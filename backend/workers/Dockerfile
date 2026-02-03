FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY workers/requirements.txt ./workers/
RUN pip install --no-cache-dir -r workers/requirements.txt

# Copy shared code (changes less frequently)
COPY shared/ ./shared/

# Copy worker code (changes most frequently)
COPY workers/ ./workers/

ENV PYTHONPATH=/app

CMD ["celery", "-A", "workers.tasks", "worker", "--loglevel=info"]
