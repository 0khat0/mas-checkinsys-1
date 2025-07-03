import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from typing import Optional
from database import Base

class Member(Base):
    __tablename__ = "members"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    checkins = relationship("Checkin", back_populates="member")

class Checkin(Base):
    __tablename__ = "checkins"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    member = relationship("Member", back_populates="checkins")

# Pydantic Schemas
class MemberBase(BaseModel):
    member_id: str
    name: str
    active: Optional[bool] = True

class MemberCreate(MemberBase):
    pass

class MemberOut(MemberBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        orm_mode = True

class CheckinBase(BaseModel):
    member_id: str

class CheckinCreate(CheckinBase):
    pass

class CheckinOut(BaseModel):
    id: uuid.UUID
    member_id: uuid.UUID
    timestamp: datetime
    member: Optional[MemberOut]

    class Config:
        orm_mode = True 