import { rtdbService, type SolarNode } from "../firebase/database";

export const nodeService = {
  subscribe: (callback: (nodes: SolarNode[]) => void): (() => void) => {
    return rtdbService.subscribeToNodes((nodes) => {
      // If empty, automatically seed initial monitored nodes in RTDB
      if (nodes.length === 0) {
        nodeService.seedInitialNodes();
      }
      callback(nodes);
    });
  },

  seedInitialNodes: async () => {
    const initialNodes: SolarNode[] = [
      {
        nodeId: "GG-NODE-01",
        name: "Substation Alpha Array",
        location: "Main Substation Sector 4",
        status: "ONLINE",
        lastSeen: new Date().toISOString(),
        voltage: 231.2,
        current: 12.8,
        power: 4.82,
        energy: 45.2,
        temperature: 36.4,
        firmware: "v2.4.1-prod",
      },
      {
        nodeId: "GG-NODE-02",
        name: "Rooftop Commercial PV",
        location: "Building C Industrial Roof",
        status: "ONLINE",
        lastSeen: new Date().toISOString(),
        voltage: 229.8,
        current: 9.4,
        power: 3.25,
        energy: 31.8,
        temperature: 34.2,
        firmware: "v2.4.1-prod",
      },
    ];

    for (const node of initialNodes) {
      await rtdbService.createOrUpdateNode(node.nodeId, node);
      await rtdbService.pushTelemetry(node.nodeId, {
        nodeId: node.nodeId,
        voltage: node.voltage,
        current: node.current,
        power: node.power,
        energy: node.energy,
        temperature: node.temperature,
        irradiance: 840,
        efficiency: 92.4,
        status: "ONLINE",
      });
    }
  },

  createNode: async (node: SolarNode): Promise<void> => {
    await rtdbService.createOrUpdateNode(node.nodeId, node);
    await rtdbService.logAuditEvent("CREATE_NODE", node.nodeId, { name: node.name, location: node.location });
  },

  updateNode: async (nodeId: string, data: Partial<SolarNode>): Promise<void> => {
    await rtdbService.createOrUpdateNode(nodeId, data);
    await rtdbService.logAuditEvent("UPDATE_NODE", nodeId, data as Record<string, unknown>);
  },

  deleteNode: async (nodeId: string): Promise<void> => {
    await rtdbService.deleteNode(nodeId);
    await rtdbService.logAuditEvent("DELETE_NODE", nodeId);
  },
};
