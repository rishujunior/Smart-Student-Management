from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from loguru import logger

client: AsyncIOMotorClient = None


async def connect_to_mongo():
    global client
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        await client.admin.command("ping")
        logger.info("✅ Connected to MongoDB successfully")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")


def get_database():
    return client[settings.DATABASE_NAME]


def get_collection(collection_name: str):
    db = get_database()
    return db[collection_name]
