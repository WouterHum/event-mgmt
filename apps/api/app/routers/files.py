from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, Body
from fastapi import Path as PathParam
from fastapi.responses import StreamingResponse
from pathlib import Path 
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, time, datetime
from pathlib import Path
import shutil
import logging

from app.db import get_db
from app.models import Upload, Event
from app.deps import require_roles
from app.storage import get_storage

router = APIRouter(
      # <-- add this
    tags=["uploads"]
)

logger = logging.getLogger("uvicorn.error")

UPLOAD_DIR = Path(__file__).parent / "uploads"
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
    
class SessionCreate(BaseModel):
    event_id: int
    speaker_id: int
    room_id: int
    session_date: str
    session_time: str
    has_video: bool = False
    has_audio: bool = False
    needs_internet: bool = False
    attendee_id: int | None = None


# --------------------------
# Upload files endpoint
# --------------------------
@router.post("/uploads")
async def upload_files(
    event_id: int = Form(...),
    speaker_id: int = Form(...),
    room_id: int = Form(...),  # Added
    session_date: str = Form(...),  # Added
    session_time: str = Form(...),  # Added
    attendee_id: Optional[int] = Form(None),
    has_video: bool = Form(False),
    has_audio: bool = Form(False),
    needs_internet: bool = Form(False),
    files: List[UploadFile] = File(default=[]),  # Made optional - can be empty list
    db: Session = Depends(get_db),    
):
    storage = get_storage()
    uploaded = []
    
    logger.info("=== /uploads endpoint hit ===")
    logger.info(f"attendee_id={attendee_id}, room_id={room_id}")
    logger.info(f"session_date={session_date}, session_time={session_time}")
    logger.info(f"files count={len(files)}")

    try:
        # Combine date and time
        session_datetime = f"{session_date}T{session_time}:00"
        
        # If there are files, upload them
        if files and len(files) > 0:
            for file in files:
                if not file.filename:
                    continue
                data = await file.read()
                meta = storage.save(file.filename, data)
                up = Upload(
                    attendee_id=attendee_id,  
                    event_id=event_id,
                    speaker_id=speaker_id,
                    room_id=room_id,  # Added
                    session_datetime=session_datetime,  # Added
                    filename=meta["key"],
                    size_bytes=len(data),
                    has_video=has_video,
                    has_audio=has_audio,
                    needs_internet=needs_internet,
                    etag=meta.get("etag"),
                )
                db.add(up)
                uploaded.append(up)
        else:
            # No files - just create a session record without files
            up = Upload(
                attendee_id=attendee_id,  
                event_id=event_id,
                speaker_id=speaker_id,
                room_id=room_id,
                session_datetime=session_datetime,
                filename=None,  # No file
                size_bytes=0,
                has_video=has_video,
                has_audio=has_audio,
                needs_internet=needs_internet,
            )
            db.add(up)
            uploaded.append(up)

        db.commit()
        for up in uploaded:
            db.refresh(up)

        return {"uploaded": [u.filename for u in uploaded if u.filename]}
    except Exception as e:
        db.rollback()
        logger.error(f"Error in upload_files: {str(e)}")
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
async def create_session(
    session: SessionCreate,  # Changed from Form(...) parameters
    db: Session = Depends(get_db)
):
    """Create new session/upload - validates date within event period"""
    
    # Validate event exists
    event = db.query(Event).filter(Event.id == session.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Validate date is within event period
    if session.session_date:
        from datetime import datetime
        session_dt = datetime.strptime(session.session_date, "%Y-%m-%d").date()
        if hasattr(event, 'start_date') and hasattr(event, 'end_date'):
            if not (event.start_date <= session_dt <= event.end_date):
                raise HTTPException(
                    status_code=400,
                    detail=f"Session date must be between {event.start_date} and {event.end_date}"
                )
    
    # Create session object
    session_data = {
        "event_id": session.event_id,
        "speaker_id": session.speaker_id,
        "room_id": session.room_id,
        "session_date": session.session_date,
        "session_time": session.session_time,
        "has_video": session.has_video,
        "has_audio": session.has_audio,
        "needs_internet": session.needs_internet,
        "filename": f"presentation_{session.speaker_id}.pptx"
    }
    
    if session.attendee_id:
        session_data["attendee_id"] = session.attendee_id
    
    db_session = Upload(**session_data)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    return {"id": db_session.id, **session_data}

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
    attendee_id: Optional[int] = Form(None),
    event_id: int = Form(...),
    speaker_id: int = Form(...),
    room_id: Optional[int] = Form(None),
    session_date: Optional[str] = Form(None),
    session_time: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db)
):
    logger.info("=== /uploads endpoint hit ===")
    logger.info(f"attendee_id={attendee_id}")
    logger.info(f"event_id={event_id}")
    logger.info(f"speaker_id={speaker_id}")
    logger.info(f"room_id={room_id}")
    logger.info(f"session_date={session_date}")
    logger.info(f"session_time={session_time}")
    logger.info(f"files={files}")
    logger.info(f"Number of files: {len(files) if files else 0}")

    if attendee_id is None:
        raise HTTPException(status_code=400, detail="attendee_id is required")

    uploaded_files = []

    if files:
        for file in files:
            file_path = f"uploads/{event_id}_{file.filename}"
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            upload = Upload(
                attendee_id=attendee_id,
                event_id=event_id,
                speaker_id=speaker_id,
                room_id=room_id,
                session_date=datetime.strptime(session_date, "%Y-%m-%d").date() if session_date else None,
                session_time=datetime.strptime(session_time, "%H:%M").time() if session_time else None,
                filename=file.filename,
                size_bytes=file.size,
                uploaded=True,
            )

            db.add(upload)
            uploaded_files.append(file.filename)

    db.commit()

    return {
        "status": "ok",
        "files_uploaded": len(uploaded_files),
        "room_id": room_id,
        "session_date": session_date,
        "session_time": session_time,
    }



@router.delete("/uploads/{upload_id}")
def delete_upload(upload_id: int, db: Session = Depends(get_db)):
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    db.delete(upload)
    db.commit()

    return {"status": "deleted"}

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@router.get("/events/{event_id}/download/{upload_id}")
def download_upload(event_id: int, upload_id: int, db: Session = Depends(get_db)):
    """
    Download a specific uploaded file by its ID for an event
    """
    # Get the upload record
    upload = db.query(Upload).filter(
        Upload.id == upload_id,
        Upload.event_id == event_id
    ).first()

    if not upload:
        logging.warning(f"Upload record not found: event_id={event_id}, upload_id={upload_id}")
        raise HTTPException(status_code=404, detail="Upload not found")

    filename = getattr(upload, "filename", None)
    if not filename:
        logging.warning(f"Upload has no filename: id={upload_id}")
        raise HTTPException(status_code=404, detail="File has no filename")

    file_path = UPLOAD_DIR / filename
    logging.info(f"Trying to serve file: {file_path.resolve()}")

    if not file_path.exists():
        logging.warning(f"File not found on server: {file_path.resolve()}")
        raise HTTPException(status_code=404, detail="File not found on server")

    # Stream the file
    return StreamingResponse(
        file_path.open("rb"),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )