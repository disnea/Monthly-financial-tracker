from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440
    
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minio_admin"
    MINIO_SECRET_KEY: str = "minio_password"
    MINIO_SECURE: bool = False
    
    RABBITMQ_URL: str = "amqp://rabbitmq_user:rabbitmq_password@localhost:5672/"
    
    EXCHANGE_RATE_API_KEY: str = ""
    FINNHUB_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    
    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@financetracker.com"
    
    AUTH_SERVICE_URL: str = "http://localhost:8001"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()
