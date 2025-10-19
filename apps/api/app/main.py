from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, events, files, devices
from .config import get_settings
import os
import boto3
import pymysql
from contextlib import contextmanager
from typing import Generator

settings = get_settings()

app = FastAPI(
    title="Event Management API",
    version="0.1.0",
    root_path="/prod" if settings.is_production else ""
)

# CORS configuration
if settings.is_production:
    origins = [
        "http://event-mgmt-api-env.eba-2efepaja.af-south-1.elasticbeanstalk.com",
        "https://main.dov6w328993cl.amplifyapp.com"
    ]
else:
    origins = settings.cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Connection Management ---
_db_password = None
_db_connection = None


def get_db_password() -> str:
    """Lazy load DB password from SSM Parameter Store"""
    global _db_password
    if _db_password is None:
        try:
            ssm = boto3.client("ssm", region_name=os.environ.get("AWS_REGION", "af-south-1"))
            response = ssm.get_parameter(
                Name="/event-mgmt-api/db/password",
                WithDecryption=True
            )
            _db_password = response['Parameter']['Value']
        except Exception as e:
            print(f"Error fetching DB password from SSM: {e}")
            raise
    return _db_password


def init_db_connection():
    """Initialize database connection (reused across Lambda invocations)"""
    global _db_connection
    
    if _db_connection is None or not _db_connection.open:
        try:
            _db_connection = pymysql.connect(
                host=os.environ.get("DB_HOST"),
                user=os.environ.get("DB_USER"),
                password=get_db_password(),
                database=os.environ.get("DB_NAME"),
                port=3306,
                connect_timeout=5,
                read_timeout=10,
                write_timeout=10,
                autocommit=False,  # Use transactions
                charset='utf8mb4'
            )
            print("Database connection established")
        except Exception as e:
            print(f"Error connecting to database: {e}")
            raise
    
    return _db_connection


@contextmanager
def get_db_connection() -> Generator[pymysql.connections.Connection, None, None]:
    """
    Context manager for database connections.
    Reuses existing connection and handles ping/reconnection.
    
    Usage:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            results = cursor.fetchall()
    """
    conn = init_db_connection()
    
    # Ping to check if connection is alive, reconnect if needed
    try:
        conn.ping(reconnect=True)
    except Exception as e:
        print(f"Connection ping failed, reconnecting: {e}")
        conn = init_db_connection()
    
    try:
        yield conn
    except Exception as e:
        conn.rollback()
        print(f"Database error, rolling back: {e}")
        raise
    else:
        conn.commit()


@contextmanager
def get_db_cursor(cursor_type=pymysql.cursors.DictCursor):
    """
    Context manager for database cursor.
    Returns dictionary cursor by default for easier data handling.
    
    Usage:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
    """
    with get_db_connection() as conn:
        cursor = conn.cursor(cursor_type)
        try:
            yield cursor
        finally:
            cursor.close()


# --- Include Routers ---
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(devices.router, prefix="/api/devices", tags=["devices"])


# --- Health Check Endpoints ---
@app.get("/")
async def root():
    return {
        "message": "API is running",
        "environment": settings.environment
    }


@app.get("/api/health")
def health():
    """Basic health check"""
    return {"status": "ok"}


@app.get("/api/health/db")
def health_db():
    """Health check with database connectivity test"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return {
            "status": "ok",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(e)
        }


# --- Lambda Handler (if using Mangum) ---
# Uncomment if you're using Mangum for Lambda deployment
# from mangum import Mangum
# handler = Mangum(app)