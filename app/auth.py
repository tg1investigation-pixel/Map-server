import os
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from datetime import timedelta

def hash_password(password: str) -> str:
    return generate_password_hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, password)

def create_jwt(identity: str):
    expires = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "3600"))
    return create_access_token(identity=identity, expires_delta=timedelta(seconds=expires))
