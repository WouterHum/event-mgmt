from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from ..db import get_db
from ..models import Device

router = APIRouter()

@router.post("/heartbeat")
def heartbeat(name: str, room_id: int | None = None, db: Session = Depends(get_db)):
    d = db.query(Device).filter(Device.name == name).first()
    if not d:
        d = Device(name=name, room_id=room_id, active=True, last_seen=datetime.utcnow())
        db.add(d)
    else:
        d.active = True
        d.last_seen = datetime.utcnow()
    db.commit()
    return {"ok": True}
