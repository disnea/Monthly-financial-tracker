from fastapi import Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from shared.database import set_tenant_context, reset_tenant_context
import logging

logger = logging.getLogger(__name__)

async def tenant_context_middleware(request: Request, call_next):
    """
    Extract tenant_id from JWT and set PostgreSQL session variable for RLS
    """
    tenant_id = None
    
    if hasattr(request.state, "user"):
        tenant_id = request.state.user.get("tenant_id")
    
    if not tenant_id:
        logger.warning("No tenant_id found in request")
        return await call_next(request)
    
    request.state.tenant_id = tenant_id
    
    if hasattr(request.state, "db"):
        session: AsyncSession = request.state.db
        try:
            await set_tenant_context(session, tenant_id)
            response = await call_next(request)
            return response
        except Exception as e:
            logger.error(f"Failed to set tenant context: {e}")
            raise HTTPException(status_code=500, detail="Database context failure")
        finally:
            try:
                await reset_tenant_context(session)
            except Exception as e:
                logger.error(f"Failed to reset tenant context: {e}")
    else:
        response = await call_next(request)
        return response
