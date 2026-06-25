from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import timedelta
import os

from models import db
from auth import register_routes as register_auth_routes
from device import register_device_routes
from siem import register_siem_routes
from soar import register_soar_routes
from blockchain_engine import create_genesis_block
from ai_routes import register_ai_routes


def create_app():
    load_dotenv()

    app = Flask(__name__)

    # ------------------------------------------
    # Database
    # ------------------------------------------
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///secure_iot.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ------------------------------------------
    # JWT
    # ------------------------------------------
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    if not app.config["JWT_SECRET_KEY"]:
        raise ValueError("JWT_SECRET_KEY not found in .env")

    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(
        minutes=int(os.getenv("JWT_EXPIRES_MINUTES", "60"))
    )

    # ------------------------------------------
    # ✅ CORS FIX (DYNAMICAL LOCALHOST ALLOWANCE)
    # ------------------------------------------
    allowed_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8088,http://localhost:8080,http://localhost:8082"
    ).split(",")

    import re
    localhost_regex = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")
    origins_patterns = allowed_origins + [localhost_regex]

    CORS(
        app,
        origins=origins_patterns,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # ------------------------------------------
    # Extensions
    # ------------------------------------------
    db.init_app(app)
    JWTManager(app)

    # ------------------------------------------
    # Routes
    # ------------------------------------------
    register_auth_routes(app)
    register_device_routes(app)
    register_siem_routes(app)
    register_soar_routes(app)
    register_ai_routes(app)

    # ------------------------------------------
    # DB init + Genesis block
    # ------------------------------------------
    with app.app_context():
        db.create_all()
        create_genesis_block()
        
        # Bootstrap default admin if no users exist
        from models import User
        if not User.query.first():
            from security import hash_password
            admin_user = User(
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin",
                is_active=True,
                login_count=0
            )
            db.session.add(admin_user)
            db.session.commit()

    return app


if __name__ == "__main__":
    app = create_app()
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=5000, debug=debug_mode)