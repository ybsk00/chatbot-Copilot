"""의도 파악 에이전트 — 사용자 질문을 차세대 품목체계(taxonomy_v2)에 매칭"""
import json
import logging
import re
from google import genai
from app.config import GOOGLE_API_KEY, MODELS

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client


# ═══════════════════════════════════════════
# taxonomy_v2 캐시 (서버 시작 시 1회 로드)
# ═══════════════════════════════════════════
_taxonomy_cache = None  # {l1: [...], l2: [...], l3: [...], tree: {...}}


def _load_taxonomy():
    """taxonomy_v2 DB → 메모리 캐시 로드"""
    global _taxonomy_cache
    if _taxonomy_cache is not None:
        return _taxonomy_cache

    try:
        from app.db.supabase_client import get_client as get_sb
        sb = get_sb()
        rows = sb.table("taxonomy_v2").select("*").eq("is_active", True).execute().data

        l1_list = [r for r in rows if r["level"] == 1]
        l2_list = [r for r in rows if r["level"] == 2]
        l3_list = [r for r in rows if r["level"] == 3]

        # L1 코드 → 이름 매핑
        l1_map = {r["code"]: r["name"] for r in l1_list}

        # L2 코드 → {name, parent_code, pr_template_key, rfp_type}
        l2_map = {}
        for r in l2_list:
            l2_map[r["code"]] = {
                "name": r["name"],
                "parent_code": r.get("parent_code"),
                "pr_template_key": r.get("pr_template_key", "_generic"),
                "rfp_type": r.get("rfp_type", "service"),
            }

        # L3 코드 → 전체 정보
        l3_map = {}
        for r in l3_list:
            l3_map[r["code"]] = r

        # 트리 구조: L1 > L2 > L3 (분류 프롬프트용 텍스트 포함)
        tree = {}
        for l1 in l1_list:
            children = []
            for l2 in l2_list:
                if l2.get("parent_code") == l1["code"]:
                    l3_names = [r["name"] for r in l3_list if r.get("parent_code") == l2["code"]]
                    children.append({
                        "code": l2["code"],
                        "name": l2["name"],
                        "l3_names": l3_names,
                    })
            tree[l1["code"]] = {
                "name": l1["name"],
                "children": children,
            }

        # 키워드 → L3 코드 역매핑 (빠른 키워드 매칭용)
        keyword_to_l3 = {}
        for r in l3_list:
            for kw in (r.get("keywords") or []):
                kw_lower = kw.strip().lower()
                if kw_lower:
                    keyword_to_l3.setdefault(kw_lower, []).append(r["code"])

        _taxonomy_cache = {
            "l1_map": l1_map,
            "l2_map": l2_map,
            "l3_map": l3_map,
            "tree": tree,
            "keyword_to_l3": keyword_to_l3,
            "l1_list": l1_list,
            "l2_list": l2_list,
            "l3_list": l3_list,
        }
        logger.info(f"taxonomy_v2 캐시 로드: L1={len(l1_list)}, L2={len(l2_list)}, L3={len(l3_list)}")
        return _taxonomy_cache

    except Exception as e:
        logger.error(f"taxonomy_v2 로드 실패: {e}")
        _taxonomy_cache = {
            "l1_map": {}, "l2_map": {}, "l3_map": {},
            "tree": {}, "keyword_to_l3": {},
            "l1_list": [], "l2_list": [], "l3_list": [],
        }
        return _taxonomy_cache


def get_taxonomy_cache():
    """외부에서 taxonomy 캐시 접근"""
    return _load_taxonomy()


def _build_taxonomy_text() -> str:
    """LLM 프롬프트용 분류체계 텍스트 생성"""
    cache = _load_taxonomy()
    lines = []
    for l1_code, l1_info in cache["tree"].items():
        l2_parts = []
        for l2 in l1_info["children"]:
            if l2["l3_names"]:
                l3_hint = "/".join(l2["l3_names"][:5])
                if len(l2["l3_names"]) > 5:
                    l3_hint += " 등"
                l2_parts.append(f"{l2['name']}({l3_hint})")
            else:
                l2_parts.append(l2["name"])
        lines.append(f"- {l1_info['name']}: {', '.join(l2_parts)}")
    return "\n".join(lines)


