from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Speaker, Upload, Room, Event
from ..deps import require_roles
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import Table, MetaData, insert
import shutil
from pathlib import Path
from datetime import datetime

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


class SpeakerBulkItem(BaseModel):
    name: str
    email: str | None = None
    bio: str | None = None


class SpeakerBulkRequest(BaseModel):
    speakers: List[SpeakerBulkItem]


def safe_getattr(obj, attr, default=None):
    try:
        return getattr(obj, attr, default)
    except:
        return default


# ============ SPEAKER ENDPOINTS ============

@router.get("/", include_in_schema=True)
def list_speakers(db: Session = Depends(get_db)):
    return db.query(Speaker).all()


@router.post("/")
def create_speaker(speaker: dict, db: Session = Depends(get_db)):
    """Add new speaker and optionally link to an event"""
    from sqlalchemy import Table, MetaData, insert
    event_id = speaker.pop("event_id", None)
    db_speaker = Speaker(**speaker)
    db.add(db_speaker)
    db.commit()
    db.refresh(db_speaker)

    if event_id:
        metadata = MetaData()
        event_speakers = Table('event_speakers', metadata, autoload_with=db.get_bind())
        stmt = insert(event_speakers).values(event_id=event_id, speaker_id=db_speaker.id)
        db.execute(stmt)
        db.commit()

    return db_speaker


@router.get("/{speaker_id}")
def get_speaker(speaker_id: int, db: Session = Depends(get_db)):
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return speaker


@router.put("/{speaker_id}")
def update_speaker(speaker_id: int, speaker: dict, db: Session = Depends(get_db)):
    db_speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not db_speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    for field in ["name", "email", "bio", "title"]:
        if field in speaker:
            setattr(db_speaker, field, speaker[field])
    db.commit()
    db.refresh(db_speaker)
    return db_speaker


@router.delete("/{speaker_id}")
def delete_speaker(speaker_id: int, db: Session = Depends(get_db)):
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    db.query(Upload).filter(Upload.speaker_id == speaker_id).delete()
    db.delete(speaker)
    db.commit()
    return {"message": "Speaker deleted"}


