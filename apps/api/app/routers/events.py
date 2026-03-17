from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from io import StringIO
import csv
import shutil
from pathlib import Path
from sqlalchemy import func, Table, MetaData

from ..db import get_db
from ..models import Event, Speaker, Room, Upload, Session as SessionModel

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def safe_getattr(obj, attr, default=None):
    try:
        return getattr(obj, attr, default)
    except:
        return default


# ============ EVENT ENDPOINTS ============

@router.get("/")
def get_events(db: Session = Depends(get_db)):
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
    for field in ["title", "description", "start_time", "end_time", "location"]:
        if field in event:
            setattr(db_event, field, event[field])
    db.commit()
    db.refresh(db_event)
    return db_event


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(db_event)
    db.commit()
    return {"message": "Event deleted"}


# ============ FIX #1: SPEAKERS PER EVENT ============

@router.get("/{event_id}/speakers")
def get_event_speakers(event_id: int, search: Optional[str] = None, db: Session = Depends(get_db)):
    """Get ONLY speakers assigned to this specific event"""
    metadata = MetaData()
    event_speakers = Table('event_speakers', metadata, autoload_with=db.get_bind())
    query = db.query(Speaker).join(
        event_speakers, Speaker.id == event_speakers.c.speaker_id
    ).filter(event_speakers.c.event_id == event_id)

    if search:
        query = query.filter(Speaker.name.ilike(f"%{search}%"))

    speakers = query.all()

    # FIX #7: Include session count and upload count per speaker
    result = []
    for speaker in speakers:
        sessions = db.query(Upload).filter(
            Upload.speaker_id == speaker.id,
            Upload.event_id == event_id
        ).all()
        total_sessions = len(sessions)
        uploaded_count = sum(1 for s in sessions if s.uploaded)
        result.append({
            "id": speaker.id,
            "name": speaker.name,
            "email": speaker.email,
            "bio": speaker.bio,
            "title": speaker.title,
            "session_count": total_sessions,
            "uploads_loaded": uploaded_count,
        })
    return result


@router.post("/{event_id}/speakers/{speaker_id}")
def assign_speaker_to_event(event_id: int, speaker_id: int, db: Session = Depends(get_db)):
    """Assign an existing speaker to an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    speaker = db.query(Speaker).filter(Speaker.id == speaker_id).first()
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")

    metadata = MetaData()
    event_speakers = Table('event_speakers', metadata, autoload_with=db.get_bind())
    # Check not already assigned
    existing = db.execute(
        event_speakers.select().where(
            (event_speakers.c.event_id == event_id) &
            (event_speakers.c.speaker_id == speaker_id)
        )
    ).first()
    if not existing:
        db.execute(event_speakers.insert().values(event_id=event_id, speaker_id=speaker_id))
        db.commit()
    return {"message": "Speaker assigned to event"}


@router.delete("/{event_id}/speakers/{speaker_id}")
def remove_speaker_from_event(event_id: int, speaker_id: int, db: Session = Depends(get_db)):
    """Remove a speaker from an event (does not delete the speaker)"""
    metadata = MetaData()
    event_speakers = Table('event_speakers', metadata, autoload_with=db.get_bind())
    db.execute(
        event_speakers.delete().where(
            (event_speakers.c.event_id == event_id) &
            (event_speakers.c.speaker_id == speaker_id)
        )
    )
    db.commit()
    return {"message": "Speaker removed from event"}


# ============ FIX #1: ROOMS PER EVENT ============

@router.get("/{event_id}/rooms")
def get_event_rooms(event_id: int, db: Session = Depends(get_db)):
    """Get ONLY rooms assigned to this specific event"""
    metadata = MetaData()
    try:
        event_rooms = Table('event_rooms', metadata, autoload_with=db.get_bind())
        rooms = db.query(Room).join(
            event_rooms, Room.id == event_rooms.c.room_id
        ).filter(event_rooms.c.event_id == event_id).all()
    except Exception:
        # Fallback if event_rooms table doesn't exist yet
        rooms = db.query(Room).all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "capacity": r.capacity,
            "location": r.location,
            "layout": r.layout,
            "equipment": r.equipment,
            "ip_address": r.ip_address,
            "status": r.status,
        }
        for r in rooms
    ]


@router.post("/{event_id}/rooms/{room_id}")
def assign_room_to_event(event_id: int, room_id: int, db: Session = Depends(get_db)):
    """Assign an existing room to an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    metadata = MetaData()
    event_rooms = Table('event_rooms', metadata, autoload_with=db.get_bind())
    existing = db.execute(
        event_rooms.select().where(
            (event_rooms.c.event_id == event_id) &
            (event_rooms.c.room_id == room_id)
        )
    ).first()
    if not existing:
        db.execute(event_rooms.insert().values(event_id=event_id, room_id=room_id))
        db.commit()
    return {"message": "Room assigned to event"}


@router.delete("/{event_id}/rooms/{room_id}")
def remove_room_from_event(event_id: int, room_id: int, db: Session = Depends(get_db)):
    """Remove a room from an event"""
    metadata = MetaData()
    event_rooms = Table('event_rooms', metadata, autoload_with=db.get_bind())
    db.execute(
        event_rooms.delete().where(
            (event_rooms.c.event_id == event_id) &
            (event_rooms.c.room_id == room_id)
        )
    )
    db.commit()
    return {"message": "Room removed from event"}


# ============ FIX #2: ROOM SESSIONS (time slots) ============

