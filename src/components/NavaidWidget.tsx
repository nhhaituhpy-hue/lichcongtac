import { useState, useEffect, useRef } from 'react';
import { Settings, Check, X, Bell, BellOff, AlertTriangle, ShieldAlert } from 'lucide-react';
import './NavaidWidget.css';

// Access ApexCharts from window
const ApexCharts = (window as any).ApexCharts;

const DEFAULT_API_URL = "https://morale-delivery-chirping.ngrok-free.dev/navaid";
const REFRESH_MS = 5000;

interface NavaidResponse {
  ok: boolean;
  data?: any;
  error?: string;
  lastUpdated?: string;
}

const chartConfigs: Record<string, any> = {
  "Azimuth": { min: 247.5, max: 251.5, unit: "°", color: "#00ffcc" },
  "Mod 30Hz": { min: 25, max: 35, unit: "%", color: "#00ffcc" },
  "Mod 9960Hz": { min: 25, max: 35, unit: "%", color: "#00ffcc" },
  "Deviation": { min: 14, max: 18, unit: "", color: "#00ffcc" },
  "RF Level": { min: -5, max: 5, unit: "dB", color: "#00ffcc" },
  "Delay": { min: 45, max: 55, unit: "µs", color: "#3399ff" },
  "Spacing": { min: 9, max: 15, unit: "µs", color: "#3399ff" },
  "Tx Power": { min: 800, max: 1200, unit: "W", color: "#3399ff" },
  "ERP": { min: -2, max: 2, unit: "dB", color: "#3399ff" },
  "Efficiency": { min: 90, max: 110, unit: "%", color: "#3399ff" }
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
  const [selectedParam, setSelectedParam] = useState<string | null>(null);
  
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [limits, setLimits] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'api' | 'limits'>('api');
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<any>(null);

  const fetchData = async () => {
    try {
      const res = await fetch(apiUrl, { cache: "no-store", headers: { "ngrok-skip-browser-warning": "true" } });
      const json = await res.json() as NavaidResponse;
      if (json.ok && json.data) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || "Không có dữ liệu");
        setData(null);
      }
      setLastUpdated(json.lastUpdated || new Date().toLocaleTimeString('vi-VN'));
    } catch (err: any) {
      setError("Lỗi kết nối: " + err.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchData();
      timerRef.current = setInterval(fetchData, REFRESH_MS);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isOpen, apiUrl]);

  const fetchHistory = async (param: string) => {
    setIsChartLoading(true);
    try {
      const res = await fetch(`/api/sirms-history?param=${encodeURIComponent(param)}`);
      const d = await res.json();
      setHistoryData(Array.isArray(d) ? d : []);
    } catch (err) {
      setHistoryData([]);
    } finally {
      setIsChartLoading(false);
    }
  };

  useEffect(() => {
    if (selectedParam) fetchHistory(selectedParam);
  }, [selectedParam]);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      });
    }
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      const res = await fetch('/api/navaid-limits');
      const data = await res.json();
      setLimits(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Failed to fetch limits", e); }
  };

  const handleSubscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      // VAPID key should be provided by the user in env or settings
      // Using a placeholder for now - User must replace this or it will fail
      const VAPID_PUBLIC_KEY = "BPYZysmdIBpeaNA6eHGp95LyX--OBHsOX10sUinDTJ5j_Gz06hUlRckWHb9Q7knkMHPkAXV6hYS_iHYZo6l6RMY"; 
      
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY
      });

      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub })
      });
      setIsSubscribed(true);
      alert("Đã đăng ký nhận thông báo thành công!");
    } catch (err) {
      console.error("Subscription failed", err);
      alert("Lỗi đăng ký: " + (err as Error).message);
    }
  };

  const handleSaveLimits = async () => {
    try {
      await fetch('/api/navaid-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(limits)
      });
      alert("Đã lưu giới hạn thành công!");
    } catch (e) { alert("Lỗi lưu giới hạn"); }
  };

  // ApexCharts Integration
  useEffect(() => {
    if (!selectedParam || !chartRef.current || !ApexCharts) return;

    const config = chartConfigs[selectedParam] || { color: '#00ffcc' };
    
    // Prepare Data for ApexCharts with TX info
    const seriesData = historyData
      .map(d => {
        const ts = Date.parse(String(d.timestamp).replace(' ', 'T'));
        let val = parseFloat(String(d.value));
        if (selectedParam === 'ERP') val = val / 10;
        return { x: ts, y: val, tx: d.tx || '—' };
      })
      .filter(p => !isNaN(p.x) && !isNaN(p.y))
      .sort((a, b) => a.x - b.x)
      .filter((p, i, self) => i === 0 || p.x > self[i - 1].x);

    // Detect TX Switches for Annotations
    const annotations: any[] = [];
    for (let i = 1; i < seriesData.length; i++) {
      if (seriesData[i].tx !== seriesData[i - 1].tx) {
        annotations.push({
          x: seriesData[i].x,
          borderColor: '#feb019',
          label: {
            borderColor: '#feb019',
            style: { color: '#fff', background: '#feb019', fontSize: '10px' },
            text: `Chuyển ${seriesData[i].tx}`,
            offsetY: 0
          }
        });
      }
    }

    const options = {
      series: [{
        name: selectedParam,
        data: seriesData
      }],
      chart: {
        type: 'area',
        height: 350,
        animations: { enabled: false },
        toolbar: {
          show: true,
          autoSelected: 'pan',
          tools: { download: false, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true }
        },
        zoom: {
          enabled: true,
          type: 'xy',
          autoScaleYaxis: true
        },
        background: 'transparent',
        foreColor: '#ffffff'
      },
      annotations: {
        xaxis: annotations
      },
      theme: { mode: 'dark' },
      colors: [config.color],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] }
      },
      xaxis: {
        type: 'datetime',
        labels: { 
          datetimeUTC: false, 
          style: { colors: '#ffffff' },
          datetimeFormatter: {
            year: 'yyyy',
            month: "MMM 'yy",
            day: 'dd MMM',
            hour: 'HH:mm'
          }
        },
        axisBorder: { show: true, color: '#1e3a5f' }
      },
      yaxis: {
        min: config.min,
        max: config.max,
        forceNiceScale: true,
        labels: { 
          formatter: (v: number) => v != null ? v.toFixed(2) + config.unit : v,
          style: { colors: '#ffffff' }
        },
        axisBorder: { show: true, color: '#1e3a5f' }
      },
      tooltip: { 
        x: { format: 'dd/MM HH:mm:ss' }, 
        theme: 'dark',
        y: {
          title: {
            formatter: (seriesName: string, { series, seriesIndex, dataPointIndex, w }: any) => {
              const tx = w.config.series[seriesIndex].data[dataPointIndex]?.tx;
              return `${seriesName} (Máy: ${tx}) :`;
            }
          }
        }
      },
      grid: { borderColor: '#1e3a5f', strokeDashArray: 4 },
      noData: {
        text: 'Đang tải hoặc chưa có dữ liệu...',
        align: 'center',
        verticalAlign: 'middle',
        style: { color: '#7a9bbd', fontSize: '14px' }
      }
    };

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new ApexCharts(chartRef.current, options);
    chartInstance.current.render();

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [selectedParam, historyData]);

  const handleSaveUrl = () => {
    localStorage.setItem('navaid_api_url', tempUrl);
    setApiUrl(tempUrl);
    setShowSettings(false);
    fetchData();
  };

  const handleClose = () => { setIsOpen(false); setSelectedParam(null); };

  return (
    <>
      <button id="navaid-fab" onClick={() => setIsOpen(true)}>
        <span className="pulse-dot"></span> 📡 DVOR / DME
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
                <button className="nav-settings-btn" onClick={() => setShowSettings(!showSettings)}><Settings size={18} /></button>
                <button className="nav-close" onClick={handleClose}>✕</button>
              </div>
            </div>

            {showSettings && (
              <div className="nav-settings-panel">
                <div className="settings-tabs">
                  <button className={activeTab === 'api' ? 'active' : ''} onClick={() => setActiveTab('api')}>Kết nối</button>
                  <button className={activeTab === 'limits' ? 'active' : ''} onClick={() => setActiveTab('limits')}>Ngưỡng cảnh báo</button>
                </div>

                {activeTab === 'api' ? (
                  <>
                    <label className="settings-label">URL API Giám sát</label>
                    <input type="text" className="nav-settings-input" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} />
                    <div className="push-status-row">
                      <span>Thông báo Push: <b>{isSubscribed ? 'Đã bật' : 'Chưa bật'}</b></span>
                      {!isSubscribed && <button className="btn-subscribe" onClick={handleSubscribe}><Bell size={14} /> Bật thông báo</button>}
                    </div>
                    <div className="nav-settings-actions">
                      <button className="nav-btn-save" onClick={handleSaveUrl}><Check size={14} /> Lưu cấu hình</button>
                    </div>
                  </>
                ) : (
                  <div className="limits-settings">
                    <div className="limits-list">
                      {Object.keys(chartConfigs).map(param => {
                        const limit = limits.find(l => l.param_name === param) || { param_name: param, min_val: chartConfigs[param].min, max_val: chartConfigs[param].max, enabled: 0 };
                        return (
                          <div key={param} className="limit-item">
                            <div className="limit-header">
                              <span className="limit-name">{param}</span>
                              <input type="checkbox" checked={!!limit.enabled} onChange={(e) => {
                                const newLimits = [...limits];
                                const idx = newLimits.findIndex(l => l.param_name === param);
                                if (idx > -1) newLimits[idx].enabled = e.target.checked ? 1 : 0;
                                else newLimits.push({ ...limit, enabled: e.target.checked ? 1 : 0 });
                                setLimits(newLimits);
                              }} />
                            </div>
                            <div className="limit-inputs">
                              <input type="number" step="any" inputMode="decimal" value={limit.min_val ?? ''} onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                const newLimits = [...limits];
                                const idx = newLimits.findIndex(l => l.param_name === param);
                                if (idx > -1) newLimits[idx].min_val = val;
                                else newLimits.push({ ...limit, min_val: val });
                                setLimits(newLimits);
                              }} placeholder="Min" />
                              <span>-</span>
                              <input type="number" step="any" inputMode="decimal" value={limit.max_val ?? ''} onChange={(e) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                const newLimits = [...limits];
                                const idx = newLimits.findIndex(l => l.param_name === param);
                                if (idx > -1) newLimits[idx].max_val = val;
                                else newLimits.push({ ...limit, max_val: val });
                                setLimits(newLimits);
                              }} placeholder="Max" />
                              <span className="unit">{chartConfigs[param].unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="nav-settings-actions">
                      <button className="nav-btn-save" onClick={handleSaveLimits}><Check size={14} /> Lưu ngưỡng</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="nav-meta">
              <span className={`tag ${data ? 'ok' : 'err'}`}>
                <span className="dot"></span> <span>{data ? 'Kết nối' : 'Lỗi'}</span>
              </span>
              <span>Cập nhật: <b>{lastUpdated}</b></span>
            </div>

            {data && (
              <div className="nav-grid">
                <DeviceCard title="◈ DVOR" type="vor" deviceData={data.dvor} onParamClick={setSelectedParam} />
                <DeviceCard title="◈ DME" type="dme" deviceData={data.dme} onParamClick={setSelectedParam} />
              </div>
            )}
          </div>
        </div>
      )}

      {selectedParam && (
        <div id="sirms-chart-modal" onClick={(e) => e.target === e.currentTarget && setSelectedParam(null)}>
          <div id="sirms-chart-container">
            <div className="chart-header">
              <span className="chart-title" style={{ color: chartConfigs[selectedParam]?.color }}>
                BIỂU ĐỒ: {selectedParam.toUpperCase()}
              </span>
              <button className="nav-close" onClick={() => setSelectedParam(null)}>✕</button>
            </div>
            <div style={{ height: '350px', position: 'relative', width: '100%' }}>
              <div ref={chartRef}></div>
              {isChartLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a1628]/50 z-10 text-xs">Đang tải lịch sử...</div>
              )}
            </div>
            <div className="chart-footer">Dữ liệu 48h gần nhất • SIRMS Database Analytics</div>
          </div>
        </div>
      )}
    </>
  );
};

