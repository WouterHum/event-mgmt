from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Upload
from app.deps import require_roles
from app.storage import get_storage
from typing import cast
from typing import List

router = APIRouter()

@router.post("/upload")
async def upload_files(
    event_id: int = Form(...),
    speaker_id: int = Form(...),
    has_video: bool = Form(False),
    has_audio: bool = Form(False),
    needs_internet: bool = Form(False),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin", "uploader")),
):
    print(f"=== Upload started ===")
    print(f"User: {user}")
    print(f"Event ID: {event_id}, Speaker ID: {speaker_id}")
    print(f"Files received: {len(files)}")
    
    storage = get_storage()
    print(f"Storage instance: {type(storage).__name__}")
    
    uploaded = []

    try:
        for idx, file in enumerate(files):
            print(f"\n--- Processing file {idx + 1}/{len(files)} ---")
            print(f"Filename: {file.filename}")
            print(f"Content type: {file.content_type}")
            
            if not file.filename:
                print(f"Skipping file {idx + 1}: no filename")
                continue
            
            data = await file.read()
            print(f"File size: {len(data)} bytes")
            
            meta = storage.save(file.filename, data)
            print(f"Saved to storage: {meta}")
            
            up = Upload(
                event_id=event_id,
                speaker_id=speaker_id,
                filename=meta["key"],
                size_bytes=len(data),
                has_video=has_video,
                has_audio=has_audio,
                needs_internet=needs_internet,
                etag=meta["etag"],
            )
            print(f"Created Upload object: {up.filename}")
            db.add(up)
            uploaded.append(up)
        
        print(f"\n=== Committing {len(uploaded)} records to database ===")
        db.commit()
        print("Commit successful")
        
        # Refresh all objects
        for up in uploaded:
            db.refresh(up)
            print(f"Refreshed: ID={up.id}, filename={up.filename}")
        
        print(f"=== Upload completed successfully ===\n")
        return {"uploaded": [u.filename for u in uploaded]}
    
    except Exception as e:
        print(f"\n!!! Upload error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/manifest/{event_id}")
def manifest(event_id: int, db: Session = Depends(get_db)):
    # Used by venue devices to know what to cache/update
    rows = db.query(Upload).filter(Upload.event_id == event_id).all()
    return [{"id": r.id, "key": r.filename, "etag": r.etag, "updated_at": r.updated_at} for r in rows]
