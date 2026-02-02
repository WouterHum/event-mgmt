import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    environment: str = os.getenv("ENVIRONMENT", "local")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 120))

    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "mysql")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "eventuser")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "eventpass")
    MYSQL_DB: str = os.getenv("MYSQL_DB", "event_mgmt")

    DATABASE_URL: str | None = None

    cors_origins: list = ["http://localhost:3000", "http://localhost:8000"]

    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_DIR: str = "/data/uploads"
    S3_BUCKET: str | None = None
    S3_PREFIX: str = "uploads/"

    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    class Config:
        env_file = ".env.local" if os.getenv("ENVIRONMENT", "local") == "local" else ".env.docker"
        case_sensitive = False
        extra = "ignore" 

@lru_cache()
def get_settings() -> Settings:
    return Settings()
