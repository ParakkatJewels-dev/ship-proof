import { supabase, isMockSupabase } from "../../integrations/supabase/db.client.js";
import { storageService } from "../../integrations/supabase/storage.client.js";
import { shopifyClient } from "../../integrations/shopify/shopify.client.js";
import { VideoStatus } from "@shipproof/shared";
import { config } from "../../config/env.config.js";
import { logger } from "../../utils/logger.js";
import { HttpError } from "../../utils/httpError.js";
import { createWatchToken, hashWatchToken, isWellFormedToken } from "../../utils/watchToken.js";
import { orderService } from "../orders/order.service.js";
import { UUID_PATTERN } from "../orders/order.service.js";
import { videoRepository as repo, StoredVideo } from "./video.repository.js";
import { v4 as uuidv4 } from "uuid";

/** What the dashboard may know about a video. It never includes storage paths or link secrets. */
export interface VideoSummary {
  id: string;
  orderId: string;
  status: VideoStatus;
  durationSeconds: number;
  fileSizeBytes: number;
  interrupted: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** When the packer started recording. Falls back to the upload time for videos saved before this was kept. */
  recordedAt: string;
  /** Picture size and frame rate of the stored video; null for videos saved before these were kept. */
  width: number | null;
  height: number | null;
  fps: number | null;
  /** True once the customer watch link is on the Shopify order. */
  shopifySynced: boolean;
}

/** What a customer's watch page may show for a link. */
export type WatchResult =
  | { state: "ready"; orderNumber: string; durationSeconds: number; playbackUrl: string; expiresAt: string | null }
  | { state: "expired" | "unavailable"; orderNumber?: string };

/** How long a playback address works. It is created fresh every time the video is opened. */
const PLAYBACK_SECONDS = 60 * 60;

export const toSummary = (v: StoredVideo): VideoSummary => ({
  id: v.id,
  orderId: v.orderId,
  status: v.status,
  durationSeconds: v.durationSeconds,
  fileSizeBytes: v.fileSizeBytes,
  interrupted: !!v.interrupted,
  expiresAt: v.expiresAt ?? null,
  createdAt: v.createdAt,
  updatedAt: v.updatedAt,
  recordedAt: v.recordedAt ?? v.createdAt,
  width: v.width ?? null,
  height: v.height ?? null,
  fps: v.fps ?? null,
  shopifySynced: !!v.shopifySyncedAt,
});

const watchUrl = (token: string) => `${config.publicWebUrl}/watch/${token}`;

