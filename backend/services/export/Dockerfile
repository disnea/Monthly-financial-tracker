FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY services/export/requirements.txt ./services/export/
RUN pip install --no-cache-dir -r services/export/requirements.txt

# Copy shared code (changes less frequently)
COPY shared/ ./shared/

# Copy service code (changes most frequently)
COPY services/export/ ./services/export/

ENV PYTHONPATH=/app

# Use --reload for hot-reloading in development
CMD ["uvicorn", "services.export.main:app", "--host", "0.0.0.0", "--port", "8006", "--reload"]
