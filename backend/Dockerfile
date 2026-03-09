FROM python:3.11-slim

WORKDIR /app

# pdfplumber 등에 필요한 시스템 라이브러리
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE 8080

# 시작 시 import 오류를 확인할 수 있도록 로그 레벨 설정
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info"]
