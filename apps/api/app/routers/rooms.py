from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Room
from ..deps import require_roles

router = APIRouter()

@router.get("/")
def list_rooms(db: Session = Depends(get_db)):
    return db.query(Room).all()

@router.post("/")
def add_room(payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    room = Room(**payload)
    db.add(room); db.commit(); db.refresh(room)
    return room

@router.put("/{room_id}")
def update_room(room_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    for k, v in payload.items():
        setattr(room, k, v)
    db.commit(); db.refresh(room)
    return room

@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    db.delete(room); db.commit()
    return {"status": "deleted"}
