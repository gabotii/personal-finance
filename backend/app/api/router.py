from fastapi import APIRouter

from app.api.routes import auth, categories, dashboard, exports, transactions, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(transactions.router)
api_router.include_router(categories.router)
api_router.include_router(dashboard.router)
api_router.include_router(exports.router)
