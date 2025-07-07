import uuid
from datetime import datetime
import pytz
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import Base

class Member(Base):
    __tablename__ = "members"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC), index=True)
    checkins = relationship("Checkin", back_populates="member")
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_member_email_active', 'email', 'active'),
        Index('idx_member_created_active', 'created_at', 'active'),
    )

class Checkin(Base):
    __tablename__ = "checkins"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(pytz.UTC), index=True)
    member = relationship("Member", back_populates="checkins")
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_checkin_member_timestamp', 'member_id', 'timestamp'),
        Index('idx_checkin_timestamp_desc', 'timestamp', postgresql_using='btree'),
        Index('idx_checkin_date', 'timestamp', postgresql_using='btree'),
    )

# Pydantic Schemas
class MemberBase(BaseModel):
    email: str
    name: str
    active: Optional[bool] = True

class MemberCreate(MemberBase):
    pass

class MemberOut(MemberBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class CheckinBase(BaseModel):
    email: str

class CheckinCreate(CheckinBase):
    pass

class CheckinOut(BaseModel):
    id: uuid.UUID
    member_id: uuid.UUID
    timestamp: datetime
    member: Optional[MemberOut]

    class Config:
        from_attributes = True 