from fastapi import FastAPI, HTTPException, Depends, Body, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta, time
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import structlog
import uuid
import pytz
import json
import os
import models
from database import engine, SessionLocal
from typing import List, Dict, Optional
import jwt
from pydantic import BaseModel

# UUID validation function
def is_valid_uuid(uuid_string: str) -> bool:
    try:
        uuid.UUID(uuid_string)
        return True
    except ValueError:
        return False

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')
CHECKIN_COUNT = Counter('checkins_total', 'Total check-ins')
MEMBER_COUNT = Counter('members_total', 'Total members')

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Muay Thai Gym Check-in System",
    description="A modern check-in system for gym members",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") == "development" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") == "development" else None,
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
)

# CORS middleware with production settings
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Custom middleware for logging and metrics
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    
    # Log request
    logger.info(
        "Request started",
        method=request.method,
        url=str(request.url),
        client_ip=get_remote_address(request)
    )
    
    response = await call_next(request)
    
    # Calculate duration
    duration = (datetime.now() - start_time).total_seconds()
    
    # Update metrics
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    REQUEST_DURATION.observe(duration)
    
    # Log response
    logger.info(
        "Request completed",
        method=request.method,
        url=str(request.url),
        status_code=response.status_code,
        duration=duration
    )
    
    return response

# Drop and recreate tables only in development
# if os.getenv("ENVIRONMENT") == "development":
#     models.Base.metadata.drop_all(bind=engine)
#     models.Base.metadata.create_all(bind=engine)
# else:
    models.Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Health check endpoint
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connection
        db.query(models.Member).first()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": "ok",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )

# Metrics endpoint
@app.get("/metrics")
async def get_metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# Sample data insertion (run once at startup if no members)
@app.on_event("startup")
async def startup_populate():
    db = SessionLocal()
    try:
        if db.query(models.Member).count() == 0:
            member1 = models.Member(email="john.doe@example.com", name="John Doe")
            member2 = models.Member(email="jane.smith@example.com", name="Jane Smith")
            db.add_all([member1, member2])
            db.commit()
            logger.info("Sample data inserted")
    except Exception as e:
        logger.error("Startup population failed", error=str(e))
    finally:
        db.close()

@app.get("/member/{email}", response_model=models.MemberOut)
@limiter.limit("10/minute")
async def get_member(request: Request, email: str, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.email == email).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    member_data = models.MemberOut.model_validate(member)
    
    return member_data

@app.post("/checkin")
@limiter.limit("5/minute")
async def check_in(request: Request, member_data: dict, db: Session = Depends(get_db)):
    """Handle member check-in (AM/PM logic)"""
    email = member_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Get member
    member = db.query(models.Member).filter(models.Member.email == email).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Get Toronto time
    toronto_tz = pytz.timezone('America/Toronto')
    now = datetime.now(toronto_tz)
    today = now.date()
    hour = now.hour
    is_am = hour < 12

    # Define AM/PM period start/end
    if is_am:
        period_start = toronto_tz.localize(datetime.combine(today, time(0, 0, 0)))
        period_end = toronto_tz.localize(datetime.combine(today, time(11, 59, 59)))
    else:
        period_start = toronto_tz.localize(datetime.combine(today, time(12, 0, 0)))
        period_end = toronto_tz.localize(datetime.combine(today, time(23, 59, 59)))

    # Convert to UTC for DB query
    period_start_utc = period_start.astimezone(pytz.UTC)
    period_end_utc = period_end.astimezone(pytz.UTC)

    # Check if already checked in this period
    existing = db.query(models.Checkin).filter(
        models.Checkin.member_id == member.id,
        models.Checkin.timestamp >= period_start_utc,
        models.Checkin.timestamp <= period_end_utc
    ).first()
    if existing:
        return {
            "message": f"Already checked in this {'AM' if is_am else 'PM'}.",
            "member_id": member.id,
            "timestamp": existing.timestamp,
            "period": 'AM' if is_am else 'PM',
            "already_checked_in": True
        }

    # Create check-in
    checkin = models.Checkin(member_id=member.id)
    db.add(checkin)
    db.commit()
    db.refresh(checkin)

    # Update metrics
    CHECKIN_COUNT.inc()

    logger.info("Check-in successful", member_id=str(member.id), email=email)

    return {
        "message": "Check-in successful",
        "member_id": member.id,
        "timestamp": checkin.timestamp,
        "period": 'AM' if is_am else 'PM',
        "already_checked_in": False
    }

