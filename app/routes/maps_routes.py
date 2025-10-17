from flask import Blueprint, jsonify, request
from ..routes.feature_routes import get_features_data

maps_bp = Blueprint("maps", __name__)

@maps_bp.route("/geojson", methods=["GET"])
def features_geojson():
    # Reuse the feature listing logic
    try:
        limit = int(request.args.get("limit", 100))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return {"message": "limit and offset must be integers"}, 400

    bbox_raw = request.args.get("bbox")
    items = get_features_data(limit=limit, offset=offset, bbox_raw=bbox_raw)

    features = []
    for f in items:
        features.append({
            "type": "Feature",
            "id": f.get("id"),
            "properties": f.get("properties", {}),
            "geometry": f.get("geometry"),
        })
    return jsonify({
        "type": "FeatureCollection",
        "features": features
    }), 200
