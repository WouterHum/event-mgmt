from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Attendee
from ..deps import require_roles
from pydantic import BaseModel

router = APIRouter()

class AttendeeCreate(BaseModel):
    name: str
    email: str

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