export class VideoService {
  /**
   * Generates a signed upload URL so the camera agent can upload directly to Supabase Storage.
   */
  async requestUploadUrl(orderId: string, sessionId: string, stationId: string, fileName: string, orderNumber?: string, recordedAt?: string) {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    orderId = await this.databaseOrderId(orderId, orderNumber);

    // The camera agent retries failed uploads, so asking again for the same recording must not create
    // a second video record. Hand out a fresh upload address for the existing one instead.
    const existing = await repo.findBySession(sessionId);
    if (existing) {
      if (existing.orderId !== orderId) throw new HttpError(409, "This recording belongs to a different order.");
      const retry = await storageService.createSignedUploadUrl(existing.storagePath);
      if (existing.status === VideoStatus.ERROR) await repo.update(existing.id, { status: VideoStatus.UPLOADING });
      return { videoId: existing.id, storagePath: existing.storagePath, signedUrl: retry.signedUrl, token: retry.token };
    }

    const storagePath = `orders/${orderId}/${sessionId}_${cleanFileName}`;
    const videoId = uuidv4();
    const { signedUrl, token } = await storageService.createSignedUploadUrl(storagePath);
    const now = new Date().toISOString();

    await repo.insert({
      id: videoId,
      sessionId,
      orderId,
      stationId: await this.knownStationId(stationId),
      storagePath,
      fileName: cleanFileName,
      fileSizeBytes: 0,
      durationSeconds: 0,
      status: VideoStatus.UPLOADING,
      retentionDays: config.retention.daysAfterDelivery,
      orderNumber,
      recordedAt: recordedAt ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return { videoId, storagePath, signedUrl, token };
  }

  /**
   * With a database, videos belong to a database order. While no real Shopify store is connected, the
   * dashboard shows demo orders that have no database id; so that the whole flow can be tried, such an order is
   * saved to the database the first time its video is uploaded. With a real store this never applies: an id
   * that is not a database order is refused.
   */
  private async databaseOrderId(orderId: string, orderNumber?: string): Promise<string> {
    if (isMockSupabase || UUID_PATTERN.test(orderId)) return orderId;
    if (shopifyClient.isMock && orderNumber) {
      const demo = await orderService.getOrder(orderNumber);
      if (demo && UUID_PATTERN.test(demo.id)) return demo.id;
    }
    throw new HttpError(400, `Order ${orderId} is not an order in the database.`);
  }

  /** The camera sends the order id it was given; the record holds the database id. They can differ for demo orders. */
  private async sameOrder(recordOrderId: string, givenOrderId: string): Promise<boolean> {
    if (recordOrderId === givenOrderId || isMockSupabase) return recordOrderId === givenOrderId;
    return (await orderService.resolveIdentity(givenOrderId))?.id === recordOrderId;
  }

  /** Stations register themselves rarely; a video must still be saved from one that is not in the table yet. */
  private async knownStationId(stationId: string): Promise<string> {
    if (isMockSupabase) return stationId;
    const { data } = await supabase.from("stations").select("id").eq("id", stationId).maybeSingle();
    return (data?.id ?? null) as string;
  }

  /**
   * Finishes an upload: checks the file really is in storage, makes the video the order's current one,
   * deletes the replaced ones, marks the order packed, and puts the watch link on the Shopify order.
   * Safe to call again for the same recording.
   */
  async completeUpload(
    orderId: string,
    sessionId: string,
    fileSizeBytes: number,
    durationSeconds: number,
    interrupted = false,
    media?: { width?: number; height?: number; fps?: number },
  ) {
    logger.info(`Video upload completed for order ${orderId}, size: ${fileSizeBytes} bytes${interrupted ? " (interrupted recording)" : ""}`);

    const video = await repo.findBySession(sessionId);
    if (!video) throw new HttpError(404, `No video record found for session ${sessionId}`);
    if (!(await this.sameOrder(video.orderId, orderId))) throw new HttpError(409, "This recording belongs to a different order.");
    orderId = video.orderId;

    if (video.status === VideoStatus.ACTIVE && video.watchTokenHash && video.shopifySyncedAt) return toSummary(video);

    // The agent says it finished; storage must agree before the video is called saved.
    const storedSize = await storageService.statObject(video.storagePath);
    if (storedSize === null) {
      await repo.update(video.id, { status: VideoStatus.ERROR });
      throw new HttpError(409, "The video file has not arrived in storage. Upload it again.");
    }
    if (storedSize > 0 && fileSizeBytes > 0 && storedSize < fileSizeBytes) {
      await repo.update(video.id, { status: VideoStatus.ERROR });
      throw new HttpError(409, "The video file in storage is incomplete. Upload it again.");
    }

    const { token, hash } = createWatchToken();
    const now = new Date().toISOString();
    await repo.update(video.id, {
      status: VideoStatus.ACTIVE,
      fileSizeBytes: storedSize || fileSizeBytes,
      durationSeconds,
      interrupted,
      watchTokenHash: hash,
      shopifySyncedAt: null,
      downloadUrl: undefined,
      ...(media?.width && media.height ? { width: media.width, height: media.height } : {}),
      ...(media?.fps ? { fps: media.fps } : {}),
    });

    await this.removeReplacedVideos(orderId, video.id);
    await orderService.markPacked(orderId, now);
    await this.publishToShopify({ ...video, watchTokenHash: hash }, token);

    return toSummary((await repo.findBySession(sessionId)) ?? video);
  }

  /** A retake or a trimmed version replaces the order's earlier videos, which must not stay in storage. */
  private async removeReplacedVideos(orderId: string, keepId: string) {
    for (const old of await repo.listByOrder(orderId)) {
      if (old.id === keepId || old.status === VideoStatus.DELETED) continue;
      await this.deleteFileAndMark(old, { keepLink: false });
    }
  }

  /** Writes the watch link to the Shopify order. If that fails, the retry job tries again. */
  private async publishToShopify(video: StoredVideo, token: string) {
    try {
      const identity = await orderService.resolveIdentity(video.orderId);
      if (!identity) {
        logger.error(`Cannot tell Shopify about the video: order ${video.orderId} is unknown.`);
        return;
      }
      const ok = await shopifyClient.setPackingProof(identity.shopifyOrderId, { watchUrl: watchUrl(token) });
      if (ok) await repo.update(video.id, { shopifySyncedAt: new Date().toISOString() });
    } catch (err: any) {
      logger.error(`Shopify update for video ${video.id} failed; it will be retried:`, err.message);
    }
  }

  /**
   * Videos whose Shopify update failed get a new link and another try. No one has seen the old link,
   * and the secret cannot be recovered from its hash, so a new one is made.
   */
  async retryShopifySync(limit = 20): Promise<number> {
    let done = 0;
    for (const video of await repo.listUnsynced(limit)) {
      const { token, hash } = createWatchToken();
      await repo.update(video.id, { watchTokenHash: hash });
      await this.publishToShopify({ ...video, watchTokenHash: hash }, token);
      if ((await repo.findBySession(video.sessionId))?.shopifySyncedAt) done++;
    }
    // Links to videos that were deleted but could not be removed from Shopify yet.
    for (const video of await repo.listStaleShopifyLinks(limit)) {
      // A newer video for the same order owns the link now; leave it alone.
      if (await repo.findLatestByOrder(video.orderId)) {
        await repo.update(video.id, { shopifySyncedAt: null });
        continue;
      }
      const identity = await orderService.resolveIdentity(video.orderId);
      if (identity && (await shopifyClient.clearPackingVideo(identity.shopifyOrderId))) {
        await repo.update(video.id, { shopifySyncedAt: null });
      }
    }
    return done;
  }

  /**
   * The database id videos are filed under. The dashboard may hold a demo id or a Shopify id for the same
   * order (see databaseOrderId), so look the order up first.
   */
  async orderIdForVideos(orderId: string): Promise<string> {
    if (isMockSupabase || UUID_PATTERN.test(orderId)) return orderId;
    return (await orderService.resolveIdentity(orderId))?.id ?? orderId;
  }

  /** The newest video of an order, without storage details. */
  async getSummaryForOrder(orderId: string): Promise<VideoSummary | null> {
    const video = await repo.findLatestByOrder(await this.orderIdForVideos(orderId));
    return video ? toSummary(video) : null;
  }

  /** A temporary address to play the order's current video from. Only for signed-in staff. */
  async getPlayback(orderId: string): Promise<{ url: string; durationSeconds: number } | null> {
    const video = await repo.findLatestByOrder(await this.orderIdForVideos(orderId));
    if (!video || video.status !== VideoStatus.ACTIVE) return null;
    return { url: await storageService.createSignedDownloadUrl(video.storagePath, PLAYBACK_SECONDS), durationSeconds: video.durationSeconds };
  }

  /**
   * Opens a customer watch link. The token is the only credential: it identifies exactly one video of
   * exactly one order, so a customer cannot reach another order's video. A fresh temporary playback
   * address is made on every visit, so no storage address is ever kept or shown for long.
   */
  async resolveWatch(token: string): Promise<WatchResult> {
    if (!isWellFormedToken(token)) return { state: "unavailable" };
    const video = await repo.findByTokenHash(hashWatchToken(token));
    if (!video) return { state: "unavailable" };

    const orderNumber = (await orderService.resolveIdentity(video.orderId))?.orderNumber || video.orderNumber || undefined;
    const due = video.expiresAt ? new Date(video.expiresAt).getTime() <= Date.now() : false;
    if (video.status === VideoStatus.DELETED || video.status === VideoStatus.EXPIRED || due) {
      return { state: "expired", orderNumber };
    }
    if (video.status !== VideoStatus.ACTIVE) return { state: "unavailable" };

    return {
      state: "ready",
      orderNumber: orderNumber ?? "",
      durationSeconds: video.durationSeconds,
      playbackUrl: await storageService.createSignedDownloadUrl(video.storagePath, PLAYBACK_SECONDS),
      expiresAt: video.expiresAt ?? null,
    };
  }

  async listVideos(): Promise<VideoSummary[]> {
    return (await repo.listRecent(50)).map(toSummary);
  }

  /**
   * Deletes the stored file and marks the record deleted. With keepLink the watch link still resolves
   * (to a "removed" message); otherwise the link is retired because a newer video replaces it.
   */
  async deleteFileAndMark(video: StoredVideo, opts: { keepLink: boolean }): Promise<boolean> {
    const deleted = await storageService.deleteFile(video.storagePath);
    if (!deleted) return false;
    await repo.update(video.id, {
      status: VideoStatus.DELETED,
      deletedAt: new Date().toISOString(),
      downloadUrl: undefined,
      ...(opts.keepLink ? {} : { watchTokenHash: null }),
    });
    return true;
  }

  /**
   * Retention: deletes videos whose period is over (30 days after the real delivery date, 60 after a return) and takes the
   * Watch button off the Shopify order. Returns how many videos were deleted.
   */
  async purgeExpired(limit = 100): Promise<number> {
    let purged = 0;
    for (const video of await repo.listDueForDeletion(limit)) {
      if (!(await this.deleteFileAndMark(video, { keepLink: true }))) continue;
      purged++;
      logger.info(`Purged expired video ${video.id} (order ${video.orderId})`);
      try {
        const identity = await orderService.resolveIdentity(video.orderId);
        const cleared = identity ? await shopifyClient.clearPackingVideo(identity.shopifyOrderId) : false;
        // Until Shopify confirms, the video is flagged so the retry job removes the link later.
        await repo.update(video.id, { shopifySyncedAt: cleared ? null : (video.shopifySyncedAt ?? new Date().toISOString()) });
      } catch (err: any) {
        logger.error(`Could not remove the video link from Shopify for video ${video.id}:`, err.message);
      }
    }
    return purged;
  }
}

export const videoService = new VideoService();
