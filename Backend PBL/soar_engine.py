from models import db, Alert, BlockedIP, Device, User
from logging_engine import log_event


def execute_soar_actions():
    """
    Reads unprocessed alerts and performs automated containment actions.
    Prevents re-execution using soar_executed flag.
    """

    try:
        pending_alerts = Alert.query.filter_by(soar_executed=False).all()

        for alert in pending_alerts:
            action_taken = None
            log_required = False

            # ===============================
            # 1️⃣ BRUTE FORCE LOGIN
            # ===============================
            if alert.alert_type == "BRUTE_FORCE_LOGIN":
                if alert.source_ip:
                    existing_block = BlockedIP.query.filter_by(
                        ip_address=alert.source_ip
                    ).first()

                    if not existing_block:
                        blocked_ip = BlockedIP(
                            ip_address=alert.source_ip,
                            reason="Blocked due to brute force login"
                        )
                        db.session.add(blocked_ip)
                        action_taken = "IP_BLOCKED"
                        log_required = True
                    else:
                        action_taken = "NO_ACTION_IP_ALREADY_BLOCKED"

            # ===============================
            # 2️⃣ DEVICE ENUMERATION
            # ===============================
            elif alert.alert_type == "DEVICE_ENUMERATION_ATTACK":
                if alert.source_ip:
                    existing_block = BlockedIP.query.filter_by(
                        ip_address=alert.source_ip
                    ).first()

                    if not existing_block:
                        blocked_ip = BlockedIP(
                            ip_address=alert.source_ip,
                            reason="Blocked due to device enumeration attack"
                        )
                        db.session.add(blocked_ip)
                        action_taken = "IP_BLOCKED"
                        log_required = True
                    else:
                        action_taken = "NO_ACTION_IP_ALREADY_BLOCKED"

            # ===============================
            # 3️⃣ HMAC ATTACK ATTEMPT
            # ===============================
            elif alert.alert_type == "HMAC_ATTACK_ATTEMPT":
                if alert.related_device_id:
                    device = Device.query.filter_by(
                        device_id=alert.related_device_id
                    ).first()

                    if device:
                        if device.status != "LOCKED" or not device.key_rotation_required:
                            device.status = "LOCKED"
                            device.key_rotation_required = True
                            action_taken = "DEVICE_LOCKED_AND_KEY_ROTATION_FLAGGED"
                            log_required = True
                        else:
                            action_taken = "NO_ACTION_DEVICE_ALREADY_LOCKED"
                    else:
                        action_taken = "NO_ACTION_DEVICE_NOT_FOUND"

            # ===============================
            # 4️⃣ REPLAY ATTACK DETECTED
            # ===============================
            elif alert.alert_type == "REPLAY_ATTACK_DETECTED":
                if alert.related_device_id:
                    device = Device.query.filter_by(
                        device_id=alert.related_device_id
                    ).first()

                    if device:
                        if device.status != "LOCKED" or not device.key_rotation_required:
                            device.status = "LOCKED"
                            device.key_rotation_required = True
                            action_taken = "DEVICE_LOCKED_REPLAY_ATTACK"
                            log_required = True
                        else:
                            action_taken = "NO_ACTION_DEVICE_ALREADY_LOCKED"
                    else:
                        action_taken = "NO_ACTION_DEVICE_NOT_FOUND"

            # ===============================
            # 5️⃣ BLOCKCHAIN TAMPER ALERT
            # ===============================
            elif alert.alert_type == "BLOCKCHAIN_TAMPER_ALERT":
                # Extreme case — lock affected device
                if alert.related_device_id:
                    device = Device.query.filter_by(
                        device_id=alert.related_device_id
                    ).first()

                    if device:
                        if device.status != "LOCKED":
                            device.status = "LOCKED"
                            action_taken = "DEVICE_LOCKED_BLOCKCHAIN_TAMPER"
                            log_required = True
                        else:
                            action_taken = "NO_ACTION_DEVICE_ALREADY_LOCKED"
                    else:
                        action_taken = "NO_ACTION_DEVICE_NOT_FOUND"
            else:
                action_taken = "NO_ACTION_UNSUPPORTED_ALERT_TYPE"

            # ALWAYS mark alert as executed so it resolves in the database and dashboard
            alert.soar_executed = True
            alert.soar_action = action_taken or "NO_ACTION"

            if log_required and action_taken:
                log_event(
                    event_type="SOAR_ACTION_EXECUTED",
                    severity="CRITICAL",
                    message=f"{action_taken} triggered by alert {alert.alert_type}",
                    device_id=alert.related_device_id,
                    user_id=alert.related_user_id,
                    ip_address=alert.source_ip
                )

        db.session.commit()
    except Exception:
        db.session.rollback()
        raise