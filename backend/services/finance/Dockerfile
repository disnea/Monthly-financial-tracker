FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared code (changes less frequently)
COPY shared/ ./shared/

# Copy service code (changes most frequently)
COPY services/finance/ ./services/finance/

ENV PYTHONPATH=/app

# Use --reload only in development
CMD ["uvicorn", "services.finance.main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]
