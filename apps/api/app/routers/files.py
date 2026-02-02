from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, Body
from fastapi import Path as PathParam
from pathlib import Path 
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, time
import shutil

from app.db import get_db
from app.models import Upload, Event
from app.deps import require_roles
from app.storage import get_storage

router = APIRouter(
      # <-- add this
    tags=["uploads"]
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# --------------------------
# Pydantic DTOs
# --------------------------
class UploadTechNotesDTO(BaseModel):
    has_video: bool = False
    has_audio: bool = False
    needs_internet: bool = False


class UploadCreateDTO(BaseModel):
    attendee_id: int
    event_id: int
    speaker_id: int
    filename: str = "placeholder.txt"
    size_bytes: int = 0
    has_video: bool = False
    has_audio: bool = False
    needs_internet: bool = False
    
class UploadUpdateDTO(BaseModel):
    room_id: Optional[int]  # Optional if you don't want to require it
    session_date: Optional[date]
    session_time: Optional[time]


# --------------------------
# Upload files endpoint
# --------------------------
@router.post("/uploads")
async def upload_files(
    attendee_id: int = Form(...),  
    event_id: int = Form(...),
    speaker_id: int = Form(...),
    has_video: bool = Form(False),
    has_audio: bool = Form(False),
    needs_internet: bool = Form(False),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),    
):
    storage = get_storage()
    uploaded = []

    try:
        for file in files:
            if not file.filename:
                continue
            data = await file.read()
            meta = storage.save(file.filename, data)
            up = Upload(
                attendee_id=attendee_id,  
                event_id=event_id,
                speaker_id=speaker_id,
                filename=meta["key"],
                size_bytes=len(data),
                has_video=has_video,
                has_audio=has_audio,
                needs_internet=needs_internet,
                etag=meta.get("etag"),
            )
            db.add(up)
            uploaded.append(up)

        db.commit()
        for up in uploaded:
            db.refresh(up)

        return {"uploaded": [u.filename for u in uploaded]}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------
# Update tech notes endpoint
# --------------------------
@router.put("/uploads/{upload_id}/tech-notes")
def update_upload_tech_notes(
    upload_id: int = PathParam(...),
    payload: UploadTechNotesDTO = Body(...),
    db: Session = Depends(get_db),
):
    up = db.query(Upload).filter(Upload.id == upload_id).first()
    if not up:
        raise HTTPException(status_code=404, detail="Upload not found")

    up.has_video = payload.has_video
    up.has_audio = payload.has_audio
    up.needs_internet = payload.needs_internet

    db.commit()
    db.refresh(up)
    return {"status": "ok", "upload_id": up.id}


# --------------------------
# Manifest endpoint (optional)
# --------------------------
@router.get("/manifest/{event_id}")
def manifest(event_id: int, db: Session = Depends(get_db)):
    rows = db.query(Upload).filter(Upload.event_id == event_id).all()
    return [{"id": r.id, "key": r.filename, "etag": r.etag, "updated_at": r.updated_at} for r in rows]


@router.post("/")
def create_session(session: dict, db: Session = Depends(get_db)):
    """Create new session/upload - validates date within event period"""
    # Validate event exists
    event = db.query(Event).filter(Event.id == session["event_id"]).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Validate date is within event period (if dates are provided)
    if session.get("session_date"):
        session_date = session["session_date"]
        if hasattr(event, 'start_date') and hasattr(event, 'end_date'):
            if not (event.start_date <= session_date <= event.end_date):
                raise HTTPException(
                    status_code=400,
                    detail=f"Session date must be between {event.start_date} and {event.end_date}"
                )
    
    # Map tech_notes to your Upload model fields
    tech_notes = session.pop("tech_notes", {})
    session["has_video"] = tech_notes.get("video", False)
    session["has_audio"] = tech_notes.get("audio", False)
    session["needs_internet"] = tech_notes.get("no_ppt", False)
    
    # Set default filename if not provided
    if "filename" not in session:
        session["filename"] = f"presentation_{session['speaker_id']}.pptx"
    
    db_session = Upload(**session)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.put("/{session_id}")
