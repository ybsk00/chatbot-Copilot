"""
BSM 통합구매프로세스 라우팅 데이터 스토어 v2 — DB-first.

Supabase DB에서 데이터를 로드하여 4-STEP 분기 라우팅을 제공한다.
- taxonomy_v2: L3 라우팅 + 분기 + detail_guide + sourcing_guide
- bsm_reference: BT 정의, GT 정의, BT 프로세스, GT 전략 메타

사용법:
    from app.data.routing_data import get_routing_store
    store = get_routing_store()
    store.get_branch1_path("L3-010101")   # "A_카탈로그직접발주"
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)

# ── 분기1 → 하위호환 pr_action 매핑 ───────────────────────
_BRANCH1_TO_ACTION = {
    "A_카탈로그직접발주": "blocked",
    "B_주관부서신청": "blocked",
    "D_조건부_기존계약확인": "conditional",
    "E_PR작성_주관부서있음": "allowed",
    "F_PR작성_주관부서없음": "allowed",
}


@dataclass
class RoutingEntry:
    """taxonomy_v2 L3 행."""
    l3_code: str
    l3_name: str
    l1: str
    l2: str
    bt_type: str
    gt_code: str
    dept: str
    pr_required: str
    has_dept: bool
    branch1_path: str
    branch2_sourcing: str


class RoutingDataStore:
    """싱글톤. DB에서 라우팅 데이터를 로드하여 캐싱."""

    _instance: RoutingDataStore | None = None

    def __init__(self) -> None:
        self.l3_index: dict[str, RoutingEntry] = {}
        self.l3_detail: dict[str, dict] = {}
        self.l3_sourcing: dict[str, dict] = {}
        self.bt_defs: dict[str, dict] = {}
        self.bt_process: dict[str, dict] = {}
        self.gt_defs: dict[str, dict] = {}
        self.gt_strategy_meta: dict = {}
        self.taxonomy_tree: list[dict] = []
        self.branch_table: dict[str, dict] = {}
        self._loaded = False

    # ── 로딩 (DB-first) ──────────────────────────────────

    def load(self) -> None:
        if self._loaded:
            return
        try:
            from app.db.supabase_client import get_client
            sb = get_client()

            # ── taxonomy_v2에서 L3 라우팅 데이터 로드 ──
            rows = sb.table("taxonomy_v2").select("*").eq("level", 3).eq("is_active", True).execute().data or []
            for r in rows:
                code = r.get("code", "")
                bt = r.get("bt_type", "")
                b1 = r.get("branch1_path", "")
                b2 = r.get("branch2_sourcing", "")

                # L1/L2 이름은 parent_code로 역추적 필요 — detail_guide에 있음
                detail = r.get("detail_guide") or {}
                l1 = detail.get("L1대분류", "")
                l2 = detail.get("L2중분류", "")

                self.l3_index[code] = RoutingEntry(
                    l3_code=code,
                    l3_name=r.get("name", ""),
                    l1=l1,
                    l2=l2,
                    bt_type=bt,
                    gt_code=r.get("gt_code", ""),
                    dept=r.get("dept", "—"),
                    pr_required=r.get("pr_yn", "N"),
                    has_dept=bool(r.get("has_dept", False)),
                    branch1_path=b1,
                    branch2_sourcing=b2,
                )

                # detail_guide 캐시
                if detail:
                    self.l3_detail[code] = detail

                # sourcing_guide 캐시
                sourcing = r.get("sourcing_guide")
                if sourcing:
                    self.l3_sourcing[code] = sourcing

                # branch_table (하위호환)
                if b1:
                    self.branch_table[code] = {
                        "L3코드": code,
                        "BT유형": bt,
                        "GT코드": r.get("gt_code", ""),
                        "PR여부": r.get("pr_yn", ""),
                        "주관부서있음": r.get("has_dept", False),
                        "분기1_진입": b1,
                        "분기2_소싱": b2,
                    }

            # ── bsm_reference에서 BT/GT 정의 로드 ──
            refs = sb.table("bsm_reference").select("*").execute().data or []
            for ref in refs:
                rt = ref.get("ref_type", "")
                rc = ref.get("ref_code", "")
                data = ref.get("data", {})

                if rt == "bt_def" and rc.startswith("BT-"):
                    self.bt_defs[rc] = data
                elif rt == "bt_process":
                    self.bt_process[rc] = data
                elif rt == "gt_def":
                    self.gt_defs[rc] = data
                elif rt == "gt_meta":
                    self.gt_strategy_meta = data

            # ── taxonomy_tree (L1→L2→L3 계층, taxonomy_v2에서 빌드) ──
            all_rows = sb.table("taxonomy_v2").select("code, level, name, parent_code").eq("is_active", True).execute().data or []
            l1s = [r for r in all_rows if r["level"] == 1]
            l2s = [r for r in all_rows if r["level"] == 2]
            l3s = [r for r in all_rows if r["level"] == 3]
            tree = []
            for l1 in l1s:
                children = []
                for l2 in l2s:
                    if l2.get("parent_code") == l1["code"]:
                        l3_list = [{"L3코드": r["code"], "L3소분류": r["name"]}
                                   for r in l3s if r.get("parent_code") == l2["code"]]
                        children.append({"L2중분류": l2["name"], "L3목록": l3_list})
                tree.append({"L1대분류": l1["name"], "children": children})
            self.taxonomy_tree = tree

            self._loaded = True

            from collections import Counter
            b1_dist = Counter(e.branch1_path for e in self.l3_index.values() if e.branch1_path)
            logger.info(
                "BSM v2 DB loaded: %d L3, %d BT, %d GT, %d detail | 분기1=%s",
                len(self.l3_index), len(self.bt_defs), len(self.gt_defs),
                len(self.l3_detail), dict(b1_dist),
            )
        except Exception:
            logger.exception("BSM RoutingDataStore DB 로딩 실패 — JSON 폴백 시도")
            self._load_json_fallback()

    def _load_json_fallback(self) -> None:
        """DB 로딩 실패 시 JSON 파일에서 폴백 로드."""
        import json
        from pathlib import Path
        bsm_dir = Path(__file__).parent / "bsm"

        try:
            def _read(name):
                with open(bsm_dir / name, encoding="utf-8") as f:
                    return json.load(f)

            # 01
            for row in _read("01_L3_routing_index.json"):
                code = row.get("L3코드", "")
                self.l3_index[code] = RoutingEntry(
                    l3_code=code, l3_name=row.get("L3소분류", ""),
                    l1=row.get("L1대분류", ""), l2=row.get("L2중분류", ""),
                    bt_type=row.get("BT유형", ""), gt_code=row.get("GT코드", ""),
                    dept=row.get("주관부서", "—"), pr_required=row.get("PR여부", "N"),
                    has_dept=bool(row.get("주관부서있음", False)),
                    branch1_path="", branch2_sourcing="",
                )
            # 02
            self.l3_detail = _read("02_L3_detail_guide.json")
            # 03
            raw03 = _read("03_BT_definition.json")
            self.bt_defs = {k: v for k, v in raw03.get("BT정의", raw03).items() if k.startswith("BT-")}
            # 04
            self.bt_process = _read("04_BT_process_P0_P10.json")
            # 05
            self.gt_defs = _read("05_GT_definition.json")
            # 06
            self.l3_sourcing = _read("06_L3_sourcing_mapping.json")
            # 07
            self.gt_strategy_meta = _read("07_GT_strategy_meta.json")
            # 08
            self.taxonomy_tree = _read("08_taxonomy_L1_L2_L3.json")
            # 09
            for row in _read("09_branch_decision_table.json"):
                code = row.get("L3코드", "")
                self.branch_table[code] = row
                if code in self.l3_index:
                    self.l3_index[code].branch1_path = row.get("분기1_진입", "")
                    self.l3_index[code].branch2_sourcing = row.get("분기2_소싱", "")

            self._loaded = True
            logger.info("BSM v2 JSON fallback loaded: %d L3", len(self.l3_index))
        except Exception:
            logger.exception("BSM JSON 폴백도 실패")
            self._loaded = False

    # ── 핵심 분기 조회 ───────────────────────────────────

    def get_branch1_path(self, l3_code: str) -> str:
        entry = self.l3_index.get(l3_code)
        if not entry or not entry.branch1_path:
            return "unknown"
        return entry.branch1_path

    def get_branch2_sourcing(self, l3_code: str) -> str:
        entry = self.l3_index.get(l3_code)
        if not entry or not entry.branch2_sourcing:
            return "SKIP"
        return entry.branch2_sourcing

    def get_bt_action(self, l3_code: str) -> str:
        b1 = self.get_branch1_path(l3_code)
        return _BRANCH1_TO_ACTION.get(b1, "unknown")

    # ── 일반 조회 ────────────────────────────────────────

    def get_routing(self, l3_code: str) -> RoutingEntry | None:
        return self.l3_index.get(l3_code)

    def get_user_message(self, l3_code: str, role: str = "user") -> dict | None:
        return self.l3_detail.get(l3_code)

    def get_user_message_text(self, l3_code: str, role: str = "user") -> str:
        detail = self.l3_detail.get(l3_code)
        if not detail:
            return ""
        return detail.get("사용자안내", "")

    def get_action_buttons(self, l3_code: str) -> list[str]:
        detail = self.l3_detail.get(l3_code)
        if not detail:
            return []
        raw = detail.get("진입방법", "") + "\n" + detail.get("사용자안내", "")
        buttons = re.findall(r"\[([^\]]+)\]", raw)
        seen = set()
        result = []
        for b in buttons:
            if b not in seen:
                seen.add(b)
                result.append(b)
        return result

    def get_process_guide(self, l3_code: str) -> dict | None:
        entry = self.l3_index.get(l3_code)
        if not entry:
            return None
        bt_proc = self.bt_process.get(entry.bt_type)
        if bt_proc:
            return bt_proc.get("프로세스", bt_proc)
        return None

    def get_sla(self, l3_code: str) -> str:
        detail = self.l3_detail.get(l3_code)
        if not detail:
            return ""
        return detail.get("Confirm_SLA", "")

    def get_violations_for_l3(self, l3_code: str) -> list[str]:
        detail = self.l3_detail.get(l3_code)
        if not detail:
            return []
        raw = detail.get("위반코드", "")
        return [line.strip() for line in raw.split("\n") if line.strip()]

    def get_bt_definition(self, bt_code: str) -> dict | None:
        return self.bt_defs.get(bt_code)

    def get_gt_definition(self, gt_code: str) -> dict | None:
        return self.gt_defs.get(gt_code)

    def build_bt_routing_payload(self, l3_code: str) -> dict | None:
        entry = self.l3_index.get(l3_code)
        if not entry:
            return None
        return {
            "bt_type": entry.bt_type,
            "gt_code": entry.gt_code,
            "pr_action": self.get_bt_action(l3_code),
            "branch1_path": entry.branch1_path,
            "branch2_sourcing": entry.branch2_sourcing,
            "action_buttons": self.get_action_buttons(l3_code),
            "dept": entry.dept,
            "sla": self.get_sla(l3_code),
            "l3_name": entry.l3_name,
            "pr_required": entry.pr_required,
            "has_dept": entry.has_dept,
        }


# ── 싱글톤 접근 ─────────────────────────────────────────

def get_routing_store() -> RoutingDataStore:
    if RoutingDataStore._instance is None:
        store = RoutingDataStore()
        store.load()
        RoutingDataStore._instance = store
    return RoutingDataStore._instance
