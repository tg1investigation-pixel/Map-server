from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import User
from ..schemas import UserCreateSchema, UserSchema, TokenSchema
from ..auth import hash_password, verify_password, create_jwt
from marshmallow import ValidationError

auth_bp = Blueprint("auth", __name__)
user_schema = UserSchema()
user_create_schema = UserCreateSchema()
token_schema = TokenSchema()

@auth_bp.route("/register", methods=["POST"])
def register():
    json_data = request.get_json() or {}
    try:
        data = user_create_schema.load(json_data)
    except ValidationError as err:
        return {"errors": err.messages}, 400

    existing = db.session.query(User).filter((User.username == data["username"]) | (User.email == data["email"])) .first()
    if existing:
        return {"message": "username or email already registered"}, 400

    user = User(
        username=data["username"],
        email=data["email"],
        password_hash=hash_password(data["password"])
    )
    db.session.add(user)
    db.session.commit()
    return user_schema.dump(user), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    json_data = request.get_json() or {}
    username_or_email = json_data.get("username") or json_data.get("email")
    password = json_data.get("password")
    if not username_or_email or not password:
        return {"message": "username/email and password required"}, 400

    user = db.session.query(User).filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()
    if not user or not verify_password(password, user.password_hash):
        return {"message": "Invalid credentials"}, 401

    access_token = create_jwt(user.username)
    result = {"access_token": access_token, "token_type": "bearer"}
    return jsonify(result), 200
