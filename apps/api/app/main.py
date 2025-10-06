from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, events, files, devices

app = FastAPI(title="Event Management API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(devices.router, prefix="/api/devices", tags=["devices"])

@app.get("/api/health")
def health():
    return {"status": "ok"}
