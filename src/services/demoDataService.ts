import type { GridData, GridHistoryPoint } from "../types/grid";
import type { SensorData } from "../types/sensor";
import type { Alert } from "../types/alert";

class DemoDataService {
  private gridData: GridData = {
    solarPower: 4.82,
    energyToday: 45.2,
    gridVoltage: 230.4,
    batteryPercentage: 82,
    systemStatus: "online",
    gridCurrent: 12.4,
    gridFrequency: 50.02,
    powerFactor: 0.96,
    temperature: 28.6,
    systemEfficiency: 91.8,
    co2SavedToday: 18.6,
    activeAlertsCount: 2,
    mlHealthScore: 92.4,
    updatedAt: new Date().toISOString(),
    isDemo: true,
  };

  private sensors: SensorData[] = [
    {
      id: "sens-001",
      name: "Inverter Chamber A",
      room: "Inverter Shed #1",
      temperature: 28.6,
      humidity: 62,
      pressure: 1008,
      status: "normal",
      connectionType: "ESP32",
      endpoint: "192.168.1.120:8080",
      lastSeen: "Just now",
    },
    {
      id: "sens-002",
      name: "Rooftop PV String #1",
      room: "North Array",
      temperature: 34.2,
      humidity: 58,
      pressure: 1008,
      status: "normal",
      connectionType: "STM32",
      endpoint: "192.168.1.121:8080",
      lastSeen: "Just now",
    },
    {
      id: "sens-003",
      name: "Battery Energy Storage (BESS)",
      room: "Power Vault",
      temperature: 24.1,
      humidity: 48,
      pressure: 1009,
      status: "normal",
      connectionType: "Raspberry Pi",
      endpoint: "192.168.1.122:8080",
      lastSeen: "Just now",
    },
    {
      id: "sens-004",
      name: "Main Grid Tie Busbar",
      room: "Substation Bay",
      temperature: 31.7,
      humidity: 60,
      pressure: 1007,
      status: "warning",
      connectionType: "MQTT",
      endpoint: "mqtt://broker.gridguard.internal",
      lastSeen: "Just now",
    },
  ];

