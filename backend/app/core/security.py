"""Password hashing and session-token primitives."""

from __future__ import annotations

import hashlib
import hmac
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_hasher = PasswordHasher()  # Argon2id with library defaults (RFC 9106 low-memory profile).

# Used to spend the same time verifying when the email does not exist,
# so response timing does not reveal which accounts are registered.
_DUMMY_HASH = _hasher.hash("dummy-password-for-timing-equalization")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    try:
        return _hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return True


def burn_password_check(password: str) -> None:
    verify_password(password, _DUMMY_HASH)


def generate_session_token() -> str:
    """256 bits of randomness, URL-safe. Only its hash is stored."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str, secret_key: str) -> str:
    """HMAC-SHA256 of the token keyed with SECRET_KEY.

    A database dump alone is not enough to forge or look up sessions, and rotating
    SECRET_KEY invalidates every existing session at once.
    """
    return hmac.new(secret_key.encode("utf-8"), token.encode("utf-8"), hashlib.sha256).hexdigest()