@router.get("/{event_id}/room-sessions")
def get_room_sessions(event_id: int, room_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all sessions (time slots) for an event, optionally filtered by room"""
    query = db.query(SessionModel).filter(SessionModel.event_id == event_id)
    if room_id:
        query = query.filter(SessionModel.room_id == room_id)
    sessions = query.order_by(SessionModel.start_time).all()

    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "event_id": s.event_id,
            "room_id": s.room_id,
            "room_name": s.room.name if s.room else None,
            "speaker_id": s.speaker_id,
            "speaker_name": s.speaker.name if s.speaker else None,
            "session_name": s.session_name,
            "start_time": s.start_time.isoformat() if s.start_time is not None else None,
            "end_time": s.end_time.isoformat() if s.end_time is not None else None,
        })
    return result


@router.post("/{event_id}/room-sessions")
def create_room_session(event_id: int, payload: dict, db: Session = Depends(get_db)):
    """Create a session/time slot for a room in an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    session = SessionModel(
        event_id=event_id,
        room_id=payload.get("room_id"),
        speaker_id=payload.get("speaker_id"),
        session_name=payload.get("session_name", "Unnamed Session"),
        start_time=datetime.fromisoformat(payload["start_time"]) if payload.get("start_time") else None,
        end_time=datetime.fromisoformat(payload["end_time"]) if payload.get("end_time") else None,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "session_name": session.session_name,
        "room_id": session.room_id,
        "speaker_id": session.speaker_id,
        "start_time": session.start_time.isoformat() if session.start_time is not None else None,
        "end_time": session.end_time.isoformat() if session.end_time is not None else None,
    }


@router.put("/{event_id}/room-sessions/{session_id}")
def update_room_session(event_id: int, session_id: int, payload: dict, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.event_id == event_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    for field in ["session_name", "room_id", "speaker_id"]:
        if field in payload:
            setattr(session, field, payload[field])
    if "start_time" in payload and payload["start_time"]:
        session.start_time = datetime.fromisoformat(payload["start_time"])  # type: ignore[assignment]
    if "end_time" in payload and payload["end_time"]:
        session.end_time = datetime.fromisoformat(payload["end_time"])  # type: ignore[assignment]

    db.commit()
    db.refresh(session)
    return {"id": session.id, "session_name": session.session_name}


@router.delete("/{event_id}/room-sessions/{session_id}")
def delete_room_session(event_id: int, session_id: int, db: Session = Depends(get_db)):
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.event_id == event_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}


# ============ UPLOAD SESSIONS (speaker presentations) ============

@router.get("/{event_id}/sessions")
def get_event_sessions(
    event_id: int,
    day: Optional[str] = None,
    room_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Upload).filter(Upload.event_id == event_id)
    if day:
        query = query.filter(Upload.session_date == day)
    if room_id:
        query = query.filter(Upload.room_id == room_id)

    sessions = query.order_by(Upload.session_time).all()
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
                "own_machine": session.own_machine,
                "video_with_audio": session.has_video_with_audio,
                "video_without_audio": session.has_video_without_audio,
                "audio_only": session.has_audio_only,
                "no_ppt": session.no_ppt,
            },
            "uploaded": safe_getattr(session, "uploaded", False),
            "upload_file_path": session.filename,
        }
        if session.speaker:
            session_dict["speaker_name"] = session.speaker.name
        if session.room:
            session_dict["room_name"] = session.room.name
        if session.event:
            session_dict["event_name"] = session.event.title
        enriched.append(session_dict)
    return enriched


# ============ FIX #9: UPLOADS PAGE - presentations per event per room ============

@router.get("/{event_id}/stats")
def get_event_stats(event_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(Upload, Room)
        .outerjoin(Room, Upload.room_id == Room.id)
        .filter(Upload.event_id == event_id)
        .all()
    )

    total = len(rows)
    uploaded_count = sum(1 for u, _ in rows if u.uploaded)

    # Group by room
    by_room: dict = {}
    for upload, room in rows:
        room_name = room.name if room else "Unassigned"
        room_id = room.id if room else None
        if room_name not in by_room:
            by_room[room_name] = {"room_id": room_id, "total": 0, "uploaded": 0, "presentations": []}
        by_room[room_name]["total"] += 1
        if upload.uploaded:
            by_room[room_name]["uploaded"] += 1
        by_room[room_name]["presentations"].append({
            "id": upload.id,
            "filename": upload.filename,
            "uploaded": upload.uploaded,
            "speaker_id": upload.speaker_id,
            "speaker_name": upload.speaker.name if upload.speaker else None,
        })

    return {
        "event_id": event_id,
        "total_presentations": total,
        "total_uploaded": uploaded_count,
        "rooms": [
            {
                "room_name": name,
                "room_id": data["room_id"],
                "total": data["total"],
                "uploaded": data["uploaded"],
                "presentations": data["presentations"],
            }
            for name, data in by_room.items()
        ]
    }


@router.get("/{event_id}/export/csv")
def export_csv(event_id: int, db: Session = Depends(get_db)):
    sessions = db.query(Upload).filter(Upload.event_id == event_id).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Event Name", "Day", "Room", "Time", "Date", "Presenter Name", "Uploaded"])
    for session in sessions:
        speaker_name = session.speaker.name if session.speaker else "Unknown"
        room_name = session.room.name if session.room else "Unknown"
        event_name = session.event.title if session.event else "Unknown"
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
            formatted_date = "Unknown"
        session_time = safe_getattr(session, "session_time")
        writer.writerow([
            event_name, day_name, room_name,
            str(session_time) if session_time else "Not Scheduled",
            formatted_date, speaker_name,
            "Yes" if session.uploaded else "No"
        ])
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=event_{event_id}_sessions.csv"}
    )


@router.get("/{event_id}/room-status")
def get_room_status(event_id: int, db: Session = Depends(get_db)):
    try:
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
        return []