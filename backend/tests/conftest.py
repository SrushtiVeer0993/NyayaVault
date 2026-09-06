import os
import pytest
from httpx import AsyncClient, ASGITransport
from app.config.settings import settings
from app.db import session as db_session
from app.main import app
from app.db.init_db import init_db_schema, seed_db


@pytest.fixture(autouse=True)
async def initialize_test_database():
    try:
        await init_db_schema()
        async with db_session.AsyncSessionLocal() as session:
            await seed_db(session)
    except Exception as e:
        pytest.skip(f"Skipping DB fixture: PostgreSQL database not accessible ({e})")


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
