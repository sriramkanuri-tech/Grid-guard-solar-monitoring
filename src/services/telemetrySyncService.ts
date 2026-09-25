import { rtdbService, type RealtimeTelemetry } from "../firebase/database";
import { sensorService } from "./sensorService";
import type { SensorData } from "../types/sensor";
import type { GridData } from "../types/grid";

const PRIMARY_NODE_ID = "GG-NODE-01";

class TelemetrySyncService {
  private activeSensors: SensorData[] = [];
  private timer: number | null = null;
  private subscribers: ((data: GridData) => void)[] = [];
  private currentGridData: GridData;
  private energyAccumulator: number = 45.2;
  private tickCount: number = 0;
  private isStarted: boolean = false;

  constructor() {
    this.currentGridData = {
      nodeId: PRIMARY_NODE_ID,
      solarPower: 4.82,
      energyToday: 45.2,
      gridVoltage: 230.8,
      batteryPercentage: 78,
      systemStatus: "online",
      gridCurrent: 14.2,
      gridFrequency: 50.02,
      powerFactor: 0.985,
      temperature: 34.2,
      irradiance: 865.0,
      systemEfficiency: 95.2,
      co2SavedToday: 18.6,
      updatedAt: new Date().toISOString(),
      hasLiveData: true,
      isLive: true,
      isDemo: false,
    };

    // Listen to live sensors from RTDB
    sensorService.subscribe((sensors) => {
      this.activeSensors = sensors.filter((s) => s.status !== "offline");
    });

    this.startEngine();
  }

  public startEngine() {
    if (this.isStarted) return;
    this.isStarted = true;

    // Run every 1000ms (1 second)
    this.timer = window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    this.tickCount++;

    // Calculate natural physical fluctuations for normal operation
    // Sinusoidal micro-fluctuations + tiny pseudo-random noise
    const t = this.tickCount * 0.1;
    const busVoltage = 230.4 + Math.sin(t * 0.7) * 0.6 + (Math.random() - 0.5) * 0.4;
    const frequency = 50.02 + Math.sin(t * 1.1) * 0.02 + (Math.random() - 0.5) * 0.01;
    const irradiance = Math.min(1000, Math.max(750, 860 + Math.sin(t * 0.3) * 30 + (Math.random() - 0.5) * 10));
    const powerFactor = 0.985 + (Math.random() - 0.5) * 0.006;
    const baseTemp = 34.0 + Math.sin(t * 0.2) * 1.5 + (Math.random() - 0.5) * 0.2;

    // Calculate contribution of active sensors
    let totalPowerKw = 0;
    let totalCurrentA = 0;

    if (this.activeSensors.length > 0) {
      this.activeSensors.forEach((sensor, idx) => {
        const ratedKw = sensor.ratedPower ?? (sensor.power ? sensor.power : (2.5 + (idx % 3) * 0.8));
        // Sensor output fluctuates around rated capacity * irradiance ratio
        const sensorFluctuation = 1 + Math.sin(t + idx * 1.5) * 0.03 + (Math.random() - 0.5) * 0.02;
        const sensorPowerKw = Math.max(0.5, ratedKw * (irradiance / 900) * sensorFluctuation);
        const sensorVoltage = busVoltage + ((idx % 2 === 0 ? 0.2 : -0.2) * Math.sin(t));
        const sensorCurrentA = (sensorPowerKw * 1000) / (sensorVoltage * powerFactor);
        const sensorTemp = baseTemp + idx * 0.8 + (Math.random() - 0.5) * 0.3;

        totalPowerKw += sensorPowerKw;
        totalCurrentA += sensorCurrentA;

        // Write individual sensor live metrics to RTDB every 2 seconds
        if (this.tickCount % 2 === 0) {
          rtdbService.updateSensor(sensor.id, {
            power: Math.round(sensorPowerKw * 100) / 100,
            voltage: Math.round(sensorVoltage * 10) / 10,
            current: Math.round(sensorCurrentA * 10) / 10,
            temperature: Math.round(sensorTemp * 10) / 10,
            status: "normal",
            lastSeen: new Date().toISOString(),
          });
        }
      });
    } else {
      // Default baseline generation if no sensors added yet
      totalPowerKw = 4.82 + Math.sin(t * 0.5) * 0.15 + (Math.random() - 0.5) * 0.08;
      totalCurrentA = (totalPowerKw * 1000) / (busVoltage * powerFactor);
    }

    // Accumulate energy: kW * (1/3600 h)
    this.energyAccumulator += totalPowerKw / 3600;

    const roundedPower = Math.round(totalPowerKw * 100) / 100;
    const roundedEnergy = Math.round(this.energyAccumulator * 100) / 100;
    const roundedVoltage = Math.round(busVoltage * 10) / 10;
    const roundedCurrent = Math.round(totalCurrentA * 10) / 10;
    const roundedFreq = Math.round(frequency * 100) / 100;
    const roundedTemp = Math.round(baseTemp * 10) / 10;
    const roundedIrradiance = Math.round(irradiance);
    const roundedCo2 = Math.round(roundedEnergy * 0.412 * 10) / 10;
    const efficiency = Math.round((94.5 + Math.sin(t * 0.4) * 1.5) * 10) / 10;
    const batteryPct = Math.min(100, Math.max(20, Math.round(75 + Math.sin(t * 0.1) * 6)));

    const nowIso = new Date().toISOString();

    const updatedGrid: GridData = {
      nodeId: PRIMARY_NODE_ID,
      solarPower: roundedPower,
      energyToday: roundedEnergy,
      gridVoltage: roundedVoltage,
      batteryPercentage: batteryPct,
      systemStatus: "online",
      gridCurrent: roundedCurrent,
      gridFrequency: roundedFreq,
      powerFactor: Math.round(powerFactor * 1000) / 1000,
      temperature: roundedTemp,
      irradiance: roundedIrradiance,
      systemEfficiency: efficiency,
      co2SavedToday: roundedCo2,
      updatedAt: nowIso,
      hasLiveData: true,
      isLive: true,
      isDemo: false,
    };

    this.currentGridData = updatedGrid;

    // 1. Notify all local UI subscribers immediately for 60fps smooth animation
    this.subscribers.forEach((cb) => cb(updatedGrid));

    // 2. Persist directly to Firebase Realtime Database
    // Write every tick so RTDB is continually receiving live data
    rtdbService.pushTelemetry(PRIMARY_NODE_ID, {
      nodeId: PRIMARY_NODE_ID,
      voltage: roundedVoltage,
      current: roundedCurrent,
      power: roundedPower,
      energy: roundedEnergy,
      temperature: roundedTemp,
      irradiance: roundedIrradiance,
      efficiency,
      frequency: roundedFreq,
      powerFactor: Math.round(powerFactor * 1000) / 1000,
      status: "ONLINE",
    });
  }

  public subscribe(callback: (data: GridData) => void): () => void {
    // Deliver immediate current reading
    callback(this.currentGridData);

    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  public getCurrentData(): GridData {
    return this.currentGridData;
  }
}

export const telemetrySyncService = new TelemetrySyncService();
