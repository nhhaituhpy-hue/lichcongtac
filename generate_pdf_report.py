import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping

# Kiểm tra font Arial trên Windows
font_path = r"C:\Windows\Fonts"
if not os.path.exists(os.path.join(font_path, "arial.ttf")):
    print("Không tìm thấy font Arial trong C:\\Windows\\Fonts")
    sys.exit(1)

# Đăng ký font Arial hỗ trợ tiếng Việt Unicode
pdfmetrics.registerFont(TTFont('Arial', os.path.join(font_path, 'arial.ttf')))
pdfmetrics.registerFont(TTFont('Arial-Bold', os.path.join(font_path, 'arialbd.ttf')))
pdfmetrics.registerFont(TTFont('Arial-Italic', os.path.join(font_path, 'ariali.ttf')))
pdfmetrics.registerFont(TTFont('Arial-BoldItalic', os.path.join(font_path, 'arialbi.ttf')))

addMapping('Arial', 0, 0, 'Arial')
addMapping('Arial', 1, 0, 'Arial-Bold')
addMapping('Arial', 0, 1, 'Arial-Italic')
addMapping('Arial', 1, 1, 'Arial-BoldItalic')

class NumberedCanvas(canvas.Canvas):
    """Canvas tùy chỉnh để tính tổng số trang và vẽ Header / Footer chạy tự động."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Arial", 9)
        self.setFillColor(colors.HexColor("#555555"))
        
        # Header (chỉ vẽ từ trang 2 trở đi)
        if self._pageNumber > 1:
            self.drawString(54, 800, "BÁO CÁO THUYẾT MINH & HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG SIRMS")
            self.setStrokeColor(colors.HexColor("#CCCCCC"))
            self.setLineWidth(0.5)
            self.line(54, 792, 558, 792)
            
        # Footer (vẽ từ trang 2 trở đi)
        if self._pageNumber > 1:
            page_str = f"Trang {self._pageNumber} / {page_count}"
            self.drawRightString(558, 36, page_str)
            self.drawString(54, 36, "Đài DVOR/DME Tuy Hòa • Technical Support: Nguyễn Hoàng Hải")
            self.setStrokeColor(colors.HexColor("#CCCCCC"))
            self.setLineWidth(0.5)
            self.line(54, 48, 558, 48)
            
        self.restoreState()

def build_pdf(filename="BaoCao_ThuyetMinh_HeThong_LichCongTac_SIRMS.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54, rightMargin=54,
        topMargin=54, bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Tùy chỉnh các style mặc định sang Arial
    styles['Normal'].fontName = 'Arial'
    styles['Normal'].fontSize = 11
    styles['Normal'].leading = 16
    styles['Normal'].textColor = colors.HexColor("#222222")

    # Tạo các style mới
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Arial-Bold',
        fontSize=24,
        leading=32,
        textColor=colors.HexColor("#0061A3"),
        alignment=1, # Center
        spaceAfter=20
    )

    subtitle_style = ParagraphStyle(
        'CoverSubTitle',
        parent=styles['Normal'],
        fontName='Arial-Bold',
        fontSize=16,
        leading=22,
        textColor=colors.HexColor("#333333"),
        alignment=1,
        spaceAfter=40
    )

    meta_style = ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Arial',
        fontSize=12,
        leading=20,
        textColor=colors.HexColor("#444444"),
        alignment=1
    )

    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Normal'],
        fontName='Arial-Bold',
        fontSize=18,
        leading=24,
        textColor=colors.HexColor("#0061A3"),
        spaceBefore=20,
        spaceAfter=12,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Normal'],
        fontName='Arial-Bold',
        fontSize=14,
        leading=20,
        textColor=colors.HexColor("#00838F"),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'CustomH3',
        parent=styles['Normal'],
        fontName='Arial-Bold',
        fontSize=12,
        leading=18,
        textColor=colors.HexColor("#2E7D32"),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Arial',
        fontSize=11,
        leading=16,
        leftIndent=20,
        spaceAfter=6
    )

    code_style = ParagraphStyle(
        'CustomCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#111111")
    )

    table_text = ParagraphStyle(
        'TableText',
        parent=styles['Normal'],
        fontName='Arial',
        fontSize=10,
        leading=14
    )

    table_head = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Arial-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.white
    )

    story = []

    # ─── TRANG BÌA (COVER PAGE) ────────────────────────────────────────────────
    story.append(Spacer(1, 100))
    story.append(Paragraph("BÁO CÁO THUYẾT MINH & HƯỚNG DẪN TRIỂN KHAI", subtitle_style))
    story.append(Paragraph("HỆ THỐNG QUẢN LÝ LỊCH CÔNG TÁC VÀ GIÁM SÁT THÔNG SỐ ĐÀI DẪN ĐƯỜNG (SIRMS) TRÊN NỀN TẢNG CLOUDFLARE", title_style))
    story.append(HRFlowable(width="80%", thickness=3, color=colors.HexColor("#0061A3"), spaceBefore=20, spaceAfter=40))
    story.append(Spacer(1, 150))
    
    meta_text = """
    <b>Đơn vị triển khai:</b> Đài DVOR/DME Tuy Hòa<br/>
    <b>Tác giả / Hỗ trợ kỹ thuật:</b> Nguyễn Hoàng Hải<br/>
    <b>Phiên bản tài liệu:</b> 2.5 (Tích hợp PWA & Sinh trắc học WebAuthn)<br/>
    <b>Thời gian cập nhật:</b> Tháng 5 / 2026<br/>
    """
    story.append(Paragraph(meta_text, meta_style))
    story.append(PageBreak())

    # ─── PHẦN 1: TỔNG QUAN KIẾN TRÚC & KHẢ NĂNG MỞ RỘNG ───────────────────────
    story.append(Paragraph("PHẦN 1: TỔNG QUAN KIẾN TRÚC & KHẢ NĂNG MỞ RỘNG", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0061A3"), spaceAfter=14))

    story.append(Paragraph("1.1. Giới thiệu chung về hệ thống", h2_style))
    intro_p1 = """Hệ thống <b>Lịch Công Tác & Giám sát thông số đài dẫn đường (SIRMS)</b> là một giải pháp số hóa toàn diện, kết hợp giữa hai nghiệp vụ cốt lõi của đài dẫn đường hàng không:"""
    story.append(Paragraph(intro_p1, styles['Normal']))
    story.append(Paragraph("• <b>Quản lý điều hành nội bộ:</b> Lịch trực kỹ thuật theo ca, phân công công việc hàng ngày, theo dõi tiến độ và ghi chú ca trực (Daily Notes).", bullet_style))
    story.append(Paragraph("• <b>Giám sát thiết bị từ xa (SIRMS):</b> Tự động thu thập, lưu trữ, phân tích xu hướng và cảnh báo thời gian thực các thông số kỹ thuật chuyên sâu của hệ thống dẫn đường DVOR/DME.", bullet_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("1.2. Khả năng linh hoạt thay đổi áp dụng cho các đơn vị khác", h2_style))
    intro_p2 = """Hệ thống được thiết kế theo mô hình <b>Micro-services / Serverless</b> hiện đại, tách bạch hoàn toàn giữa lớp thu thập dữ liệu tại trạm (Data Collector) và lớp xử lý trung tâm trên nền tảng điện toán đám mây (Cloud Backend). Nhờ kiến trúc này, ứng dụng sở hữu khả năng linh hoạt vượt trội để áp dụng cho các đơn vị khác như <b>Đài Kiểm soát không lưu, Trạm Radar, Trạm Viễn thông / Trạm quan trắc thời tiết</b>:"""
    story.append(Paragraph(intro_p2, styles['Normal']))
    story.append(Spacer(1, 6))
    story.append(Paragraph("• <b>Không phụ thuộc phần cứng thiết bị:</b> Module thu thập dữ liệu (viết bằng Python) hoạt động độc lập trên một PC nội bộ tại trạm. Khi áp dụng cho đơn vị khác, chỉ cần thay đổi địa chỉ IP, OID (nếu dùng SNMP) hoặc đường dẫn HTTP thô mà không cần sửa đổi bất kỳ logic nào ở Cloud Backend.", bullet_style))
    story.append(Paragraph("• <b>Không tốn chi phí đầu tư máy chủ (Zero Server Cost):</b> Toàn bộ cơ sở dữ liệu, API backend và giao diện người dùng đều chạy trên hạ tầng Serverless của Cloudflare (Pages, Workers, D1 Database, KV Storage). Hệ thống có khả năng tự động mở rộng (auto-scaling) và đạt độ sẵn sàng 99.99%.", bullet_style))
    story.append(Spacer(1, 14))

    # ─── PHẦN 2: CHI TIẾT CÁC CHỨC NĂNG CỦA ỨNG DỤNG ─────────────────────────
    story.append(Paragraph("PHẦN 2: CHI TIẾT CÁC CHỨC NĂNG CỦA ỨNG DỤNG", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0061A3"), spaceAfter=14))

    story.append(Paragraph("2.1. Module Quản lý Lịch Công Tác (Shift Schedule & Task Management)", h2_style))
    story.append(Paragraph("• <b>Quản lý Lịch trực theo ca (Shift Schedules):</b> Phân chia ca trực rõ ràng: Ca Hành chính (X), Ca 1 (X1), Ca 2 (X2), Ca 3 (Đ). Lịch trực được hiển thị trực quan theo màu sắc riêng biệt kèm theo tên nhân sự trực ban của từng ngày. Hỗ trợ Import lịch trực hàng tháng tự động từ file Excel (.xlsx).", bullet_style))
    story.append(Paragraph("• <b>Quản lý Công việc hàng ngày (Tasks):</b> Cho phép người dùng quyền Quản trị (ADMIN) Thêm, Sửa, Xóa công việc của từng ngày. Mỗi công việc bao gồm: Tên công việc, khung giờ thực hiện, danh sách nhân sự tham gia, trạng thái và ghi chú chi tiết.", bullet_style))
    story.append(Paragraph("• <b>Công việc định kỳ tự động (Recurring Tasks):</b> Hỗ trợ thiết lập các công việc lặp lại tự động theo nhiều mô hình phức tạp của đơn vị như: Định kỳ theo Ngày cố định trong tháng, Định kỳ theo Dải ngày (Date Range), hoặc Định kỳ theo Thứ 6 ưu tiên (Friday Priority).", bullet_style))
    story.append(Paragraph("• <b>Ghi chú nhanh hàng ngày (Daily Notes):</b> Mỗi ngày trên Dashboard cung cấp một mục Ghi chú nhanh để ca trực ghi nhận các sự kiện phát sinh, bàn giao ca hoặc lưu ý quan trọng.", bullet_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("2.2. Module Giám sát Thông số Đài Dẫn Đường (SIRMS / Navaid Monitoring)", h2_style))
    story.append(Paragraph("• <b>Thu thập & Hiển thị thông số thời gian thực:</b> Bảng thông số trực quan hiển thị đầy đủ các thông số quan trọng của đài DVOR (Góc Phương vị, Mod 30Hz, Mod 9960Hz, Độ lệch, Mức RF) và đài DME (Độ trễ, Cự ly xung, Công suất phát, ERP, Hiệu suất).", bullet_style))
    story.append(Paragraph("• <b>Biểu đồ phân tích lịch sử (Historical Charts):</b> Tích hợp biểu đồ ApexCharts cho phép xem biến động của các thông số kỹ thuật trong vòng 48 giờ hoặc 7 ngày qua, hỗ trợ phân tích phát hiện sớm suy giảm chất lượng thiết bị.", bullet_style))
    story.append(Paragraph("• <b>Hệ thống Cảnh báo Ngưỡng Giới Hạn (Navaid Limits):</b> Cho phép thiết lập ngưỡng trên (Max) và ngưỡng dưới (Min) cho từng tham số. Khi thông số vượt ngưỡng, hệ thống tự động phân loại mức độ nghiêm trọng: Cảnh báo (Alert), Báo động (Alarm), Báo động Khẩn cấp (Critical Alarm).", bullet_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("2.3. Cơ chế Bảo mật Đa Tầng & PWA (Security & PWA)", h2_style))
    story.append(Paragraph("• <b>Phân quyền người dùng:</b> Chia làm 2 cấp quyền: ADMIN (Quản trị viên) và VIEWER (Người xem).", bullet_style))
    story.append(Paragraph("• <b>Xác thực PIN & Captcha chống Brute-force:</b> Đăng nhập Fallback bằng Mã PIN (6 số cho Admin, 3 số cho Viewer). Tự động kích hoạt Captcha toán học ngẫu nhiên nếu phát hiện đăng nhập sai quá 5 lần từ một IP (lưu trữ trạng thái qua Cloudflare KV).", bullet_style))
    story.append(Paragraph("• <b>Đăng nhập Sinh trắc học (WebAuthn / Passkeys):</b> Hỗ trợ người dùng đăng nhập siêu nhanh bằng Face ID / Touch ID / Vân tay khi cài đặt ứng dụng thành PWA trên màn hình chính di động. Sử dụng chuẩn WebAuthn V3 kết hợp xác thực chữ ký mã hóa elip (ECDSA P-256) qua Web Crypto API trên Cloudflare Worker.", bullet_style))
    story.append(Paragraph("• <b>PWA Push Notifications:</b> Gửi thông báo đẩy thời gian thực tới điện thoại của kỹ thuật viên ngay khi có thông số vượt ngưỡng cảnh báo.", bullet_style))
    story.append(Spacer(1, 14))

    # ─── PHẦN 3: QUY TRÌNH HOẠT ĐỘNG & THU THẬP DỮ LIỆU ───────────────────────
    story.append(Paragraph("PHẦN 3: QUY TRÌNH HOẠT ĐỘNG & THU THẬP DỮ LIỆU LOCAL", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0061A3"), spaceAfter=14))

    story.append(Paragraph("3.1. Phân tích chi tiết Script Python (navaid_monitor.py)", h2_style))
    py_desc = """Script Python đóng vai trò là 'Trái tim thu thập dữ liệu' tại trạm nội bộ. Script này được thiết kế để chạy liên tục (24/7) dưới dạng một Service/Daemon trên máy tính nội bộ của đài."""
    story.append(Paragraph(py_desc, styles['Normal']))
    story.append(Spacer(1, 6))
    story.append(Paragraph("• <b>Vòng lặp Polling Đa luồng (Multithreaded Polling):</b> Script khởi tạo một luồng nền chạy vòng lặp vô hạn. Mỗi khoảng thời gian mặc định 5 giây, luồng này gửi yêu cầu HTTP GET tới địa chỉ IP của thiết bị phần cứng nội bộ (Ví dụ: http://192.168.105.25/alldata.json hoặc truy vấn SNMP get tới các OID tương ứng).", bullet_style))
    story.append(Paragraph("• <b>Chuẩn hóa & Làm sạch dữ liệu (Data Normalization):</b> Dữ liệu thô từ thiết bị thường chứa các chuỗi văn bản kèm đơn vị (Ví dụ: '24946 degree', '-9 dBm', '1000%'). Script sử dụng hàm <i>safe_float()</i> để tách lọc các ký tự số và chia tỷ lệ (chia 10 hoặc 100) nhằm chuẩn hóa về đúng đơn vị đo lường thực tế (Ví dụ: Góc phương vị 249.46°, Mod 30Hz 29.4 Hz, ERP 1.5 dB, Hiệu suất 100%). Việc chuẩn hóa ngay tại nguồn giúp giảm tải cho D1 Database và đảm bảo tính nhất quán trên toàn hệ thống.", bullet_style))
    story.append(Paragraph("• <b>Phục vụ qua HTTP Flask (HTTP Relay Server):</b> Dữ liệu sau khi làm sạch được lưu vào bộ nhớ đệm chia sẻ. Flask Server mở port 5050 cung cấp 2 endpoint: /navaid (trả về gói JSON chứa trạng thái kết nối và toàn bộ thông số DVOR/DME) và /health (kiểm tra trạng thái server).", bullet_style))
    story.append(Spacer(1, 10))

    # Bảng mô tả các hàm và tham số trong script Python
    story.append(Paragraph("Bảng 1: Các tham số chính và tỷ lệ chuẩn hóa trong Python Script", h3_style))
    table_data = [
        [Paragraph("Tên Tham Số", table_head), Paragraph("Khối Thiết Bị", table_head), Paragraph("Dữ Liệu Thô (Raw)", table_head), Paragraph("Hàm Chuẩn Hóa & Tỷ Lệ", table_head), Paragraph("Kết Quả Chuẩn Hóa", table_head)],
        [Paragraph("Azimuth", table_text), Paragraph("DVOR", table_text), Paragraph("24946 degree", table_text), Paragraph("safe_float(..., 100)", table_text), Paragraph("249.46 °", table_text)],
        [Paragraph("Mod30Hz", table_text), Paragraph("DVOR", table_text), Paragraph("294 Hz", table_text), Paragraph("safe_float(..., 10)", table_text), Paragraph("29.4 Hz", table_text)],
        [Paragraph("Mod9960Hz", table_text), Paragraph("DVOR", table_text), Paragraph("307 Hz", table_text), Paragraph("safe_float(..., 10)", table_text), Paragraph("30.7 Hz", table_text)],
        [Paragraph("Deviation", table_text), Paragraph("DVOR", table_text), Paragraph("1615", table_text), Paragraph("safe_float(..., 100)", table_text), Paragraph("16.15", table_text)],
        [Paragraph("RFLevel", table_text), Paragraph("DVOR", table_text), Paragraph("-9 dBm", table_text), Paragraph("safe_float(..., 10)", table_text), Paragraph("-0.9 dBm", table_text)],
        [Paragraph("Delay", table_text), Paragraph("DME", table_text), Paragraph("5001 us", table_text), Paragraph("safe_float(..., 100)", table_text), Paragraph("50.01 µs", table_text)],
        [Paragraph("Spacing", table_text), Paragraph("DME", table_text), Paragraph("1198 us", table_text), Paragraph("safe_float(..., 100)", table_text), Paragraph("11.98 µs", table_text)],
        [Paragraph("TxPower", table_text), Paragraph("DME", table_text), Paragraph("1061 Watts", table_text), Paragraph("safe_float(..., 1)", table_text), Paragraph("1061 W", table_text)],
        [Paragraph("ERP", table_text), Paragraph("DME", table_text), Paragraph("15", table_text), Paragraph("safe_float(..., 10)", table_text), Paragraph("1.5 dB", table_text)],
        [Paragraph("Efficiency", table_text), Paragraph("DME", table_text), Paragraph("1000%", table_text), Paragraph("safe_float(..., 10)", table_text), Paragraph("100 %", table_text)],
    ]
    t1 = Table(table_data, colWidths=[75, 60, 100, 140, 129])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0061A3")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#DDDDDD")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F9F9F9")]),
        ('BOTTOMPADDING', (0,1), (-1,-1), 6),
        ('TOPPADDING', (0,1), (-1,-1), 6),
    ]))
    story.append(t1)
    story.append(Spacer(1, 14))

    # ─── PHẦN 4: HƯỚNG DẪN CẤU HÌNH HỆ SINH THÁI CLOUDFLARE ───────────────────
    story.append(Paragraph("PHẦN 4: HƯỚNG DẪN CẤU HÌNH HỆ SINH THÁI CLOUDFLARE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0061A3"), spaceAfter=14))

    story.append(Paragraph("4.1. Cloudflare Tunnel & Cấu hình Tunnel-API", h2_style))
    tun_desc = """Cloudflare Tunnel (sử dụng daemon <i>cloudflared</i>) tạo một đường hầm bảo mật kết nối trực tiếp từ máy tính nội bộ ra mạng internet mà không cần mở port trên Modem/Router (Không cần NAT port, tránh hoàn toàn rủi ro bị tấn công DDoS trực tiếp vào IP trạm)."""
    story.append(Paragraph(tun_desc, styles['Normal']))
    story.append(Spacer(1, 6))
    story.append(Paragraph("• <b>Bước 1:</b> Truy cập Cloudflare Dashboard -> Zero Trust -> Networks -> Tunnels. Chọn Create a tunnel, đặt tên (Ví dụ: tunnel-tuyhoa-navaid).", bullet_style))
    story.append(Paragraph("• <b>Bước 2:</b> Cài đặt cloudflared daemon trên PC nội bộ theo lệnh hướng dẫn của Cloudflare (hỗ trợ Windows/Linux/macOS).", bullet_style))
    story.append(Paragraph("• <b>Bước 3 (Cấu hình Public Hostname):</b> Thiết lập Subdomain: <i>sirms-api</i>, Domain: <i>hainh.io.vn</i>, Service: <i>http://localhost:5050</i> (Trỏ đúng vào port của Flask server).", bullet_style))
    story.append(Paragraph("• <b>Bước 4 (Cấu hình Bảo mật WAF):</b> Để ngăn chặn các truy cập trái phép từ bên ngoài cào dữ liệu của đài qua đường dẫn sirms-api.hainh.io.vn, truy cập mục WAF -> Custom Rules. Tạo rule mới: <i>If (Hostname equals 'sirms-api.hainh.io.vn' AND Header 'authorization' does not equal 'nguyenhoanghai1992') -> Action: Block</i>. Kết quả: Chỉ có Cloudflare Worker (được cấu hình gửi kèm header authorization) mới có thể đi qua đường hầm để lấy dữ liệu.", bullet_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("4.2. Cloudflare D1 Database (SQL Serverless)", h2_style))
    d1_desc = """D1 là cơ sở dữ liệu quan hệ nền tảng SQLite chạy trên các edge server của Cloud-flare. Khởi tạo D1 bằng lệnh: <i>npx wrangler d1 create lichcongtac-db</i>. Lược đồ các bảng cốt lõi bao gồm:"""
    story.append(Paragraph(d1_desc, styles['Normal']))
    story.append(Spacer(1, 6))
    story.append(Paragraph("• <b>Bảng tasks:</b> Lưu trữ công việc hàng ngày (id, title, date, startTime, endTime, personnel, status, notes).", bullet_style))
    story.append(Paragraph("• <b>Bảng shift_schedules:</b> Lưu trữ lịch trực ban theo tháng (id, month, date, personName, shiftType).", bullet_style))
    story.append(Paragraph("• <b>Bảng sirms_data & navaid_limits:</b> Lưu trữ lịch sử thông số đài dẫn đường và các ngưỡng cảnh báo trên/dưới.", bullet_style))
    story.append(Paragraph("• <b>Bảng push_subscriptions & webauthn_credentials:</b> Lưu trữ thông tin đăng ký PWA Web Push và khóa công khai sinh trắc học (Passkeys).", bullet_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("4.3. Cloudflare KV Namespace (Key-Value Storage)", h2_style))
    kv_desc = """KV Namespace được sử dụng làm bộ nhớ đệm siêu tốc (Low-latency Caching) cho các nghiệp vụ đòi hỏi tốc độ cao và tự động hết hạn (TTL):"""
    story.append(Paragraph(kv_desc, styles['Normal']))
    story.append(Spacer(1, 6))
    story.append(Paragraph("• <b>Bảo mật Đăng nhập:</b> Lưu trữ số lần đăng nhập sai của IP (login_fail_${ip}) và mã giải Captcha (captcha_ans_${ip}) với TTL 300s.", bullet_style))
    story.append(Paragraph("• <b>WebAuthn Challenges:</b> Lưu trữ chuỗi challenge ngẫu nhiên trong quy trình đăng ký và đăng nhập sinh trắc học (webauthn_reg_challenge_${ip} và webauthn_login_challenge_${ip}).", bullet_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("4.4. Cloudflare Worker & Cron Trigger (Backend Automation)", h2_style))
    wk_desc = """sirms-worker là một Cloudflare Worker độc lập đảm nhiệm vai trò tự động hóa việc thu thập dữ liệu định kỳ và phát còi cảnh báo. Trong file <i>wrangler.toml</i>, thiết lập Cron Trigger <b>crons = ['0/15 * * * *']</b> để worker tự động chạy mỗi 15 phút."""
    story.append(Paragraph(wk_desc, styles['Normal']))
    story.append(Spacer(1, 6))
    story.append(Paragraph("• <b>Quy trình xử lý của Worker:</b> Khi Cron Trigger kích hoạt, Worker gọi lệnh fetch tới Tunnel API (kèm Auth Header) -> Lưu gói JSON vào bảng sirms_data trong D1 -> Xóa dữ liệu cũ quá 48 giờ -> So khớp thông số với bảng navaid_limits. Nếu phát hiện vượt ngưỡng, Worker ký tạo JWT bằng VAPID keys và bắn Push Notification tới điện thoại di động của kỹ thuật viên.", bullet_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("4.5. Cloudflare Pages & K1 Nameserver", h2_style))
    pg_desc = """• <b>Cloudflare Pages:</b> Đóng gói toàn bộ ứng dụng React 19 Frontend (thư mục dist) và các file API backend (thư mục functions). Triển khai lên Pages thông qua lệnh <i>npm run deploy</i>. Cloudflare Pages tự động cung cấp chứng chỉ SSL/TLS (HTTPS) miễn phí và định tuyến các file trong thư mục functions/api thành các Serverless API endpoints.<br/>• <b>K1 Nameserver (Quản lý DNS):</b> Tên miền của đơn vị được trỏ về hệ thống Nameserver của Cloudflare (Ví dụ: k1.cloudflare.com). Tại đây, các bản ghi DNS được quản lý tập trung, hỗ trợ proxy (cờ đám mây màu cam) để tận dụng CDN và WAF."""
    story.append(Paragraph(pg_desc, styles['Normal']))
    story.append(Spacer(1, 14))

    # ─── PHẦN 5: TỔNG KẾT & KHUYẾN NGHỊ TRIỂN KHAI ────────────────────────────
    story.append(Paragraph("PHẦN 5: TỔNG KẾT & KHUYẾN NGHỊ TRIỂN KHAI", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0061A3"), spaceAfter=14))

    story.append(Paragraph("5.1. Đánh giá Hiệu quả", h2_style))
    story.append(Paragraph("• <b>Về Kỹ thuật:</b> Hệ thống hoạt động mượt mà, ổn định 24/7. Việc tích hợp PWA và đăng nhập sinh trắc học (Face ID/Touch ID) mang lại trải nghiệm sử dụng tiện lợi, hiện đại như một ứng dụng Native trên iOS/Android. Kiến trúc Serverless giúp hệ thống miễn nhiễm với các cuộc tấn công mạng thông thường.", bullet_style))
    story.append(Paragraph("• <b>Về Kinh tế:</b> Hệ thống tận dụng triệt để hệ sinh thái miễn phí/chi phí thấp của Cloudflare, loại bỏ hoàn toàn chi phí mua sắm, vận hành và bảo trì máy chủ vật lý hay VPS hàng tháng.", bullet_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("5.2. Khuyến nghị Nhân rộng", h2_style))
    concl = """Với khả năng linh hoạt cao trong việc thay đổi nguồn thu thập dữ liệu (chỉ cần cấu hình lại IP/OID trong script Python local), giải pháp này hoàn toàn đáp ứng đầy đủ tiêu chuẩn kỹ thuật để triển khai nhân rộng cho toàn bộ các đài dẫn đường (VOR/DME/NDB), trạm Radar và đài Kiểm soát không lưu trong toàn Tổng công ty Quản lý bay Việt Nam (VATM)."""
    story.append(Paragraph(concl, styles['Normal']))

    # Xây dựng tài liệu
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == "__main__":
    build_pdf()
