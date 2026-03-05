from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, rfp, knowledge, suppliers, admin

app = FastAPI(
    title="IP Assist API",
    description="간접구매 AI 코파일럿 백엔드",
    version="2.0.0",
)

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
