from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from ..db import get_db
from ..models import Room, Upload
from ..deps import require_roles

from pathlib import Path
from typing import List, Optional
from fastapi import HTTPException
import paramiko
from datetime import datetime, date
from ..room_scanner import RoomScanner
from ..file_matcher import FileMatcher


router = APIRouter()

@router.get("/")
def list_rooms(db: Session = Depends(get_db)):
    rooms = (
        db.query(Room)
        .options(joinedload(Room.uploads))
        .all()
    )

    return [
        {
            "id": r.id,
            "name": r.name,
            "capacity": r.capacity,
            "location": r.location,
            "layout": r.layout,
            "equipment": r.equipment,
            "ip_address": r.ip_address,
            "presentations": [
                {
                    "id": u.id,
                    "fileName": u.filename
                }
                for u in r.uploads
            ]
        }
        for r in rooms
    ]

@router.post("/")
def add_room(payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    room = Room(**payload)
    db.add(room); db.commit(); db.refresh(room)
    return room

@router.post("/")
def create_room(room: dict, db: Session = Depends(get_db)):
    """Add new room"""
    # Remove event_id if present since Room table doesn't have it
    room_data = {k: v for k, v in room.items() if k != "event_id"}
    
    db_room = Room(**room_data)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

@router.put("/{room_id}")
def update_room(room_id: int, room: dict, db: Session = Depends(get_db)):
    """Update room (assign IP address, change status)"""
    db_room = db.query(Room).filter(Room.id == room_id).first()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Update fields explicitly (only fields that exist in Room model)
    if "name" in room:
        db_room.name = room["name"]
    if "capacity" in room:
        db_room.capacity = room["capacity"]
    if "location" in room:
        db_room.location = room["location"]
    if "layout" in room:
        db_room.layout = room["layout"]
    if "equipment" in room:
        db_room.equipment = room["equipment"]
    if "status" in room:
        db_room.status = room["status"]
    if "ip_address" in room:
        db_room.ip_address = room["ip_address"]
    
    db.commit()
    db.refresh(db_room)
    return db_room

@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)):
    """Remove room from event"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    db.delete(room)
    db.commit()
    return {"message": "Room deleted"}

@router.put("/{room_id}/ping")
def ping_room(room_id: int, db: Session = Depends(get_db)):
    """
    Ping a room to check if it's online
    Updates room status to green (online) or red (offline)
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if not room.ip_address:
        raise HTTPException(status_code=400, detail="Room has no IP address configured")
    
    # Ping the room
    scanner = RoomScanner()
    is_online = scanner.ping_host(room.ip_address)
    
    # Update room status
    room.status = "green" if is_online else "red"
    db.commit()
    
    return {
        "room_id": room_id,
        "name": room.name,
        "ip_address": room.ip_address,
        "status": room.status,
        "is_online": is_online
    }


