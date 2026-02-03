FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY services/emi/requirements.txt ./services/emi/
RUN pip install --no-cache-dir -r services/emi/requirements.txt

# Copy shared code (changes less frequently)
COPY shared/ ./shared/

# Copy service code (changes most frequently)
COPY services/emi/ ./services/emi/

ENV PYTHONPATH=/app

# Use --reload for hot-reloading in development
CMD ["uvicorn", "services.emi.main:app", "--host", "0.0.0.0", "--port", "8003", "--reload"]
