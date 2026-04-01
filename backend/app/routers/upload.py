"""Upload Router — 구매담당자용 PDF 업로드 → PR/RFP/RFQ 자동 작성"""
import json
import logging
import re
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from google import genai
from google.genai import types
from app.config import GOOGLE_API_KEY, MODELS
from app.constants.pr_schemas import PR_SCHEMAS, TAXONOMY_TO_PR

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client


@router.post("/upload-pr")
async def upload_pr(file: UploadFile = File(...)):
    """구매요청서 PDF 업로드 → 카테고리 분류 + 필드 추출.

    Returns:
        pr_type, extracted_fields, label
    """
    try:
        content = await file.read()
        # pdfplumber로 텍스트 추출
        import pdfplumber
        import io
        text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages[:10]:  # 최대 10페이지
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

        if not text.strip():
            raise HTTPException(status_code=422, detail="PDF에서 텍스트를 추출할 수 없습니다.")

        # LLM으로 카테고리 분류 + 필드 추출
        prompt = f"""아래 구매요청서 PDF 텍스트를 분석하여 JSON으로 반환하세요. 설명 없이 JSON만.

## 사용 가능한 카테고리
{json.dumps({k: v["label"] for k, v in PR_SCHEMAS.items() if k != "_generic"}, ensure_ascii=False, indent=2)}

## PDF 텍스트
{text[:3000]}

## 출력 형식
{{"pr_type": "카테고리키 (없으면 _generic)", "fields": {{"p1": "값", "p2": "값", ...}}, "title": "구매요청서 제목", "department": "요청부서", "requester": "요청자", }}"""

        response = _get_client().models.generate_content(
            model=MODELS["generation"],
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=1000,
                temperature=0.1,
            ),
        )
        result_text = response.text.strip()
        if result_text.startswith("```"):
            result_text = re.sub(r"```json?\s*", "", result_text)
            result_text = re.sub(r"```\s*$", "", result_text)

        result = json.loads(result_text)

        pr_type = result.get("pr_type", "_generic")
        if pr_type not in PR_SCHEMAS:
            pr_type = "_generic"

        return {
            "pr_type": pr_type,
            "label": PR_SCHEMAS.get(pr_type, PR_SCHEMAS["_generic"])["label"],
            "extracted_fields": result.get("fields", {}),
            "title": result.get("title", ""),
            "department": result.get("department", ""),
            "requester": result.get("requester", ""),
        }

    except json.JSONDecodeError as e:
        logger.error(f"[Upload] JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="PDF 분석 결과를 파싱할 수 없습니다.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Upload] Failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF 처리 실패: {str(e)}")


# ── PR → RFP/RFQ 필드 매핑 정의 ──
_PR_TO_RFP_COMMON = {
    "c1": "s1", "c2": "s2", "c3": "s3", "c4": "s4", "c5": "s5",
    "c6": "s6", "c7": "s7", "c9": "s8", "c10": "s9",
    "c11": "s10", "c12": "s11", "c13": "s12",
}
_PR_TO_RFQ_COMMON = {
    "c6": "q1",   # 서비스명/품목명 → 요청 품목
    "c10": "q2",  # 대상 규모 → 수량/규모
    "c9": "q4",   # 계약 기간 → 납품/서비스 기간
}


async def _extract_pr_from_pdf(file: UploadFile) -> dict:
    """PDF에서 PR 필드 추출 공통 로직."""
    content = await file.read()
    import pdfplumber
    import io
    text = ""
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages[:10]:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF에서 텍스트를 추출할 수 없습니다.")

    prompt = f"""아래 구매요청서 PDF 텍스트를 분석하여 JSON으로 반환하세요. 설명 없이 JSON만.

## 사용 가능한 카테고리
{json.dumps({k: v["label"] for k, v in PR_SCHEMAS.items() if k != "_generic"}, ensure_ascii=False, indent=2)}

## PDF 텍스트
{text[:3000]}

## 출력 형식
{{"pr_type": "카테고리키 (없으면 _generic)", "fields": {{"p1": "값", "p2": "값", ...}}, "title": "구매요청서 제목", "department": "요청부서", "requester": "요청자"}}"""

    response = _get_client().models.generate_content(
        model=MODELS["generation"],
        contents=prompt,
        config=types.GenerateContentConfig(
            max_output_tokens=1000,
            temperature=0.1,
        ),
    )
    result_text = response.text.strip()
    if result_text.startswith("```"):
        result_text = re.sub(r"```json?\s*", "", result_text)
        result_text = re.sub(r"```\s*$", "", result_text)

    result = json.loads(result_text)
    pr_type = result.get("pr_type", "_generic")
    if pr_type not in PR_SCHEMAS:
        pr_type = "_generic"

    return {
        "pr_type": pr_type,
        "label": PR_SCHEMAS.get(pr_type, PR_SCHEMAS["_generic"])["label"],
        "extracted_fields": result.get("fields", {}),
        "title": result.get("title", ""),
        "department": result.get("department", ""),
        "requester": result.get("requester", ""),
    }


@router.post("/upload-pr-convert")
async def upload_pr_and_convert(
    file: UploadFile = File(...),
    target: str = Query(..., pattern="^(rfp|rfq)$"),
):
    """PR PDF 업로드 → RFP 또는 RFQ 필드로 변환.

    Query Params:
        target: "rfp" or "rfq"
    Returns:
        target, target_type, mapped_fields, pr_type, label
    """
    try:
        pr_result = await _extract_pr_from_pdf(file)
        extracted = pr_result["extracted_fields"]
        pr_type = pr_result["pr_type"]

        # PR 공통필드(c*) + 추출 필드(p*) → 대상 포맷 매핑
        mapped = {}
        if target == "rfp":
            for pr_key, rfp_key in _PR_TO_RFP_COMMON.items():
                val = extracted.get(pr_key)
                if val:
                    mapped[rfp_key] = val
            # title → s6 (사업명/품목명)
            if pr_result["title"] and "s6" not in mapped:
                mapped["s6"] = pr_result["title"]
            if pr_result["department"]:
                mapped["s2"] = pr_result["department"]
            if pr_result["requester"]:
                mapped["s3"] = pr_result["requester"]
        else:  # rfq
            for pr_key, rfq_key in _PR_TO_RFQ_COMMON.items():
                val = extracted.get(pr_key)
                if val:
                    mapped[rfq_key] = val
            # title → q1 (요청 품목명)
            if pr_result["title"] and "q1" not in mapped:
                mapped["q1"] = pr_result["title"]

        return {
            "target": target,
            "pr_type": pr_type,
            "label": pr_result["label"],
            "mapped_fields": mapped,
            "extracted_fields": extracted,
            "title": pr_result["title"],
            "department": pr_result["department"],
            "requester": pr_result["requester"],
        }

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"[Upload:Convert] JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="PDF 분석 결과를 파싱할 수 없습니다.")
    except Exception as e:
        logger.error(f"[Upload:Convert] Failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF 처리 실패: {str(e)}")