# ═══════════════════════════════════════════
# 분류 프롬프트 (기존과 동일 구조, 출력 키는 대분류/중분류 유지)
# ═══════════════════════════════════════════
CLASSIFY_PROMPT = """사용자의 간접구매 질문을 아래 분류체계에 매칭하고, 구매 의도(CTA)를 판단하세요. JSON만 반환.

[분류체계]
{taxonomy}

[CTA 의도 판단 기준]
- "hot": 구매/발주/도입 의사가 명확함 (예: "설치하고 싶어요", "견적 받고 싶어요", "50대 필요해요", "계약하려고", "도입 검토 중")
- "warm": 비교/탐색/검토 중 (예: "종류가 뭐가 있어요?", "A랑 B 차이", "추천해주세요", "비용이 얼마나", "어떤 게 좋을까")
- "cold": 일반 정보 수집/개념 질문 (예: "뭔가요?", "알려주세요", "설명해주세요", "절차가 어떻게")

[렌탈/리스 분류 가이드]
- "렌탈", "리스", "임대", "대여" 키워드가 포함된 사무기기(공기청정기, 정수기, 복합기, 비데, OA기기) 질문 → 해당 기기의 렌탈 중분류
- 일회성 구매(구매, 납품) 질문 → 물품 관련 대분류

[규칙]
1. 가장 관련 있는 대분류와 중분류 1개를 선택하세요.
2. 매칭 불가 시 대분류/중분류는 null, cta는 "cold"를 반환하세요.
3. JSON만 반환, 설명 없이.
4. 대화 이력이 있으면 맥락을 반드시 참고하세요. 짧거나 모호한 질문은 이전 대화 주제와 같은 대분류/중분류로 판단하세요.
5. "안내해주세요", "알려주세요", "더 알고 싶어요" 같은 짧은 후속 요청은 반드시 직전 대화 주제의 분류를 유지하세요.

{history_section}[사용자 질문]
{question}

출력: {{"대분류": "...", "중분류": "...", "cta": "hot|warm|cold"}}"""


# ── 렌탈/리스 키워드 오버라이드 ──
# ═══════════════════════════════════════════
# 하위호환: TAXONOMY dict (orchestrator.py에서 참조)
# taxonomy_v2 DB에서 동적 생성
# ═══════════════════════════════════════════
def _build_legacy_taxonomy() -> dict:
    """기존 TAXONOMY dict 형태로 변환 (하위호환)"""
    cache = _load_taxonomy()
    taxonomy = {}
    for l1_code, l1_name in cache["l1_map"].items():
        middles = []
        for l2_code, l2_info in cache["l2_map"].items():
            if l2_info.get("parent_code") == l1_code:
                l3_names = [r["name"] for r in cache["l3_list"] if r.get("parent_code") == l2_code]
                if l3_names:
                    hint = "/".join(l3_names[:4])
                    middles.append(f"{l2_info['name']}({hint})")
                else:
                    middles.append(l2_info["name"])
        taxonomy[l1_name] = middles
    return taxonomy


class _LazyTaxonomy:
    """서버 시작 시 DB 연결 전에 import되어도 오류 없도록 lazy 로딩"""

    def __init__(self):
        self._data = None

    def _ensure_loaded(self) -> dict:
        if self._data is None:
            self._data = _build_legacy_taxonomy()
        return self._data

    def items(self):
        return self._ensure_loaded().items()

    def __contains__(self, item):
        return item in self._ensure_loaded()

    def get(self, key, default=None):
        return self._ensure_loaded().get(key, default)

    def __getitem__(self, key):
        return self._ensure_loaded()[key]

    def keys(self):
        return self._ensure_loaded().keys()


TAXONOMY = _LazyTaxonomy()


