from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Date, Time
from sqlalchemy.orm import relationship, Mapped, mapped_column, declarative_base
from .db import Base
from datetime import datetime
from typing_extensions import Literal
from typing import Optional

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # admin|technician|client|uploader
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow) 
    
    attendee_profile = relationship("Attendee", back_populates="user", uselist=False)
    attendees = relationship("Attendee", back_populates="user")
    
class Attendee(Base):
    __tablename__ = "attendees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # optional link to User

    
    # new presenter/session fields
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True)
    session_title = Column(String(255), nullable=True)
    venue = Column(String(255), nullable=True)
    presentation_time = Column(DateTime, nullable=True)

    # relationships
    uploads = relationship("Upload", back_populates="attendee")
    user = relationship("User", back_populates="attendees")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String(255))
    created_by = Column(Integer, ForeignKey("users.id"))

RoomStatus = Literal["red", "amber", "green", "blue"]
class Room(Base):
    __tablename__ = "rooms"
    id: Mapped[int] = mapped_column(primary_key=True)
    name = Column(String(255))
    location = Column(String(255), nullable=True) 
    capacity = Column(Integer)
    layout = Column(String(255), nullable=True)  
    equipment = Column(Text, nullable=True) 
    status: Mapped[str] = mapped_column(String)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    uploads = relationship("Upload", back_populates="room")
    

class Speaker(Base):
    __tablename__ = "speakers"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    title = Column(String(50))
    bio = Column(Text)
    email = Column(String(255), unique=True, nullable=True)

class Upload(Base):
    __tablename__ = "uploads"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    speaker_id = Column(Integer, ForeignKey("speakers.id"), nullable=False)
    attendee_id = Column(Integer, ForeignKey("attendees.id"), nullable=True)  
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)  
    filename = Column(String(512), nullable=False)
    size_bytes = Column(Integer)
    has_video: Mapped[bool] = mapped_column(Boolean, default=False)
    has_audio: Mapped[bool] = mapped_column(Boolean, default=False)
    needs_internet: Mapped[bool] = mapped_column(Boolean, default=False)

    etag: Mapped[str | None] = mapped_column(String(128), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    session_date = Column(Date, nullable=True)
    session_time = Column(Time, nullable=True)

    event = relationship("Event")
    speaker = relationship("Speaker")
    attendee = relationship("Attendee", back_populates="uploads")
    room = relationship("Room", back_populates="uploads")
class Device(Base):
    __tablename__ = "devices"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    room_id: Mapped[int | None] = mapped_column(nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