  private alerts: Alert[] = [
    {
      id: "alt-001",
      type: "temperature",
      sensor: "Main Grid Tie Busbar",
      room: "Substation Bay",
      value: 31.7,
      threshold: 30.0,
      severity: "warning",
      message: "Busbar temperature exceeded standard operating threshold (30°C)",
      resolved: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    },
    {
      id: "alt-002",
      type: "frequency",
      sensor: "Grid Coupling Inverter",
      room: "Main Switchgear",
      value: 50.18,
      threshold: 50.15,
      severity: "warning",
      message: "Minor frequency transient detected in local microgrid sync",
      resolved: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "alt-003",
      type: "voltage",
      sensor: "BESS Storage Link",
      room: "Power Vault",
      value: 236.2,
      threshold: 235.0,
      severity: "info",
      message: "Grid voltage slightly high during peak solar export window",
      resolved: true,
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
  ];

  private hourlyGeneration: number[] = [25, 35, 42, 55, 70, 62, 78, 88, 75, 92, 82, 96];

  private gridListeners: Set<(data: GridData) => void> = new Set();
  private sensorListeners: Set<(sensors: SensorData[]) => void> = new Set();
  private alertListeners: Set<(alerts: Alert[]) => void> = new Set();
  private intervalId: number | null = null;

  constructor() {
    this.startSimulation();
  }

  private startSimulation() {
    if (typeof window === "undefined") return;
    if (this.intervalId) return;

    // Gradual, realistic step every 3 seconds
    this.intervalId = window.setInterval(() => {
      this.stepSimulation();
    }, 3000);
  }

  private stepSimulation() {
    // 1. Solar power: wander between 4.70 and 5.15 kW with subtle realistic drift
    const solarDelta = (Math.random() - 0.48) * 0.06;
    let newSolar = parseFloat((this.gridData.solarPower + solarDelta).toFixed(2));
    if (newSolar < 4.70) newSolar = 4.75;
    if (newSolar > 5.15) newSolar = 5.10;

    // 2. Energy today: slowly and steadily increases
    const energyDelta = Math.random() < 0.35 ? 0.01 : 0.0;
    const newEnergy = parseFloat((this.gridData.energyToday + energyDelta).toFixed(2));

    // 3. Grid Voltage: gently fluctuates around 230V ± 1.5V
    const voltDelta = (Math.random() - 0.5) * 0.5;
    let newVoltage = parseFloat((this.gridData.gridVoltage + voltDelta).toFixed(1));
    if (newVoltage < 228.5) newVoltage = 229.0;
    if (newVoltage > 232.0) newVoltage = 231.5;

    // 4. Battery: 80% to 85% charging slowly
    const battShift = Math.random() < 0.25 ? (Math.random() > 0.5 ? 1 : -1) : 0;
    let newBattery = this.gridData.batteryPercentage + battShift;
    if (newBattery < 80) newBattery = 80;
    if (newBattery > 86) newBattery = 85;

    // 5. Grid Current: 12.0 - 12.8 A
    const currDelta = (Math.random() - 0.5) * 0.1;
    const newCurrent = parseFloat(((this.gridData.gridCurrent || 12.4) + currDelta).toFixed(1));

    // 6. Frequency: 49.98 - 50.04 Hz
    const freqDelta = (Math.random() - 0.5) * 0.01;
    const newFreq = parseFloat(((this.gridData.gridFrequency || 50.02) + freqDelta).toFixed(2));

    // 7. Power Factor: 0.95 - 0.97
    const pfDelta = (Math.random() - 0.5) * 0.003;
    const newPf = parseFloat(((this.gridData.powerFactor || 0.96) + pfDelta).toFixed(2));

    // 8. Inverter temp: 28.4 - 29.3 °C
    const tempDelta = (Math.random() - 0.5) * 0.1;
    const newTemp = parseFloat(((this.gridData.temperature || 28.6) + tempDelta).toFixed(1));

    // 9. CO2 saved: proportional to energy today (approx 0.41 kg per kWh)
    const newCo2 = parseFloat((newEnergy * 0.412).toFixed(1));

    this.gridData = {
      ...this.gridData,
      solarPower: newSolar,
      energyToday: newEnergy,
      gridVoltage: newVoltage,
      batteryPercentage: newBattery,
      gridCurrent: newCurrent,
      gridFrequency: newFreq,
      powerFactor: newPf,
      temperature: newTemp,
      co2SavedToday: newCo2,
      updatedAt: new Date().toISOString(),
    };

    // Update sensors with subtle drift
    this.sensors = this.sensors.map((s) => {
      const sTempDelta = (Math.random() - 0.5) * 0.15;
      const sHumDelta = Math.random() < 0.3 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      const sPresDelta = Math.random() < 0.2 ? (Math.random() > 0.5 ? 1 : -1) : 0;

      return {
        ...s,
        temperature: parseFloat((s.temperature + sTempDelta).toFixed(1)),
        humidity: Math.max(30, Math.min(85, s.humidity + sHumDelta)),
        pressure: Math.max(990, Math.min(1030, s.pressure + sPresDelta)),
        lastSeen: "Just now",
      };
    });

    // Notify listeners
    this.gridListeners.forEach((fn) => fn(this.gridData));
    this.sensorListeners.forEach((fn) => fn(this.sensors));
  }

  public getGridData(): GridData {
    return { ...this.gridData };
  }

  public getSensors(): SensorData[] {
    return [...this.sensors];
  }

  public getAlerts(): Alert[] {
    return [...this.alerts];
  }

  public getHourlyGeneration(): number[] {
    return [...this.hourlyGeneration];
  }

  public subscribeGrid(fn: (data: GridData) => void): () => void {
    this.gridListeners.add(fn);
    fn(this.gridData);
    return () => {
      this.gridListeners.delete(fn);
    };
  }

  public subscribeSensors(fn: (sensors: SensorData[]) => void): () => void {
    this.sensorListeners.add(fn);
    fn(this.sensors);
    return () => {
      this.sensorListeners.delete(fn);
    };
  }

  public subscribeAlerts(fn: (alerts: Alert[]) => void): () => void {
    this.alertListeners.add(fn);
    fn(this.alerts);
    return () => {
      this.alertListeners.delete(fn);
    };
  }

  public addAlert(alert: Omit<Alert, "id">): Alert {
    const newAlert: Alert = {
      ...alert,
      id: "alt-" + Date.now().toString(36),
    };
    this.alerts = [newAlert, ...this.alerts];
    this.gridData.activeAlertsCount = this.alerts.filter((a) => !a.resolved).length;
    this.alertListeners.forEach((fn) => fn(this.alerts));
    this.gridListeners.forEach((fn) => fn(this.gridData));
    return newAlert;
  }

  public resolveAlert(id: string): void {
    this.alerts = this.alerts.map((a) =>
      a.id === id ? { ...a, resolved: true } : a
    );
    this.gridData.activeAlertsCount = this.alerts.filter((a) => !a.resolved).length;
    this.alertListeners.forEach((fn) => fn(this.alerts));
    this.gridListeners.forEach((fn) => fn(this.gridData));
  }

  public addSensor(sensor: Omit<SensorData, "id">): SensorData {
    const newSens: SensorData = {
      ...sensor,
      id: "sens-" + (this.sensors.length + 1).toString().padStart(3, "0"),
      lastSeen: "Just now",
    };
    this.sensors = [...this.sensors, newSens];
    this.sensorListeners.forEach((fn) => fn(this.sensors));
    return newSens;
  }

  public getHistoricalTrend(period: "today" | "7days" | "30days"): {
    labels: string[];
    power: number[];
    energy: number[];
    voltage: number[];
    battery: number[];
  } {
    if (period === "today") {
      const labels = ["6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM"];
      return {
        labels,
        power: [1.2, 2.8, 4.1, 4.9, 4.8, 3.4, 1.1],
        energy: [4.2, 12.8, 24.5, 36.1, 41.2, 44.5, 45.2],
        voltage: [229.4, 230.1, 230.8, 231.2, 230.7, 230.2, 229.9],
        battery: [65, 70, 76, 80, 82, 84, 82],
      };
    } else if (period === "7days") {
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return {
        labels,
        power: [4.5, 4.7, 4.3, 4.9, 5.1, 4.8, 4.82],
        energy: [41.2, 43.8, 39.5, 46.1, 48.0, 44.9, 45.2],
        voltage: [230.1, 230.5, 229.8, 230.9, 231.0, 230.4, 230.4],
        battery: [80, 81, 78, 83, 85, 84, 82],
      };
    } else {
      const labels = ["W1", "W2", "W3", "W4"];
      return {
        labels,
        power: [4.4, 4.7, 4.9, 4.82],
        energy: [280, 310, 325, 316],
        voltage: [230.2, 230.6, 230.4, 230.4],
        battery: [81, 82, 83, 82],
      };
    }
  }

  public getGridHistory(): GridHistoryPoint[] {
    const times = ["12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45", "14:00"];
    return times.map((t, idx) => ({
      time: t,
      voltage: parseFloat((230.0 + Math.sin(idx) * 1.2).toFixed(1)),
      frequency: parseFloat((50.0 + Math.cos(idx) * 0.02).toFixed(2)),
      powerFactor: parseFloat((0.96 + Math.sin(idx * 0.5) * 0.01).toFixed(2)),
      current: parseFloat((12.2 + Math.cos(idx) * 0.4).toFixed(1)),
      status: "normal",
    }));
  }
}

export const demoDataService = new DemoDataService();
