"""
Management script: seed the NyayaVault Supabase database.

This script is designed to be run ONCE after applying supabase_bootstrap.sql.
It seeds all users (IO, Forensic, Senior), roles, permissions, sample case,
and the deterministic demo dataset.

Usage (from backend/ directory with virtualenv active):
    python seed.py

The script is idempotent - it checks for existing data before inserting.
"""
import asyncio
import logging

from app.db.session import AsyncSessionLocal
from app.db.init_db import seed_db, seed_demo_dataset

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nyayavault.seed")


async def main():
    logger.info("Connecting to Supabase...")
    async with AsyncSessionLocal() as db:
        logger.info("Running seed_db (users, roles, permissions, sample case)...")
        await seed_db(db)
    logger.info("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(main())
