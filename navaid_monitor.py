#!/usr/bin/env python3
"""
NAVAID Monitor - DVOR/DME Data Relay Server
Chạy liên tục 24/7 trên PC nội bộ, lấy dữ liệu từ 192.168.105.25/alldata.json
rồi phục vụ qua HTTP để Cloudflare Tunnel trỏ vào.

Yêu cầu: pip install requests flask flask-cors
Chạy  : python navaid_monitor.py
Port  : 5050  (Cloudflare Tunnel trỏ vào http://localhost:5050)
"""

import requests
import time
import logging
import json
import threading
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS

# ─── CẤU HÌNH ────────────────────────────────────────────────────────────────
DEVICE_URL    = "http://192.168.105.25/alldata.json"
POLL_INTERVAL = 5          # giây giữa mỗi lần lấy dữ liệu
SERVER_PORT   = 5050       # port Flask – khớp với Cloudflare Tunnel
LOG_FILE      = "navaid_monitor.log"
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

# Bộ nhớ chia sẻ (thread-safe vì GIL + chỉ đọc/ghi dict)
latest_data: dict = {}
last_updated: str = ""
error_message: str = ""


# ─── HÀM PARSE DỮ LIỆU ───────────────────────────────────────────────────────

def safe_float(value: str, divisor: float = 1.0) -> float | None:
    """Tách số đầu tiên khỏi chuỗi rồi chia cho divisor."""
    try:
        num = float("".join(c for c in str(value).split()[0] if c in "0123456789.-"))
        return round(num / divisor, 2)
    except Exception:
        return None


def parse_vor(raw: dict) -> dict:
    """Chuyển khối VOR thô → dữ liệu DVOR đã chuẩn hoá."""
    return {
        "Tx1":        raw.get("Tx1", "—"),
        "Tx2":        raw.get("Tx2", "—"),
        "Main":       raw.get("MainTransmitter", "—"),
        "Antenna":    raw.get("Antenna", "—"),
        "Load":       raw.get("Load", "—"),
        "Alert":      raw.get("Alert", "—"),
        "Status":     raw.get("Status", "—"),
        # Azimuth: "24946 degree" → 249.46°
        "Azimuth":    safe_float(raw.get("AzimuthAngle", "0"), 100),
        # Mod30Hz: "294 Hz" → 29.4 Hz
        "Mod30Hz":    safe_float(raw.get("Mod30Hz", "0"), 10),
        # Mod9960Hz: "307 Hz" → 30.7 Hz
        "Mod9960Hz":  safe_float(raw.get("Mod9960Hz", "0"), 10),
        # Deviation: "1615" → 16.15
        "Deviation":  safe_float(raw.get("Deviation", "0"), 100),
        # RFlevel: "-9 dBm" → -0.9 dBm
        "RFLevel":    safe_float(raw.get("RFlevel", "0"), 10),
        "Date":       raw.get("Date", ""),
        "Time":       raw.get("Time", ""),
    }


def parse_dme(raw: dict) -> dict:
    """Chuyển khối DME thô → dữ liệu DME đã chuẩn hoá."""
    return {
        "Tx1":        raw.get("Tx1", "—"),
        "Tx2":        raw.get("Tx2", "—"),
        "Main":       raw.get("MainTransmitter", "—"),
        "Antenna":    raw.get("Antenna", "—"),
        "Load":       raw.get("Load", "—"),
        "Alert":      raw.get("MaintenanceAlert", "—"),
        "Status":     raw.get("Status", "—"),
        # Delay: "5001 us" → 50.01 µs
        "Delay":      safe_float(raw.get("Delay", "0"), 100),
        # Spacing: "1198 us" → 11.98 µs
        "Spacing":    safe_float(raw.get("Spacing", "0"), 100),
        # TxPower: "1061 Watts" → 1061 W
        "TxPower":    safe_float(raw.get("TxPower", "0")),
        # ERP: "0 dB" → 0 dB
        "ERP":        safe_float(raw.get("ERP", "0")),
        # Efficiency: "1000%" → 100%  (chia 10)
        "Efficiency": safe_float(raw.get("Efficiency", "0"), 10),
        "PRF":        safe_float(raw.get("PRF", "0")),
        "Date":       raw.get("Date", ""),
        "Time":       raw.get("Time", ""),
    }


# ─── VÒNG LẶP POLLING ────────────────────────────────────────────────────────

def polling_loop():
    global latest_data, last_updated, error_message
    log.info("Bắt đầu polling %s mỗi %ds …", DEVICE_URL, POLL_INTERVAL)

    while True:
        try:
            resp = requests.get(DEVICE_URL, timeout=8)
            resp.raise_for_status()
            raw = resp.json()

            latest_data = {
                "dvor": parse_vor(raw.get("vor", {})),
                "dme":  parse_dme(raw.get("dme", {})),
            }
            last_updated  = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            error_message = ""
            log.info("OK – cập nhật lúc %s", last_updated)

        except requests.exceptions.ConnectionError:
            error_message = "Không kết nối được tới thiết bị (192.168.105.25)"
            log.warning(error_message)
        except requests.exceptions.Timeout:
            error_message = "Timeout khi kết nối tới thiết bị"
            log.warning(error_message)
        except Exception as exc:
            error_message = f"Lỗi không xác định: {exc}"
            log.error(error_message, exc_info=True)

        time.sleep(POLL_INTERVAL)


# ─── ENDPOINT API ─────────────────────────────────────────────────────────────

@app.route("/navaid", methods=["GET"])
def get_navaid():
    """Endpoint chính – lichcongtactuh.pages.dev fetch vào đây."""
    return jsonify({
        "ok":          error_message == "",
        "error":       error_message or None,
        "lastUpdated": last_updated,
        "data":        latest_data,
    })


@app.route("/health", methods=["GET"])
def health():
    """Kiểm tra nhanh server còn sống."""
    return jsonify({"status": "running", "lastUpdated": last_updated})


# ─── KHỞI ĐỘNG ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Polling chạy trong thread riêng, không chặn Flask
    t = threading.Thread(target=polling_loop, daemon=True)
    t.start()

    log.info("Flask server khởi động tại http://0.0.0.0:%d", SERVER_PORT)
    # use_reloader=False bắt buộc khi dùng thread nền
    app.run(host="0.0.0.0", port=SERVER_PORT, debug=False, use_reloader=False)
