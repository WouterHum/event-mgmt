from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Event
from ..deps import require_roles

router = APIRouter()

@router.get("/")
def list_events(db: Session = Depends(get_db)):
    return db.query(Event).all()

@router.post("/")
def create_event(payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    evt = Event(**payload)
    db.add(evt); db.commit(); db.refresh(evt)
    return evt
