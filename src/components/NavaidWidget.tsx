import { useState, useEffect, useRef } from 'react';
import { Settings, Check, X } from 'lucide-react';
import './NavaidWidget.css';

const DEFAULT_API_URL = "https://morale-delivery-chirping.ngrok-free.dev/navaid";
const REFRESH_MS = 5000;

interface NavaidResponse {
  ok: boolean;
  data?: any;
  error?: string;
  lastUpdated?: string;
}

const NavaidWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('navaid_api_url') || DEFAULT_API_URL);
  const [tempUrl, setTempUrl] = useState(apiUrl);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('—');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch(apiUrl, {
        cache: "no-store",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = (await res.json()) as NavaidResponse;

      if (json.ok && json.data) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || "Không có dữ liệu");
        setData(null);
      }
      setLastUpdated(json.lastUpdated || new Date().toLocaleTimeString('vi-VN'));
      setLoading(false);
    } catch (err: any) {
      setError("Lỗi kết nối: " + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchData();
      timerRef.current = setInterval(fetchData, REFRESH_MS);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, apiUrl]);

  const handleSaveUrl = () => {
    localStorage.setItem('navaid_api_url', tempUrl);
    setApiUrl(tempUrl);
    setShowSettings(false);
    setLoading(true);
    fetchData();
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowSettings(false);
  };

  return (
    <>
      <button id="navaid-fab" onClick={() => setIsOpen(true)}>
        <span className="pulse-dot"></span>
        📡 DVOR / DME
      </button>

      {isOpen && (
        <div id="navaid-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
          <div id="navaid-popup">
            <div className="nav-header">
              <div className="nav-header-left">
                <div className="nav-logo">🛩️</div>
                <div>
                  <div className="nav-title">SIRMS MONITOR</div>
                  <div className="nav-subtitle">ĐÀI DVOR / DME TUY HÒA</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="nav-settings-btn"
                  onClick={() => setShowSettings(!showSettings)}
                  title="Cài đặt API URL"
                >
                  <Settings size={18} />
                </button>
                <button className="nav-close" onClick={handleClose}>✕</button>
              </div>
            </div>

            {showSettings && (
              <div className="nav-settings-panel">
                <div className="nav-settings-header">Cấu hình Tunnel URL</div>
                <div className="nav-settings-body">
                  <input
                    type="text"
                    className="nav-settings-input"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="https://your-tunnel-url.ngrok.app/navaid"
                  />
                  <div className="nav-settings-actions">
                    <button className="nav-btn-save" onClick={handleSaveUrl}>
                      <Check size={14} /> Lưu
                    </button>
                    <button className="nav-btn-cancel" onClick={() => { setShowSettings(false); setTempUrl(apiUrl); }}>
                      <X size={14} /> Hủy
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="nav-meta">
              <span className={`tag ${data ? 'ok' : 'err'}`}>
                <span className="dot"></span>
                <span>{data ? 'Kết nối' : (error ? 'Lỗi' : 'Đang kết nối...')}</span>
              </span>
              <span>Cập nhật: <b id="nav-updated">{lastUpdated}</b></span>
              <span style={{ marginLeft: 'auto' }}>Tự làm mới: 5s</span>
            </div>

            {loading && !data && <div className="nav-loading">Đang tải dữ liệu từ thiết bị…</div>}
            {error && !data && <div className="nav-error">⚠ {error}</div>}

            {data && (
              <div className="nav-grid">
                <DeviceCard title="◈ DVOR" type="vor" status={data.dvor?.Status} deviceData={data.dvor} />
                <DeviceCard title="◈ DME" type="dme" status={data.dme?.Status} deviceData={data.dme} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const DeviceCard = ({ title, type, status, deviceData }: any) => {
  const main = (deviceData?.Main || "").trim();

  const vorParams = [
    ["Azimuth", deviceData?.Azimuth, "°"],
    ["Mod 30Hz", deviceData?.Mod30Hz, "%"],
    ["Mod 9960Hz", deviceData?.Mod9960Hz, "%"],
    ["Deviation", deviceData?.Deviation, ""],
    ["RF Level", deviceData?.RFLevel, "dB"],
    ["Antenna", deviceData?.Antenna, ""],
    ["Load", deviceData?.Load, ""],
    ["Alert", deviceData?.Alert, ""],
  ];

  const dmeParams = [
    ["Load (Anten)", deviceData?.Load, ""],
    ["Delay", deviceData?.Delay, "µs"],
    ["Spacing", deviceData?.Spacing, "µs"],
    ["Tx Power", deviceData?.TxPower, "W"],
    ["ERP", deviceData?.ERP != null ? (Number(deviceData.ERP) / 10).toFixed(1) : null, "dB"],
    ["Efficiency", deviceData?.Efficiency, "%"],
    ["PRF", deviceData?.PRF, "ppps"],
    ["Alert", deviceData?.Alert, ""],
  ];

  const params = type === 'vor' ? vorParams : dmeParams;

  return (
    <div className="dev-card" data-dev={type}>
      <div className="dev-card-header">
        <span className={`dev-card-title ${type}`}>{title}</span>
        <span className="dev-status-badge">{status || "—"}</span>
      </div>
      <div className="tx-row">
        {["Tx1", "Tx2"].map(tx => {
          const state = (deviceData?.[tx] || "OFF").trim().toUpperCase() === "ON";
          const isMain = (main === tx || main === tx.replace("x", "X")) && state;
          return (
            <div key={tx} className={`tx-pill ${state ? "on" : "off"} ${isMain ? "main-mark" : ""}`}>
              <span className="label">{tx}{isMain ? " ★" : ""}</span>
              {state ? "ON" : "OFF"}
            </div>
          );
        })}
      </div>
      <div className="param-list">
        {params.map(([label, val, unit]: any) => (
          <div key={label} className="param-row">
            <span className="param-label">{label}</span>
            <span className="param-val">{val ?? "—"}<span className="param-unit">{unit}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NavaidWidget;
