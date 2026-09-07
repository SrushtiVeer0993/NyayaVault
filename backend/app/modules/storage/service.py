import hashlib
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional, Tuple

import aioboto3
from botocore.exceptions import ClientError

from app.config.settings import settings


class StorageService:
    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER.lower()
        if self.provider not in {"minio", "s3"}:
            raise ValueError("STORAGE_PROVIDER must be 'minio' or 's3'.")

    @asynccontextmanager
    async def _client(self) -> AsyncIterator[object]:
        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            region_name=settings.STORAGE_REGION,
            use_ssl=settings.STORAGE_SECURE,
        ) as client:
            yield client

    async def _ensure_bucket(self, client: object) -> None:
        try:
            await client.head_bucket(Bucket=settings.STORAGE_BUCKET)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code")
            if error_code not in {"404", "NoSuchBucket", "NotFound"}:
                raise
            await client.create_bucket(Bucket=settings.STORAGE_BUCKET)

    async def check_health(self) -> bool:
        async with self._client() as client:
            try:
                await client.head_bucket(Bucket=settings.STORAGE_BUCKET)
                return True
            except Exception:
                return False

    @staticmethod
    def _backup_key(key: str) -> str:
        return f"{key}.canonical_backup"

    async def save_file(self, content: bytes, key: str) -> Tuple[str, int, str]:
        """Saves file bytes and returns (storage_key, file_size, sha256_hash)"""
        sha256_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        async with self._client() as client:
            await self._ensure_bucket(client)
            await client.put_object(
                Bucket=settings.STORAGE_BUCKET,
                Key=key,
                Body=content,
            )
            await client.put_object(
                Bucket=settings.STORAGE_BUCKET,
                Key=self._backup_key(key),
                Body=content,
            )

        return key, file_size, sha256_hash

    async def read_file(self, key: str) -> Optional[bytes]:
        """Reads file bytes from storage"""
        async with self._client() as client:
            try:
                response = await client.get_object(Bucket=settings.STORAGE_BUCKET, Key=key)
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
                    return None
                raise
            async with response["Body"] as body:
                return await body.read()

    async def simulate_tamper(self, key: str, tamper_note: str = "Simulated bit flip/payload alteration") -> str:
        """Modifies bytes at storage level to demonstrate cryptographic mismatch per PRD Section 21"""
        original = await self.read_file(key)
        if original is None:
            raise FileNotFoundError(f"Object at {key} not found.")

        tampered_content = original + b"\n[TAMPERED_IN_TRANSIT: ALTERED_BYTES]"
        async with self._client() as client:
            await client.put_object(
                Bucket=settings.STORAGE_BUCKET,
                Key=key,
                Body=tampered_content,
            )

        return hashlib.sha256(tampered_content).hexdigest()

    async def restore_tamper(self, key: str) -> str:
        """Restores the canonical bytes from secure backup"""
        canonical = await self.read_file(self._backup_key(key))
        if canonical is None:
            raise FileNotFoundError(f"Canonical backup for {key} not found.")

        async with self._client() as client:
            await client.put_object(
                Bucket=settings.STORAGE_BUCKET,
                Key=key,
                Body=canonical,
            )

        return hashlib.sha256(canonical).hexdigest()


storage_service = StorageService()
