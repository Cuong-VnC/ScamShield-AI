# Backend ScamShield-AI (FastAPI + model v8) – D-04
# Build:  docker build -t scamshield-api .
# Run:    docker run --rm -p 8000:8000 --env-file .env scamshield-api
FROM python:3.11.9-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    KERAS_BACKEND=tensorflow \
    TF_CPP_MIN_LOG_LEVEL=2 \
    PORT=8000

WORKDIR /app

# Cài thư viện trước để tận dụng cache layer khi chỉ sửa code.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY backend ./backend

# Không chạy bằng root.
RUN useradd --create-home --uid 10001 app && chown -R app:app /app
USER app

EXPOSE 8000

# Model nạp mất ~20–40s nên cho start-period dài.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD python -c "import os,json,urllib.request as u; r=json.load(u.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/health', timeout=4)); exit(0 if r.get('models_loaded') else 1)"

CMD ["sh", "-c", "exec uvicorn backend.src.main:app --host 0.0.0.0 --port ${PORT}"]
