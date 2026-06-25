from flask import jsonify, request
from flask_jwt_extended import jwt_required
from datetime import timezone, timedelta, datetime

from models import Alert, Device, SecurityEvent, BlockchainBlock
from siem_engine import run_all_detections
from auth import require_role
from soar_engine import execute_soar_actions
from blockchain_engine import validate_chain, get_chain

IST = timezone(timedelta(hours=5, minutes=30))

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


def register_siem_routes(app):

    # =====================================================
    # RUN DETECTIONS
    # =====================================================
    @app.route("/run-detections", methods=["POST"])
    @jwt_required()
    @require_role("admin")
    def run_detections():
        total_alerts = run_all_detections()
        execute_soar_actions()
        return jsonify({
            "status": "success",
            "message": "SIEM detection rules executed successfully",
            "alerts_generated": total_alerts
        }), 200


    # =====================================================
    # GET ALERTS — with pagination
    # =====================================================
    @app.route("/alerts", methods=["GET"])
    @jwt_required()
    @require_role("admin", "user", "viewer")
    def get_alerts():
        page = request.args.get("page", 1, type=int)
        per_page = min(
            request.args.get("per_page", DEFAULT_PAGE_SIZE, type=int),
            MAX_PAGE_SIZE
        )

        pagination = Alert.query.order_by(
            Alert.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)

        alert_list = []
        for a in pagination.items:
            created_at = a.created_at
            if created_at and created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            created_ist = created_at.astimezone(IST) if created_at else None

            alert_list.append({
                "id": a.id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "description": a.description,
                "source_ip": a.source_ip,
                "related_user_id": a.related_user_id,
                "related_device_id": a.related_device_id,
                "event_count": a.event_count,
                "soar_executed": a.soar_executed,
                "soar_action": a.soar_action,
                "created_at_ist": created_ist.strftime("%Y-%m-%d %H:%M:%S") if created_ist else None
            })

        return jsonify({
            "alerts": alert_list,
            "total": pagination.total,
            "page": pagination.page,
            "pages": pagination.pages
        }), 200


    # =====================================================
    # BLOCKCHAIN EXPLORER (ADMIN ONLY)
    # Added: was completely missing before
    # =====================================================
    @app.route("/blockchain", methods=["GET"])
    @jwt_required()
    @require_role("admin", "user", "viewer")
    def get_blockchain():
        chain_valid = validate_chain()
        chain = get_chain()
        return jsonify({
            "chain_valid": chain_valid,
            "total_blocks": len(chain),
            "blocks": chain
        }), 200


    # =====================================================
    # DASHBOARD STATS (ADMIN ONLY)
    # Added: needed by the Overview page
    # =====================================================
    @app.route("/dashboard-stats", methods=["GET"])
    @jwt_required()
    @require_role("admin", "user", "viewer")
    def dashboard_stats():
        last_24h = datetime.now(timezone.utc) - timedelta(hours=24)

        return jsonify({
            "total_devices": Device.query.count(),
            "active_devices": Device.query.filter_by(status="ACTIVE").count(),
            "locked_devices": Device.query.filter_by(status="LOCKED").count(),
            "active_alerts": Alert.query.filter_by(soar_executed=False).count(),
            "events_today": SecurityEvent.query.filter(
                SecurityEvent.created_at >= last_24h
            ).count(),
            "chain_valid": validate_chain(),
            "total_blocks": BlockchainBlock.query.count()
        }), 200
    
    # =====================================================
    # DASHBOARD CHARTS DATA
    # =====================================================
    @app.route("/dashboard-charts", methods=["GET"])
    @jwt_required()
    @require_role("admin", "user", "viewer")
    def dashboard_charts():
        from collections import Counter, defaultdict

        last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        last_7d  = datetime.now(timezone.utc) - timedelta(days=7)

        recent = SecurityEvent.query.filter(
            SecurityEvent.created_at >= last_24h
        ).all()

        weekly = SecurityEvent.query.filter(
            SecurityEvent.created_at >= last_7d
        ).all()

        severity_counts = Counter(e.severity for e in recent)
        type_counts = Counter(e.event_type for e in recent)

        daily_critical = defaultdict(int)
        daily_high     = defaultdict(int)
        daily_info     = defaultdict(int)

        for e in weekly:
            if e.created_at:
                day = e.created_at.strftime("%a")
                if e.severity == "CRITICAL": daily_critical[day] += 1
                elif e.severity == "HIGH":   daily_high[day] += 1
                elif e.severity == "INFO":   daily_info[day] += 1

        days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

        return jsonify({
            "severity_breakdown": {
                "CRITICAL": severity_counts.get("CRITICAL", 0),
                "HIGH":     severity_counts.get("HIGH", 0),
                "MEDIUM":   severity_counts.get("MEDIUM", 0),
                "INFO":     severity_counts.get("INFO", 0),
            },
            "event_type_breakdown": dict(type_counts.most_common(5)),
            "daily_counts": {
                "days": days,
                "critical": [daily_critical.get(d, 0) for d in days],
                "high":     [daily_high.get(d, 0)     for d in days],
                "info":     [daily_info.get(d, 0)      for d in days],
            }
        }), 200


    # =====================================================
    # ADMIN ONLY: DATABASE BACKUP
    # =====================================================
    @app.route("/admin/backup-database", methods=["GET"])
    @jwt_required()
    @require_role("admin")
    def backup_database():
        import os
        import shutil
        from flask import send_file
        
        db_path = os.path.join(app.instance_path, "secure_iot.db")
        if not os.path.exists(db_path):
            return jsonify({"message": "Database file not found"}), 404
            
        try:
            backup_path = os.path.join(app.instance_path, "secure_iot_backup.db")
            shutil.copyfile(db_path, backup_path)
            return send_file(backup_path, as_attachment=True, download_name="secure_iot_backup.db")
        except Exception as e:
            return jsonify({"message": f"Backup failed: {str(e)}"}), 500


    # =====================================================
    # ADMIN ONLY: RESET DATABASE
    # =====================================================
    @app.route("/admin/reset-database", methods=["POST"])
    @jwt_required()
    @require_role("admin")
    def reset_database():
        try:
            from models import db
            # Drop all and recreate
            db.drop_all()
            db.create_all()
            
            # Seed genesis block
            from blockchain_engine import create_genesis_block
            create_genesis_block()
            
            # Seed admin user
            from security import hash_password
            from models import User
            admin_user = User(
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin",
                is_active=True,
                login_count=0
            )
            db.session.add(admin_user)
            db.session.commit()
            
            # Seed default devices
            from models import Device
            from blockchain_engine import add_block
            import hashlib
            
            vidit_device = Device(
                device_id="vidit",
                secret_key="my_secret_key_123",
                status="ACTIVE",
                key_version=1
            )
            db.session.add(vidit_device)
            db.session.flush()
            
            vidit_hash = hashlib.sha256(vidit_device.secret_key.encode()).hexdigest()
            add_block(device_id="vidit", key_hash=vidit_hash, key_version=1, key_status="ACTIVE")
            
            thermostat = Device(
                device_id="thermostat_iot",
                secret_key="thermostat_secret_abc",
                status="ACTIVE",
                key_version=1
            )
            db.session.add(thermostat)
            db.session.flush()
            
            thermostat_hash = hashlib.sha256(thermostat.secret_key.encode()).hexdigest()
            add_block(device_id="thermostat_iot", key_hash=thermostat_hash, key_version=1, key_status="ACTIVE")
            db.session.commit()
            
            # Seed 45 mock events for charts
            seed_demo_data(db)
            
            # Clear reports directory
            import os
            reports_dir = os.path.join(app.root_path, "reports")
            if os.path.exists(reports_dir):
                for f in os.listdir(reports_dir):
                    file_path = os.path.join(reports_dir, f)
                    try:
                        if os.path.isfile(file_path):
                            os.unlink(file_path)
                    except Exception:
                        pass
            
            # Log SYSTEM_RESET event
            from logging_engine import log_event
            log_event(
                event_type="SYSTEM_RESET",
                severity="CRITICAL",
                message="System database and reports reset to factory defaults",
                ip_address=request.remote_addr
            )
            
            return jsonify({
                "status": "success",
                "message": "Database and reports reset successfully"
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"message": f"Database reset failed: {str(e)}"}), 500


    # =====================================================
    # SYSTEM CONFIGURATION
    # =====================================================
    @app.route("/system/config", methods=["GET"])
    @jwt_required()
    def get_system_config():
        import json
        import os
        
        config_path = os.path.join(app.root_path, "..", "cypherguard.json")
        if not os.path.exists(config_path):
            config_path = os.path.join(app.root_path, "cypherguard.json")
            
        if not os.path.exists(config_path):
            return jsonify({
                "install_dir": ".",
                "backend_dir": "Backend PBL",
                "frontend_dir": "Frontend PBL",
                "ollama_models": "ollama_models",
                "version": "1.1.0"
            }), 200
            
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
            return jsonify(config_data), 200
        except Exception as e:
            return jsonify({"error": f"Failed to load config: {str(e)}"}), 500


    # =====================================================
    # GET PLATFORM SETTINGS CONFIGURATION (ADMIN ONLY)
    # =====================================================
    @app.route("/admin/settings/config", methods=["GET"])
    @jwt_required()
    @require_role("admin")
    def get_settings_config():
        import json
        import os
        import requests
        
        # Load cypherguard.json config
        config_path = os.path.join(app.root_path, "..", "cypherguard.json")
        if not os.path.exists(config_path):
            config_path = os.path.join(app.root_path, "cypherguard.json")
            
        active_model = "llama3"
        ollama_host = "http://127.0.0.1:11434"
        brute_force_limit = 5
        device_flood_limit = 10
        hmac_failure_limit = 5
        theme = "deep-slate-soc"
        
        ollama_threads = 2
        
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    active_model = cfg.get("active_model", "llama3")
                    ollama_host = cfg.get("ollama_host", "http://127.0.0.1:11434")
                    brute_force_limit = cfg.get("brute_force_limit", 5)
                    device_flood_limit = cfg.get("device_flood_limit", 10)
                    hmac_failure_limit = cfg.get("hmac_failure_limit", 5)
                    theme = cfg.get("theme", "deep-slate-soc")
                    ollama_threads = cfg.get("ollama_threads", 2)
            except Exception:
                pass
                
        # Check if Ollama is running locally
        is_running = False
        models = []
        try:
            res = requests.get(f"{ollama_host}/api/tags", timeout=3)
            if res.status_code == 200:
                is_running = True
                data = res.json()
                models = [m.get("name") for m in data.get("models", [])]
        except Exception:
            pass
            
        # Check if ollama command is installed in PATH
        from ai_soc_engine import check_ollama_installed
        is_installed = check_ollama_installed()
        
        return jsonify({
            "active_model": active_model,
            "ollama_host": ollama_host,
            "brute_force_limit": brute_force_limit,
            "device_flood_limit": device_flood_limit,
            "hmac_failure_limit": hmac_failure_limit,
            "theme": theme,
            "ollama_threads": ollama_threads,
            "is_installed": is_installed,
            "is_running": is_running,
            "models": models
        }), 200


    # =====================================================
    # POST PLATFORM SETTINGS CONFIGURATION (ADMIN ONLY)
    # =====================================================
    @app.route("/admin/settings/config", methods=["POST"])
    @jwt_required()
    @require_role("admin")
    def save_settings_config():
        import json
        import os
        
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"message": "Invalid JSON body"}), 400
            
        config_path = os.path.join(app.root_path, "..", "cypherguard.json")
        if not os.path.exists(config_path):
            config_path = os.path.join(app.root_path, "cypherguard.json")
            
        cfg = {}
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
            except Exception:
                pass
                
        # Update config fields
        for key in ["active_model", "ollama_host", "brute_force_limit", "device_flood_limit", "hmac_failure_limit", "theme"]:
            if key in data:
                cfg[key] = data[key]
        if "ollama_threads" in data:
            try:
                cfg["ollama_threads"] = int(data["ollama_threads"])
            except (ValueError, TypeError):
                pass
                
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(cfg, f, indent=2)
            return jsonify({"status": "success", "message": "System configuration updated successfully"}), 200
        except Exception as e:
            return jsonify({"message": f"Failed to save configuration: {str(e)}"}), 500


    # =====================================================
    # POST OLLAMA PULL MODEL (ADMIN ONLY)
    # =====================================================
    @app.route("/admin/ollama/pull", methods=["POST"])
    @jwt_required()
    @require_role("admin")
    def pull_ollama_model():
        import subprocess
        import threading
        
        data = request.get_json(silent=True)
        if not data or not data.get("model_name"):
            return jsonify({"message": "model_name required"}), 400
            
        model_name = data.get("model_name")
        
        # Trigger background pull thread
        def run_pull(m_name):
            try:
                from logging_engine import log_event
                log_event(event_type="OLLAMA_PULL_START", severity="INFO",
                          message=f"Model pull initiated in background: {m_name}")
                          
                result = subprocess.run(["ollama", "pull", m_name], capture_output=True, text=True, check=True)
                
                log_event(event_type="OLLAMA_MODEL_PULLED", severity="INFO",
                          message=f"Model {m_name} pulled successfully and ready")
            except Exception as e:
                from logging_engine import log_event
                log_event(event_type="OLLAMA_MODEL_ERROR", severity="CRITICAL",
                          message=f"Failed to pull model {m_name}: {str(e)}")
                          
        thread = threading.Thread(target=run_pull, args=(model_name,))
        thread.daemon = True
        thread.start()
        
        return jsonify({"status": "success", "message": f"Pull initiated for '{model_name}' in the background."}), 200


