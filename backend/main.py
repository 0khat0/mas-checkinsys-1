from fastapi import FastAPI, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from datetime import datetime, date
import uuid
import models
from database import engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
models.Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Sample data insertion (run once at startup if no members)
@app.on_event("startup")
def startup_populate():
    db = SessionLocal()
    if db.query(models.Member).count() == 0:
        member1 = models.Member(member_id="MT001", name="John Doe")
        member2 = models.Member(member_id="MT002", name="Jane Smith")
        db.add_all([member1, member2])
        db.commit()
    db.close()

@app.get("/member/{member_id}", response_model=models.MemberOut)
def get_member(member_id: str, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.member_id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@app.post("/checkin", response_model=models.CheckinOut)
def checkin(data: models.CheckinCreate, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.member_id == data.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    checkin = models.Checkin(member_id=member.id)
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin

@app.get("/admin/checkins/today")
def get_today_checkins(db: Session = Depends(get_db)):
    today = date.today()
    start = datetime.combine(today, datetime.min.time())
    end = datetime.combine(today, datetime.max.time())
    checkins = db.query(models.Checkin).filter(models.Checkin.timestamp >= start, models.Checkin.timestamp <= end).all()
    result = []
    for c in checkins:
        member = db.query(models.Member).filter(models.Member.id == c.member_id).first()
        if member:
            result.append({
                "checkin_id": str(c.id),
                "member_id": member.member_id,
                "name": member.name,
                "timestamp": c.timestamp
            })
        else:
            result.append({
                "checkin_id": str(c.id),
                "member_id": None,
                "name": None,
                "timestamp": c.timestamp
            })
    return result

@app.post("/member", response_model=models.MemberOut)
def create_member(data: models.MemberCreate, db: Session = Depends(get_db)):
    # Check if member_id already exists
    existing = db.query(models.Member).filter(models.Member.member_id == data.member_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Member ID already exists")
    member = models.Member(member_id=data.member_id, name=data.name, active=data.active)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member 