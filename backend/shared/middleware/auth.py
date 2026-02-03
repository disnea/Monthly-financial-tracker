from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from shared.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer()

async def auth_middleware(request: Request, call_next):
    """
    Validate JWT token and extract user information
    """
    # Allow OPTIONS requests for CORS preflight
    if request.method == "OPTIONS":
        return await call_next(request)
    
    auth_header = request.headers.get("Authorization")
    
    public_paths = ["/docs", "/openapi.json", "/health", "/login", "/register", "/stocks"]
    if any(request.url.path.startswith(path) for path in public_paths):
        return await call_next(request)
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        request.state.user = {
            "user_id": payload.get("user_id"),
            "tenant_id": payload.get("tenant_id"),
            "email": payload.get("email"),
            "role": payload.get("role")
        }
    except JWTError as e:
        logger.error(f"JWT validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return await call_next(request)

def get_current_user(request: Request) -> dict:
    """
    Dependency to get current user from request state
    """
    if not hasattr(request.state, "user"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return request.state.user