@router.put("/{room_id}/scan")
def scan_room(
    room_id: int,
    event_id: Optional[int] = Query(None, description="Filter uploads by event"),
    session_date: Optional[date] = Query(None, description="Filter uploads by session date"),
    update_uploads: bool = Query(True, description="Update matched upload records"),
    db: Session = Depends(get_db)
):
    """
    Scan room for files and match them with expected uploads
    
    This endpoint will:
    1. Ping the room to check if online
    2. Scan the configured folder for files
    3. Match files to upload records
    4. Optionally update upload records with file info
    
    Returns summary of scan results
    """
    # Get room
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room.ip_address is None:
        raise HTTPException(status_code=400, detail="Room has no IP address configured")
    
    # Ping the room
    scanner = RoomScanner()
    is_online = scanner.ping_host(room.ip_address)
    
    # Update room status
    room.status = "green" if is_online else "red"
    db.commit()
    
    if not is_online:
        return {
            "status": "offline",
            "room_id": room_id,
            "ip_address": room.ip_address,
            "message": "Room is not reachable"
        }
    
    try:
        # Determine folder path
        if room.attachment_folder:
            folder_path = room.attachment_folder
        elif room.share_path:
            folder_path = f"\\\\{room.ip_address}\\{room.share_path}"
        else:
            folder_path = f"\\\\{room.ip_address}\\Attachments"
        
        # Scan for files
        scanned_files = scanner.scan_folder(folder_path)
        
        # Get uploads to match against
        upload_query = db.query(Upload).filter(Upload.room_id == room_id)
        if event_id:
            upload_query = upload_query.filter(Upload.event_id == event_id)
        if session_date:
            upload_query = upload_query.filter(Upload.session_date == session_date)
        uploads = upload_query.all()
        
        # Match files to uploads
        matcher = FileMatcher()
        matched_uploads = []
        unmatched_files = []
        
        for scanned_file in scanned_files:
            upload_id = matcher.match_file_to_upload(scanned_file, uploads)
            
            if upload_id:
                # Found a match
                matched_uploads.append({
                    "upload_id": upload_id,
                    "filename": scanned_file['filename'],
                    "file_path": scanned_file['file_path'],
                    "file_size": scanned_file['file_size']
                })
                
                # Update upload record if requested
                if update_uploads:
                    upload = db.query(Upload).filter(Upload.id == upload_id).first()
                    if upload:
                        upload.size_bytes = scanned_file['file_size']
                        upload.has_video = scanned_file['has_video']
                        upload.has_audio = scanned_file['has_audio']
                        upload.uploaded = True
                        upload.updated_at = datetime.utcnow()
            else:
                # No match found
                unmatched_files.append({
                    "filename": scanned_file['filename'],
                    "file_size": scanned_file['file_size'],
                    "file_path": scanned_file['file_path']
                })
        
        if update_uploads:
            db.commit()
        
        return {
            "status": "ok",
            "room_id": room_id,
            "ip_address": room.ip_address,
            "scan_date": datetime.utcnow().isoformat(),
            "total_files": len(scanned_files),
            "matched_uploads": len(matched_uploads),
            "unmatched_files": len(unmatched_files),
            "matches": matched_uploads,
            "unmatched": unmatched_files
        }
        
    except FileNotFoundError as e:
        return {
            "status": "error",
            "room_id": room_id,
            "error": f"Folder not found: {str(e)}"
        }
    except Exception as e:
        return {
            "status": "error",
            "room_id": room_id,
            "error": f"Scan failed: {str(e)}"
        }


@router.post("/{room_id}/verify-uploads")
def verify_uploads(
    room_id: int,
    event_id: Optional[int] = Query(None, description="Filter by event"),
    session_date: Optional[date] = Query(None, description="Filter by session date"),
    db: Session = Depends(get_db)
):
    """
    Check which expected uploads are missing from the room
    Useful for pre-event verification
    
    This does NOT scan the room - it uses the 'uploaded' flag
    from previous scans to determine what's missing
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Get expected uploads
    upload_query = db.query(Upload).filter(Upload.room_id == room_id)
    if event_id:
        upload_query = upload_query.filter(Upload.event_id == event_id)
    if session_date:
        upload_query = upload_query.filter(Upload.session_date == session_date)
    
    all_uploads = upload_query.all()
    
    found = [u for u in all_uploads if u.uploaded]
    missing = [u for u in all_uploads if not u.uploaded]
    
    return {
        "room_id": room_id,
        "room_name": room.name,
        "total_expected": len(all_uploads),
        "found": len(found),
        "missing": len(missing),
        "found_uploads": [
            {
                "id": u.id,
                "filename": u.filename,
                "speaker_id": u.speaker_id,
                "size_bytes": u.size_bytes
            } for u in found
        ],
        "missing_uploads": [
            {
                "id": u.id,
                "filename": u.filename,
                "speaker_id": u.speaker_id
            } for u in missing
        ]
    }


@router.put("/{room_id}/credentials")
def update_credentials(
    room_id: int,
    username: str,
    password: str,
    share_path: Optional[str] = None,
    attachment_folder: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update room network credentials"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room.username = username
    room.password = password  # TODO: Encrypt in production!
    
    if share_path:
        room.share_path = share_path
    if attachment_folder:
        room.attachment_folder = attachment_folder
    
    db.commit()
    
    return {"message": "Credentials updated successfully"}