const DeviceCard = ({ title, type, deviceData, onParamClick }: any) => {
  const main = (deviceData?.Main || "").trim();
  const chartParams = ["Azimuth", "Mod 30Hz", "Mod 9960Hz", "Deviation", "RF Level", "Delay", "Spacing", "Tx Power", "ERP", "Efficiency"];
  const vorParams = [
    ["Azimuth", deviceData?.Azimuth, "°"], ["Mod 30Hz", deviceData?.Mod30Hz, "%"],
    ["Mod 9960Hz", deviceData?.Mod9960Hz, "%"], ["Deviation", deviceData?.Deviation, ""],
    ["RF Level", deviceData?.RFLevel, "dB"], ["Antenna", deviceData?.Antenna, ""],
  ];
  const dmeParams = [
    ["Load", deviceData?.Load, ""],
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
      <div className="dev-card-header"><span className={`dev-card-title ${type}`}>{title}</span><span className="dev-status-badge">{deviceData?.Status || "—"}</span></div>
      <div className="tx-row">
        {["Tx1", "Tx2"].map(tx => {
          const state = (deviceData?.[tx] || "OFF").trim().toUpperCase() === "ON";
          const isMain = (main === tx || main === tx.replace("x", "X")) && state;
          return <div key={tx} className={`tx-pill ${state ? "on" : "off"} ${isMain ? "main-mark" : ""}`}><span className="label">{tx}{isMain ? " ★" : ""}</span> {state ? "ON" : "OFF"}</div>;
        })}
      </div>
      <div className="param-list">
        {params.map(([label, val, unit]: any) => {
          const canClick = chartParams.includes(label);
          return <div key={label} className={`param-row ${canClick ? 'clickable' : ''}`} onClick={() => canClick && onParamClick(label)}><span className="param-label">{label}</span><span className="param-val">{val ?? "—"}<span className="param-unit">{unit}</span></span></div>;
        })}
      </div>
    </div>
  );
};

export default NavaidWidget;
