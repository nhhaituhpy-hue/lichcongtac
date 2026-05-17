import urllib.request
import base64
import sys

mermaid_code = """sequenceDiagram
    autonumber
    participant HW as Thiết bị trạm
    participant PY as Python Monitor
    participant TUN as Cloudflare Tunnel
    participant WK as sirms-worker
    participant D1 as D1 Database
    participant PWA as PWA Client

    loop Mỗi 5 giây - Polling Local
        PY->>HW: HTTP GET /alldata.json
        HW-->>PY: Raw Data JSON
        PY->>PY: Chuẩn hóa safe_float()
    end

    loop Mỗi 15 phút - Cloudflare Cron
        WK->>TUN: Fetch sirms-api.hainh.io.vn
        TUN->>PY: Forward request tới port 5050
        PY-->>TUN: JSON Data chuẩn hóa
        TUN-->>WK: JSON Data
        WK->>D1: INSERT INTO sirms_data
        WK->>WK: So khớp dữ liệu navaid_limits
        alt Nếu thông số vượt ngưỡng
            WK->>D1: Truy vấn push_subscriptions
            WK->>PWA: Gửi Web Push Notification
            PWA-->>Kỹ thuật viên: Chuông cảnh báo trên điện thoại
        end
    end

    loop Khi người dùng mở PWA
        PWA->>D1: Fetch API lấy dữ liệu
        D1-->>PWA: Hiển thị giao diện Dashboard
    end
"""

def export_image(filename="SoDo_LuongDuLieu_SIRMS.png"):
    # Làm sạch khoảng trắng thừa ở đầu các dòng
    clean_code = "\n".join([line.strip() for line in mermaid_code.splitlines() if line.strip()])
    # Mã hóa base64 urlsafe chuỗi Mermaid và loại bỏ padding '='
    b64 = base64.urlsafe_b64encode(clean_code.encode('utf-8')).decode('utf-8').rstrip('=')
    
    # URL tới dịch vụ mermaid.ink với cờ scale=3 (độ phân giải cao)
    url = f"https://mermaid.ink/img/{b64}?scale=3"
    
    print(f"Fetching diagram from mermaid.ink...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    
    try:
        with urllib.request.urlopen(req) as response, open(filename, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Successfully exported diagram image to: {filename}")
    except Exception as e:
        print(f"Error exporting diagram: {e}")
        sys.exit(1)

if __name__ == "__main__":
    export_image()
