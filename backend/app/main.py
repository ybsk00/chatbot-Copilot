import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.routers import chat, rfp, knowledge, suppliers, admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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


@app.get("/")
async def root():
    return {"service": "IP Assist API", "version": "2.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
