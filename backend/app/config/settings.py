import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_ENV: str = "development"
    APP_NAME: str = "NyayaVault"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "nyayavault-dev-secret-change-in-production-minimum-32-chars-long"

    # Database: Supports SQLite (aiosqlite) or PostgreSQL (asyncpg)
    DATABASE_URL: str = "sqlite+aiosqlite:///./nyayavault.db"

    # Optional Supabase client metadata. Backend writes use DATABASE_URL, not the anon key.
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""

    # JWT
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Storage (MinIO/S3 or local fallback)
    STORAGE_PROVIDER: str = "local"  # "local" or "minio" or "s3"
    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "nyayavault-documents"
    STORAGE_LOCAL_DIR: str = "./storage_data"

    # Blockchain
    BLOCKCHAIN_NETWORK: str = "hyperledger-fabric"
    BLOCKCHAIN_CHANNEL: str = "nyayachannel"
    BLOCKCHAIN_CHAINCODE: str = "nyayavault_cc"
    BLOCKCHAIN_MODE: str = "mock"  # "mock" or "fabric"

    # AI / OCR
    AI_MODE: str = "mock"  # "mock" or "onnx" or "torch"
    AI_CONFIDENCE_THRESHOLD: float = 0.85

    # CORS
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:5173,"
        "http://127.0.0.1:5173,http://localhost:8080"
    )


settings = Settings()