RENTAL_KEYWORDS = ["렌탈", "렌트", "리스", "임대", "대여"]
MAINTENANCE_KEYWORDS = ["유지보수", "A/S", "정기점검", "필터교체", "소모품"]


def _get_rfp_type(major: str, middle: str | None = None, question: str = "") -> str:
    """분류체계에서 RFP 유형 결정 — taxonomy_v2의 rfp_type 사용"""
    cache = _load_taxonomy()

    # L2 이름으로 매칭 → rfp_type 조회
    base_type = "service_contract"
    if middle:
        clean_middle = middle.split("(")[0].strip() if "(" in middle else middle
        for l2_code, l2_info in cache["l2_map"].items():
            if l2_info["name"] == clean_middle or clean_middle in l2_info["name"]:
                base_type = l2_info.get("rfp_type", "service_contract")
                break
        else:
            # L1 이름으로 첫 번째 L2의 rfp_type 사용
            for l1_code, l1_name in cache["l1_map"].items():
                if l1_name == major:
                    for l2_code, l2_info in cache["l2_map"].items():
                        if l2_info.get("parent_code") == l1_code:
                            base_type = l2_info.get("rfp_type", "service_contract")
                            break
                    break
    else:
        # 대분류만 있을 때 → 첫 L2의 rfp_type
        for l1_code, l1_name in cache["l1_map"].items():
            if l1_name == major:
                for l2_code, l2_info in cache["l2_map"].items():
                    if l2_info.get("parent_code") == l1_code:
                        base_type = l2_info.get("rfp_type", "service_contract")
                        break
                break

    # 렌탈/리스 키워드 오버라이드
    q = question.lower()
    has_rental = any(kw in q for kw in RENTAL_KEYWORDS)
    if has_rental and base_type not in ("rental", "rental_maintenance"):
        has_maint = any(kw in q for kw in MAINTENANCE_KEYWORDS)
        if has_maint or base_type in ("purchase_maintenance",):
            return "rental_maintenance"
        return "rental"

    return base_type


def _get_pr_template_key(major: str, middle: str | None = None, l3_code: str | None = None) -> str:
    """분류 결과 → PR 템플릿 키 반환 (L3 개별키 우선)"""
    cache = _load_taxonomy()

    # 1순위: L3 코드로 직접 매칭 (139개 개별 템플릿)
    if l3_code and l3_code in cache.get("l3_map", {}):
        l3_info = cache["l3_map"][l3_code]
        l3_name = l3_info.get("name", "")
        # L3 이름에서 prefix 추출 시도 (taxonomy_v2에 pr_template_key가 있으면 사용)
        if l3_info.get("pr_template_key") and l3_info["pr_template_key"] != "_generic":
            return l3_info["pr_template_key"]

    # 2순위: L2 이름 매칭 (기존 로직, fallback)
    if middle:
        clean_middle = middle.split("(")[0].strip() if "(" in middle else middle
        for l2_code, l2_info in cache["l2_map"].items():
            if l2_info["name"] == clean_middle or clean_middle in l2_info["name"]:
                return l2_info.get("pr_template_key", "_generic")

    # 3순위: L1 이름으로 첫 L2의 pr_template_key
    for l1_code, l1_name in cache["l1_map"].items():
        if l1_name == major:
            for l2_code, l2_info in cache["l2_map"].items():
                if l2_info.get("parent_code") == l1_code:
                    return l2_info.get("pr_template_key", "_generic")

    return "_generic"


def _get_rfq_template_key(pr_template_key: str) -> str | None:
    """PR 템플릿 키에 대응하는 RFQ 템플릿이 있는지 확인"""
    try:
        from app.constants.rfq_schemas import RFQ_SCHEMAS
        if pr_template_key in RFQ_SCHEMAS:
            return pr_template_key
    except ImportError:
        pass
    return None


