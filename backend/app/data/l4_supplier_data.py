"""L4 공급업체 추천 데이터스토어 — 싱글턴, DB-first, 메모리 캐시."""
import logging
import random
from dataclasses import dataclass, field
from app.db.supabase_client import get_client

logger = logging.getLogger(__name__)


@dataclass
class L4Entry:
    code: str
    parent_code: str
    name: str
    branch_type: str
    has_region: bool
    has_worktype: bool


@dataclass
class EvalCriterion:
    num: int
    name: str
    weight_pct: int


class L4SupplierStore:
    """L4 분류체계 + 공급업체 추천 엔진. 싱글턴."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def load(self):
        """DB에서 taxonomy_l4 + supplier_eval_weights 로드."""
        try:
            sb = get_client()

            # taxonomy_l4
            res = sb.table("taxonomy_l4").select("*").eq("is_active", True).execute()
            self.l4_index: dict[str, L4Entry] = {}
            self.l3_to_l4: dict[str, list[dict]] = {}

            for row in res.data:
                entry = L4Entry(
                    code=row["code"],
                    parent_code=row["parent_code"],
                    name=row["name"],
                    branch_type=row["branch_type"],
                    has_region=row["has_region"],
                    has_worktype=row["has_worktype"],
                )
                self.l4_index[entry.code] = entry
                self.l3_to_l4.setdefault(entry.parent_code, []).append({
                    "code": entry.code,
                    "name": entry.name,
                })

            # supplier_eval_weights
            res2 = sb.table("supplier_eval_weights").select("*").eq("is_active", True).execute()
            self.eval_weights: dict[str, list[EvalCriterion]] = {}
            for row in res2.data:
                self.eval_weights.setdefault(row["l4_code"], []).append(
                    EvalCriterion(
                        num=row["criterion_num"],
                        name=row["criterion_name"],
                        weight_pct=row["weight_pct"],
                    )
                )
            # 정렬
            for code in self.eval_weights:
                self.eval_weights[code].sort(key=lambda c: c.num)

            self._loaded = True
            logger.info(f"[L4Store] Loaded {len(self.l4_index)} L4, "
                        f"{len(self.eval_weights)} eval_weight groups")
        except Exception as e:
            logger.error(f"[L4Store] Load failed: {e}")
            self.l4_index = {}
            self.l3_to_l4 = {}
            self.eval_weights = {}

    def _ensure_loaded(self):
        if not self._loaded:
            self.load()

    def get_l4_options(self, l3_code: str) -> list[dict]:
        """L3 코드의 하위 L4 목록 반환. [{code, name}, ...]"""
        self._ensure_loaded()
        return self.l3_to_l4.get(l3_code, [])

    def get_branch_info(self, l4_code: str) -> dict:
        """L4의 지역/공종 분기 정보."""
        self._ensure_loaded()
        entry = self.l4_index.get(l4_code)
        if not entry:
            return {"has_region": False, "has_worktype": False}

        result = {
            "has_region": entry.has_region,
            "has_worktype": entry.has_worktype,
            "branch_type": entry.branch_type,
        }
        if entry.has_region:
            result["regions"] = [
                "수도권(서울·경기·인천)",
                "충청권(대전·세종·충남·충북)",
                "영남권(부산·울산·경남)",
                "대경권(대구·경북)",
                "호남권(광주·전남·전북)",
                "강원·제주",
            ]
        if entry.has_worktype:
            # 공종 목록은 DB에서 동적으로 가져옴
            result["worktypes"] = self._get_worktypes(l4_code)
        return result

    def _get_worktypes(self, l4_code: str) -> list[str]:
        """suppliers_l4에서 해당 L4의 공종 목록 조회."""
        try:
            sb = get_client()
            res = sb.table("suppliers_l4").select("scope_value") \
                .eq("l4_code", l4_code) \
                .eq("scope_type", "worktype") \
                .execute()
            return sorted(set(r["scope_value"] for r in res.data if r["scope_value"]))
        except Exception:
            return []

    def get_eval_criteria(self, l4_code: str) -> list[dict]:
        """L4의 평가 기준 반환."""
        self._ensure_loaded()
        criteria = self.eval_weights.get(l4_code, [])
        return [{"num": c.num, "name": c.name, "weight_pct": c.weight_pct} for c in criteria]

    def get_suppliers(
        self,
        l4_code: str,
        scope_type: str = "nationwide",
        scope_value: str | None = None,
        session_id: str | None = None,
    ) -> dict:
        """L4 공급업체 추천 — S/A 고정 + B/C/D 롤링.

        Returns:
            {
                "l4": {code, name, parent_code},
                "eval_criteria": [{num, name, weight_pct}],
                "fixed": [supplier...],    # S/A 등급 (항상 표시)
                "rotating": [supplier...], # B/C/D 중 2개 (세션별 롤링)
                "branch": {has_region, has_worktype, ...}
            }
        """
        self._ensure_loaded()
        entry = self.l4_index.get(l4_code)

        try:
            sb = get_client()

            # 쿼리 빌더
            base_q = sb.table("suppliers_l4") \
                .select("*") \
                .eq("l4_code", l4_code) \
                .eq("scope_type", scope_type) \
                .eq("is_active", True)

            if scope_value:
                base_q = base_q.eq("scope_value", scope_value)
            else:
                base_q = base_q.is_("scope_value", "null")

            all_suppliers = base_q.order("weighted_score", desc=True).execute()
            suppliers = all_suppliers.data or []

        except Exception as e:
            logger.error(f"[L4Store] Supplier query failed: {e}")
            suppliers = []

        # S/A 등급: 고정
        fixed = [s for s in suppliers if s.get("grade") in ("S", "A")]
        # B/C 등급: 롤링 (D등급 제외)
        pool = [s for s in suppliers if s.get("grade") in ("B", "C")]

        rotating = []
        if pool:
            seed_str = f"{session_id or 'default'}:{l4_code}:{scope_value or ''}"
            rng = random.Random(hash(seed_str))
            rotating = rng.sample(pool, min(2, len(pool)))

        return {
            "l4": {
                "code": l4_code,
                "name": entry.name if entry else "",
                "parent_code": entry.parent_code if entry else "",
            },
            "eval_criteria": self.get_eval_criteria(l4_code),
            "fixed": fixed,
            "rotating": rotating,
            "branch": self.get_branch_info(l4_code),
        }


# 싱글턴 접근
_store: L4SupplierStore | None = None


def get_l4_store() -> L4SupplierStore:
    global _store
    if _store is None:
        _store = L4SupplierStore()
        _store.load()
    return _store
