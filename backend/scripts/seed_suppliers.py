# -*- coding: utf-8 -*-
"""공급업체 시드 — 서브카테고리(sub_category)로 세분화"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.db.supabase_client import get_client

SUPPLIERS = [
    # ── 일반 구매 ──
    {"name": "오피스디포코리아", "category": "일반 구매", "sub_category": "사무용품", "tags": ["사무용품","대량납품","전국배송"], "score": 92, "match_rate": 88},
    {"name": "한국사무기기", "category": "일반 구매", "sub_category": "전자기기", "tags": ["전자기기","A/S우수","공공조달"], "score": 88, "match_rate": 85},
    {"name": "모닝글로리", "category": "일반 구매", "sub_category": "문구류", "tags": ["문구류","친환경","ESG인증"], "score": 85, "match_rate": 82},
    {"name": "아이마켓코리아", "category": "일반 구매", "sub_category": "MRO", "tags": ["MRO","B2B전문","실시간재고"], "score": 90, "match_rate": 91},
    {"name": "그린오피스", "category": "일반 구매", "sub_category": "친환경용품", "tags": ["친환경","재생용지","탄소중립"], "score": 83, "match_rate": 79},

    # ── 일반 용역 ──
    {"name": "메가존클라우드", "category": "일반 용역", "sub_category": "IT개발", "tags": ["IT개발","클라우드","MSP"], "score": 95, "match_rate": 93},
    {"name": "인프런비즈", "category": "일반 용역", "sub_category": "교육", "tags": ["교육서비스","온라인교육","법정교육"], "score": 89, "match_rate": 87},
    {"name": "애드플래닛", "category": "일반 용역", "sub_category": "마케팅", "tags": ["마케팅","디지털광고","SNS운영"], "score": 86, "match_rate": 84},
    {"name": "코드잇솔루션", "category": "일반 용역", "sub_category": "SW개발", "tags": ["SW개발","앱개발","SI"], "score": 91, "match_rate": 89},
    {"name": "리서치플러스", "category": "일반 용역", "sub_category": "조사·분석", "tags": ["시장조사","데이터분석","리서치"], "score": 84, "match_rate": 81},

    # ── 서비스 — 건강검진 ──
    {"name": "서울대병원건강증진센터", "category": "서비스", "sub_category": "건강검진", "tags": ["건강검진","종합검진","대학병원"], "score": 96, "match_rate": 95},
    {"name": "삼성서울병원기업검진", "category": "서비스", "sub_category": "건강검진", "tags": ["건강검진","기업검진","프리미엄"], "score": 95, "match_rate": 94},
    {"name": "한국건강관리협회", "category": "서비스", "sub_category": "건강검진", "tags": ["건강검진","전국네트워크","단체검진"], "score": 93, "match_rate": 92},
    {"name": "세브란스건강검진센터", "category": "서비스", "sub_category": "건강검진", "tags": ["건강검진","종합검진","VIP검진"], "score": 94, "match_rate": 93},

    # ── 서비스 — 급식·식자재 ──
    {"name": "삼성웰스토리", "category": "서비스", "sub_category": "급식대행", "tags": ["급식대행","식자재","위생관리"], "score": 94, "match_rate": 92},
    {"name": "현대그린푸드", "category": "서비스", "sub_category": "급식대행", "tags": ["급식대행","식자재","케이터링"], "score": 91, "match_rate": 89},

    # ── 서비스 — 보안·경비 ──
    {"name": "에스원", "category": "서비스", "sub_category": "보안경비", "tags": ["경비보안","시설관리","CCTV"], "score": 93, "match_rate": 90},
    {"name": "KT텔레캅", "category": "서비스", "sub_category": "보안경비", "tags": ["보안시스템","출입관리","영상보안"], "score": 90, "match_rate": 88},

    # ── 서비스 — 보험 ──
    {"name": "한화생명보험", "category": "서비스", "sub_category": "보험", "tags": ["단체보험","복리후생","임직원보험"], "score": 88, "match_rate": 85},
    {"name": "삼성생명기업보험", "category": "서비스", "sub_category": "보험", "tags": ["단체보험","퇴직연금","기업보험"], "score": 90, "match_rate": 87},

    # ── 서비스 — 물류 ──
    {"name": "CJ대한통운", "category": "서비스", "sub_category": "물류", "tags": ["물류","택배","3PL"], "score": 91, "match_rate": 89},
    {"name": "한진택배", "category": "서비스", "sub_category": "물류", "tags": ["물류","택배","전국배송"], "score": 88, "match_rate": 86},

    # ── 서비스 — 복지 ──
    {"name": "위벨복지", "category": "서비스", "sub_category": "복지", "tags": ["복지몰","선택복지","포인트제"], "score": 85, "match_rate": 83},
    {"name": "베네피아", "category": "서비스", "sub_category": "복지", "tags": ["복지몰","문화생활","기업복지"], "score": 87, "match_rate": 85},

    # ── 서비스 — 건물관리 ──
    {"name": "한솔FM", "category": "서비스", "sub_category": "건물관리", "tags": ["건물관리","설비관리","FM"], "score": 87, "match_rate": 86},
    {"name": "삼성SDS빌딩관리", "category": "서비스", "sub_category": "건물관리", "tags": ["빌딩관리","에너지관리","스마트빌딩"], "score": 89, "match_rate": 87},

    # ── 서비스 — 청소·환경 ──
    {"name": "크린토피아비즈", "category": "서비스", "sub_category": "청소", "tags": ["사무실청소","정기청소","위생관리"], "score": 84, "match_rate": 82},
    {"name": "ISS코리아", "category": "서비스", "sub_category": "청소", "tags": ["시설관리","청소","통합FM"], "score": 86, "match_rate": 84},

    # ── 렌탈·리스 ──
    {"name": "현대캐피탈", "category": "렌탈·리스", "sub_category": "차량리스", "tags": ["차량리스","금융안정","전국네트워크"], "score": 95, "match_rate": 93},
    {"name": "KB캐피탈", "category": "렌탈·리스", "sub_category": "차량리스", "tags": ["차량리스","다양한차종","유연한조건"], "score": 92, "match_rate": 90},
    {"name": "롯데렌탈", "category": "렌탈·리스", "sub_category": "차량렌탈", "tags": ["차량렌탈","전국정비망","대규모관리"], "score": 90, "match_rate": 88},
    {"name": "후지필름코리아", "category": "렌탈·리스", "sub_category": "OA기기", "tags": ["복합기렌탈","OA기기","유지보수"], "score": 86, "match_rate": 84},
    {"name": "코니카미놀타", "category": "렌탈·리스", "sub_category": "OA기기", "tags": ["프린터렌탈","문서관리","IT장비"], "score": 84, "match_rate": 82},

    # ── 공사 ──
    {"name": "한화건설인테리어", "category": "공사", "sub_category": "인테리어", "tags": ["인테리어","사무공간","시공실적"], "score": 93, "match_rate": 91},
    {"name": "삼성물산인테리어", "category": "공사", "sub_category": "인테리어", "tags": ["프리미엄시공","대형프로젝트","안전관리"], "score": 91, "match_rate": 89},
    {"name": "현대리바트", "category": "공사", "sub_category": "가구·시공", "tags": ["사무가구","인테리어","원스톱"], "score": 88, "match_rate": 86},
    {"name": "퍼시스인테리어", "category": "공사", "sub_category": "가구·시공", "tags": ["오피스설계","가구시공","공간컨설팅"], "score": 87, "match_rate": 85},
    {"name": "코오롱글로벌", "category": "공사", "sub_category": "시설공사", "tags": ["시설공사","리모델링","매장공사"], "score": 85, "match_rate": 83},

    # ── 컨설팅 ──
    {"name": "삼일PwC", "category": "컨설팅", "sub_category": "경영전략", "tags": ["전략컨설팅","회계자문","글로벌"], "score": 96, "match_rate": 94},
    {"name": "딜로이트안진", "category": "컨설팅", "sub_category": "경영전략", "tags": ["경영컨설팅","디지털전환","리스크"], "score": 95, "match_rate": 93},
    {"name": "김앤장법률사무소", "category": "컨설팅", "sub_category": "법무", "tags": ["법무자문","계약검토","규제대응"], "score": 94, "match_rate": 92},
    {"name": "노무법인정상", "category": "컨설팅", "sub_category": "노무", "tags": ["노무자문","인사제도","급여설계"], "score": 88, "match_rate": 86},
    {"name": "EY한영", "category": "컨설팅", "sub_category": "세무·ESG", "tags": ["세무자문","ESG컨설팅","내부감사"], "score": 93, "match_rate": 91},

    # ── 구매+유지보수 ──
    {"name": "한샘오피스", "category": "구매+유지보수", "sub_category": "사무가구", "tags": ["사무가구","설치시공","A/S"], "score": 90, "match_rate": 88},
    {"name": "HP코리아", "category": "구매+유지보수", "sub_category": "PC·프린터", "tags": ["PC","프린터","기술지원"], "score": 91, "match_rate": 89},
    {"name": "레노버코리아", "category": "구매+유지보수", "sub_category": "PC·서버", "tags": ["노트북","서버","엔터프라이즈"], "score": 87, "match_rate": 85},
    {"name": "코웨이비즈", "category": "구매+유지보수", "sub_category": "생활가전", "tags": ["정수기","공기청정기","렌탈관리"], "score": 88, "match_rate": 86},

    # ── 렌탈+유지보수 ──
    {"name": "캐논코리아", "category": "렌탈+유지보수", "sub_category": "복합기", "tags": ["복합기","렌탈","정기점검"], "score": 92, "match_rate": 90},
    {"name": "리코코리아", "category": "렌탈+유지보수", "sub_category": "OA기기", "tags": ["OA기기","문서솔루션","유지보수"], "score": 89, "match_rate": 87},
    {"name": "교세라코리아", "category": "렌탈+유지보수", "sub_category": "프린터", "tags": ["프린터","복합기","친환경"], "score": 86, "match_rate": 84},
    {"name": "SK렌터카", "category": "렌탈+유지보수", "sub_category": "차량", "tags": ["차량렌탈","EV충전","관리서비스"], "score": 90, "match_rate": 88},

    # ── 구매·리스 ──
    {"name": "Dell테크놀로지스", "category": "구매·리스", "sub_category": "PC·서버", "tags": ["PC","서버","리스옵션"], "score": 93, "match_rate": 91},
    {"name": "삼성전자B2B", "category": "구매·리스", "sub_category": "IT장비", "tags": ["모니터","노트북","디바이스"], "score": 95, "match_rate": 93},
    {"name": "LG전자B2B", "category": "구매·리스", "sub_category": "IT장비", "tags": ["디스플레이","IT장비","에너지효율"], "score": 92, "match_rate": 90},
    {"name": "시스코코리아", "category": "구매·리스", "sub_category": "네트워크", "tags": ["네트워크","보안장비","리스"], "score": 91, "match_rate": 89},
]


def run():
    supabase = get_client()

    # 기존 데이터 삭제
    supabase.table("suppliers").delete().neq("id", 0).execute()
    print("기존 공급업체 삭제 완료")

    for s in SUPPLIERS:
        supabase.table("suppliers").insert({
            "name": s["name"],
            "category": s["category"],
            "sub_category": s.get("sub_category", ""),
            "tags": s["tags"],
            "score": s["score"],
            "match_rate": s["match_rate"],
            "status": "active",
        }).execute()
        print(f"  {s['name']} ({s['category']} > {s.get('sub_category', '')}) 저장")

    # 확인
    result = supabase.table("suppliers").select("id, name, category, sub_category").order("id").execute()
    print(f"\n총 {len(result.data)}개 저장 완료")


if __name__ == "__main__":
    run()
