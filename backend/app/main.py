import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 시작 시 환경변수 확인 로그
logger.info("=== IP Assist Backend Starting ===")
logger.info(f"GOOGLE_API_KEY: {'set' if os.getenv('GOOGLE_API_KEY') else 'MISSING'}")
logger.info(f"SUPABASE_URL: {'set' if os.getenv('SUPABASE_URL') else 'MISSING'}")
logger.info(f"SUPABASE_SERVICE_KEY: {'set' if os.getenv('SUPABASE_SERVICE_KEY') else 'MISSING'}")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.routers import chat, rfp, knowledge, suppliers, admin, rfp_view

app = FastAPI(
    title="IP Assist API",
    description="간접구매 AI 코파일럿 백엔드",
    version="2.0.0",
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    logger.error(f"422 Validation Error: {exc.errors()}")
    logger.error(f"Request body (first 500 chars): {body[:500]}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(rfp.router)
app.include_router(knowledge.router)
app.include_router(suppliers.router)
app.include_router(admin.router)
app.include_router(rfp_view.router)


@app.on_event("startup")
async def startup_warmup():
    """콜드 스타트 완화: Gemini 클라이언트 + Supabase 연결 프리웜."""
    import threading

    def _warmup():
        try:
            from app.db.supabase_client import get_client
            get_client().table("constitution_rules").select("id").limit(1).execute()
            logger.info("[Warmup] Supabase connection OK")
        except Exception as e:
            logger.warning(f"[Warmup] Supabase: {e}")
        try:
            from google import genai
            from app.config import GOOGLE_API_KEY
            genai.Client(api_key=GOOGLE_API_KEY)
            logger.info("[Warmup] Gemini client initialized")
        except Exception as e:
            logger.warning(f"[Warmup] Gemini: {e}")

    threading.Thread(target=_warmup, daemon=True).start()


@app.get("/")
async def root():
    return {"service": "IP Assist API", "version": "2.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