# ── CTA 키워드 사전감지 (LLM 결과 보정용) ──
_CTA_HOT_KEYWORDS = [
    "설치하고", "도입하고", "계약하고", "발주하고", "구매하고",
    "설치할", "도입할", "계약할", "발주할", "구매할",
    "견적", "설치 예정", "도입 예정", "계약 예정",
    "필요해", "필요합니다", "신청하고", "주문하고",
    "검토 중", "검토중", "도입 검토", "구매 검토",
]
_CTA_WARM_KEYWORDS = [
    "비교", "차이", "추천", "어떤 게", "뭐가 좋", "얼마나", "얼마",
    "종류", "옵션", "대안", "선택", "장단점", "비용",
    "가격", "단가", "견적서", "시세", "시장가",
]


def _detect_cta_keyword(question: str) -> str | None:
    """키워드 기반 CTA 사전감지. 확실한 경우만 반환."""
    q = question.lower()
    if any(kw in q for kw in _CTA_HOT_KEYWORDS):
        return "hot"
    if any(kw in q for kw in _CTA_WARM_KEYWORDS):
        return "warm"
    return None


def _keyword_pre_match(question: str) -> dict | None:
    """키워드 기반 L3 사전 매칭 (LLM 호출 전 빠른 감지)"""
    cache = _load_taxonomy()
    if not cache["keyword_to_l3"]:
        return None

    q_lower = question.lower()
    scores = {}  # l3_code → hit count

    for kw, l3_codes in cache["keyword_to_l3"].items():
        if kw in q_lower:
            for code in l3_codes:
                scores[code] = scores.get(code, 0) + 1

    if not scores:
        return None

    # 가장 많이 매칭된 L3
    best_l3_code = max(scores, key=scores.get)
    if scores[best_l3_code] < 1:
        return None

    l3 = cache["l3_map"].get(best_l3_code)
    if not l3:
        return None

    # L3 → L2 → L1 역추적
    l2_code = l3.get("parent_code", "")
    l2_info = cache["l2_map"].get(l2_code, {})
    l1_code = l2_info.get("parent_code", "")
    l1_name = cache["l1_map"].get(l1_code, "")
    l2_name = l2_info.get("name", "")

    return {
        "l1_name": l1_name,
        "l2_name": l2_name,
        "l3_code": best_l3_code,
        "l3_name": l3.get("name", ""),
        "pr_template_key": l3.get("pr_template_key", "_generic"),
        "rfp_type": l3.get("rfp_type", "service"),
        "keyword_hits": scores[best_l3_code],
    }


def _enrich_bt_gt(out: dict) -> dict:
    """분류 결과에 BT/GT 라우팅 정보 추가.

    추가 필드: bt_type, gt_code, pr_action, dept, branch1_path, branch2_sourcing
    l3_code가 없으면 대분류+중분류 이름으로 01번 JSON에서 L3 폴백 매칭.
    """
    try:
        from app.data.routing_data import get_routing_store
        store = get_routing_store()

        l3_code = out.get("l3_code")

        # l3_code 없으면: 대분류+중분류 이름으로 01번 JSON에서 첫 번째 매칭 L3 탐색
        if not l3_code:
            major = out.get("대분류", "")
            middle = out.get("중분류", "")
            if major:
                for code, entry in store.l3_index.items():
                    # 중분류 이름 매칭 우선
                    if middle and middle in entry.l2:
                        l3_code = code
                        break
                    # 대분류만 있으면 첫 번째 L3
                    if not middle and entry.l1 == major:
                        l3_code = code
                        break
                if l3_code:
                    out["l3_code"] = l3_code
                    out["l3_name"] = store.l3_index[l3_code].l3_name

        if not l3_code:
            return out

        entry = store.get_routing(l3_code)
        if entry:
            out["bt_type"] = entry.bt_type
            out["gt_code"] = entry.gt_code
            out["pr_action"] = store.get_bt_action(l3_code)
            out["dept"] = entry.dept
            out["branch1_path"] = store.get_branch1_path(l3_code)
            out["branch2_sourcing"] = store.get_branch2_sourcing(l3_code)
    except Exception as e:
        logger.warning(f"BT/GT enrichment 실패 (l3={out.get('l3_code')}): {e}")
    return out


