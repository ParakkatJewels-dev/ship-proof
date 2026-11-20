"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stationService = exports.StationService = void 0;
const db_client_js_1 = require("../../integrations/supabase/db.client.js");
const shared_1 = require("@shipproof/shared");
const logger_js_1 = require("../../utils/logger.js");
const mockStationsStore = [
    {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Packing Bay 1 (Main Hall)",
        location: "Bengaluru Warehouse",
        status: shared_1.StationStatus.ONLINE,
        cameraStatus: shared_1.CameraStatus.CONNECTED,
        cameraInfo: { deviceIndex: 0, name: "Logitech C920 Pro HD", resolution: "1080p", fps: 30 },
        lastHeartbeat: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    },
    {
        id: "22222222-2222-2222-2222-222222222222",
        name: "Packing Bay 2 (Express)",
        location: "Bengaluru Warehouse",
        status: shared_1.StationStatus.ONLINE,
        cameraStatus: shared_1.CameraStatus.CONNECTED,
        cameraInfo: { deviceIndex: 1, name: "Hikvision 1080p RTSP", resolution: "1080p", fps: 30 },
        lastHeartbeat: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    },
    {
        id: "33333333-3333-3333-3333-333333333333",
        name: "Packing Bay 3 (High Value)",
        location: "Kochi Showroom",
        status: shared_1.StationStatus.OFFLINE,
        cameraStatus: shared_1.CameraStatus.DISCONNECTED,
        cameraInfo: { deviceIndex: 0, name: "USB Desk Cam 4K", resolution: "4K", fps: 60 },
        lastHeartbeat: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date().toISOString(),
    },
];
class StationService {
    async listStations() {
        if (db_client_js_1.isMockSupabase) {
            return mockStationsStore;
        }
        const { data, error } = await db_client_js_1.supabase.from("stations").select("*").order("name");
        if (error) {
            logger_js_1.logger.error("Failed to list stations:", error);
            return mockStationsStore;
        }
        return (data || []).map((s) => ({
            id: s.id,
            name: s.name,
            location: s.location,
            status: s.status,
            cameraStatus: s.camera_status,
            cameraInfo: s.camera_info,
            currentPackerId: s.current_packer_id,
            currentOrderId: s.current_order_id,
            lastHeartbeat: s.last_heartbeat,
            createdAt: s.created_at,
        }));
    }
    async getStation(stationId) {
        const stations = await this.listStations();
        return stations.find((s) => s.id === stationId) || null;
    }
    async recordHeartbeat(heartbeat) {
        if (db_client_js_1.isMockSupabase) {
            const idx = mockStationsStore.findIndex((s) => s.id === heartbeat.stationId);
            if (idx !== -1) {
                mockStationsStore[idx].status = heartbeat.status;
                mockStationsStore[idx].cameraStatus = heartbeat.cameraStatus;
                mockStationsStore[idx].lastHeartbeat = heartbeat.timestamp;
            }
            return;
        }
        await db_client_js_1.supabase
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
exports.StationService = StationService;
exports.stationService = new StationService();
