import boto3
import os
from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    environment: str = os.getenv("ENVIRONMENT", "local")
    ENV: str = "local"
    SECRET_KEY: str = "dev-secret-change"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "Wouter_Laptop")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "appuser")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "apppass")
    MYSQL_DB: str = os.getenv("MYSQL_DB", "eventdb")

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
        return self.environment == "production"

    class Config:
        env_file = ".env"
        case_sensitive = False

# Cache settings
@lru_cache()
def get_settings():
    s = Settings()

    # If running in AWS Lambda, override MYSQL_PASSWORD from SSM
    if s.ENV == "aws":
        ssm = boto3.client("ssm", region_name=os.environ.get("AWS_REGION"))
        response = ssm.get_parameter(
            Name="/event-mgmt-api/db/password",
            WithDecryption=True
        )
        s.MYSQL_PASSWORD = response['Parameter']['Value']

    return s
