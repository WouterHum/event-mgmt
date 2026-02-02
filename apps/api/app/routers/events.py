from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from io import StringIO
import csv
import shutil
from pathlib import Path
from sqlalchemy import func

from ..db import get_db
from ..models import Event, Speaker, Room, Upload

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Helper function to safely get attribute from Upload that might not exist yet
def safe_getattr(obj, attr, default=None):
    """Safely get attribute that might not exist if migration hasn't run"""
    try:
        return getattr(obj, attr, default)
    except:
        return default

# ============ EVENT ENDPOINTS ============

@router.get("/")
def get_events(db: Session = Depends(get_db)):
    """Get all events for the loader page"""
    return db.query(Event).all()

@router.get("/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.post("/")
def create_event(event: dict, db: Session = Depends(get_db)):
    db_event = Event(**event)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.put("/{event_id}")
def update_event(event_id: int, event: dict, db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Update fields explicitly
    if "name" in event:
        db_event.name = event["name"]
    if "logo_url" in event:
        db_event.logo_url = event["logo_url"]
    if "start_date" in event:
        db_event.start_date = event["start_date"]
    if "end_date" in event:
        db_event.end_date = event["end_date"]
    if "status" in event:
        db_event.status = event["status"]
    
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/{event_id}/speakers")
def get_event_speakers(event_id: int, search: Optional[str] = None, db: Session = Depends(get_db)):
    """Get speakers for event with optional case-insensitive search"""
    # Get speakers through event_speakers junction table
    from sqlalchemy import Table, MetaData
    
    # Define the junction table
    metadata = MetaData()
    event_speakers = Table('event_speakers', metadata,
                          autoload_with=db.get_bind())
    
    query = db.query(Speaker).join(event_speakers, Speaker.id == event_speakers.c.speaker_id).filter(event_speakers.c.event_id == event_id)
    
    if search:
        search_lower = search.lower()
        query = query.filter(Speaker.name.ilike(f"%{search_lower}%"))
    
    return query.all()

@router.get("/{event_id}/rooms")
def get_event_rooms(event_id: int, db: Session = Depends(get_db)):
    """Get all rooms for an event"""
    # Rooms table doesn't have event_id, so return all available rooms
    # If you need event-specific rooms, create an event_rooms junction table
    return db.query(Room).all()

@router.get("/{event_id}/sessions")
def get_event_sessions(
    event_id: int, 
    day: Optional[str] = None, 
    room_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get filtered sessions by day and room"""
    query = db.query(Upload).filter(Upload.event_id == event_id)
    
    # Filter by day
    if day:
        query = query.filter(Upload.session_date == day)
    
    # Filter by room
    if room_id:
        query = query.filter(Upload.room_id == room_id)
    
    sessions = query.order_by(Upload.session_time).all()
    
    # Enrich with details
    enriched = []
    for session in sessions:
        session_dict = {
            "id": session.id,
            "event_id": session.event_id,
            "speaker_id": session.speaker_id,
            "room_id": safe_getattr(session, "room_id"),
            "session_date": str(safe_getattr(session, "session_date")) if safe_getattr(session, "session_date") else None,
            "session_time": str(safe_getattr(session, "session_time")) if safe_getattr(session, "session_time") else None,
            "tech_notes": {
                "own_pc": False,  # Map from your fields
                "video": session.has_video,
                "audio": session.has_audio,
                "no_ppt": session.needs_internet
            },
            "uploaded": safe_getattr(session, "uploaded", False),
            "upload_file_path": session.filename,
        }
        
        # Add speaker name
        if session.speaker:
            session_dict["speaker_name"] = session.speaker.name
        
        # Add room name by querying Room table
        room_id = safe_getattr(session, "room_id")
        if room_id:
            room = db.query(Room).filter(Room.id == room_id).first()
            if room:
                session_dict["room_name"] = room.name
        
        # Add event name and logo
        if session.event:
            session_dict["event_name"] = session.event.title
            session_dict["event_logo"] = getattr(session.event, 'logo_url', None)
        
        enriched.append(session_dict)
    
    return enriched

@router.post("/{event_id}/upload-bulk")
def bulk_upload(event_id: int, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    """Bulk upload presentations"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    uploaded = []
    for file in files:
        file_path = UPLOAD_DIR / f"{event_id}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded.append(str(file_path))
    
    return {"message": f"{len(uploaded)} files uploaded", "files": uploaded}

@router.get("/{event_id}/export/csv")
def export_csv(event_id: int, db: Session = Depends(get_db)):
    """Export sessions as CSV"""
    sessions = db.query(Upload).filter(Upload.event_id == event_id).all()
    
    output = StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Event Name", "Day", "Room", "Time", "Date", "Presenter Name", "Uploaded"])
    
    for session in sessions:
        speaker_name = session.speaker.name if session.speaker else "Unknown"
        
        # Get room name by querying Room table
        room_name = "Unknown"
        room_id = safe_getattr(session, "room_id")
        if room_id:
            room = db.query(Room).filter(Room.id == room_id).first()
            if room:
                room_name = room.name
        
        event_name = session.event.name if session.event else "Unknown"
        
        # Get day name from date
        try:
            session_date = safe_getattr(session, "session_date")
            if isinstance(session_date, str):
                date_obj = datetime.strptime(session_date, "%Y-%m-%d")
            elif session_date:
                date_obj = session_date
            else:
                date_obj = None
                
            if date_obj:
                day_name = date_obj.strftime("%A")
                formatted_date = date_obj.strftime("%d %b %Y")
            else:
                day_name = "Not Scheduled"
                formatted_date = "Not Scheduled"
        except:
            day_name = "Unknown"
            formatted_date = str(session_date) if session_date else "Not Scheduled"
        
        session_time = safe_getattr(session, "session_time")
        writer.writerow([
            event_name,
            day_name,
            room_name,
            str(session_time) if session_time else "Not Scheduled",
            formatted_date,
            speaker_name,
            "Yes" if session.uploaded else "No"
        ])
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=event_{event_id}_sessions.csv"}
    )

@router.get("/{event_id}/stats")
def get_event_stats(event_id: int, db: Session = Depends(get_db)):
    total = (
        db.query(func.count(Upload.id))
        .filter(Upload.event_id == event_id)
        .scalar()
    )

    rows = (
        db.query(Room.name, func.count(Upload.id))
        .select_from(Upload)
        .join(Room, Room.id == Upload.room_id)
        .filter(Upload.event_id == event_id)
        .group_by(Room.name)
        .all()
    )

    return {
        "total_presentations": total,
        "room_breakdown": {name: count for name, count in rows}
    }
    
@router.get("/{event_id}/room-status")
def get_room_status(event_id: int, db: Session = Depends(get_db)):
    """Get room PC status"""
    # Check if room_id column exists in Upload table
    try:
        # Get all rooms that have uploads for this event
        room_ids = db.query(Upload.room_id).filter(
            Upload.event_id == event_id,
            Upload.room_id.isnot(None)
        ).distinct().all()
        
        result = []
        for (room_id,) in room_ids:
            room = db.query(Room).filter(Room.id == room_id).first()
            if room:
                presentation_count = db.query(Upload).filter(
                    Upload.room_id == room.id,
                    Upload.event_id == event_id
                ).count()
                result.append({
                    "room_id": room.id,
                    "room_name": room.name,
                    "ip_address": getattr(room, 'ip_address', None),
                    "status": room.status or "offline",
                    "presentation_count": presentation_count
                })
        
        return result
    except AttributeError:
        # room_id column doesn't exist yet - need to run migration
        return []
    
    
    # Add this DEBUG endpoint to events.py to see what's in the uploads folder

@router.get("/{event_id}/debug-uploads")
def debug_uploads(event_id: int, db: Session = Depends(get_db)):
    """Debug endpoint to see what's in the uploads folder"""
    upload_dir = Path("uploads")
    
    result = {
        "upload_dir_exists": upload_dir.exists(),
        "upload_dir_path": str(upload_dir.absolute()),
        "event_id": event_id,
        "event_prefix": f"{event_id}_",
        "files_in_folder": [],
        "assigned_files_in_db": []
    }
    
    # List all files in uploads folder
    if upload_dir.exists():
        try:
            for f in upload_dir.iterdir():
                result["files_in_folder"].append({
                    "name": f.name,
                    "is_file": f.is_file(),
                    "size": f.stat().st_size if f.is_file() else 0,
                    "starts_with_prefix": f.name.startswith(f"{event_id}_")
                })
        except Exception as e:
            result["error_reading_folder"] = str(e)
    
    # List all filenames in database for this event
    try:
        uploads = db.query(Upload).filter(Upload.event_id == event_id).all()
        for upload in uploads:
            result["assigned_files_in_db"].append({
                "id": upload.id,
                "filename": safe_getattr(upload, "filename", None),
                "uploaded": safe_getattr(upload, "uploaded", False),
                "speaker_id": upload.speaker_id
            })
    except Exception as e:
        result["error_reading_db"] = str(e)
    
    return result
