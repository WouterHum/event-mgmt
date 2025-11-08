from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Attendee
from ..deps import require_roles

router = APIRouter()

# ✅ List all attendees
@router.get("/")
def list_attendees(db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    return db.query(Attendee).all()

# ✅ Add attendee
@router.post("/")
def create_attendee(payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    # Combine first and last name into one string
    full_name = f"{payload.get('first_name', '')} {payload.get('last_name', '')}".strip()

    attendee_data = {
        "name": full_name,
        "email": payload["email"],
        # include other fields if any
    }

    attendee = Attendee(**attendee_data)
    db.add(attendee)
    db.commit()
    db.refresh(attendee)
    return attendee


# ✅ Update attendee
@router.put("/{attendee_id}")
def update_attendee(attendee_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    attendee = db.query(Attendee).filter(Attendee.id == attendee_id).first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")
    for k, v in payload.items():
        if hasattr(attendee, k):
            setattr(attendee, k, v)
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
