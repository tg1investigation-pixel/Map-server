from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Feature
from ..schemas import FeatureCreateSchema, FeatureSchema, FeatureUpdateSchema
from marshmallow import ValidationError
from typing import List, Tuple, Optional

features_bp = Blueprint("features", __name__)
feature_schema = FeatureSchema()
feature_create_schema = FeatureCreateSchema()
feature_update_schema = FeatureUpdateSchema()

def point_in_bbox(coord: List[float], bbox: Tuple[float, float, float, float]) -> bool:
    # coord = [lng, lat] or [x, y]
    try:
        lng, lat = float(coord[0]), float(coord[1])
    except Exception:
        return False
    minx, miny, maxx, maxy = bbox
    return (minx <= lng <= maxx) and (miny <= lat <= maxy)

def _parse_bbox(bbox_raw: Optional[str]):
    if not bbox_raw:
        return None
    try:
        parts = [float(x) for x in bbox_raw.split(",")]
        if len(parts) != 4:
            return None
        return tuple(parts)
    except ValueError:
        return None

def get_features_data(limit: int = 100, offset: int = 0, bbox_raw: Optional[str] = None):
    parsed_bbox = _parse_bbox(bbox_raw)
    q = db.session.query(Feature).offset(offset).limit(limit * 5)
    items = q.all()

    if parsed_bbox:
        filtered = []
        for it in items:
            geom = it.geometry or {}
            coords = None
            if isinstance(geom, dict) and geom.get("type") == "Point":
                coords = geom.get("coordinates")
            if coords and point_in_bbox(coords, parsed_bbox):
                filtered.append(it)
        items = filtered[:limit]
    else:
        items = items[:limit]

    return [feature_schema.dump(it) for it in items]

@features_bp.route("", methods=["POST"])
@jwt_required()
def create_feature():
    json_data = request.get_json() or {}
    try:
        data = feature_create_schema.load(json_data)
    except ValidationError as err:
        return {"errors": err.messages}, 400

    f = Feature(
        name=data.get("name"),
        properties=data.get("properties", {}),
        geometry=data["geometry"]
    )
    db.session.add(f)
    db.session.commit()
    return feature_schema.dump(f), 201

@features_bp.route("/<int:feature_id>", methods=["GET"])
def get_feature(feature_id):
    f = db.session.get(Feature, feature_id)
    if not f:
        return {"message": "Feature not found"}, 404
    return feature_schema.dump(f), 200

@features_bp.route("/<int:feature_id>", methods=["PUT"])
@jwt_required()
def update_feature(feature_id):
    f = db.session.get(Feature, feature_id)
    if not f:
        return {"message": "Feature not found"}, 404
    json_data = request.get_json() or {}
    try:
        data = feature_update_schema.load(json_data)
    except ValidationError as err:
        return {"errors": err.messages}, 400

    if "name" in data:
        f.name = data["name"]
    if "properties" in data:
        f.properties = data["properties"]
    if "geometry" in data:
        f.geometry = data["geometry"]

    db.session.add(f)
    db.session.commit()
    return feature_schema.dump(f), 200

@features_bp.route("/<int:feature_id>", methods=["DELETE"])
@jwt_required()
def delete_feature(feature_id):
    f = db.session.get(Feature, feature_id)
    if not f:
        return {"message": "Feature not found"}, 404
    db.session.delete(f)
    db.session.commit()
    return "", 204

@features_bp.route("", methods=["GET"])
def list_features():
    # Query params: limit, offset, bbox (minx,miny,maxx,maxy)
    try:
        limit = int(request.args.get("limit", 100))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return {"message": "limit and offset must be integers"}, 400

    bbox_raw = request.args.get("bbox")
    parsed = get_features_data(limit=limit, offset=offset, bbox_raw=bbox_raw)
    return jsonify(parsed), 200
