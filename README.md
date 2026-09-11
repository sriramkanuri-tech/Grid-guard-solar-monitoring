# 🌞 Grid Guard Solar Monitoring

> **Protect the grid. Power the future. ⚡**

Grid Guard Solar Monitoring is a modern web-based solar energy monitoring platform designed to monitor solar power generation, grid conditions, energy performance, system health, alerts, and ML-based fault detection from a single dashboard.

## ✨ Features

- 📊 **Dashboard** - View important solar and grid parameters at a glance
- 📈 **Analytics** - Analyze system performance and energy data
- ☀️ **Energy Monitoring** - Track solar power and energy generation
- 🔌 **Grid Monitoring** - Monitor voltage, frequency, power factor, and other parameters
- 🔗 **Sensor Connectivity** - Designed for ESP32/STM32 sensor integration
- 🚨 **Alerts** - Display important system conditions and warnings
- 🤖 **ML Detection** - Support for machine-learning-based abnormality and fault detection
- 🔐 **Authentication** - Registration and login system
- ⚙️ **Settings** - Manage system configuration
- 📱 **Responsive UI** - Designed for desktop and mobile screens

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Hardware Integration
- ESP32
- STM32
- Solar and electrical sensors

### Planned Technologies
- Real-time sensor communication
- Machine Learning
- Sensor data synchronization
- Backend/API integration

## 📁 Project Structure

```text
Gridguardsolarmonitoring/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── DashboardHeader.tsx
│   │   ├── DashboardSidebar.tsx
│   │   ├── Navbar.tsx
│   │   └── StatCard.tsx
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── config.ts
│   └── main.tsx
├── package.json
├── vite.config.ts
└── README.md