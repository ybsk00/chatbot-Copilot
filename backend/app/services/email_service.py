"""RFP 이메일 발송 서비스 (aiosmtplib + Gmail SMTP)"""

import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.config import SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_APP_PASSWORD

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv(
    "BACKEND_URL",
    "https://ip-assist-backend-1058034030780.asia-northeast3.run.app",
)

RFP_TYPE_LABELS = {
    "purchase": "일반 구매",
    "service_contract": "일반 용역",
    "service": "서비스",
    "rental": "렌탈·리스",
    "construction": "공사",
    "consulting": "컨설팅",
    "purchase_maintenance": "구매+유지보수",
    "rental_maintenance": "렌탈+유지보수",
    "purchase_lease": "구매·리스",
}


def _build_html(rfp_data: dict, rfp_id: int) -> str:
    """RFP 이메일 HTML 본문 생성"""
    rfp_type = rfp_data.get("rfp_type", "")
    type_label = RFP_TYPE_LABELS.get(rfp_type, rfp_type)
    title = rfp_data.get("title", rfp_data.get("fields", {}).get("s6", "제안요청서"))
    org_name = rfp_data.get("org_name", rfp_data.get("fields", {}).get("s1", "-"))
    department = rfp_data.get("department", rfp_data.get("fields", {}).get("s2", "-"))
    requester = rfp_data.get("requester", rfp_data.get("fields", {}).get("s3", "-"))
    created_at = str(rfp_data.get("created_at", ""))[:10]
    view_url = f"{BACKEND_URL}/rfp/view/{rfp_id}"

    return f"""\
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

  <!-- 헤더 -->
  <tr>
    <td style="background:linear-gradient(135deg,#1a56db,#2563eb);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">제안요청서 발송 안내</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">IP Assist &mdash; 간접구매 AI 코파일럿</p>
    </td>
  </tr>

  <!-- 본문 -->
  <tr>
    <td style="padding:36px 40px 24px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
        안녕하세요,<br>
        아래와 같이 <strong>제안요청서(RFP)</strong>가 작성·발송되었습니다.<br>
        상세 내용은 하단 버튼을 통해 확인하실 수 있습니다.
      </p>

      <!-- 요약 테이블 -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;color:#6b7280;font-size:13px;width:120px;border-bottom:1px solid #e5e7eb;">유형</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #e5e7eb;">{type_label}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">기관명</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb;">{org_name}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">부서</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb;">{department}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">담당자</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px;border-bottom:1px solid #e5e7eb;">{requester}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">제목 / 사업명</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #e5e7eb;">{title}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#6b7280;font-size:13px;">작성일</td>
          <td style="padding:12px 16px;color:#111827;font-size:14px;">{created_at}</td>
        </tr>
      </table>

      <!-- CTA 버튼 -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:4px 0 20px;">
            <a href="{view_url}" target="_blank"
               style="display:inline-block;padding:14px 36px;background:#2563eb;color:#ffffff;
                      font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;
                      letter-spacing:0.5px;">
              RFP 상세 보기 및 다운로드
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
        본 메일은 IP Assist 시스템에서 자동 발송되었습니다.<br>
        문의사항이 있으시면 담당자에게 연락해 주세요.
      </p>
    </td>
  </tr>

  <!-- 푸터 -->
  <tr>
    <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        &copy; 업무마켓9 &middot; IP Assist &mdash; 간접구매 AI 코파일럿
      </p>
    </td>
  </tr>

</table>
</td></tr></table>
</body>
</html>"""


async def send_rfp_email(to_email: str, rfp_data: dict, rfp_id: int) -> dict:
    """RFP 이메일을 비동기로 발송한다.

    Args:
        to_email: 수신자 이메일 주소
        rfp_data: RFP 데이터 (rfp_type, title, org_name, department, requester, fields, created_at)
        rfp_id: rfp_requests 테이블 ID

    Returns:
        {"ok": True/False, "message": str}
    """
    rfp_type = rfp_data.get("rfp_type", "")
    type_label = RFP_TYPE_LABELS.get(rfp_type, rfp_type)
    title = rfp_data.get("title", rfp_data.get("fields", {}).get("s6", "제안요청서"))
    subject = f"[제안요청서] {type_label} - {title}"

    msg = MIMEMultipart("alternative")
    msg["From"] = f"IP Assist <{SMTP_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    html_body = _build_html(rfp_data, rfp_id)
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=SMTP_EMAIL,
            password=SMTP_APP_PASSWORD,
        )
        logger.info(f"RFP email sent to {to_email} (rfp_id={rfp_id})")
        return {"ok": True, "message": f"이메일이 {to_email}(으)로 발송되었습니다."}
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return {"ok": False, "message": f"이메일 발송 실패: {str(e)}"}
