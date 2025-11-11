from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, events, files, devices, speakers, rooms, attendees
from .config import get_settings
import os
import boto3
import pymysql
from contextlib import contextmanager
from typing import Generator
from functools import lru_cache

settings = get_settings()

app = FastAPI(
    title="Event Management API",
    version="0.1.0",
    redirect_slashes=True
)



ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    allowed_origins = [
        "https://main.dov6w328993cl.amplifyapp.com",
        # Add other production domains if needed
    ]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# --- Database Connection Management ---
_db_password = None
_db_connection = None


@lru_cache()
def get_db_password():
    """Get database password from SSM Parameter Store (cached)"""
    from .config import get_settings
    settings = get_settings()
    
    # In production, get from SSM
    if settings.is_production:
        try:
            ssm = boto3.client("ssm", region_name=os.environ.get("AWS_REGION", "af-south-1"))
            response = ssm.get_parameter(
                Name="/event-mgmt-api/db/password",
                WithDecryption=True
            )
            return response['Parameter']['Value']
        except Exception as e:
            print(f"Error fetching password from SSM: {e}")
            # Fallback to environment variable
            return os.environ.get("DB_PASSWORD", "")
    else:
        # Local development
        return settings.MYSQL_PASSWORD


def init_db_connection():
    """Initialize database connection (reused across Lambda invocations)"""
    global _db_connection
    
    if _db_connection is None or not _db_connection.open:
        try:
            # Get password
            password = get_db_password()
            
            _db_connection = pymysql.connect(
                host=os.environ.get("DB_HOST", os.environ.get("MYSQL_HOST", "localhost")),
                user=os.environ.get("DB_USER", os.environ.get("MYSQL_USER", "appuser")),
                password=password,
                database=os.environ.get("DB_NAME", os.environ.get("MYSQL_DB", "eventdb")),
                port=int(os.environ.get("DB_PORT", "3306")),
                connect_timeout=5,
                read_timeout=10,
                write_timeout=10,
                autocommit=False,
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
    """Context manager for database cursor."""
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
app.include_router(speakers.router, prefix="/api/speakers", tags=["speakers"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])
app.include_router(attendees.router, prefix="/api/attendees", tags=["attendees"])

# --- DEBUG: print all routes and methods ---
for route in app.routes:
    if isinstance(route, APIRoute): 
        print(route.path, route.methods)

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


# --- Lambda Handler ---
from mangum import Mangum
handler = Mangum(app)