import { rtdbService } from "../firebase/database";
import type { SensorData } from "../types/sensor";

export const sensorService = {
  /**
   * Subscribes to live sensor list from Firebase Realtime Database.
   * Auto-seeds initial field sensors if RTDB sensors list is empty.
   */
  subscribe: (callback: (sensors: SensorData[]) => void): (() => void) => {
    return rtdbService.subscribeToSensors((sensors) => {
      if (sensors.length === 0) {
        sensorService.seedInitialSensors();
      }
      callback(sensors);
    });
  },

  seedInitialSensors: async (): Promise<void> => {
    const initialSensors: Omit<SensorData, "id">[] = [
      {
        name: "Main Solar String Inverter A",
        room: "Array Shed North",
        connectionType: "ESP32",
        endpoint: "192.168.1.101:8080",
        ratedPower: 3.2,
        power: 3.18,
        voltage: 231.2,
        current: 13.8,
        temperature: 34.5,
        humidity: 58,
        pressure: 1012,
        status: "normal",
        lastSeen: new Date().toISOString(),
      },
      {
        name: "Rooftop Secondary PV Pod",
        room: "Building C Industrial Roof",
        connectionType: "Raspberry Pi",
        endpoint: "192.168.1.102:8080",
        ratedPower: 2.4,
        power: 2.35,
        voltage: 230.4,
        current: 10.2,
        temperature: 32.8,
        humidity: 62,
        pressure: 1011,
        status: "normal",
        lastSeen: new Date().toISOString(),
      },
    ];

    for (const s of initialSensors) {
      await rtdbService.addSensor(s);
    }
  },

  addSensor: async (sensor: Omit<SensorData, "id">): Promise<SensorData> => {
    const newSensor = await rtdbService.addSensor({
      ...sensor,
      power: sensor.power ?? sensor.ratedPower ?? 2.5,
      voltage: sensor.voltage ?? 230.5,
      current: sensor.current ?? ((sensor.power ?? sensor.ratedPower ?? 2.5) * 1000) / 230.5,
      status: sensor.status || "normal",
      lastSeen: new Date().toISOString(),
    });

    // Also register corresponding node in RTDB nodes list
    await rtdbService.createOrUpdateNode(newSensor.id, {
      nodeId: newSensor.id,
      name: newSensor.name,
      location: newSensor.room || "Facility Field",
      status: "ONLINE",
      voltage: newSensor.voltage ?? 230.5,
      current: newSensor.current ?? 10.8,
      power: newSensor.power ?? 2.5,
      energy: (newSensor.power ?? 2.5) * 4.2,
      temperature: newSensor.temperature,
      firmware: "v2.4.2-prod",
    });

    return newSensor;
  },

  deleteSensor: async (sensorId: string): Promise<void> => {
    await rtdbService.deleteSensor(sensorId);
    await rtdbService.deleteNode(sensorId);
  },

  updateSensor: async (sensorId: string, data: Partial<SensorData>): Promise<void> => {
    await rtdbService.updateSensor(sensorId, data);
  },
};
