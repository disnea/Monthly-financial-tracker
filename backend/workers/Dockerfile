FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ ./shared/
COPY workers/ ./workers/

ENV PYTHONPATH=/app

CMD ["celery", "-A", "workers.tasks", "worker", "--loglevel=info"]
