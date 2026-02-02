from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..db import get_db
from ..models import User
from ..deps import require_roles
from ..security import hash_password  # you should already have this

router = APIRouter()


@router.get("/", dependencies=[Depends(require_roles("admin"))])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()

    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.post("/", dependencies=[Depends(require_roles("admin"))])
def create_user(payload: dict = Body(...), db: Session = Depends(get_db)):
    required_fields = ["email", "password", "role"]
    for field in required_fields:
        if field not in payload:
            raise HTTPException(status_code=400, detail=f"Missing {field}")

    existing = db.query(User).filter(User.email == payload["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        email=payload["email"],
        password_hash=hash_password(payload["password"]),
        role=payload["role"],
        is_active=payload.get("is_active", True),
        created_at=datetime.utcnow(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
    }

@router.put("/{user_id}", dependencies=[Depends(require_roles("admin"))])
def update_user(user_id: int, payload: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "email" in payload:
        user.email = payload["email"]

    if "role" in payload:
        user.role = payload["role"]

    if "is_active" in payload:
        user.is_active = payload["is_active"]

    if "password" in payload and payload["password"]:
        user.password_hash = hash_password(payload["password"])

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
    }
