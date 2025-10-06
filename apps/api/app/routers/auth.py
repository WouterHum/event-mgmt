from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db, Base, engine
from ..models import User
from ..security import verify_password, create_access_token
from pydantic import BaseModel

router = APIRouter()

# dev helper — create tables on first run
Base.metadata.create_all(bind=engine)

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(sub=user.email, role=user.role)
    return {"access_token": token, "token_type": "bearer", "role": user.role}
