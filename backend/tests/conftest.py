import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.init_db import init_db_schema, seed_db
from app.db.session import AsyncSessionLocal


@pytest.fixture(autouse=True)
async def initialize_test_database():
    await init_db_schema()
    async with AsyncSessionLocal() as session:
        await seed_db(session)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
