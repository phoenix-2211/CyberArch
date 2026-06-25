# ==========================================================
# ai_routes.py
# CypherGuard — AI SOC Analysis Routes
# ==========================================================
# Endpoints:
#
#   POST  /ai/generate-full-soc-report         Admin only
#   POST  /ai/generate-alert-analysis          Admin only
#   POST  /ai/generate-risk-summary            Admin only
#
#   GET   /ai/download-report/<filename>       Download .html report
#   GET   /ai/download-docx/<filename>         Download .docx report
#   GET   /ai/list-reports                     List all saved reports
# ==========================================================

import os
from flask import jsonify, request, send_from_directory  # type: ignore[import-untyped]
from flask_jwt_extended import jwt_required  # type: ignore[import-untyped]

from auth import require_role
from ai_soc_engine import (
    generate_full_soc_report,
    generate_alert_analysis,
    generate_risk_summary,
)
from logging_engine import log_event

REPORTS_FOLDER = "reports"


def register_ai_routes(app):

    # ==================================================
    # POST /ai/generate-full-soc-report
    # --------------------------------------------------
    # Request body (all optional):
    # {
    #   "start_date":     "2026-03-01",
    #   "end_date":       "2026-03-16",
    #   "specific_dates": ["2026-03-15"],     ← alternative to range
    #   "device_id":      "ESP32_001",        ← omit = all devices
    #   "severity":       "HIGH"              ← omit = all severities
    # }
    # Response:
    # {
    #   "status":        "success",
    #   "report_type":   "Full SOC Report",
    #   "analysis_text": "... AI report ...",
    #   "report_file":   "FULL_SOC__2026-03-16__ESP32_001.html",
    #   "docx_file":     "FULL_SOC__2026-03-16__ESP32_001.docx",
    #   "csv_available": true,
    #   "summary":       { "total_events": ..., "total_alerts": ... }
    # }
    # ==================================================
    @app.route("/ai/generate-full-soc-report", methods=["POST"])
    @jwt_required()
    @require_role("admin")
    def ai_full_soc():
        try:
            filters = request.get_json() or {}
            html_file, docx_file, csv_data, text, summary = generate_full_soc_report(filters)

            return jsonify({
                "status":        "success",
                "report_type":   "Full SOC Report",
                "analysis_text": text,
                "report_file":   os.path.basename(html_file),
                "docx_file":     os.path.basename(docx_file) if docx_file else None,
                "csv_available": bool(csv_data),
                "summary":       summary,
            }), 200

        except (EnvironmentError, RuntimeError, TimeoutError, FileNotFoundError) as e:
            log_event(event_type="AI_SOC_REPORT_ERROR",
                      severity="CRITICAL", message=str(e))
            return jsonify({"status": "error", "message": str(e)}), 500

        except Exception as e:
            log_event(event_type="AI_SOC_REPORT_ERROR",
                      severity="CRITICAL", message=str(e))
            return jsonify({"status": "error", "message": str(e)}), 500


    # ==================================================
    # POST /ai/generate-alert-analysis
    # ==================================================
    @app.route("/ai/generate-alert-analysis", methods=["POST"])
    @jwt_required()
    @require_role("admin")
    def ai_alert_analysis():
        try:
            filters = request.get_json() or {}
            html_file, docx_file, csv_data, text = generate_alert_analysis(filters)

            return jsonify({
                "status":        "success",
                "report_type":   "Alert Analysis",
                "analysis_text": text,
                "report_file":   os.path.basename(html_file),
                "docx_file":     os.path.basename(docx_file) if docx_file else None,
                "csv_available": bool(csv_data),
            }), 200

        except Exception as e:
            log_event(event_type="AI_ALERT_ANALYSIS_ERROR",
                      severity="CRITICAL", message=str(e))
            return jsonify({"status": "error", "message": str(e)}), 500


    # ==================================================
    # POST /ai/generate-risk-summary
    # ==================================================
    @app.route("/ai/generate-risk-summary", methods=["POST"])
    @jwt_required()
    @require_role("admin")
    def ai_risk_summary():
        try:
            filters = request.get_json() or {}
            html_file, docx_file, _, text = generate_risk_summary(filters)

            return jsonify({
                "status":        "success",
                "report_type":   "Risk Summary",
                "analysis_text": text,
                "report_file":   os.path.basename(html_file),
                "docx_file":     os.path.basename(docx_file) if docx_file else None,
            }), 200

        except Exception as e:
            log_event(event_type="AI_RISK_SUMMARY_ERROR",
                      severity="CRITICAL", message=str(e))
            return jsonify({"status": "error", "message": str(e)}), 500


    # ==================================================
    # GET /ai/view-report/<filename>
    # Serve the HTML report inline (for iframe preview)
    # Security: blocks path traversal
    # ==================================================
    @app.route("/ai/view-report/<string:filename>", methods=["GET"])
    @jwt_required()
    @require_role("admin")
    def view_report(filename):
        if ".." in filename or "/" in filename or "\\" in filename:
            return jsonify({"error": "Invalid filename"}), 400

        if not filename.endswith(".html"):
            return jsonify({"error": "Only .html reports can be viewed inline."}), 400

        reports_dir = os.path.abspath(REPORTS_FOLDER)
        full_path   = os.path.join(reports_dir, filename)

        if not os.path.exists(full_path):
            return jsonify({"error": f"Report '{filename}' not found"}), 404

        return send_from_directory(
            reports_dir,
            filename,
            as_attachment=False,   # <-- inline, not download
            mimetype="text/html"
        )


    # ==================================================
    # GET /ai/download-report/<filename>
    # Download the saved HTML report
    # Security: blocks path traversal
    # ==================================================
    @app.route("/ai/download-report/<string:filename>", methods=["GET"])
    @jwt_required()
    @require_role("admin")
    def download_report(filename):
        # Block path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            return jsonify({"error": "Invalid filename"}), 400

        # Only allow .html files from this endpoint
        if not filename.endswith(".html"):
            return jsonify({"error": "This endpoint serves .html reports only. "
                                     "Use /ai/download-docx/<filename> for Word documents."}), 400

        reports_dir = os.path.abspath(REPORTS_FOLDER)
        full_path   = os.path.join(reports_dir, filename)

        if not os.path.exists(full_path):
            return jsonify({"error": f"Report '{filename}' not found"}), 404

        return send_from_directory(
            reports_dir,
            filename,
            as_attachment=True,
            download_name=filename,
            mimetype="text/html"
        )


    # ==================================================
    # GET /ai/download-docx/<filename>
    # Download the saved DOCX Word document
    # ==================================================
    @app.route("/ai/download-docx/<string:filename>", methods=["GET"])
    @jwt_required()
    @require_role("admin")
    def download_docx(filename):
        # Block path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            return jsonify({"error": "Invalid filename"}), 400

        # Only allow .docx files from this endpoint
        if not filename.endswith(".docx"):
            return jsonify({"error": "This endpoint serves .docx reports only. "
                                     "Use /ai/download-report/<filename> for HTML reports."}), 400

        reports_dir = os.path.abspath(REPORTS_FOLDER)
        full_path   = os.path.join(reports_dir, filename)

        if not os.path.exists(full_path):
            return jsonify({"error": f"DOCX report '{filename}' not found. "
                                     "python-docx may not be installed on the server."}), 404

        return send_from_directory(
            reports_dir,
            filename,
            as_attachment=True,
            download_name=filename,
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )


    # ==================================================
    # GET /ai/list-reports
    # Returns all saved report filenames grouped by type
    # ==================================================
    @app.route("/ai/list-reports", methods=["GET"])
    @jwt_required()
    @require_role("admin")
    def list_reports():
        try:
            if not os.path.exists(REPORTS_FOLDER):
                return jsonify({"status": "success", "reports": []}), 200

            all_files = sorted(os.listdir(REPORTS_FOLDER), reverse=True)

            reports = []
            seen_bases = {}

            for f in all_files:
                if not (f.endswith(".html") or f.endswith(".docx")):
                    continue

                base = f.rsplit(".", 1)[0]  # strip extension

                if base not in seen_bases:
                    seen_bases[base] = {"html": None, "docx": None}

                if f.endswith(".html"):
                    seen_bases[base]["html"] = f
                elif f.endswith(".docx"):
                    seen_bases[base]["docx"] = f

            for base, files in seen_bases.items():
                reports.append({
                    "base_name":   base,
                    "html_file":   files["html"],
                    "docx_file":   files["docx"],
                })

            return jsonify({
                "status":  "success",
                "reports": reports,
                "total":   len(reports),
            }), 200

        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500