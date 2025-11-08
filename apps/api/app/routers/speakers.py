from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Speaker
from ..deps import require_roles
import csv
from fastapi import UploadFile

router = APIRouter()

# 🟢 List all speakers
@router.get("/", include_in_schema=True)
def list_speakers(db: Session = Depends(get_db)):
    return db.query(Speaker).all()

# 🟢 Create a new speaker
@router.post("/")
def create_speaker(payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    speaker = Speaker(**payload)
    db.add(speaker)
    db.commit()
    db.refresh(speaker)
    return speaker

# 🟡 Update a speaker
@router.put("/{speaker_id}")
def update_speaker(speaker_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    for key, value in payload.items():
        if hasattr(speaker, key):
            setattr(speaker, key, value)

    db.commit()
    db.refresh(speaker)
    return speaker

# 🔴 Delete a speaker
@router.delete("/{speaker_id}")
def delete_speaker(speaker_id: int, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")

    db.delete(speaker)
    db.commit()
    return {"message": f"Speaker {speaker_id} deleted successfully"}

@router.post("/bulk")
async def bulk_upload_speakers(file: UploadFile = File(...), db: Session = Depends(get_db)):
    data = (await file.read()).decode("utf-8").splitlines()
    reader = csv.DictReader(data)
    for row in reader:
        db.add(Speaker(**row))
    db.commit()
    return {"message": f"Uploaded {len(data)-1} speakers"}