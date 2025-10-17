from marshmallow import fields, validate, Schema, EXCLUDE
from .extensions import ma
from .models import User, Feature

class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        include_fk = True
        exclude = ("password_hash",)
        unknown = EXCLUDE

class UserCreateSchema(Schema):
    username = fields.Str(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=6))
    class Meta:
        unknown = EXCLUDE

class TokenSchema(Schema):
    access_token = fields.Str()
    token_type = fields.Str()

class FeatureSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Feature
        load_instance = True
        include_fk = True
        unknown = EXCLUDE

class FeatureCreateSchema(Schema):
    name = fields.Str(required=False, allow_none=True)
    properties = fields.Dict(required=False)
    geometry = fields.Dict(required=True)  # expect GeoJSON geometry object
    class Meta:
        unknown = EXCLUDE

class FeatureUpdateSchema(Schema):
    name = fields.Str(required=False)
    properties = fields.Dict(required=False)
    geometry = fields.Dict(required=False)
    class Meta:
        unknown = EXCLUDE
