from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENV: str = "local"  # local | aws
    SECRET_KEY: str = "dev-secret-change"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8
    MYSQL_HOST: str = "Wouter_Laptop"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "appuser"
    MYSQL_PASSWORD: str = "apppass"
    MYSQL_DB: str = "eventdb"
    STORAGE_BACKEND: str = "local"  # local | s3
    STORAGE_LOCAL_DIR: str = "/data/uploads"
    S3_BUCKET: str | None = None
    S3_PREFIX: str = "uploads/"
    AWS_REGION: str = "eu-west-1"

    class Config:
        env_file = ".env"

settings = Settings()
