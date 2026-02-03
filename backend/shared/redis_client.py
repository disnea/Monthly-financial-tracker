import redis.asyncio as aioredis
from shared.config import get_settings
from typing import Optional
import json

settings = get_settings()

class RedisClient:
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
    
    async def connect(self):
        self.redis = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    
    async def close(self):
        if self.redis:
            await self.redis.close()
    
    async def get(self, key: str) -> Optional[str]:
        return await self.redis.get(key)
    
    async def set(self, key: str, value: str, ex: Optional[int] = None):
        await self.redis.set(key, value, ex=ex)
    
    async def delete(self, key: str):
        await self.redis.delete(key)
    
    async def get_json(self, key: str) -> Optional[dict]:
        value = await self.get(key)
        if value:
            return json.loads(value)
        return None
    
    async def set_json(self, key: str, value: dict, ex: Optional[int] = None):
        await self.set(key, json.dumps(value), ex=ex)
    
    async def exists(self, key: str) -> bool:
        return await self.redis.exists(key) > 0

redis_client = RedisClient()

async def get_redis() -> RedisClient:
    return redis_client
