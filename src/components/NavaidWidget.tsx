import { useState, useEffect, useRef } from 'react';
import { Settings, Check, X } from 'lucide-react';
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
                <input type="text" className="nav-settings-input" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} />
                <div className="nav-settings-actions">
                  <button className="nav-btn-save" onClick={handleSaveUrl}><Check size={14} /> Lưu</button>
                  <button className="nav-btn-cancel" onClick={() => setShowSettings(false)}><X size={14} /> Hủy</button>
                </div>
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
    ["Delay", deviceData?.Delay, "µs"], ["Spacing", deviceData?.Spacing, "µs"],
    ["Tx Power", deviceData?.TxPower, "W"], ["ERP", deviceData?.ERP != null ? (Number(deviceData.ERP)/10).toFixed(1) : null, "dB"],
    ["Efficiency", deviceData?.Efficiency, "%"], ["PRF", deviceData?.PRF, "ppps"],
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
