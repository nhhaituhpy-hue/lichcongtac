import { useState, useEffect, useRef } from 'react';
import { Settings, Check, X } from 'lucide-react';
import { 
  Chart as ChartJS, 
  LineController, 
  LineElement, 
  PointElement, 
  LinearScale, 
  Title, 
  Tooltip, 
  Legend, 
  TimeScale, 
  Filler,
  ChartConfiguration
} from 'chart.js';
import 'chartjs-adapter-moment';
import './NavaidWidget.css';

// Register ChartJS components
ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DEFAULT_API_URL = "https://morale-delivery-chirping.ngrok-free.dev/navaid";
const REFRESH_MS = 5000;

interface NavaidResponse {
  ok: boolean;
  data?: any;
  error?: string;
  lastUpdated?: string;
}

const chartConfigs: Record<string, any> = {
  "Azimuth": { min: 247.5, max: 251.5, unit: "°", color: "#00c8a0" },
  "Mod 30Hz": { min: 25, max: 35, unit: "%", color: "#00c8a0" },
  "Mod 9960Hz": { min: 25, max: 35, unit: "%", color: "#00c8a0" },
  "Deviation": { min: 14, max: 18, unit: "", color: "#00c8a0" },
  "RF Level": { min: -5, max: 5, unit: "dB", color: "#00c8a0" },
  "Delay": { min: 45, max: 55, unit: "µs", color: "#3b9eff" },
  "Spacing": { min: 9, max: 15, unit: "µs", color: "#3b9eff" },
  "Tx Power": { min: 800, max: 1200, unit: "W", color: "#3b9eff" },
  "ERP": { min: -2, max: 2, unit: "dB", color: "#3b9eff" },
  "Efficiency": { min: 90, max: 110, unit: "%", color: "#3b9eff" }
};

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

  // Chart state
  const [selectedParam, setSelectedParam] = useState<string | null>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);

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

  // Handle chart rendering
  useEffect(() => {
    if (selectedParam && chartCanvasRef.current) {
      fetchHistory(selectedParam);
    }
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [selectedParam]);

  const fetchHistory = async (param: string) => {
    try {
      const res = await fetch(`/api/sirms-history?param=${encodeURIComponent(param)}`);
      const historyData = (await res.json()) as any;
      if (historyData.error) throw new Error(historyData.error);
      
      renderChart(param, historyData);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const renderChart = (label: string, history: any[]) => {
    if (!chartCanvasRef.current) return;
    const config = chartConfigs[label] || { color: "#3b9eff" };
    
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const chartConfig: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: [{
          label: label,
          data: history.map((d: any) => ({ x: new Date(d.timestamp).getTime(), y: d.value })),
          borderColor: config.color,
          backgroundColor: config.color + "22",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'hour', displayFormats: { hour: 'HH:mm' } },
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#7a9bbd', font: { size: 10 } }
          },
          y: {
            min: config.min,
            max: config.max,
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: '#e8f4ff', font: { size: 11 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y} ${config.unit || ""}`
            }
          }
        }
      }
    };

    chartInstanceRef.current = new ChartJS(chartCanvasRef.current, chartConfig);
  };

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
    setSelectedParam(null);
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
                <DeviceCard 
                  title="◈ DVOR" 
                  type="vor" 
                  status={data.dvor?.Status} 
                  deviceData={data.dvor} 
                  onParamClick={(label: string) => setSelectedParam(label)}
                />
                <DeviceCard 
                  title="◈ DME" 
                  type="dme" 
                  status={data.dme?.Status} 
                  deviceData={data.dme} 
                  onParamClick={(label: string) => setSelectedParam(label)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Chart Modal */}
      {selectedParam && (
        <div id="sirms-chart-modal" onClick={(e) => e.target === e.currentTarget && setSelectedParam(null)}>
          <div id="sirms-chart-container">
            <div className="chart-header">
              <span className="chart-title" style={{ color: chartConfigs[selectedParam]?.color }}>
                BIỂU ĐỒ: {selectedParam.toUpperCase()}
              </span>
              <button className="nav-close" onClick={() => setSelectedParam(null)}>✕</button>
            </div>
            <div style={{ height: '350px', position: 'relative' }}>
              <canvas ref={chartCanvasRef}></canvas>
            </div>
            <div className="chart-footer">
              Dữ liệu 48h gần nhất • Lấy từSIRMS Database
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DeviceCard = ({ title, type, status, deviceData, onParamClick }: any) => {
  const main = (deviceData?.Main || "").trim();
  const chartParams = ["Azimuth", "Mod 30Hz", "Mod 9960Hz", "Deviation", "RF Level", "Delay", "Spacing", "Tx Power", "ERP", "Efficiency"];

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
        {params.map(([label, val, unit]: any) => {
          const isClickable = chartParams.includes(label);
          return (
            <div 
              key={label} 
              className={`param-row ${isClickable ? 'clickable' : ''}`}
              onClick={() => isClickable && onParamClick(label)}
            >
              <span className="param-label">{label}</span>
              <span className="param-val">{val ?? "—"}<span className="param-unit">{unit}</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NavaidWidget;
