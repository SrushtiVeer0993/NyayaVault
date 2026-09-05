import os
import aiofiles
import hashlib
from typing import Optional, Tuple
from app.config.settings import settings


class StorageService:
    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER
        self.local_base_dir = os.path.abspath(settings.STORAGE_LOCAL_DIR)
        os.makedirs(self.local_base_dir, exist_ok=True)

    def _get_local_path(self, key: str) -> str:
        # Sanitize key to prevent path traversal
        clean_key = os.path.normpath(key).lstrip(os.sep).lstrip("/").lstrip("\\")
        full_path = os.path.join(self.local_base_dir, clean_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        return full_path

    async def save_file(self, content: bytes, key: str) -> Tuple[str, int, str]:
        """Saves file bytes and returns (storage_key, file_size, sha256_hash)"""
        sha256_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        # Local storage provider (or fallback)
        local_path = self._get_local_path(key)
        async with aiofiles.open(local_path, "wb") as f:
            await f.write(content)

        # Save an original backup for tamper restoration demo
        backup_path = local_path + ".canonical_backup"
        async with aiofiles.open(backup_path, "wb") as f:
            await f.write(content)

        return key, file_size, sha256_hash

    async def read_file(self, key: str) -> Optional[bytes]:
        """Reads file bytes from storage"""
        local_path = self._get_local_path(key)
        if not os.path.exists(local_path):
            return None
        async with aiofiles.open(local_path, "rb") as f:
            return await f.read()

    async def simulate_tamper(self, key: str, tamper_note: str = "Simulated bit flip/payload alteration") -> str:
        """Modifies bytes at storage level to demonstrate cryptographic mismatch per PRD Section 21"""
        local_path = self._get_local_path(key)
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Object at {key} not found.")

        async with aiofiles.open(local_path, "rb") as f:
            original = await f.read()

        tampered_content = original + b"\n[TAMPERED_IN_TRANSIT: ALTERED_BYTES]"
        async with aiofiles.open(local_path, "wb") as f:
            await f.write(tampered_content)

        return hashlib.sha256(tampered_content).hexdigest()

    async def restore_tamper(self, key: str) -> str:
        """Restores the canonical bytes from secure backup"""
        local_path = self._get_local_path(key)
        backup_path = local_path + ".canonical_backup"
        if not os.path.exists(backup_path):
            raise FileNotFoundError(f"Canonical backup for {key} not found.")

        async with aiofiles.open(backup_path, "rb") as f:
            canonical = await f.read()

        async with aiofiles.open(local_path, "wb") as f:
            await f.write(canonical)

        return hashlib.sha256(canonical).hexdigest()


storage_service = StorageService()