def classify_intent(question: str, history: list[dict] | None = None) -> dict | None:
    """사용자 질문을 분류체계(대분류/중분류)에 매칭 + RFP/PR 유형 추천.
    반환: {"대분류", "중분류", "rfp_type", "cta", "pr_template_key", "l3_code"(옵션),
           "bt_type", "gt_code", "pr_action", "dept"(BT/GT 라우팅)}
    """
    cache = _load_taxonomy()
    valid_majors = set(cache["l1_map"].values())

    # 키워드 사전 매칭
    pre_match = _keyword_pre_match(question)

    # LLM 분류
    taxonomy_text = _build_taxonomy_text()
    history_section = ""
    if history:
        lines = []
        for msg in history[-6:]:
            role = "사용자" if msg.get("role") == "user" else "AI"
            content = msg.get("content", "")[:200]
            lines.append(f"{role}: {content}")
        history_section = "[대화 이력]\n" + "\n".join(lines) + "\n\n"

    prompt = CLASSIFY_PROMPT.format(
        taxonomy=taxonomy_text,
        question=question,
        history_section=history_section,
    )

    try:
        response = _get_client().models.generate_content(
            model=MODELS["refinement"],
            contents=prompt,
            config={"max_output_tokens": 100},
        )
        text = response.text.strip()
        if text.startswith("```"):
            text = re.sub(r"```json?\s*", "", text)
            text = re.sub(r"```\s*$", "", text)

        result = json.loads(text)

        major = result.get("대분류")
        if not major or major == "null" or major not in valid_majors:
            # LLM 실패 시 키워드 매칭 결과 사용
            if pre_match:
                cta = result.get("cta", "cold")
                kw_cta = _detect_cta_keyword(question)
                if kw_cta == "hot":
                    cta = "hot"
                elif kw_cta == "warm" and cta == "cold":
                    cta = "warm"
                return _enrich_bt_gt({
                    "대분류": pre_match["l1_name"],
                    "중분류": pre_match["l2_name"],
                    "rfp_type": pre_match["rfp_type"],
                    "cta": cta,
                    "pr_template_key": pre_match["pr_template_key"],
                    "l3_code": pre_match["l3_code"],
                    "l3_name": pre_match["l3_name"],
                })
            return None

        middle = result.get("중분류", "")
        if middle and "(" in middle:
            middle = middle.split("(")[0].strip()

        cta = result.get("cta", "cold")
        if cta not in ("hot", "warm", "cold"):
            cta = "cold"

        # 키워드 보정
        kw_cta = _detect_cta_keyword(question)
        if kw_cta == "hot" and cta != "hot":
            cta = "hot"
        elif kw_cta == "warm" and cta == "cold":
            cta = "warm"

        rfp_type = _get_rfp_type(major, middle, question)

        # L3 코드 결정
        l3_code = pre_match["l3_code"] if pre_match and pre_match["l1_name"] == major else None
        pr_template_key = _get_pr_template_key(major, middle, l3_code)
        rfq_template_key = _get_rfq_template_key(pr_template_key)

        out = {
            "대분류": major,
            "중분류": middle,
            "rfp_type": rfp_type,
            "cta": cta,
            "pr_template_key": pr_template_key,
        }
        if l3_code:
            out["l3_code"] = l3_code
            out["l3_name"] = pre_match["l3_name"]
        if rfq_template_key:
            out["rfq_template_key"] = rfq_template_key

        return _enrich_bt_gt(out)

    except Exception as e:
        logger.error(f"classify_intent 오류: {e}")
        # 키워드 매칭 폴백
        if pre_match:
            return _enrich_bt_gt({
                "대분류": pre_match["l1_name"],
                "중분류": pre_match["l2_name"],
                "rfp_type": pre_match["rfp_type"],
                "cta": _detect_cta_keyword(question) or "cold",
                "pr_template_key": pre_match["pr_template_key"],
                "l3_code": pre_match["l3_code"],
                "l3_name": pre_match["l3_name"],
            })
        return None
