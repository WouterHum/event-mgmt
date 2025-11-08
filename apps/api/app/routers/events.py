from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Event
from ..deps import require_roles
import csv
from io import StringIO
from fastapi.responses import StreamingResponse

router = APIRouter()

@router.get("/", include_in_schema=True)
@router.get("", include_in_schema=False) 
def list_events(db: Session = Depends(get_db)):
    return db.query(Event).all()

@router.post("")
def create_event(payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    evt = Event(**payload)
    db.add(evt); db.commit(); db.refresh(evt)
    return evt

@router.put("/{event_id}")
def update_event(event_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    evt = db.query(Event).filter(Event.id == event_id).first()
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    for key, value in payload.items():
        if hasattr(evt, key):
            setattr(evt, key, value)

    db.commit()
    db.refresh(evt)
    return evt

@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    evt = db.query(Event).filter(Event.id == event_id).first()
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(evt)
    db.commit()
    return {"message": f"Event {event_id} deleted successfully"}

@router.get("/export")
def export_events(db: Session = Depends(get_db)):
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Description", "Start Time", "End Time", "Location"])
    for e in db.query(Event).all():
        writer.writerow([e.id, e.title, e.description, e.start_time, e.end_time, e.location])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=events.csv"})