def seed_demo_data(db_instance):
    import random
    from datetime import datetime, timezone, timedelta
    from models import SecurityEvent
    
    event_types = [
        ("AUTH_SUCCESS", "INFO", "Device authenticated successfully"),
        ("CHALLENGE_ISSUED", "INFO", "Challenge nonce generated successfully"),
        ("LOGIN_SUCCESS", "INFO", "Login successful for user: admin"),
        ("LOGIN_FAIL", "MEDIUM", "Login failed: wrong password for user"),
        ("HMAC_MISMATCH", "HIGH", "HMAC verification failed (invalid response)"),
        ("NONCE_REPLAY_ATTEMPT", "CRITICAL", "Replay attempt detected: No active nonce found"),
        ("BLOCKCHAIN_TAMPER_DETECTED", "CRITICAL", "Blockchain integrity validation failed"),
        ("DEVICE_REGISTERED", "INFO", "New device registered successfully"),
        ("KEY_ROTATION_INITIATED", "HIGH", "Key rotation initiated"),
        ("KEY_ROTATION_COMPLETED", "CRITICAL", "Key rotation finalized successfully"),
        ("DEVICE_ACCESS_REVOKED", "CRITICAL", "Device access permanently revoked by admin"),
        ("DEVICE_ACCESS_GRANTED", "HIGH", "Device access re-granted by admin"),
    ]
    
    weighted_types = []
    for etype, sev, msg in event_types:
        if etype in ["AUTH_SUCCESS", "CHALLENGE_ISSUED"]:
            weight = 10
        elif etype in ["LOGIN_SUCCESS", "DEVICE_REGISTERED"]:
            weight = 5
        elif etype in ["LOGIN_FAIL", "HMAC_MISMATCH"]:
            weight = 3
        else:
            weight = 1
        weighted_types.extend([(etype, sev, msg)] * weight)
        
    now = datetime.now(timezone.utc)
    
    events_to_add = []
    for i in range(45):
        etype, sev, msg = random.choice(weighted_types)
        hours_offset = random.uniform(0.1, 168)
        created_at = now - timedelta(hours=hours_offset)
        
        full_msg = msg
        dev_id = None
        ip_addr = None
        
        if "device" in msg.lower() or "hmac" in msg.lower() or "replay" in msg.lower() or "blockchain" in msg.lower():
            dev_id = random.choice(["vidit", "thermostat_iot", "smart_lock_1", "fake_device_2"])
            full_msg = f"{msg} (Device: {dev_id})"
            
        if "login" in msg.lower() or "ip" in msg.lower() or "auth" in msg.lower():
            ip_addr = f"192.168.1.{random.randint(10, 250)}"
            full_msg = f"{full_msg} from IP {ip_addr}"
            
        evt = SecurityEvent(
            event_type=etype,
            severity=sev,
            device_id=dev_id,
            ip_address=ip_addr,
            message=full_msg,
            alerted=False,
            created_at=created_at
        )
        events_to_add.append(evt)
        
    db_instance.session.bulk_save_objects(events_to_add)
    db_instance.session.commit()