# FIX #7: Sessions with session_count and upload counts
@router.get("/{speaker_id}/sessions")
def get_speaker_sessions(speaker_id: int, event_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all sessions/uploads for a speaker, optionally filtered by event"""
    query = db.query(Upload).filter(Upload.speaker_id == speaker_id)
    if event_id:
        query = query.filter(Upload.event_id == event_id)
    sessions = query.all()

    enriched = []
    for session in sessions:
        session_dict = {
            "id": session.id,
            "event_id": session.event_id,
            "speaker_id": session.speaker_id,
            "room_id": session.room_id,
            "session_date": str(session.session_date) if session.session_date is not None else None,
            "session_time": str(session.session_time) if session.session_time is not None else None,
            # FIX #6: time_start and time_finish
            "time_start": str(session.session_time) if session.session_time is not None else None,
            # FIX #5: Updated tech notes structure
            "tech_notes": {
                "own_machine": safe_getattr(session, "own_machine", False),
                "video_with_audio": safe_getattr(session, "has_video_with_audio", False),
                "video_without_audio": safe_getattr(session, "has_video_without_audio", False),
                "audio_only": safe_getattr(session, "has_audio_only", False),
                "no_ppt": safe_getattr(session, "no_ppt", False),
            },
            # FIX #3: uploaded should reflect actual file upload, not creation
            "uploaded": safe_getattr(session, "uploaded", False),
            "upload_file_path": session.filename if str(session.filename) != "placeholder.pptx" else None,
        }
        if session.speaker is not None:
            session_dict["speaker_name"] = session.speaker.name
        if session.room_id is not None:
            room = db.query(Room).filter(Room.id == session.room_id).first()
            if room is not None:
                session_dict["room_name"] = room.name
        if session.event is not None:
            session_dict["event_name"] = session.event.title

        enriched.append(session_dict)

    return enriched


# FIX #3: Create session WITHOUT auto-creating a presentation
@router.post("/{speaker_id}/sessions")
def create_speaker_session(speaker_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    Create a session for a speaker.
    - Does NOT auto-create an upload record.
    - uploaded=False until a file is actually uploaded.
    """
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")

    session = Upload(
        event_id=payload["event_id"],
        speaker_id=speaker_id,
        room_id=payload.get("room_id"),
        session_date=datetime.strptime(payload["session_date"], "%Y-%m-%d").date() if payload.get("session_date") else None,
        session_time=datetime.strptime(str(payload["session_time"]), "%H:%M:%S" if str(payload.get("session_time", "")).count(":") == 2 else "%H:%M").time() if payload.get("session_time") else None,
        filename="placeholder.pptx",
        size_bytes=0,
        uploaded=False,  # FIX #3: Start as not uploaded
        # FIX #5: tech notes
        own_machine=payload.get("own_machine", False),
        has_video_with_audio=payload.get("video_with_audio", False),
        has_video_without_audio=payload.get("video_without_audio", False),
        has_audio_only=payload.get("audio_only", False),
        no_ppt=payload.get("no_ppt", False),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "event_id": session.event_id,
        "speaker_id": session.speaker_id,
        "room_id": session.room_id,
        "session_date": str(session.session_date) if session.session_date is not None else None,
        "session_time": str(session.session_time) if session.session_time is not None else None,
        "uploaded": session.uploaded,
        "tech_notes": {
            "own_machine": session.own_machine,
            "video_with_audio": session.has_video_with_audio,
            "video_without_audio": session.has_video_without_audio,
            "audio_only": session.has_audio_only,
            "no_ppt": session.no_ppt,
        }
    }


# FIX #3: Upload a presentation file for a session
@router.post("/{speaker_id}/sessions/{session_id}/upload")
async def upload_session_presentation(
    speaker_id: int,
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a presentation file for an existing session"""
    session = db.query(Upload).filter(
        Upload.id == session_id,
        Upload.speaker_id == speaker_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save file
    safe_filename = f"{session.event_id}_{speaker_id}_{session_id}_{file.filename}"
    file_path = UPLOAD_DIR / safe_filename
    data = await file.read()
    with open(file_path, "wb") as f:
        f.write(data)

    # Update session record - mark as uploaded
    session.filename = safe_filename  # type: ignore[assignment]
    session.size_bytes = len(data)  # type: ignore[assignment]
    session.uploaded = True  # type: ignore[assignment]
    session.updated_at = datetime.utcnow()  # type: ignore[assignment]
    db.commit()
    db.refresh(session)

    return {"status": "ok", "filename": safe_filename, "uploaded": True}


@router.put("/{speaker_id}/sessions/{session_id}")
def update_speaker_session(speaker_id: int, session_id: int, payload: dict, db: Session = Depends(get_db)):
    """Update a session's details"""
    session = db.query(Upload).filter(
        Upload.id == session_id,
        Upload.speaker_id == speaker_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if "room_id" in payload:
        session.room_id = payload["room_id"]  # type: ignore[assignment]
    if "session_date" in payload and payload["session_date"]:
        session.session_date = datetime.strptime(payload["session_date"], "%Y-%m-%d").date()  # type: ignore[assignment]
    if "session_time" in payload and payload["session_time"]:
        time_str = str(payload["session_time"])
        # Handle both HH:MM and HH:MM:SS formats
        fmt = "%H:%M:%S" if time_str.count(":") == 2 else "%H:%M"
        session.session_time = datetime.strptime(time_str, fmt).time()  # type: ignore[assignment]

    # FIX #4/#5: tech notes - new columns, wrapped in try/except in case migration hasn't run
    try:
        if "own_machine" in payload:
            session.own_machine = bool(payload["own_machine"])  # type: ignore[assignment]
        if "no_ppt" in payload:
            session.no_ppt = bool(payload["no_ppt"])  # type: ignore[assignment]
        if "video_with_audio" in payload and payload["video_with_audio"]:
            session.has_video_with_audio = True   # type: ignore[assignment]
            session.has_video_without_audio = False  # type: ignore[assignment]
            session.has_audio_only = False  # type: ignore[assignment]
        elif "video_without_audio" in payload and payload["video_without_audio"]:
            session.has_video_with_audio = False  # type: ignore[assignment]
            session.has_video_without_audio = True  # type: ignore[assignment]
            session.has_audio_only = False  # type: ignore[assignment]
        elif "audio_only" in payload and payload["audio_only"]:
            session.has_video_with_audio = False  # type: ignore[assignment]
            session.has_video_without_audio = False  # type: ignore[assignment]
            session.has_audio_only = True  # type: ignore[assignment]
        elif any(k in payload for k in ["video_with_audio", "video_without_audio", "audio_only"]):
            session.has_video_with_audio = False  # type: ignore[assignment]
            session.has_video_without_audio = False  # type: ignore[assignment]
            session.has_audio_only = False  # type: ignore[assignment]
    except Exception as e:
        print(f"Warning: could not set tech note columns (run migration?): {e}")

    db.commit()
    db.refresh(session)
    return {"id": session.id, "status": "updated"}


@router.delete("/{speaker_id}/sessions/{session_id}")
def delete_speaker_session(speaker_id: int, session_id: int, db: Session = Depends(get_db)):
    session = db.query(Upload).filter(
        Upload.id == session_id,
        Upload.speaker_id == speaker_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}


@router.post("/bulk")
def bulk_add_speakers(speakers: List[dict], db: Session = Depends(get_db)):
    if not speakers:
        raise HTTPException(status_code=400, detail="No speakers provided")

    metadata = MetaData()
    event_speakers = Table('event_speakers', metadata, autoload_with=db.get_bind())

    added_count = 0
    for s in speakers:
        event_id = s.pop("event_id", None)
        if not event_id or not s.get("name"):
            continue
        db_speaker = Speaker(**s)
        db.add(db_speaker)
        db.flush()
        stmt = insert(event_speakers).values(event_id=event_id, speaker_id=db_speaker.id)
        db.execute(stmt)
        added_count += 1

    db.commit()
    return {"added": added_count}