@app.post("/checkin/by-name")
@limiter.limit("5/minute")
async def check_in_by_name(request: Request, member_data: dict, db: Session = Depends(get_db)):
    """Handle member check-in by full name (case-insensitive, exact match)"""
    name = member_data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    # Get member by case-insensitive exact match
    member = db.query(models.Member).filter(func.lower(models.Member.name) == name.strip().lower()).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Get Toronto time
    toronto_tz = pytz.timezone('America/Toronto')
    now = datetime.now(toronto_tz)
    today = now.date()
    hour = now.hour
    is_am = hour < 12

    # Define AM/PM period start/end
    if is_am:
        period_start = toronto_tz.localize(datetime.combine(today, time(0, 0, 0)))
        period_end = toronto_tz.localize(datetime.combine(today, time(11, 59, 59)))
    else:
        period_start = toronto_tz.localize(datetime.combine(today, time(12, 0, 0)))
        period_end = toronto_tz.localize(datetime.combine(today, time(23, 59, 59)))

    # Convert to UTC for DB query
    period_start_utc = period_start.astimezone(pytz.UTC)
    period_end_utc = period_end.astimezone(pytz.UTC)

    # Check if already checked in this period
    existing = db.query(models.Checkin).filter(
        models.Checkin.member_id == member.id,
        models.Checkin.timestamp >= period_start_utc,
        models.Checkin.timestamp <= period_end_utc
    ).first()
    if existing:
        return {
            "message": f"Already checked in this {'AM' if is_am else 'PM' }.",
            "member_id": member.id,
            "email": member.email,
            "timestamp": existing.timestamp,
            "period": 'AM' if is_am else 'PM',
            "already_checked_in": True
        }

    # Create check-in
    checkin = models.Checkin(member_id=member.id)
    db.add(checkin)
    db.commit()
    db.refresh(checkin)

    # Update metrics
    CHECKIN_COUNT.inc()

    logger.info("Check-in by name successful", member_id=str(member.id), name=name)

    return {
        "message": "Check-in successful",
        "member_id": member.id,
        "email": member.email,
        "timestamp": checkin.timestamp,
        "period": 'AM' if is_am else 'PM',
        "already_checked_in": False
    }

@app.get("/admin/checkins/today")
@limiter.limit("30/minute")
async def get_today_checkins(request: Request, db: Session = Depends(get_db)):
    # Get Toronto timezone
    toronto_tz = pytz.timezone('America/Toronto')
    
    # Get today's date in Toronto
    today = datetime.now(toronto_tz).date()
    
    # Create start and end times in Toronto
    start = toronto_tz.localize(datetime.combine(today, datetime.min.time()))
    end = toronto_tz.localize(datetime.combine(today, datetime.max.time()))
    
    # Convert to UTC for database query
    start_utc = start.astimezone(pytz.UTC)
    end_utc = end.astimezone(pytz.UTC)
    
    # Use optimized query with joins, order by timestamp descending
    checkins = db.query(models.Checkin, models.Member).join(
        models.Member, models.Checkin.member_id == models.Member.id
    ).filter(
        models.Checkin.timestamp >= start_utc,
        models.Checkin.timestamp <= end_utc
    ).order_by(models.Checkin.timestamp.desc()).all()
    
    result = []
    for checkin, member in checkins:
        # Convert UTC timestamp to Toronto time
        toronto_timestamp = checkin.timestamp.astimezone(toronto_tz)
        result.append({
            "checkin_id": str(checkin.id),
            "email": member.email,
            "name": member.name,
            "timestamp": toronto_timestamp.isoformat()
        })
    
    return result

