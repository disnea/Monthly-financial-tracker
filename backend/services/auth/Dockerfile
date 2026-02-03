FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ ./shared/
COPY services/auth/ ./services/auth/

ENV PYTHONPATH=/app

CMD ["uvicorn", "services.auth.main:app", "--host", "0.0.0.0", "--port", "8001"]
