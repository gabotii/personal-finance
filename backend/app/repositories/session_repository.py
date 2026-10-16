from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app.models.user_session import UserSession


class SessionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, session: UserSession) -> UserSession:
        self.db.add(session)
        self.db.flush()
        return session

    def get_active_by_token_hash(self, token_hash: str, now: datetime) -> UserSession | None:
        stmt = (
            select(UserSession)
            .options(joinedload(UserSession.user))
            .where(UserSession.token_hash == token_hash, UserSession.expires_at > now)
        )
        return self.db.scalar(stmt)

    def delete_by_token_hash(self, token_hash: str) -> None:
        self.db.execute(delete(UserSession).where(UserSession.token_hash == token_hash))

    def delete_expired_for_user(self, user_id: uuid.UUID, now: datetime) -> None:
        self.db.execute(
            delete(UserSession).where(UserSession.user_id == user_id, UserSession.expires_at <= now)
        )

    def delete_all_for_user_except(self, user_id: uuid.UUID, keep_id: uuid.UUID) -> None:
        self.db.execute(
            delete(UserSession).where(UserSession.user_id == user_id, UserSession.id != keep_id)
        )
