import boto3
import os
from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Use ENVIRONMENT consistently
    environment: str = os.getenv("ENVIRONMENT", "local")
    
    SECRET_KEY: str = "dev-secret-change"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # Database settings with defaults for local
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

@lru_cache()
def get_settings():
    s = Settings()

    # If running in production (AWS Lambda), get credentials from SSM and environment
    if s.is_production:
        # Get DB password from SSM
        try:
            ssm = boto3.client("ssm", region_name=os.environ.get("AWS_REGION", "af-south-1"))
            response = ssm.get_parameter(
                Name="/event-mgmt-api/db/password",
                WithDecryption=True
            )
            s.MYSQL_PASSWORD = response['Parameter']['Value']
        except Exception as e:
            print(f"Warning: Could not fetch password from SSM: {e}")
        
        # Override with environment variables (these come from your SAM template)
        s.MYSQL_HOST = os.getenv("DB_HOST", s.MYSQL_HOST)
        s.MYSQL_DB = os.getenv("DB_NAME", s.MYSQL_DB)
        s.MYSQL_USER = os.getenv("DB_USER", s.MYSQL_USER)
        s.MYSQL_PORT = int(os.getenv("DB_PORT", str(s.MYSQL_PORT)))
        
        # Production settings
        s.STORAGE_BACKEND = "s3"
        s.S3_BUCKET = os.getenv("S3_BUCKET")

    return s