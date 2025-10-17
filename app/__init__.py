import os
import threading
from flask import Flask
from dotenv import load_dotenv
from .extensions import db, migrate, jwt, ma, cors
from .routes.auth_routes import auth_bp
from .routes.feature_routes import features_bp
from .routes.maps_routes import maps_bp
from .routes.health import health_bp
from prometheus_client import start_http_server

load_dotenv()  # load .env if present

def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY", "change-me"),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///./dev.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.getenv("SECRET_KEY", "change-me"),
        JWT_ACCESS_TOKEN_EXPIRES=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "3600")),
    )

    # init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    ma.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": "*"}})

    # register blueprints
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(features_bp, url_prefix="/features")
    app.register_blueprint(maps_bp, url_prefix="/maps")
    app.register_blueprint(health_bp, url_prefix="")

    # create tables if not using migrations (safe for dev)
    with app.app_context():
        db.create_all()

    # start prometheus metrics http server on separate thread
    try:
        port = int(os.getenv("PROMETHEUS_METRICS_PORT", "8001"))
        t = threading.Thread(target=start_http_server, args=(port,), daemon=True)
        t.start()
    except Exception:
        pass

    return app
