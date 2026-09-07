from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config.settings import settings

# Supabase uses pgbouncer in Transaction mode — prepared statements must be disabled.
# The `statement_cache_size=0` must be passed as a connect_arg, not a URL query param.
_db_url = settings.DATABASE_URL.split("?")[0]  # strip any leftover query params

engine = create_async_engine(
    _db_url,
    echo=settings.DEBUG,
    future=True,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)



async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
