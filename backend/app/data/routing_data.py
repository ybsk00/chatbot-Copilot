"""
BSM 통합구매프로세스 라우팅 데이터 스토어.

9개 JSON 파일을 서버 기동 시 메모리 로드하여
L3 분류 결과에 따른 BT/GT 라우팅을 제공한다.

사용법:
    from app.data.routing_data import get_routing_store
    store = get_routing_store()
    action = store.get_bt_action("L3-010101")  # "blocked"
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_BSM_DIR = Path(__file__).parent / "bsm"

# ── BT → PR 허용 여부 매핑 ──────────────────────────────────
BT_PR_BLOCKED = {"BT-A", "BT-B", "BT-C", "BT-D"}
BT_PR_ALLOWED = {"BT-E", "BT-F", "BT-G", "BT-H", "BT-I"}
BT_PR_CONDITIONAL = {"BT-J"}
# BT-K(긴급)는 모든 BT에서 발동 가능 — 별도 처리


@dataclass
class RoutingEntry:
    """01_L3_routing_index.json 한 행."""
    l3_code: str
    l3_name: str
    l1: str
    l2: str
    bt_type: str
    gt_code: str
    dept: str
    automation: str
    control_profile: str
    runtime_stage: str


class RoutingDataStore:
    """싱글톤. 9개 JSON을 메모리에 캐싱."""

    _instance: RoutingDataStore | None = None

    def __init__(self) -> None:
        # 01: L3 라우팅 색인
        self.l3_index: dict[str, RoutingEntry] = {}
        # 02: L3별 P0~P10 프로세스
        self.l3_process: dict[str, dict] = {}
        # 03: L3별 사용자 안내 메시지
        self.l3_messages: dict[str, dict] = {}
        # 04: BT 정의
        self.bt_defs: dict[str, dict] = {}
        # 05: GT 정의
        self.gt_defs: dict[str, dict] = {}
        # 06: 위반코드
        self.violations: dict[str, dict] = {}
        # 07: GT 전략 메타
        self.gt_strategy_meta: dict = {}
        # 08: L1→L2→L3 계층
        self.taxonomy_tree: list[dict] = []

        self._loaded = False

    # ── 로딩 ─────────────────────────────────────────────

    def load(self) -> None:
        if self._loaded:
            return
        try:
            self._load_01_routing_index()
            self._load_02_process()
            self._load_03_messages()
            self._load_04_bt()
            self._load_05_gt()
            self._load_06_violations()
            self._load_07_strategy_meta()
            self._load_08_taxonomy()
            self._loaded = True

            blocked = sum(1 for e in self.l3_index.values() if e.bt_type in BT_PR_BLOCKED)
            allowed = sum(1 for e in self.l3_index.values() if e.bt_type in BT_PR_ALLOWED)
            conditional = sum(1 for e in self.l3_index.values() if e.bt_type in BT_PR_CONDITIONAL)
            logger.info(
                "BSM RoutingDataStore loaded: %d L3, %d BT, %d GT, %d VIOL "
                "(PR blocked=%d, allowed=%d, conditional=%d)",
                len(self.l3_index), len(self.bt_defs), len(self.gt_defs),
                len(self.violations), blocked, allowed, conditional,
            )
        except Exception:
            logger.exception("BSM RoutingDataStore 로딩 실패")
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
                gt_code=row.get("GT코드", ""),
                dept=row.get("주관부서", "—"),
                automation=row.get("자동화수준", ""),
                control_profile=row.get("Control_Profile", ""),
                runtime_stage=row.get("Runtime_Stage", ""),
            )

    def _load_02_process(self) -> None:
        self.l3_process = self._read_json("02_L3_process_P0_P10.json")

    def _load_03_messages(self) -> None:
        self.l3_messages = self._read_json("03_L3_user_messages.json")

    def _load_04_bt(self) -> None:
        self.bt_defs = self._read_json("04_BT_definition_mapping.json")

    def _load_05_gt(self) -> None:
        self.gt_defs = self._read_json("05_GT_definition.json")

    def _load_06_violations(self) -> None:
        self.violations = self._read_json("06_violation_codes.json")

    def _load_07_strategy_meta(self) -> None:
        self.gt_strategy_meta = self._read_json("07_GT_strategy_meta.json")

    def _load_08_taxonomy(self) -> None:
        self.taxonomy_tree = self._read_json("08_taxonomy_L1_L2_L3.json")

    # ── 조회 메서드 ──────────────────────────────────────

    def get_bt_action(self, l3_code: str) -> str:
        """PR 허용 여부 반환: "blocked" | "allowed" | "conditional" | "unknown"."""
        entry = self.l3_index.get(l3_code)
        if not entry:
            return "unknown"
        bt = entry.bt_type
        if bt in BT_PR_BLOCKED:
            return "blocked"
        if bt in BT_PR_ALLOWED:
            return "allowed"
        if bt in BT_PR_CONDITIONAL:
            return "conditional"
        return "unknown"

    def get_routing(self, l3_code: str) -> RoutingEntry | None:
        """L3코드로 라우팅 엔트리 조회."""
        return self.l3_index.get(l3_code)

    def get_user_message(self, l3_code: str, role: str = "user") -> dict | None:
        """03번 JSON에서 사용자 안내 메시지 조회.

        role: "user" → 일반사용자_안내, "procurement" → 주관부서_처리안내
        """
        msg = self.l3_messages.get(l3_code)
        if not msg:
            return None
        return msg

    def get_user_message_text(self, l3_code: str, role: str = "user") -> str:
        """역할에 맞는 안내 메시지 텍스트만 반환."""
        msg = self.get_user_message(l3_code, role)
        if not msg:
            return ""
        if role == "procurement":
            return msg.get("주관부서_처리안내", "")
        return msg.get("일반사용자_안내", "")

    def get_action_buttons(self, l3_code: str) -> list[str]:
        """03번 JSON의 BSM_액션버튼 파싱. "[버튼1] [버튼2]" → ["버튼1", "버튼2"]."""
        msg = self.l3_messages.get(l3_code)
        if not msg:
            return []
        raw = msg.get("BSM_액션버튼", "")
        # "[카탈로그 주문] [수량수정]" → ["카탈로그 주문", "수량수정"]
        buttons = re.findall(r"\[([^\]]+)\]", raw)
        return buttons

    def get_process_guide(self, l3_code: str) -> dict | None:
        """02번 JSON에서 P0~P10 프로세스 조회."""
        entry = self.l3_process.get(l3_code)
        if not entry:
            return None
        return entry.get("프로세스단계", entry)

    def get_sla(self, l3_code: str) -> str:
        """03번 JSON에서 처리 SLA 조회."""
        msg = self.l3_messages.get(l3_code)
        if not msg:
            return ""
        return msg.get("처리_SLA", "")

    def get_violation_info(self, viol_code: str) -> dict | None:
        """06번 JSON에서 위반코드 상세 조회."""
        return self.violations.get(viol_code)

    def get_violations_for_l3(self, l3_code: str) -> list[str]:
        """03번 JSON에서 해당 L3의 금지행위 텍스트 반환."""
        msg = self.l3_messages.get(l3_code)
        if not msg:
            return []
        raw = msg.get("금지행위_자동차단", "")
        return [line.strip() for line in raw.split("\n") if line.strip()]

    def get_bt_definition(self, bt_code: str) -> dict | None:
        """04번 JSON에서 BT 정의 조회."""
        return self.bt_defs.get(bt_code)

    def get_gt_definition(self, gt_code: str) -> dict | None:
        """05번 JSON에서 GT 정의 조회."""
        return self.gt_defs.get(gt_code)

    def build_bt_routing_payload(self, l3_code: str) -> dict | None:
        """프론트엔드에 전달할 bt_routing 메타 객체 생성."""
        entry = self.l3_index.get(l3_code)
        if not entry:
            return None
        return {
            "bt_type": entry.bt_type,
            "gt_code": entry.gt_code,
            "pr_action": self.get_bt_action(l3_code),
            "action_buttons": self.get_action_buttons(l3_code),
            "dept": entry.dept,
            "sla": self.get_sla(l3_code),
            "automation": entry.automation,
            "l3_name": entry.l3_name,
        }


# ── 싱글톤 접근 ─────────────────────────────────────────

def get_routing_store() -> RoutingDataStore:
    """RoutingDataStore 싱글톤 반환. 최초 호출 시 자동 로드."""
    if RoutingDataStore._instance is None:
        store = RoutingDataStore()
        store.load()
        RoutingDataStore._instance = store
    return RoutingDataStore._instance
