FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY services/market/requirements.txt ./services/market/
RUN pip install --no-cache-dir -r services/market/requirements.txt

# Copy shared code (changes less frequently)
COPY shared/ ./shared/

# Copy service code (changes most frequently)
COPY services/market/ ./services/market/

ENV PYTHONPATH=/app

# Use --reload for hot-reloading in development
CMD ["uvicorn", "services.market.main:app", "--host", "0.0.0.0", "--port", "8005", "--reload"]