@app.get("/admin/checkins/range")
@limiter.limit("20/minute")
async def get_checkins_by_range(
    request: Request,
    start_date: date,
    end_date: date,
    group_by: str = "day",  # Options: day, week, month, year
    db: Session = Depends(get_db)
):
    toronto_tz = pytz.timezone('America/Toronto')
    
    # Convert dates to datetime with timezone
    start = toronto_tz.localize(datetime.combine(start_date, datetime.min.time()))
    end = toronto_tz.localize(datetime.combine(end_date, datetime.max.time()))
    
    # Convert to UTC for query
    start_utc = start.astimezone(pytz.UTC)
    end_utc = end.astimezone(pytz.UTC)
    
    # Get base query
    query = db.query(models.Checkin).filter(
        models.Checkin.timestamp >= start_utc,
        models.Checkin.timestamp <= end_utc
    )
    
    # Add aggregation based on group_by parameter
    if group_by == "day":
        # Group by day with count
        results = db.query(
            func.date_trunc('day', models.Checkin.timestamp).label('date'),
            func.count().label('count')
        ).filter(
            models.Checkin.timestamp >= start_utc,
            models.Checkin.timestamp <= end_utc
        ).group_by('date').order_by('date').all()
    elif group_by == "week":
        results = db.query(
            func.date_trunc('week', models.Checkin.timestamp).label('date'),
            func.count().label('count')
        ).filter(
            models.Checkin.timestamp >= start_utc,
            models.Checkin.timestamp <= end_utc
        ).group_by('date').order_by('date').all()
    elif group_by == "month":
        results = db.query(
            func.date_trunc('month', models.Checkin.timestamp).label('date'),
            func.count().label('count')
        ).filter(
            models.Checkin.timestamp >= start_utc,
            models.Checkin.timestamp <= end_utc
        ).group_by('date').order_by('date').all()
    elif group_by == "year":
        results = db.query(
            func.date_trunc('year', models.Checkin.timestamp).label('date'),
            func.count().label('count')
        ).filter(
            models.Checkin.timestamp >= start_utc,
            models.Checkin.timestamp <= end_utc
        ).group_by('date').order_by('date').all()
    
    return [{
        "date": r.date.astimezone(toronto_tz).isoformat(),
        "count": r.count
    } for r in results]

@app.get("/admin/checkins/stats")
@limiter.limit("20/minute")
async def get_checkin_stats(request: Request, db: Session = Depends(get_db)):
    toronto_tz = pytz.timezone('America/Toronto')
    now = datetime.now(toronto_tz)
    today = now.date()
    start = toronto_tz.localize(datetime.combine(today, datetime.min.time()))
    end = toronto_tz.localize(datetime.combine(today, datetime.max.time()))
    start_utc = start.astimezone(pytz.UTC)
    end_utc = end.astimezone(pytz.UTC)
    checkins_today_count = db.query(models.Checkin).filter(
        models.Checkin.timestamp >= start_utc,
        models.Checkin.timestamp <= end_utc
    ).count()
    stats = {
        "total_members": db.query(models.Member).count(),
        "active_members": db.query(models.Member).filter(models.Member.active == True).count(),
        "total_checkins": db.query(models.Checkin).count(),
        "checkins_today": checkins_today_count,
        "checkins_this_week": db.query(models.Checkin).filter(
            models.Checkin.timestamp >= now - timedelta(days=7)
        ).count(),
        "checkins_this_month": db.query(models.Checkin).filter(
            models.Checkin.timestamp >= now - timedelta(days=30)
        ).count(),
    }
    return stats

@app.post("/member")
@limiter.limit("10/minute")
async def create_member(request: Request, member_data: dict, db: Session = Depends(get_db)):
    """Create a new member"""
    email = member_data.get("email")
    name = member_data.get("name")
    
    if not email or not name:
        raise HTTPException(status_code=400, detail="Email and name are required")
    
    # Check if member already exists (not soft-deleted)
    existing = db.query(models.Member).filter(
        models.Member.email == email,
        models.Member.name == name,
        models.Member.deleted_at.is_(None)
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail="Member already exists")
    
    member = models.Member(email=email, name=name)
    db.add(member)
    db.commit()
    db.refresh(member)
    
    # Update metrics
    MEMBER_COUNT.inc()
    
    logger.info("Member created", member_id=str(member.id), email=email, name=name)
    
    return models.MemberOut.model_validate(member)

