FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY services/investment/requirements.txt ./services/investment/
RUN pip install --no-cache-dir -r services/investment/requirements.txt

# Copy shared code (changes less frequently)
COPY shared/ ./shared/

# Copy service code (changes most frequently)
COPY services/investment/ ./services/investment/

ENV PYTHONPATH=/app

# Use --reload for hot-reloading in development
CMD ["uvicorn", "services.investment.main:app", "--host", "0.0.0.0", "--port", "8004", "--reload"]
