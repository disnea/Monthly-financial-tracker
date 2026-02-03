from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
import io
from minio import Minio
from minio.error import S3Error

import sys
sys.path.append('/app')

from shared.database import get_db, Base, engine
from shared.models import User, Tenant
from shared.config import get_settings
from shared.middleware.auth import get_current_user, auth_middleware

app = FastAPI(title="Auth Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Initialize MinIO client
minio_client = Minio(
    "minio:9000",
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=False
)

# Ensure buckets exist
try:
    if not minio_client.bucket_exists("profile-images"):
        minio_client.make_bucket("profile-images")
    if not minio_client.bucket_exists("bank-statements"):
        minio_client.make_bucket("bank-statements")
except Exception as e:
    print(f"MinIO bucket creation error: {e}")

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    tenant_name: str
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: str
    tenant_id: str
    email: str
    full_name: str
    role: str
    preferred_currency: str
    preferred_language: str

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth"}

@app.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).join(Tenant).where(
            User.email == request.email,
            Tenant.slug == request.tenant_name.lower().replace(" ", "-")
        )
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
    
    tenant_slug = request.tenant_name.lower().replace(" ", "-")
    result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        tenant = Tenant(
            name=request.tenant_name,
            slug=tenant_slug,
            subscription_tier="free",
            max_users=5,
            is_active=True
        )
        db.add(tenant)
        await db.flush()
    
    new_user = User(
        tenant_id=tenant.id,
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        phone=request.phone,
        role="admin" if not tenant.id else "member",
        is_active=True,
        email_verified=False
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    token_data = {
        "user_id": str(new_user.id),
        "tenant_id": str(new_user.tenant_id),
        "email": new_user.email,
        "role": new_user.role
    }
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(new_user.id),
            "tenant_id": str(new_user.tenant_id),
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "preferred_currency": new_user.preferred_currency,
            "preferred_language": new_user.preferred_language
        }
    }

@app.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    user.last_login_at = datetime.utcnow()
    await db.commit()
    
    token_data = {
        "user_id": str(user.id),
        "tenant_id": str(user.tenant_id),
        "email": user.email,
        "role": user.role
    }
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "tenant_id": str(user.tenant_id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "preferred_currency": user.preferred_currency,
            "preferred_language": user.preferred_language
        }
    }

@app.get("/me", response_model=UserResponse)
async def get_current_user(
    authorization: str = Depends(lambda request: request.headers.get("Authorization")),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    token = authorization.split(" ")[1]
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("user_id")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        tenant_id=str(user.tenant_id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        preferred_currency=user.preferred_currency,
        preferred_language=user.preferred_language
    )

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    preferred_currency: Optional[str] = None
    preferred_language: Optional[str] = None

@app.put("/profile")
async def update_profile(
    profile: ProfileUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    # Extract and verify JWT token
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    token = authorization.split(" ")[1]
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("user_id")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if profile.full_name:
        user.full_name = profile.full_name
    if profile.phone:
        user.phone = profile.phone
    if profile.preferred_currency:
        user.preferred_currency = profile.preferred_currency
    if profile.preferred_language:
        user.preferred_language = profile.preferred_language
    
    await db.commit()
    await db.refresh(user)
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "preferred_currency": user.preferred_currency,
            "preferred_language": user.preferred_language,
            "profile_image_url": user.profile_image_url
        }
    }

@app.post("/profile/upload-image")
async def upload_profile_image(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    user_data = get_current_user(request)
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed.")
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Validate file size (max 5MB)
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{user_data['user_id']}/{uuid.uuid4()}.{file_extension}"
    
    try:
        # Upload to MinIO
        minio_client.put_object(
            "profile-images",
            unique_filename,
            io.BytesIO(file_content),
            file_size,
            content_type=file.content_type
        )
        
        # Update user profile with image URL
        image_url = f"/api/profile-images/{unique_filename}"
        
        result = await db.execute(select(User).where(User.id == uuid.UUID(user_data["user_id"])))
        user = result.scalar_one_or_none()
        
        if user:
            user.profile_image_url = image_url
            await db.commit()
        
        return {
            "message": "Profile image uploaded successfully",
            "image_url": image_url
        }
    except S3Error as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