@app.post("/family/register")
@limiter.limit("10/minute")
async def register_family(request: Request, family_data: models.FamilyRegistration, db: Session = Depends(get_db)):
    """Register multiple family members with one email and check them all in"""
    email = family_data.email
    members = family_data.members
    
    if not email or not members:
        raise HTTPException(status_code=400, detail="Email and at least one member are required")
    
    # Check if any member already exists (not soft-deleted)
    existing_members = []
    for member_info in members:
        existing = db.query(models.Member).filter(
            models.Member.email == email,
            models.Member.name == member_info.name,
            models.Member.deleted_at.is_(None)
        ).first()
        if existing:
            existing_members.append(member_info.name)
    
    if existing_members:
        raise HTTPException(status_code=409, detail=f"Members already exist: {', '.join(existing_members)}")
    
    # Create all family members
    created_members = []
    for member_info in members:
        member = models.Member(email=email, name=member_info.name)
        db.add(member)
        created_members.append(member)
    
    db.commit()
    
    # Check in all members
    toronto_tz = pytz.timezone('America/Toronto')
    now = datetime.now(toronto_tz)
    checkins = []
    
    for member in created_members:
        db.refresh(member)
        checkin = models.Checkin(member_id=member.id)
        db.add(checkin)
        checkins.append(checkin)
        CHECKIN_COUNT.inc()
    
    db.commit()
    
    logger.info("Family registered and checked in", email=email, member_count=len(members))
    
    return {
        "message": f"Family registered successfully. {len(members)} members checked in.",
        "members": [models.MemberOut.model_validate(m) for m in created_members],
        "checkins": len(checkins),
        "member_ids": [str(m.id) for m in created_members]  # NEW: include member_ids for frontend
    }

@app.get("/family/members/{email}")
@limiter.limit("20/minute")
async def get_family_members(request: Request, email: str, db: Session = Depends(get_db)):
    """Get all family members by email (including soft-deleted)"""
    members = db.query(models.Member).filter(
        models.Member.email == email
    ).all()
    
    if not members:
        raise HTTPException(status_code=404, detail="No family members found with this email")
    
    return [models.MemberOut.model_validate(member) for member in members]

@app.post("/family/checkin")
@limiter.limit("5/minute")
async def family_checkin(request: Request, checkin_data: models.FamilyCheckin, db: Session = Depends(get_db)):
    """Check in selected family members"""
    email = checkin_data.email
    member_names = checkin_data.member_names
    
    if not email or not member_names:
        raise HTTPException(status_code=400, detail="Email and member names are required")
    
    # Get Toronto time for AM/PM logic
    toronto_tz = pytz.timezone('America/Toronto')
    now = datetime.now(toronto_tz)
    today = now.date()
    hour = now.hour
    is_am = hour < 12
    
    # Define AM/PM period
    if is_am:
        period_start = toronto_tz.localize(datetime.combine(today, time(0, 0, 0)))
        period_end = toronto_tz.localize(datetime.combine(today, time(11, 59, 59)))
    else:
        period_start = toronto_tz.localize(datetime.combine(today, time(12, 0, 0)))
        period_end = toronto_tz.localize(datetime.combine(today, time(23, 59, 59)))
    
    # Convert to UTC for DB query
    period_start_utc = period_start.astimezone(pytz.UTC)
    period_end_utc = period_end.astimezone(pytz.UTC)
    
    results = []
    for name in member_names:
        # Get member
        member = db.query(models.Member).filter(
            models.Member.email == email,
            models.Member.name == name,
            models.Member.deleted_at.is_(None)
        ).first()
        
        if not member:
            results.append(f"{name}: Member not found")
            continue
        
        # Check if already checked in this period
        existing = db.query(models.Checkin).filter(
            models.Checkin.member_id == member.id,
            models.Checkin.timestamp >= period_start_utc,
            models.Checkin.timestamp <= period_end_utc
        ).first()
        
        if existing:
            results.append(f"{name}: Already checked in this {'AM' if is_am else 'PM'}")
            continue
        
        # Create check-in
        checkin = models.Checkin(member_id=member.id)
        db.add(checkin)
        CHECKIN_COUNT.inc()
        results.append(f"{name}: Check-in successful")
    
    db.commit()
    
    logger.info("Family check-in completed", email=email, members=member_names)
    
    return {
        "message": "Family check-in completed",
        "results": results
    }

