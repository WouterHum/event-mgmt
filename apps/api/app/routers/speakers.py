from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Speaker, Upload, Room
from ..deps import require_roles
import csv
from fastapi import UploadFile

router = APIRouter()

# Helper function to safely get attribute from Upload that might not exist yet
def safe_getattr(obj, attr, default=None):
    """Safely get attribute that might not exist if migration hasn't run"""
    try:
        return getattr(obj, attr, default)
    except:
        return default

# 🟢 List all speakers
@router.get("/", include_in_schema=True)
def list_speakers(db: Session = Depends(get_db)):
    return db.query(Speaker).all()

# 🟢 Create a new speaker
@router.post("/")
def create_speaker(speaker: dict, db: Session = Depends(get_db)):
    """Add new speaker to event"""
    from sqlalchemy import Table, MetaData, insert
    
    # Extract event_id if provided
    event_id = speaker.pop("event_id", None)
    
    # Create speaker
    db_speaker = Speaker(**speaker)
    db.add(db_speaker)
    db.commit()
    db.refresh(db_speaker)
    
    # Link to event if event_id provided
    if event_id:
        metadata = MetaData()
        event_speakers = Table('event_speakers', metadata, autoload_with=db.get_bind())
        stmt = insert(event_speakers).values(event_id=event_id, speaker_id=db_speaker.id)
        db.execute(stmt)
        db.commit()
    
    return db_speaker

@router.get("/{speaker_id}")
def get_speaker(speaker_id: int, db: Session = Depends(get_db)):
    """Get speaker details"""
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return speaker

@router.put("/{speaker_id}")
def update_speaker(speaker_id: int, speaker: dict, db: Session = Depends(get_db)):
    """Update speaker"""
    db_speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not db_speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    # Update fields explicitly
    if "name" in speaker:
        db_speaker.name = speaker["name"]
    if "email" in speaker:
        db_speaker.email = speaker["email"]
    if "bio" in speaker:
        db_speaker.bio = speaker["bio"]
    
    db.commit()
    db.refresh(db_speaker)
    return db_speaker

@router.delete("/{speaker_id}")
def delete_speaker(speaker_id: int, db: Session = Depends(get_db)):
    """Delete speaker and all associated sessions"""
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    # Delete associated uploads/sessions
    db.query(Upload).filter(Upload.speaker_id == speaker_id).delete()
    
    db.delete(speaker)
    db.commit()
    return {"message": "Speaker deleted"}

@router.get("/{speaker_id}/sessions")
def get_speaker_sessions(speaker_id: int, db: Session = Depends(get_db)):
    """Get all sessions/uploads for a speaker with enriched data"""
    sessions = db.query(Upload).filter(Upload.speaker_id == speaker_id).all()
    
    # Enrich with details
    enriched = []
    for session in sessions:
        session_dict = {
            "id": session.id,
            "event_id": session.event_id,
            "speaker_id": session.speaker_id,
            "room_id": session.room_id,
            "session_date": str(session.session_date) if session.updated_at is not None
                else None,
            "session_time": str(session.session_time) if session.updated_at is not None
                else None,
            "tech_notes": {
                "own_pc": False,  # Not in your model, set to false or add column
                "video": session.has_video,
                "audio": session.has_audio,
                "no_ppt": session.needs_internet
            },
            "uploaded": (
                session.updated_at.isoformat()
                if session.updated_at is not None
                else None
            ),
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
