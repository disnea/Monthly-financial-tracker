"""
Shared test fixtures for the Monthly Financial Tracker test suite.

Provides:
- Async SQLite in-memory database (isolated per test)
- Test user / JWT helpers
- FastAPI AsyncClient fixtures for auth, finance, and EMI services
"""

import os
import sys

# ── Environment variables (MUST be set before any project import) ────────
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("MINIO_ENDPOINT", "localhost:9000")
os.environ.setdefault("MINIO_ACCESS_KEY", "minioadmin")
os.environ.setdefault("MINIO_SECRET_KEY", "minioadmin")
os.environ.setdefault("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

# ── Python path setup ────────────────────────────────────────────────────
_backend = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _backend not in sys.path:
    sys.path.insert(0, _backend)

# ── SQLite DDL compilers for PostgreSQL-specific column types ────────────
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB, ARRAY as PG_ARRAY


@compiles(PG_UUID, "sqlite")
def _compile_uuid_sqlite(type_, compiler, **kw):
    return "VARCHAR(36)"


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


@compiles(PG_ARRAY, "sqlite")
def _compile_array_sqlite(type_, compiler, **kw):
    return "JSON"


# ── Standard imports ─────────────────────────────────────────────────────
import uuid as _uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from unittest.mock import patch, MagicMock, AsyncMock

import pytest
import pytest_asyncio
from jose import jwt
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)

# Import Base (declarative base) and the DB dependency we'll override
from shared.database import Base, get_db
from shared.config import get_settings

# Importing models ensures their tables are registered in Base.metadata
import shared.models  # noqa: F401

settings = get_settings()

# ── Constants ────────────────────────────────────────────────────────────
TEST_USER_ID = str(_uuid.uuid4())
TEST_TENANT_ID = str(_uuid.uuid4())
TEST_USER = {
    "user_id": TEST_USER_ID,
    "tenant_id": TEST_TENANT_ID,
    "email": "test@test.com",
    "role": "admin",
}


# ── Helpers ──────────────────────────────────────────────────────────────
def create_test_token(user_data: Optional[dict] = None) -> str:
    """Generate a valid JWT for testing."""
    payload = (user_data or TEST_USER).copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=1)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ── Core database fixtures ───────────────────────────────────────────────
@pytest_asyncio.fixture
async def async_engine():
    """Create a fresh SQLite in-memory engine with all project tables."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def session_factory(async_engine):
    """Async session factory bound to the test engine."""
    return async_sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )


@pytest_asyncio.fixture
async def db_session(session_factory):
    """Single async session for direct DB operations in test code."""
    async with session_factory() as session:
        yield session


# ── Auth helpers ─────────────────────────────────────────────────────────
@pytest.fixture
def mock_user():
    """Standard test user dict (matches the shape set by auth middleware)."""
    return TEST_USER.copy()


@pytest.fixture
def auth_headers():
    """Authorization header dict containing a valid test JWT."""
    return {"Authorization": f"Bearer {create_test_token()}"}


# ── Service TestClient fixtures ──────────────────────────────────────────

@pytest_asyncio.fixture
async def auth_client(session_factory):
    """
    Async HTTP client wired to the **auth** service.

    - Overrides ``get_db`` with the test SQLite session.
    - The auth service does NOT use the shared auth_middleware as HTTP
      middleware; it decodes JWT directly in its endpoints, so no extra
      mocking is needed.
    """
    from services.auth.main import app as auth_app

    async def _override_get_db():
        async with session_factory() as session:
            yield session

    auth_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=auth_app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    auth_app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def finance_client(session_factory):
    """
    Async HTTP client wired to the **finance** service.

    - Overrides ``get_db`` with the test SQLite session.
    - Mocks ``set_tenant_context`` (PostgreSQL-specific RLS call).
    - The ``auth_middleware`` HTTP middleware validates JWT using
      ``settings.SECRET_KEY``; we send a valid token generated
      with the same key (see ``auth_headers`` fixture).
    """
    from services.finance.main import app as finance_app

    async def _override_get_db():
        async with session_factory() as session:
            yield session

    finance_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=finance_app)

    with patch("services.finance.main.set_tenant_context", new_callable=AsyncMock):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    finance_app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def emi_client(session_factory):
    """
    Async HTTP client wired to the **EMI** service.

    - Overrides ``get_db`` with the test SQLite session.
    - Mocks ``set_tenant_context`` (PostgreSQL-specific RLS call).
    """
    from services.emi.main import app as emi_app

    async def _override_get_db():
        async with session_factory() as session:
            yield session

    emi_app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=emi_app)

    with patch("services.emi.main.set_tenant_context", new_callable=AsyncMock):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    emi_app.dependency_overrides.clear()