@app.get("/family/checkin-status/{email}")
@limiter.limit("10/minute")
async def family_checkin_status(request: Request, email: str, db: Session = Depends(get_db)):
    """Return which family members have checked in and which have not for the current day and AM/PM period."""
    # Get all active family members
    members = db.query(models.Member).filter(
        models.Member.email == email,
        models.Member.deleted_at.is_(None)
    ).all()
    if not members:
        raise HTTPException(status_code=404, detail="No family members found with this email")

    # Get Toronto time and AM/PM period
    toronto_tz = pytz.timezone('America/Toronto')
    now = datetime.now(toronto_tz)
    today = now.date()
    hour = now.hour
    is_am = hour < 12
    if is_am:
        period_start = toronto_tz.localize(datetime.combine(today, time(0, 0, 0)))
        period_end = toronto_tz.localize(datetime.combine(today, time(11, 59, 59)))
    else:
        period_start = toronto_tz.localize(datetime.combine(today, time(12, 0, 0)))
        period_end = toronto_tz.localize(datetime.combine(today, time(23, 59, 59)))
    period_start_utc = period_start.astimezone(pytz.UTC)
    period_end_utc = period_end.astimezone(pytz.UTC)

    checked_in = []
    not_checked_in = []
    for member in members:
        existing = db.query(models.Checkin).filter(
            models.Checkin.member_id == member.id,
            models.Checkin.timestamp >= period_start_utc,
            models.Checkin.timestamp <= period_end_utc
        ).first()
        if existing:
            checked_in.append(member.name)
        else:
            not_checked_in.append(member.name)
    return {
        "checked_in": checked_in,
        "not_checked_in": not_checked_in,
        "period": "AM" if is_am else "PM",
        "date": today.isoformat()
    }

@app.get("/members")
@limiter.limit("20/minute")
async def get_members(request: Request, db: Session = Depends(get_db)):
    """Get all members ordered by join date"""
    members = db.query(models.Member).order_by(models.Member.created_at.desc()).all()
    members_data = [models.MemberOut.model_validate(m).model_dump() for m in members]
    
    return members_data

class MemberUpdate(BaseModel):
    name: str
    email: str

def calculate_streak(check_ins: List[datetime]) -> Dict:
    if not check_ins:
        return {"current_streak": 0, "highest_streak": 0}
    
    # Sort check-ins by date
    dates = sorted(set(c.date() for c in check_ins))
    
    current_streak = 0
    highest_streak = 0
    temp_streak = 0
    
    # Calculate streaks
    for i in range(len(dates)):
        if i == 0:
            temp_streak = 1
        else:
            # Check if dates are consecutive
            if (dates[i] - dates[i-1]).days == 1:
                temp_streak += 1
            else:
                temp_streak = 1
        
        highest_streak = max(highest_streak, temp_streak)
        
        # Check if we're in a current streak (continues to today)
        if i == len(dates) - 1:
            if (date.today() - dates[i]).days <= 1:
                current_streak = temp_streak
            else:
                current_streak = 0
    
    return {
        "current_streak": current_streak,
        "highest_streak": highest_streak
    }

@app.get("/member/{member_id}/stats")
@limiter.limit("30/minute")
async def get_member_stats(request: Request, member_id: str, db: Session = Depends(get_db)):
    """Get member statistics including monthly check-ins and streaks"""
    
    # Validate UUID format
    if not is_valid_uuid(member_id):
        raise HTTPException(status_code=400, detail="Invalid member ID format")
    
    # Get member
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Get timezone
    tz = pytz.timezone('America/Toronto')
    
    # Calculate start of current month
    now = datetime.now(tz)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get all check-ins for streak calculation
    all_check_ins = db.query(models.Checkin.timestamp)\
        .filter(models.Checkin.member_id == member_id)\
        .all()
    
    # Convert to list of datetime objects
    check_in_dates = [c.timestamp for c in all_check_ins]
    
    # Get monthly check-ins count
    monthly_check_ins = db.query(func.count(models.Checkin.id))\
        .filter(
            and_(
                models.Checkin.member_id == member_id,
                models.Checkin.timestamp >= start_of_month
            )
        ).scalar()
    
    # Calculate streaks
    streak_info = calculate_streak(check_in_dates)
    
    stats = {
        "monthly_check_ins": monthly_check_ins,
        "current_streak": streak_info["current_streak"],
        "highest_streak": streak_info["highest_streak"],
        "member_since": member.created_at.strftime("%B %Y"),
        "check_in_dates": [dt.isoformat() for dt in check_in_dates],
        "name": member.name,  # Always include name
        "email": member.email # Always include email
    }
    
    return stats 

