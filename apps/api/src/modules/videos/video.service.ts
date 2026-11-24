import { supabase, isMockSupabase } from "../../integrations/supabase/db.client.js";
import { storageService } from "../../integrations/supabase/storage.client.js";
import { shopifyClient } from "../../integrations/shopify/shopify.client.js";
import { VideoRecord, VideoStatus } from "@shipproof/shared";
import { logger } from "../../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

const mockVideosStore = new Map<string, VideoRecord>();

export class VideoService {
  /**
   * Generates a signed upload URL so the camera agent can upload directly to Supabase Storage.
   */
  async requestUploadUrl(orderId: string, sessionId: string, stationId: string, fileName: string) {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `orders/${orderId}/${sessionId}_${cleanFileName}`;

    // The camera agent retries failed uploads, so asking again for the same recording must not create
    // a second video record. Hand out a fresh upload address for the existing one instead.
    const existing = isMockSupabase
      ? mockVideosStore.get(orderId)?.sessionId === sessionId
        ? mockVideosStore.get(orderId)
        : null
      : (
          await supabase.from("videos").select("id, storage_path").eq("session_id", sessionId).maybeSingle()
        ).data;
    if (existing) {
      const existingPath = "storagePath" in existing ? existing.storagePath : existing.storage_path;
      const retry = await storageService.createSignedUploadUrl(existingPath);
      return { videoId: existing.id, storagePath: existingPath, signedUrl: retry.signedUrl, token: retry.token };
    }

    const videoId = uuidv4();
    const { signedUrl, token } = await storageService.createSignedUploadUrl(storagePath);

    const initialRecord: VideoRecord = {
      id: videoId,
      sessionId,
      orderId,
      stationId,
      storagePath,
      fileName: cleanFileName,
      fileSizeBytes: 0,
      durationSeconds: 0,
      status: VideoStatus.UPLOADING,
      retentionDays: 7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMockSupabase) {
      mockVideosStore.set(orderId, initialRecord);
    } else {
      await supabase.from("videos").insert({
        id: videoId,
        session_id: sessionId,
        order_id: orderId,
        station_id: stationId,
        storage_path: storagePath,
        file_name: cleanFileName,
        status: VideoStatus.UPLOADING,
        retention_days: 7,
      });
    }

    return {
      videoId,
      storagePath,
      signedUrl,
      token,
    };
  }

  /**
   * Finalizes upload confirmation after camera agent finishes streaming the file.
   */
  async completeUpload(orderId: string, sessionId: string, fileSizeBytes: number, durationSeconds: number, interrupted = false) {
    logger.info(`Video upload completed for order ${orderId}, size: ${fileSizeBytes} bytes${interrupted ? " (interrupted recording)" : ""}`);

    // Generate signed download URL for playback
    const existing = await this.getVideoForOrder(orderId);
    if (!existing) {
      throw new Error(`No video record found for order ${orderId}`);
    }

    const downloadUrl = await storageService.createSignedDownloadUrl(existing.storagePath, 7 * 86400);

    const updatedRecord: VideoRecord = {
      ...existing,
      fileSizeBytes,
      durationSeconds,
      interrupted,
      status: VideoStatus.ACTIVE,
      downloadUrl,
      updatedAt: new Date().toISOString(),
    };

    if (isMockSupabase) {
      mockVideosStore.set(orderId, updatedRecord);
    } else {
      await supabase
        .from("videos")
        .update({
          file_size_bytes: fileSizeBytes,
          duration_seconds: durationSeconds,
          interrupted,
          status: VideoStatus.ACTIVE,
          download_url: downloadUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);
    }

    // Attach link into Shopify order metafield
    await shopifyClient.attachVideoProofMetafield(orderId, downloadUrl);

    return updatedRecord;
  }

  /**
   * Get packing video for an order.
   */
  async getVideoForOrder(orderId: string): Promise<VideoRecord | null> {
    if (isMockSupabase) {
      return mockVideosStore.get(orderId) || null;
    }

    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    return {
      id: data.id,
      sessionId: data.session_id,
      orderId: data.order_id,
      stationId: data.station_id,
      storagePath: data.storage_path,
      fileName: data.file_name,
      fileSizeBytes: data.file_size_bytes,
      durationSeconds: data.duration_seconds,
      status: data.status as VideoStatus,
      downloadUrl: data.download_url,
      retentionDays: data.retention_days,
      interrupted: data.interrupted ?? false,
      expiresAt: data.expires_at,
      deletedAt: data.deleted_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * List all videos for admin monitoring.
   */
  async listVideos(): Promise<VideoRecord[]> {
    if (isMockSupabase) {
      return Array.from(mockVideosStore.values());
    }

    const { data } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return (data || []).map((d: any) => ({
      id: d.id,
      sessionId: d.session_id,
      orderId: d.order_id,
      stationId: d.station_id,
      storagePath: d.storage_path,
      fileName: d.file_name,
      fileSizeBytes: d.file_size_bytes,
      durationSeconds: d.duration_seconds,
      status: d.status as VideoStatus,
      downloadUrl: d.download_url,
      retentionDays: d.retention_days,
      interrupted: d.interrupted ?? false,
      expiresAt: d.expires_at,
      deletedAt: d.deleted_at,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  }
}

export const videoService = new VideoService();
