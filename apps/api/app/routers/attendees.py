from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Attendee
from ..models import Upload  # <-- you need this
from typing import List, Optional
from sqlalchemy import or_
from ..deps import require_roles
from pydantic import BaseModel

router = APIRouter()

class AttendeeCreate(BaseModel):
    name: str
    email: str
    
    
# 🔍 Search attendees by name
@router.get("/search")
def search_attendees(q: str, db: Session = Depends(get_db)):
    if not q:
        return []

    rows = (
        db.query(Attendee)
        .filter(Attendee.name.ilike(f"%{q}%"))
        .order_by(Attendee.name.asc())
        .all()
    )

    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email
        }
        for r in rows
    ]

# 📌 Get attendee with session + upload status
@router.get("/{attendee_id}")
def get_attendee(attendee_id: int, db: Session = Depends(get_db)):
    attendee = db.query(Attendee).filter(Attendee.id == attendee_id).first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")

    # fetch uploads for this attendee
    uploads = (
        db.query(Upload)
        .filter(Upload.attendee_id == attendee_id)
        .order_by(Upload.updated_at.desc())
        .all()
    )

    uploads_list = [
        {
            "id": u.id,
            "filename": u.filename,
            "has_video": bool(u.has_video),
            "has_audio": bool(u.has_audio),
            "needs_internet": bool(u.needs_internet),
            "updated_at": u.updated_at,
            "event_id": u.event_id,
            "speaker_id": u.speaker_id
        }
        for u in uploads
    ]

    return {
        "delegate": {
            "id": attendee.id,
            "name": attendee.name,
            "email": attendee.email,
        },
        "session": {
            "title": attendee.session_title,
            "venue": attendee.venue,
            "time": attendee.presentation_time,
        },
        "uploads": uploads_list,
    }


# ✅ List all attendees
@router.get("/")
def list_attendees(db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    return db.query(Attendee).all()

# ✅ Add attendee
@router.post("/")
def create_attendee(payload: AttendeeCreate, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    # Combine first and last name into one string
    attendee = Attendee(**payload.dict())
    db.add(attendee)
    db.commit()
    db.refresh(attendee)
    return {
        "id": attendee.id,
        "name": attendee.name,
        "email": attendee.email,
        "user_id": attendee.user_id,
    }


# ✅ Update attendee
@router.put("/{attendee_id}")
def update_attendee(attendee_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    attendee = db.query(Attendee).filter(Attendee.id == attendee_id).first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")
    attendee.name = payload.get("name", attendee.name)
    attendee.email = payload.get("email", attendee.email)

    db.commit()
    db.refresh(attendee)
    return attendee

# ✅ Delete attendee
@router.delete("/{attendee_id}")
def delete_attendee(attendee_id: int, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    attendee = db.query(Attendee).filter(Attendee.id == attendee_id).first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")
    db.delete(attendee)
    db.commit()
    return {"status": "deleted"}
