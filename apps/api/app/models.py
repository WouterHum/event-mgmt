from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column, declarative_base
from .db import Base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # admin|technician|client|uploader
    is_active = Column(Boolean, default=True)
    
    attendee_profile = relationship("Attendee", back_populates="user", uselist=False)
    
class Attendee(Base):
    __tablename__ = "attendees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # optional link to User

    user = relationship("User", back_populates="attendee_profile")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String(255))
    created_by = Column(Integer, ForeignKey("users.id"))


class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    location = Column(String(255), nullable=True) 
    capacity = Column(Integer)
    layout = Column(String(255), nullable=True)  
    equipment = Column(Text, nullable=True) 

class Speaker(Base):
    __tablename__ = "speakers"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    title = Column(String(50))
    bio = Column(Text)
    email = Column(String(255), unique=True, nullable=True)

class Upload(Base):
    __tablename__ = "uploads"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    speaker_id = Column(Integer, ForeignKey("speakers.id"), nullable=False)
    filename = Column(String(512), nullable=False)
    size_bytes = Column(Integer)
    has_video = Column(Boolean, default=False)   # per uploader’s “technical note” field
    has_audio = Column(Boolean, default=False)
    needs_internet = Column(Boolean, default=False)
    etag = Column(String(128))                  # for venue sync
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    event = relationship("Event")
    speaker = relationship("Speaker")
class Device(Base):
    __tablename__ = "devices"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    room_id: Mapped[int | None] = mapped_column(nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
