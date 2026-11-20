import { supabase, isMockSupabase } from "../../integrations/supabase/db.client.js";
import { PackingStation, StationStatus, CameraStatus, StationHeartbeat } from "@shipproof/shared";
import { logger } from "../../utils/logger.js";

const mockStationsStore: PackingStation[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Packing Bay 1 (Main Hall)",
    location: "Bengaluru Warehouse",
    status: StationStatus.ONLINE,
    cameraStatus: CameraStatus.CONNECTED,
    cameraInfo: { deviceIndex: 0, name: "Logitech C920 Pro HD", resolution: "1080p", fps: 30 },
    lastHeartbeat: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Packing Bay 2 (Express)",
    location: "Bengaluru Warehouse",
    status: StationStatus.ONLINE,
    cameraStatus: CameraStatus.CONNECTED,
    cameraInfo: { deviceIndex: 1, name: "Hikvision 1080p RTSP", resolution: "1080p", fps: 30 },
    lastHeartbeat: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Packing Bay 3 (High Value)",
    location: "Kochi Showroom",
    status: StationStatus.OFFLINE,
    cameraStatus: CameraStatus.DISCONNECTED,
    cameraInfo: { deviceIndex: 0, name: "USB Desk Cam 4K", resolution: "4K", fps: 60 },
    lastHeartbeat: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export class StationService {
  async listStations(): Promise<PackingStation[]> {
    if (isMockSupabase) {
      return mockStationsStore;
    }

    const { data, error } = await supabase.from("stations").select("*").order("name");
    if (error) {
      logger.error("Failed to list stations:", error);
      return mockStationsStore;
    }

    return (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      location: s.location,
      status: s.status as StationStatus,
      cameraStatus: s.camera_status as CameraStatus,
      cameraInfo: s.camera_info,
      currentPackerId: s.current_packer_id,
      currentOrderId: s.current_order_id,
      lastHeartbeat: s.last_heartbeat,
      createdAt: s.created_at,
    }));
  }

  async getStation(stationId: string): Promise<PackingStation | null> {
    const stations = await this.listStations();
    return stations.find((s) => s.id === stationId) || null;
  }

  async recordHeartbeat(heartbeat: StationHeartbeat): Promise<void> {
    if (isMockSupabase) {
      const idx = mockStationsStore.findIndex((s) => s.id === heartbeat.stationId);
      if (idx !== -1) {
        mockStationsStore[idx].status = heartbeat.status;
        mockStationsStore[idx].cameraStatus = heartbeat.cameraStatus;
        mockStationsStore[idx].lastHeartbeat = heartbeat.timestamp;
      }
      return;
    }

    await supabase
      .from("stations")
      .update({
        status: heartbeat.status,
        camera_status: heartbeat.cameraStatus,
        last_heartbeat: heartbeat.timestamp,
        updated_at: new Date().toISOString(),
      })
      .eq("id", heartbeat.stationId);
  }
}

export const stationService = new StationService();
