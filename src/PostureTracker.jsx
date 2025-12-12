import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, ReferenceLine 
} from 'recharts';
import mqtt from 'mqtt';

// --- MQTT CONFIGURATION ---
const BROKER_URL = 'ws://10.192.37.112:9001'//broker.hivemq.com:8000/mqtt';
const TOPIC_DATA = 'posture/project/data';
const TOPIC_THRESHOLD = 'posture/project/threshold';

// Max readings to keep in memory for charts
const MAX_READINGS = 100;

const users = [
  { id: 1, name: 'Nathan', avatar: '👨‍💻' },
  { id: 2, name: 'Alex', avatar: '👩‍🔬' },
  { id: 3, name: 'Jordan', avatar: '🧑‍💼' },
];

export default function PostureTracker() {
  // --- UI State ---
  const [activeView, setActiveView] = useState('live');
  const [selectedUser, setSelectedUser] = useState(users[0]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pulseEnabled, setPulseEnabled] = useState(true);

  // --- MQTT State ---
  const [client, setClient] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [threshold, setThreshold] = useState(30);
  
  // --- Sensor Data ---
  const [currentData, setCurrentData] = useState({
    pitch: 0,
    roll: 0,
    yaw: 0,
    calibrated: false,
  });
  
  // --- Historical Data for Charts ---
  const [readings, setReadings] = useState([]);
  const [dailySummary, setDailySummary] = useState([]);
  const readingCountRef = useRef(0);

  // --- MQTT Connection ---
  useEffect(() => {
    console.log('Connecting to MQTT broker...');
    const mqttClient = mqtt.connect(BROKER_URL);

    mqttClient.on('connect', () => {
      setConnectionStatus('Connected');
      console.log('MQTT Connected!');
      mqttClient.subscribe(TOPIC_DATA, (err) => {
        if (!err) console.log(`Subscribed to ${TOPIC_DATA}`);
      });
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT Error:', err);
      setConnectionStatus('Error');
    });

    mqttClient.on('close', () => {
      setConnectionStatus('Disconnected');
    });

    mqttClient.on('message', (topic, message) => {
      if (topic === TOPIC_DATA) {
        try {
          const payload = JSON.parse(message.toString());
          setCurrentData(payload);
          
          // Update threshold from Pi if different
          if (payload.threshold !== undefined) {
            setThreshold(payload.threshold);
          }
          
          // Store reading for chart (throttled - every 10th reading at 50Hz = 5 per second)
          readingCountRef.current += 1;
          if (readingCountRef.current % 10 === 0) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            });
            
            setReadings(prev => {
              const newReadings = [...prev, {
                time: timeStr,
                pitch: Math.abs(payload.pitch),
                roll: Math.abs(payload.roll),
                yaw: payload.yaw,
                timestamp: Date.now(),
              }];
              // Keep only last MAX_READINGS
              return newReadings.slice(-MAX_READINGS);
            });
          }
        } catch (e) {
          console.error("Error parsing JSON from Pi:", e);
        }
      }
    });

    setClient(mqttClient);

    return () => {
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, []);

  // --- Handle Threshold Change ---
  const handleThresholdChange = (e) => {
    const newValue = parseInt(e.target.value);
    setThreshold(newValue);
    
    // Publish to Pi
    if (client && connectionStatus === 'Connected') {
      client.publish(TOPIC_THRESHOLD, newValue.toString());
      console.log(`Published threshold: ${newValue}`);
    }
  };

  // --- Slouch Detection ---
  const isSlouching = Math.abs(currentData.pitch) > threshold && currentData.calibrated;

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    if (readings.length === 0) {
      return {
        avgAngle: '0.0',
        goodPosturePercent: '100',
        alertCount: 0,
        totalReadings: 0,
      };
    }
    
    const angles = readings.map(r => r.pitch);
    const avg = angles.reduce((a, b) => a + b, 0) / angles.length;
    const goodCount = readings.filter(r => r.pitch <= threshold).length;
    const alertCount = readings.filter(r => r.pitch > threshold).length;
    
    return {
      avgAngle: avg.toFixed(1),
      goodPosturePercent: ((goodCount / readings.length) * 100).toFixed(0),
      alertCount,
      totalReadings: readings.length,
    };
  }, [readings, threshold]);

  // --- Custom Tooltip ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div style={{
          background: 'white',
          padding: '12px 16px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          border: 'none',
        }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#1a1a2e', fontSize: '13px' }}>{label}</p>
          <p style={{ 
            margin: '4px 0 0', 
            color: value > threshold ? '#e07a5f' : '#81b29a',
            fontWeight: 600,
            fontSize: '15px',
          }}>
            {value.toFixed(1)}° pitch
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: isSlouching 
        ? 'linear-gradient(180deg, #fff5f5 0%, #ffe5e5 100%)' 
        : 'linear-gradient(180deg, #ffffff 0%, #f8f9fc 100%)',
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '24px',
      boxSizing: 'border-box',
      transition: 'background 0.3s ease',
    }}>
      <style>{`
        * { box-sizing: border-box; }
        
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .view-toggle {
          display: flex;
          background: #f0f2f5;
          border-radius: 16px;
          padding: 4px;
          gap: 4px;
        }
        
        .view-btn {
          padding: 12px 28px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }
        
        .view-btn.active {
          background: white;
          color: #1a1a2e;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        .view-btn:not(.active) {
          background: transparent;
          color: #6b7280;
        }
        
        .view-btn:not(.active):hover {
          color: #1a1a2e;
        }
        
        .stat-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        
        .stat-card.alert {
          animation: pulse 1s infinite;
          box-shadow: 0 4px 20px rgba(224, 122, 95, 0.3);
        }
        
        .threshold-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: linear-gradient(90deg, #81b29a 0%, #f2cc8f 50%, #e07a5f 100%);
          outline: none;
          margin: 16px 0;
        }
        
        .threshold-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: white;
          border: 3px solid #3d5a80;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transition: all 0.2s ease;
        }
        
        .threshold-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .user-dropdown {
          position: relative;
        }
        
        .user-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        
        .user-btn:hover {
          border-color: #3d5a80;
          box-shadow: 0 4px 12px rgba(61, 90, 128, 0.1);
        }
        
        .user-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          padding: 8px;
          min-width: 180px;
          z-index: 100;
          animation: slideDown 0.2s ease;
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .user-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s ease;
          border: none;
          background: none;
          width: 100%;
          font-family: inherit;
          font-size: 14px;
        }
        
        .user-option:hover {
          background: #f0f2f5;
        }
        
        .pulse-toggle {
          position: relative;
          width: 56px;
          height: 32px;
          background: #e5e7eb;
          border-radius: 16px;
          cursor: pointer;
          transition: background 0.3s ease;
          border: none;
        }
        
        .pulse-toggle.active {
          background: #81b29a;
        }
        
        .pulse-toggle::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 4px;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .pulse-toggle.active::after {
          transform: translateX(24px);
        }
        
        .chart-container {
          background: white;
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: #f0fdf4;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: #16a34a;
        }
        
        .live-dot {
          width: 8px;
          height: 8px;
          background: #16a34a;
          border-radius: 50%;
          animation: blink 1s infinite;
        }
        
        .connection-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }
        
        .connection-badge.connected {
          background: #f0fdf4;
          color: #16a34a;
        }
        
        .connection-badge.disconnected {
          background: #fef2f2;
          color: #dc2626;
        }
        
        .angle-display {
          font-size: 72px;
          font-weight: 700;
          font-family: 'Space Mono', monospace;
          line-height: 1;
        }
        
        .slouch-alert {
          animation: blink 1s infinite;
          color: #dc2626;
          font-weight: 700;
          font-size: 18px;
          margin-top: 12px;
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        maxWidth: '1200px',
        margin: '0 auto 32px',
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#1a1a2e',
            margin: 0,
            letterSpacing: '-0.5px',
          }}>
            Posture Pulse
          </h1>
          <p style={{
            color: '#6b7280',
            margin: '4px 0 0',
            fontSize: '15px',
          }}>
            Real-time posture monitoring · IMU + MQTT
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Connection Status */}
          <div className={`connection-badge ${connectionStatus === 'Connected' ? 'connected' : 'disconnected'}`}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connectionStatus === 'Connected' ? '#16a34a' : '#dc2626',
            }}></span>
            {connectionStatus}
          </div>

          {/* User Dropdown */}
          <div className="user-dropdown">
            <button 
              className="user-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span style={{ fontSize: '24px' }}>{selectedUser.avatar}</span>
              <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{selectedUser.name}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: '4px' }}>
                <path d="M4 6L8 10L12 6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {showUserMenu && (
              <div className="user-menu">
                {users.map(user => (
                  <button
                    key={user.id}
                    className="user-option"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowUserMenu(false);
                    }}
                    style={{
                      fontWeight: user.id === selectedUser.id ? 600 : 400,
                      background: user.id === selectedUser.id ? '#f0f2f5' : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{user.avatar}</span>
                    <span style={{ color: '#1a1a2e' }}>{user.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* View Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div className="view-toggle">
            <button
              className={`view-btn ${activeView === 'live' ? 'active' : ''}`}
              onClick={() => setActiveView('live')}
            >
              Live
            </button>
            <button
              className={`view-btn ${activeView === 'history' ? 'active' : ''}`}
              onClick={() => setActiveView('history')}
            >
              History
            </button>
          </div>

          {/* Calibration Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: currentData.calibrated ? '#f0fdf4' : '#fef3c7',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            color: currentData.calibrated ? '#16a34a' : '#d97706',
          }}>
            {currentData.calibrated ? '✅ Calibrated' : '⏳ Calibrating... Sit still'}
          </div>
        </div>

        {/* Live View - Main Angle Display */}
        {activeView === 'live' && (
          <div className={`chart-container ${isSlouching ? 'alert' : ''}`} style={{ 
            marginBottom: '28px',
            background: isSlouching ? '#fef2f2' : 'white',
            textAlign: 'center',
            padding: '40px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </div>
            </div>
            
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#6b7280', margin: '0 0 12px' }}>
              Current Pitch Angle
            </h2>
            
            <div className="angle-display" style={{
              color: isSlouching ? '#dc2626' : Math.abs(currentData.pitch) > threshold * 0.7 ? '#f59e0b' : '#16a34a',
            }}>
              {Math.abs(currentData.pitch).toFixed(1)}°
            </div>
            
            {isSlouching && (
              <div className="slouch-alert">
                ⚠️ SLOUCH DETECTED - Straighten up! ⚠️
              </div>
            )}
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '40px',
              marginTop: '24px',
              color: '#6b7280',
              fontSize: '14px',
            }}>
              <div>
                <span style={{ fontWeight: 600 }}>Roll:</span> {currentData.roll.toFixed(1)}°
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Yaw:</span> {currentData.yaw.toFixed(1)}°
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}>
          <div className={`stat-card ${isSlouching ? 'alert' : ''}`}>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Angle
            </p>
            <p style={{
              fontSize: '36px',
              fontWeight: 700,
              color: isSlouching ? '#dc2626' : '#81b29a',
              margin: 0,
              fontFamily: "'Space Mono', monospace",
            }}>
              {Math.abs(currentData.pitch).toFixed(1)}°
            </p>
          </div>

          <div className="stat-card">
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Session Avg
            </p>
            <p style={{
              fontSize: '36px',
              fontWeight: 700,
              color: parseFloat(stats.avgAngle) > threshold ? '#e07a5f' : '#81b29a',
              margin: 0,
              fontFamily: "'Space Mono', monospace",
            }}>
              {stats.avgAngle}°
            </p>
          </div>

          <div className="stat-card">
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Good Posture
            </p>
            <p style={{
              fontSize: '36px',
              fontWeight: 700,
              color: stats.goodPosturePercent >= 70 ? '#81b29a' : stats.goodPosturePercent >= 50 ? '#f2cc8f' : '#e07a5f',
              margin: 0,
              fontFamily: "'Space Mono', monospace",
            }}>
              {stats.goodPosturePercent}%
            </p>
          </div>

          <div className="stat-card">
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Slouch Alerts
            </p>
            <p style={{
              fontSize: '36px',
              fontWeight: 700,
              color: stats.alertCount > 10 ? '#e07a5f' : '#3d5a80',
              margin: 0,
              fontFamily: "'Space Mono', monospace",
            }}>
              {stats.alertCount}
            </p>
          </div>
        </div>

        {/* Live Chart */}
        <div className="chart-container" style={{ marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#1a1a2e',
                margin: 0,
              }}>
                {activeView === 'live' ? 'Real-Time Pitch Angle' : 'Session History'}
              </h2>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '4px 0 0' }}>
                {readings.length} readings this session
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#6b7280',
            }}>
              <span style={{
                width: '12px',
                height: '12px',
                background: '#3d5a80',
                borderRadius: '3px',
              }}></span>
              Pitch
              <span style={{
                width: '20px',
                height: '2px',
                background: '#e07a5f',
                marginLeft: '8px',
              }}></span>
              Threshold
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={readings}>
              <defs>
                <linearGradient id="angleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3d5a80" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#3d5a80" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af" 
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 60]}
                tickFormatter={(v) => `${v}°`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={threshold} 
                stroke="#e07a5f" 
                strokeWidth={2}
                strokeDasharray="8 4"
                label={{ value: `Threshold: ${threshold}°`, position: 'right', fill: '#e07a5f', fontSize: 12 }}
              />
              <Area 
                type="monotone" 
                dataKey="pitch"
                stroke="#3d5a80" 
                strokeWidth={2}
                fill="url(#angleGradient)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Threshold Control Panel */}
        <div className="chart-container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '40px',
            alignItems: 'center',
          }}>
            <div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#1a1a2e',
                margin: '0 0 8px',
              }}>
                Slouch Threshold
              </h2>
              <p style={{
                color: '#6b7280',
                fontSize: '14px',
                margin: '0 0 20px',
                lineHeight: 1.5,
              }}>
                Adjust the angle threshold. Changes are sent to the Raspberry Pi in real-time via MQTT.
              </p>

              <div style={{ position: 'relative', padding: '0 4px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#3d5a80',
                    fontFamily: "'Space Mono', monospace",
                  }}>
                    {threshold}°
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={threshold}
                  onChange={handleThresholdChange}
                  className="threshold-slider"
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#9ca3af',
                  fontWeight: 500,
                }}>
                  <span>5° (Strict)</span>
                  <span>60° (Relaxed)</span>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '24px 32px',
              background: '#f8f9fc',
              borderRadius: '16px',
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Audio Alerts
              </span>
              <button
                className={`pulse-toggle ${pulseEnabled ? 'active' : ''}`}
                onClick={() => setPulseEnabled(!pulseEnabled)}
              />
              <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: pulseEnabled ? '#81b29a' : '#9ca3af',
              }}>
                {pulseEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div style={{
          marginTop: '28px',
          padding: '20px 24px',
          background: '#f0f2f5',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>📡</span>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: '#1a1a2e', fontSize: '14px' }}>
                MQTT: {connectionStatus}
              </p>
              <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '13px' }}>
                Broker: broker.hivemq.com
              </p>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Topics: <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>{TOPIC_DATA}</code>
            {' · '}
            <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>{TOPIC_THRESHOLD}</code>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '40px',
          paddingBottom: '20px',
          color: '#9ca3af',
          fontSize: '13px',
        }}>
          <p style={{ margin: 0 }}>
            Posture Pulse · Built with 💙 for healthier habits
          </p>
        </div>
      </div>
    </div>
  );
}
