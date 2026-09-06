import json
from typing import List, Optional, Union
from pydantic import field_validator
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

    # Relational Database (PostgreSQL)
    DATABASE_URL: str = "postgresql+asyncpg://nyayavault:nyayavault@localhost:5432/nyayavault"

    # Optional Supabase client metadata. Backend writes use DATABASE_URL, not the anon key.
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""

    # JWT
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Object Storage (MinIO / S3)
    STORAGE_PROVIDER: str = "minio"  # "minio" or "s3"
    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "nyayavault-documents"
    STORAGE_REGION: str = "us-east-1"
    STORAGE_SECURE: bool = False
    STORAGE_LOCAL_DIR: str = "./storage_data"



    # Qdrant Vector Database
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: Optional[str] = ""
    QDRANT_COLLECTION_DOCUMENTS: str = "nyayavault_documents"
    QDRANT_COLLECTION_SECURITY: str = "nyayavault_security"
    QDRANT_VECTOR_SIZE: int = 384

    # Redis Task Queue / Broker
    REDIS_URL: str = "redis://localhost:6379/0"

    # Blockchain & Integrity Layer
    BLOCKCHAIN_NETWORK: str = "hyperledger-fabric"
    BLOCKCHAIN_CHANNEL: str = "nyayachannel"
    BLOCKCHAIN_CHAINCODE: str = "nyayavault_cc"
    BLOCKCHAIN_MODE: str = "mock"  # "mock" or "fabric"
    INTEGRITY_SECRET_KEY: str = "nyayavault-integrity-sha256-salt"

    # AI / OCR / NLP Models
    AI_MODE: str = "mock"  # "mock" or "local" or "cloud"
    AI_CONFIDENCE_THRESHOLD: float = 70.0
    OCR_ENGINE: str = "mock"  # "mock" or "tesseract" or "easyocr"
    AI_MODEL_PATH: str = "./models"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    SPACY_MODEL: str = "en_core_web_sm"

    # External APIs & LLM Inference Services
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENAI_API_KEY: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None


    # CORS
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:5173,"
        "http://127.0.0.1:5173,http://localhost:8080"
    )

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


    # File Upload Rules
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: str = "pdf,doc,docx,jpg,jpeg,png,txt"


settings = Settings()



