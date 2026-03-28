import re
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from shared.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def set_tenant_context(session: AsyncSession, tenant_id: str):
    # Validate tenant_id is a valid UUID to prevent SQL injection
    uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
    if not uuid_pattern.match(str(tenant_id)):
        raise ValueError(f"Invalid tenant_id format: {tenant_id}")
    await session.execute(
        text(f"SET LOCAL app.current_tenant_id = '{tenant_id}';")
    )

async def reset_tenant_context(session: AsyncSession):
    await session.execute(text("RESET app.current_tenant_id;"))
