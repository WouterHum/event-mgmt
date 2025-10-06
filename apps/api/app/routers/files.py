from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Upload
from app.deps import require_roles
from app.storage import get_storage
from typing import cast

router = APIRouter()

@router.post("/upload")
async def upload_file(
    event_id: int = Form(...),
    speaker_id: int = Form(...),
    has_video: bool = Form(False),
    has_audio: bool = Form(False),
    needs_internet: bool = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin","uploader")),
):
    data = await file.read()
    storage = get_storage()
    meta = storage.save(cast(str, file.filename), data)
    up = Upload(
        event_id=event_id, speaker_id=speaker_id,
        filename=meta["key"], size_bytes=len(data),
        has_video=has_video, has_audio=has_audio, needs_internet=needs_internet,
        etag=meta["etag"]
    )
    db.add(up)
    db.commit()
    db.refresh(up)
    return {"id": up.id, "etag": up.etag}

@router.get("/manifest/{event_id}")
def manifest(event_id: int, db: Session = Depends(get_db)):
    # Used by venue devices to know what to cache/update
    rows = db.query(Upload).filter(Upload.event_id == event_id).all()
    return [{"id": r.id, "key": r.filename, "etag": r.etag, "updated_at": r.updated_at} for r in rows]