def update_session(session_id: int, session: dict, db: Session = Depends(get_db)):
    """Update session/upload"""
    db_session = db.query(Upload).filter(Upload.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Validate date is within event period if event_id or date changed
    if "event_id" in session or "session_date" in session:
        event_id = session.get("event_id", db_session.event_id)
        session_date = session.get("session_date", db_session.session_date)
        
        event = db.query(Event).filter(Event.id == event_id).first()
        if event and session_date:
            if hasattr(event, 'start_date') and hasattr(event, 'end_date'):
                if not (event.start_date <= session_date <= event.end_date):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Session date must be between {event.start_date} and {event.end_date}"
                    )
    
    # Map tech_notes to your Upload model fields
    if "tech_notes" in session:
        tech_notes = session.pop("tech_notes")
        session["has_video"] = tech_notes.get("video", db_session.has_video)
        session["has_audio"] = tech_notes.get("audio", db_session.has_audio)
        session["needs_internet"] = tech_notes.get("no_ppt", db_session.needs_internet)
    
    for key, value in session.items():
        setattr(db_session, key, value)
    
    db.commit()
    db.refresh(db_session)
    return db_session

@router.delete("/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    """Delete session/upload"""
    session = db.query(Upload).filter(Upload.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}

@router.post("/{session_id}/upload")
def upload_presentation(session_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload presentation file for a session"""
    session = db.query(Upload).filter(Upload.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Validate filename exists and assign to variable for type narrowing
    filename = file.filename
    if not filename:
        raise HTTPException(status_code=400, detail="File must have a filename")
    
    # Save file - filename is now guaranteed to be str
    file_path = UPLOAD_DIR / f"{session_id}_{filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = file_path.stat().st_size
    
    # Update session
    session.uploaded = True
    session.filename = filename  # type: ignore[assignment]
    session.size_bytes = file_size  # type: ignore[assignment]
    db.commit()
    
    return {"message": "File uploaded successfully", "file_path": str(file_path)}


# Add this endpoint to get unassigned files
@router.get("/{event_id}/unassigned-files")
def get_unassigned_files(event_id: int, db: Session = Depends(get_db)):
    """Get list of files in uploads folder that haven't been assigned to sessions"""
    upload_dir = Path("uploads")
    
    if not upload_dir.exists():
        return []
    
    # Get all files in uploads folder that start with this event_id
    event_prefix = f"{event_id}_"
    all_files = []
    try:
        for f in upload_dir.iterdir():
            if f.is_file() and not f.name.startswith('.'):
                # Check if file belongs to this event
                if f.name.startswith(event_prefix):
                    all_files.append(f.name)
    except Exception as e:
        print(f"Error reading upload directory: {e}")
        return []
    
    # Get all filenames already assigned to sessions for this event
    # These are stored WITHOUT the event_id prefix in most cases
    try:
        assigned_files = db.query(Upload.filename).filter(
            Upload.event_id == event_id,
            Upload.filename.isnot(None)
        ).all()
        assigned_filenames = {f[0] for f in assigned_files if f[0]}
    except AttributeError:
        # If Upload doesn't have filename attribute (before migration), return all files as unassigned
        assigned_filenames = set()
    
    # Return files that aren't assigned yet
    # A file is "assigned" if its full name (1_file.bmp) OR its stripped name (file.bmp) is in the DB
    unassigned = []
    for filename in all_files:
        # Strip the event_id prefix for comparison
        stripped_filename = filename.replace(event_prefix, "", 1)
        
        # Check if either the full filename OR the stripped filename is in the database
        is_assigned = (filename in assigned_filenames) or (stripped_filename in assigned_filenames)
        
        # Also check if any DB filename ends with the stripped name (handles timestamp prefixes)
        for db_filename in assigned_filenames:
            if db_filename.endswith(stripped_filename):
                is_assigned = True
                break
        
        if not is_assigned:
            file_path = upload_dir / filename
            try:
                file_size = file_path.stat().st_size
            except:
                file_size = 0
            
            unassigned.append({
                "filename": filename,  # Keep full filename with prefix for backend
                "display_name": stripped_filename,  # Show without prefix to user
                "path": str(file_path),
                "assigned": False,
                "size": file_size
            })
    
    return unassigned




# Add this endpoint to sessions.py
@router.post("/{session_id}/assign-file")
def assign_file_to_session(session_id: int, data: dict, db: Session = Depends(get_db)):
    """Assign an uploaded file to a specific session"""
    filename = data.get("filename")
    
    if not filename:
        raise HTTPException(status_code=400, detail="Filename required")
    
    # Get the session
    session = db.query(Upload).filter(Upload.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if file exists in uploads folder
    upload_dir = Path("uploads")
    file_path = upload_dir / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Update session with file info
    session.filename = filename  # type: ignore[assignment]
    session.uploaded = True  # type: ignore[assignment]
    session.size_bytes = file_path.stat().st_size  # type: ignore[assignment]
    
    db.commit()
    
    return {"message": "File assigned successfully", "session_id": session_id, "filename": filename}

@router.put("/uploads/{upload_id}")
async def update_upload(
    upload_id: int,
    attendee_id: Optional[int] = Form(None),
    event_id: Optional[int] = Form(None),
    speaker_id: Optional[int] = Form(None),
    room_id: Optional[int] = Form(None),  # ADD THIS
    session_date: Optional[str] = Form(None),  # ADD THIS
    session_time: Optional[str] = Form(None),  # ADD THIS
    files: Optional[list[UploadFile]] = File(None),
    db: Session = Depends(get_db)
):
    print("PUT /files/uploads/{upload_id} called with:", upload_id)
    print("Form data received:", attendee_id, event_id, speaker_id, room_id, session_date, session_time)
    print("Number of files uploaded:", len(files) if files else 0)
    
    """Update upload/session"""
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Update fields if provided
    if attendee_id is not None:
        upload.attendee_id = attendee_id # type: ignore[assignment]
    if event_id is not None:
        upload.event_id = event_id # type: ignore[assignment]
    if speaker_id is not None:
        upload.speaker_id = speaker_id # type: ignore[assignment]
    if room_id is not None:
        upload.room_id = room_id  # type: ignore[assignment]
    if session_date is not None:
        upload.session_date = session_date  # type: ignore[assignment]
    if session_time is not None:
        upload.session_time = session_time   # type: ignore[assignment]
    
    # Handle file upload if provided
    if files:
        for file in files:
            file_path = f"uploads/{event_id}_{file.filename}"
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            upload.filename = file.filename # type: ignore[assignment]
            upload.size_bytes = file.size # type: ignore[assignment]
    
    db.commit()
    db.refresh(upload)
    
    return {"status": "ok", "upload_id": upload_id}

@router.post("/uploads")
async def create_upload(
    attendee_id: int = Form(...),
    event_id: int = Form(...),
    speaker_id: int = Form(...),
    room_id: Optional[int] = Form(None),  # ADD THIS
    session_date: Optional[str] = Form(None),  # ADD THIS
    session_time: Optional[str] = Form(None),  # ADD THIS
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db)  # ADD THIS if not there
):
    """Create upload/session with room and schedule info"""
    
    # Save files
    uploaded_files = []
    for file in files:
        # Save file to disk
        file_path = f"uploads/{event_id}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create database record
        upload = Upload()
        upload.attendee_id = attendee_id  # type: ignore[assignment]
        upload.event_id = event_id  # type: ignore[assignment]
        upload.speaker_id = speaker_id  # type: ignore[assignment]
        upload.room_id = room_id  # type: ignore[assignment]
        upload.session_date = session_date  # type: ignore[assignment]
        upload.session_time = session_time  # type: ignore[assignment]
        upload.filename = file.filename  # type: ignore[assignment]
        upload.size_bytes = file.size  # type: ignore[assignment]
        upload.uploaded = True  # type: ignore[assignment]
        
        db.add(upload)
        uploaded_files.append(file.filename)
    
    db.commit()
    
    return {
        "status": "ok",
        "files_uploaded": len(uploaded_files),
        "room_id": room_id,
        "session_date": session_date,
        "session_time": session_time
    }


@router.delete("/uploads/{upload_id}")
def delete_upload(upload_id: int, db: Session = Depends(get_db)):
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    db.delete(upload)
    db.commit()

    return {"status": "deleted"}