@app.post("/member/lookup-by-name")
@limiter.limit("10/minute")
async def lookup_member_by_name(request: Request, data: dict = Body(...), db: Session = Depends(get_db)):
    """Look up a member by their name for check-in purposes"""
    
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    # Search for member by name (case-insensitive, trimmed)
    member = db.query(models.Member).filter(
        func.lower(func.trim(models.Member.name)) == func.lower(name),
        models.Member.deleted_at.is_(None)
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    logger.info("Member lookup by name", name=name, member_id=str(member.id), email=member.email)
    
    return {
        "id": str(member.id),
        "email": member.email,
        "name": member.name
    }

@app.put("/member/{member_id}")
@limiter.limit("5/minute")
async def update_member(request: Request, member_id: str, update: models.MemberUpdate, db: Session = Depends(get_db)):
    """Update member information"""
    # Validate UUID format
    if not is_valid_uuid(member_id):
        raise HTTPException(status_code=400, detail="Invalid member ID format")
    
    # Get member
    member = db.query(models.Member).filter(
        models.Member.id == member_id,
        models.Member.deleted_at.is_(None)
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Update fields
    if update.name is not None:
        setattr(member, 'name', update.name)
    
    if update.email is not None:
        # If email is being changed, update all family members
        old_email = member.email
        new_email = update.email
        
        # Update all family members with the same email
        family_members = db.query(models.Member).filter(
            models.Member.email == old_email,
            models.Member.deleted_at.is_(None)
        ).all()
        
        for family_member in family_members:
            setattr(family_member, 'email', new_email)
        
        logger.info("Family email updated", old_email=old_email, new_email=new_email, member_count=len(family_members))
    
    db.commit()
    db.refresh(member)
    
    logger.info("Member updated", member_id=str(member.id))
    
    return models.MemberOut.model_validate(member)

@app.delete("/member/{member_id}")
@limiter.limit("5/minute")
async def delete_member(request: Request, member_id: str, db: Session = Depends(get_db)):
    """Hard delete a member"""
    # Validate UUID format
    if not is_valid_uuid(member_id):
        raise HTTPException(status_code=400, detail="Invalid member ID format")
    
    # Get member
    member = db.query(models.Member).filter(
        models.Member.id == member_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db.delete(member)
    db.commit()
    
    logger.info("Member hard deleted", member_id=str(member.id), name=member.name, email=member.email)
    
    return {"message": "Member deleted successfully"}

@app.post("/member/{member_id}/restore")
@limiter.limit("5/minute")
async def restore_member(request: Request, member_id: str, db: Session = Depends(get_db)):
    """Restore a soft-deleted member"""
    # Validate UUID format
    if not is_valid_uuid(member_id):
        raise HTTPException(status_code=400, detail="Invalid member ID format")
    
    # Get member
    member = db.query(models.Member).filter(
        models.Member.id == member_id,
        models.Member.deleted_at.is_not(None)
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found or not deleted")
    
    # Restore
    setattr(member, 'deleted_at', None)
    db.commit()
    
    logger.info("Member restored", member_id=str(member.id), name=member.name, email=member.email)
    
    return models.MemberOut.model_validate(member)

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = "HS256"

security = HTTPBearer()

def create_jwt_token():
    payload = {"role": "admin"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("role") == "admin"
    except Exception:
        return False

@app.post("/admin/login")
def admin_login(data: dict = Body(...)):
    password = data.get("password")
    if password == ADMIN_PASSWORD:
        token = create_jwt_token()
        return {"token": token}
    else:
        raise HTTPException(status_code=401, detail="Invalid password")

# Example protected admin endpoint
@app.get("/admin/protected")
def admin_protected(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    if not verify_jwt_token(token):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return {"message": "You are an authenticated admin!"} 