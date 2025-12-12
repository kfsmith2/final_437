# Posture Pulse

Real-time posture monitoring dashboard using MQTT to communicate with a Raspberry Pi + BNO085 IMU.

## Architecture

```
┌─────────────────┐      MQTT (WebSocket)      ┌─────────────────┐
│  React Frontend │  ◄─────────────────────►   │  Raspberry Pi   │
│  (This App)     │                            │  + BNO085 IMU   │
└─────────────────┘                            └─────────────────┘
        │                                              │
        │  Subscribe: posture/project/data             │  Publish: posture/project/data
        │  Publish: posture/project/threshold          │  Subscribe: posture/project/threshold
        │                                              │
        └──────────────► broker.hivemq.com ◄───────────┘
```

## Quick Start (VS Code)

### Prerequisites
- **Node.js** (v18+) - [nodejs.org](https://nodejs.org/)
- **VS Code** - [code.visualstudio.com](https://code.visualstudio.com/)

### Setup Steps

1. **Open in VS Code**: File → Open Folder → Select `posture-tracker`

2. **Open terminal**: Press `` Ctrl+` ``

3. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```

4. **Open browser**: Click the `http://localhost:5173` link

5. **Start the Pi script**: Run your Python script on the Raspberry Pi

The dashboard will automatically connect to HiveMQ and display live data!

---

## MQTT Configuration

Both the frontend and Pi script use these settings:

| Setting | Value |
|---------|-------|
| Broker | `broker.hivemq.com` |
| WebSocket Port | `8000` (frontend) |
| TCP Port | `1883` (Pi) |
| Data Topic | `posture/project/data` |
| Threshold Topic | `posture/project/threshold` |

### Data Format (Pi → Frontend)

```json
{
  "yaw": 12.34,
  "pitch": 15.67,
  "roll": 3.21,
  "threshold": 30.0,
  "calibrated": true
}
```

### Threshold Format (Frontend → Pi)

```
"25"  // Just the number as a string
```

---

## Features

- ✅ **Live angle display** - Big, color-coded pitch readout
- ✅ **Real-time chart** - Rolling graph of recent readings
- ✅ **Slouch detection** - Visual + background color alerts
- ✅ **Threshold slider** - Adjusts Pi sensitivity via MQTT
- ✅ **Calibration status** - Shows when IMU is ready
- ✅ **Connection status** - MQTT connected/disconnected indicator
- ✅ **Session stats** - Average angle, good posture %, alert count
- ✅ **User selection** - Switch between users

---

## Project Structure

```
posture-tracker/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    └── PostureTracker.jsx   # Main component with MQTT
```

---

## Troubleshooting

### "Disconnected" status
- Check your internet connection
- HiveMQ public broker may be temporarily down
- Try refreshing the page

### No data appearing
- Ensure Pi script is running
- Check Pi has internet access
- Verify topic names match exactly

### PowerShell script error (Windows)
Run this first:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **MQTT.js** - WebSocket MQTT client
- **Recharts** - Charts
- **HiveMQ** - Public MQTT broker
