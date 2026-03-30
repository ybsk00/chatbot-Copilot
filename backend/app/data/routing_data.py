"""
BSM 통합구매프로세스 라우팅 데이터 스토어 v2.

10개 JSON 파일(BSM_Chunking_GuideType_260330)을 서버 기동 시 메모리 로드하여
4-STEP 분기 라우팅을 제공한다.

STEP 1 (01): L3 라우팅 색인 → BT/GT/PR여부/주관부서
STEP 2 (09): 분기 결정 테이블 → 분기1 진입경로 + 분기2 소싱방식
STEP 3 (05): GT 정의 → RFQ/입찰 필요 여부
STEP 4 (03+02): BT 정의 + L3 상세 가이드 → 사용자 안내

사용법:
    from app.data.routing_data import get_routing_store
    store = get_routing_store()
    store.get_branch1_path("L3-010101")   # "A_카탈로그직접발주"
    store.get_branch2_sourcing("L3-010101")  # "SKIP"
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_BSM_DIR = Path(__file__).parent / "bsm"

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
    """01_L3_routing_index.json 한 행."""
    l3_code: str
    l3_name: str
    l1: str
    l2: str
    bt_type: str
    bt_type_name: str
    gt_code: str
    dept: str
    pr_required: str   # "Y" | "N" | "불가" | "조건부"
    has_dept: bool      # True/False


class RoutingDataStore:
    """싱글톤. 10개 JSON(v2)을 메모리에 캐싱."""

    _instance: RoutingDataStore | None = None

    def __init__(self) -> None:
        self.l3_index: dict[str, RoutingEntry] = {}   # 01
        self.l3_detail: dict[str, dict] = {}           # 02 (merged guide+messages)
        self.bt_defs: dict[str, dict] = {}             # 03
        self.bt_process: dict[str, dict] = {}          # 04
        self.gt_defs: dict[str, dict] = {}             # 05
        self.l3_sourcing: dict[str, dict] = {}         # 06
        self.gt_strategy_meta: dict = {}               # 07
        self.taxonomy_tree: list[dict] = []            # 08
        self.branch_table: dict[str, dict] = {}        # 09 (핵심)
        self._loaded = False

    # ── 로딩 ─────────────────────────────────────────────

    def load(self) -> None:
        if self._loaded:
            return
        try:
            self._load_01_routing_index()
            self._load_02_detail_guide()
            self._load_03_bt_definition()
            self._load_04_bt_process()
            self._load_05_gt_definition()
            self._load_06_sourcing_mapping()
            self._load_07_strategy_meta()
            self._load_08_taxonomy()
            self._load_09_branch_decision()
            self._loaded = True

            # 분기 분포 로깅
            from collections import Counter
            b1 = Counter(r.get("분기1_진입", "") for r in self.branch_table.values())
            b2 = Counter(r.get("분기2_소싱", "") for r in self.branch_table.values())
            logger.info(
                "BSM v2 loaded: %d L3, %d BT, %d GT, %d branch | "
                "분기1=%s | 분기2=%s",
                len(self.l3_index), len(self.bt_defs), len(self.gt_defs),
                len(self.branch_table), dict(b1), dict(b2),
            )
        except Exception:
            logger.exception("BSM RoutingDataStore v2 로딩 실패")
            self._loaded = False

    def _read_json(self, filename: str) -> Any:
        path = _BSM_DIR / filename
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _load_01_routing_index(self) -> None:
        data = self._read_json("01_L3_routing_index.json")
        for row in data:
            code = row.get("L3코드", "")
            self.l3_index[code] = RoutingEntry(
                l3_code=code,
                l3_name=row.get("L3소분류", ""),
                l1=row.get("L1대분류", ""),
                l2=row.get("L2중분류", ""),
                bt_type=row.get("BT유형", ""),
                bt_type_name=row.get("BT유형명", ""),
                gt_code=row.get("GT코드", ""),
                dept=row.get("주관부서", "—"),
                pr_required=row.get("PR여부", "N"),
                has_dept=bool(row.get("주관부서있음", False)),
            )

    def _load_02_detail_guide(self) -> None:
        self.l3_detail = self._read_json("02_L3_detail_guide.json")

    def _load_03_bt_definition(self) -> None:
        raw = self._read_json("03_BT_definition.json")
        # 03번은 "4대원칙" + "BT정의" 섹션 구조일 수 있음
        if isinstance(raw, dict):
            bt_section = raw.get("BT정의", raw)
            # 4대원칙은 별도 저장하지 않음 (bt_defs에서 BT 코드만 추출)
            self.bt_defs = {k: v for k, v in bt_section.items() if k.startswith("BT-")}
            if not self.bt_defs:
                self.bt_defs = raw

    def _load_04_bt_process(self) -> None:
        self.bt_process = self._read_json("04_BT_process_P0_P10.json")

    def _load_05_gt_definition(self) -> None:
        self.gt_defs = self._read_json("05_GT_definition.json")

    def _load_06_sourcing_mapping(self) -> None:
        self.l3_sourcing = self._read_json("06_L3_sourcing_mapping.json")

    def _load_07_strategy_meta(self) -> None:
        self.gt_strategy_meta = self._read_json("07_GT_strategy_meta.json")

    def _load_08_taxonomy(self) -> None:
        self.taxonomy_tree = self._read_json("08_taxonomy_L1_L2_L3.json")

    def _load_09_branch_decision(self) -> None:
        data = self._read_json("09_branch_decision_table.json")
        # 배열 → L3코드 키 dict로 변환
        for row in data:
            code = row.get("L3코드", "")
            if code:
                self.branch_table[code] = row

    # ── 핵심 분기 조회 ───────────────────────────────────

    def get_branch1_path(self, l3_code: str) -> str:
        """09번: 분기1 진입경로 반환.
        Returns: "A_카탈로그직접발주" | "B_주관부서신청" | "D_조건부_기존계약확인"
                 | "E_PR작성_주관부서있음" | "F_PR작성_주관부서없음" | "unknown"
        """
        row = self.branch_table.get(l3_code)
        if not row:
            return "unknown"
        return row.get("분기1_진입", "unknown")

    def get_branch2_sourcing(self, l3_code: str) -> str:
        """09번: 분기2 소싱방식 반환.
        Returns: "SKIP" | "SKIP_or_PR" | "2A_PR만" | "2B_RFQ" | "2C_RFP입찰"
        """
        row = self.branch_table.get(l3_code)
        if not row:
            return "SKIP"
        return row.get("분기2_소싱", "SKIP")

    def get_bt_action(self, l3_code: str) -> str:
        """하위호환: 분기1 → "blocked" | "allowed" | "conditional" | "unknown"."""
        b1 = self.get_branch1_path(l3_code)
        return _BRANCH1_TO_ACTION.get(b1, "unknown")

    # ── 일반 조회 ────────────────────────────────────────

    def get_routing(self, l3_code: str) -> RoutingEntry | None:
        return self.l3_index.get(l3_code)

    def get_user_message(self, l3_code: str, role: str = "user") -> dict | None:
        """02번 L3 상세 가이드에서 안내 메시지 조회."""
        return self.l3_detail.get(l3_code)

    def get_user_message_text(self, l3_code: str, role: str = "user") -> str:
        """역할에 맞는 안내 메시지 텍스트 반환."""
        detail = self.l3_detail.get(l3_code)
        if not detail:
            return ""
        return detail.get("사용자안내", "")

    def get_action_buttons(self, l3_code: str) -> list[str]:
        """02번 상세 가이드에서 진입방법 기반 액션 버튼 추출."""
        detail = self.l3_detail.get(l3_code)
        if not detail:
            return []
        # 진입방법에서 [버튼] 패턴 추출
        raw = detail.get("진입방법", "") + "\n" + detail.get("사용자안내", "")
        buttons = re.findall(r"\[([^\]]+)\]", raw)
        # 중복 제거 (순서 유지)
        seen = set()
        result = []
        for b in buttons:
            if b not in seen:
                seen.add(b)
                result.append(b)
        return result

    def get_process_guide(self, l3_code: str) -> dict | None:
        """04번 BT 프로세스에서 P0~P10 조회 (BT 레벨)."""
        entry = self.l3_index.get(l3_code)
        if not entry:
            return None
        bt_proc = self.bt_process.get(entry.bt_type)
        if bt_proc:
            return bt_proc.get("프로세스", bt_proc)
        return None

    def get_sla(self, l3_code: str) -> str:
        """02번에서 Confirm_SLA 조회."""
        detail = self.l3_detail.get(l3_code)
        if not detail:
            return ""
        return detail.get("Confirm_SLA", "")

    def get_violations_for_l3(self, l3_code: str) -> list[str]:
        """02번에서 위반코드 텍스트 반환."""
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
        """프론트엔드에 전달할 bt_routing 메타 객체."""
        entry = self.l3_index.get(l3_code)
        if not entry:
            return None
        branch1 = self.get_branch1_path(l3_code)
        branch2 = self.get_branch2_sourcing(l3_code)
        return {
            "bt_type": entry.bt_type,
            "bt_type_name": entry.bt_type_name,
            "gt_code": entry.gt_code,
            "pr_action": self.get_bt_action(l3_code),
            "branch1_path": branch1,
            "branch2_sourcing": branch2,
            "action_buttons": self.get_action_buttons(l3_code),
            "dept": entry.dept,
            "sla": self.get_sla(l3_code),
            "l3_name": entry.l3_name,
            "pr_required": entry.pr_required,
            "has_dept": entry.has_dept,
        }


# ── 싱글톤 접근 ─────────────────────────────────────────

def get_routing_store() -> RoutingDataStore:
    """RoutingDataStore 싱글톤 반환. 최초 호출 시 자동 로드."""
    if RoutingDataStore._instance is None:
        store = RoutingDataStore()
        store.load()
        RoutingDataStore._instance = store
    return RoutingDataStore._instance
