import { VideoRecord, VideoStatus } from "@shipproof/shared";
import { supabase, isMockSupabase } from "../../integrations/supabase/db.client.js";

/** A video as kept in the database: the public record plus the fields only the server may see. */
export interface StoredVideo extends VideoRecord {
  /** SHA-256 of the secret in the customer watch link. */
  watchTokenHash?: string | null;
  /** When the watch link was last written to the Shopify order. Null means it still has to be sent. */
  shopifySyncedAt?: string | null;
  /** When the packer started recording, as reported by the camera computer. */
  recordedAt?: string | null;
  /** Picture size and frame rate of the stored video. */
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  /** Only kept in the in-memory store; the real database reads the number from the orders table. */
  orderNumber?: string;
}

/** All reads and writes of video records. The in-memory store is used only when Supabase is not configured. */
export interface VideoRepository {
  insert(video: StoredVideo): Promise<void>;
  update(id: string, patch: Partial<StoredVideo>): Promise<void>;
  findBySession(sessionId: string): Promise<StoredVideo | null>;
  /** The newest video of an order that has not been deleted. */
  findLatestByOrder(orderId: string): Promise<StoredVideo | null>;
  listByOrder(orderId: string): Promise<StoredVideo[]>;
  findByTokenHash(hash: string): Promise<StoredVideo | null>;
  /** Stores an extra watch link (the Share action) for a video; only the hash of its secret is kept. */
  addShareLink(videoId: string, tokenHash: string, createdBy: string | null): Promise<void>;
  /** The video an extra watch link points to. */
  findByShareHash(hash: string): Promise<StoredVideo | null>;
  /** Finished videos whose watch link has not reached Shopify yet. */
  listUnsynced(limit: number): Promise<StoredVideo[]>;
  /** Deleted videos whose link could not be taken off the Shopify order yet. */
  listStaleShopifyLinks(limit: number): Promise<StoredVideo[]>;
  /** Videos whose retention period is over and whose file must be deleted. */
  listDueForDeletion(limit: number): Promise<StoredVideo[]>;
  listRecent(limit: number): Promise<StoredVideo[]>;
}

/* ------------------------------- in memory -------------------------------- */

const memory = new Map<string, StoredVideo>();
/** Extra watch links in demo mode: secret hash -> video id. */
const memoryShares = new Map<string, string>();

const newestFirst = (a: StoredVideo, b: StoredVideo) => b.createdAt.localeCompare(a.createdAt);

const memoryRepository: VideoRepository = {
  async insert(video) {
    memory.set(video.id, { ...video });
  },
  async update(id, patch) {
    const current = memory.get(id);
    if (current) memory.set(id, { ...current, ...patch, updatedAt: new Date().toISOString() });
  },
  async findBySession(sessionId) {
    return [...memory.values()].find((v) => v.sessionId === sessionId) ?? null;
  },
  async findLatestByOrder(orderId) {
    return [...memory.values()].filter((v) => v.orderId === orderId && v.status !== VideoStatus.DELETED).sort(newestFirst)[0] ?? null;
  },
  async listByOrder(orderId) {
    return [...memory.values()].filter((v) => v.orderId === orderId).sort(newestFirst);
  },
  async findByTokenHash(hash) {
    return [...memory.values()].find((v) => v.watchTokenHash === hash) ?? null;
  },
  async addShareLink(videoId, tokenHash) {
    memoryShares.set(tokenHash, videoId);
  },
  async findByShareHash(hash) {
    const id = memoryShares.get(hash);
    return id ? memory.get(id) ?? null : null;
  },
  async listUnsynced(limit) {
    return [...memory.values()].filter((v) => v.status === VideoStatus.ACTIVE && !v.shopifySyncedAt).slice(0, limit);
  },
  async listStaleShopifyLinks(limit) {
    return [...memory.values()]
      .filter((v) => v.status === VideoStatus.DELETED && v.watchTokenHash && v.shopifySyncedAt)
      .slice(0, limit);
  },
  async listDueForDeletion(limit) {
    const now = Date.now();
    return [...memory.values()]
      .filter(
        (v) =>
          v.status === VideoStatus.EXPIRED ||
          (v.status === VideoStatus.ACTIVE && v.expiresAt && new Date(v.expiresAt).getTime() <= now),
      )
      .slice(0, limit);
  },
  async listRecent(limit) {
    return [...memory.values()].sort(newestFirst).slice(0, limit);
  },
};

/* --------------------------------- Supabase -------------------------------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fromRow(d: any): StoredVideo {
  return {
    id: d.id,
    sessionId: d.session_id,
    orderId: d.order_id,
    stationId: d.station_id,
    storagePath: d.storage_path,
    fileName: d.file_name,
    fileSizeBytes: d.file_size_bytes,
    durationSeconds: d.duration_seconds,
    status: d.status as VideoStatus,
    downloadUrl: d.download_url ?? undefined,
    retentionDays: d.retention_days,
    interrupted: d.interrupted ?? false,
    expiresAt: d.expires_at,
    deletedAt: d.deleted_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    watchTokenHash: d.watch_token_hash,
    shopifySyncedAt: d.shopify_synced_at,
    recordedAt: d.recorded_at,
    width: d.width,
    height: d.height,
    fps: d.fps === null || d.fps === undefined ? null : Number(d.fps),
  };
}

/** camelCase fields to the database column names. Only fields that are present are written. */
function toRow(p: Partial<StoredVideo>): Record<string, unknown> {
  const map: Record<string, string> = {
    id: "id",
    sessionId: "session_id",
    orderId: "order_id",
    stationId: "station_id",
    storagePath: "storage_path",
    fileName: "file_name",
    fileSizeBytes: "file_size_bytes",
    durationSeconds: "duration_seconds",
    status: "status",
    downloadUrl: "download_url",
    retentionDays: "retention_days",
    interrupted: "interrupted",
    expiresAt: "expires_at",
    deletedAt: "deleted_at",
    watchTokenHash: "watch_token_hash",
    shopifySyncedAt: "shopify_synced_at",
    recordedAt: "recorded_at",
    width: "width",
    height: "height",
    fps: "fps",
  };
  const row: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(map)) {
    if (key in p) row[column] = (p as any)[key] ?? null;
  }
  return row;
}

function must<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

const supabaseRepository: VideoRepository = {
  async insert(video) {
    if (!UUID.test(video.orderId)) throw new Error(`Order id ${video.orderId} is not an order in the database`);
    must(await supabase.from("videos").insert(toRow(video)), "Could not save the video record");
  },
  async update(id, patch) {
    must(
      await supabase
        .from("videos")
        .update({ ...toRow(patch), updated_at: new Date().toISOString() })
        .eq("id", id),
      "Could not update the video record",
    );
  },
  async findBySession(sessionId) {
    if (!UUID.test(sessionId)) return null;
    const data = must(await supabase.from("videos").select("*").eq("session_id", sessionId).maybeSingle(), "Video lookup failed");
    return data ? fromRow(data) : null;
  },
  async findLatestByOrder(orderId) {
    if (!UUID.test(orderId)) return null;
    const data = must(
      await supabase
        .from("videos")
        .select("*")
        .eq("order_id", orderId)
        .neq("status", VideoStatus.DELETED)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "Video lookup failed",
    );
    return data ? fromRow(data) : null;
  },
  async listByOrder(orderId) {
    if (!UUID.test(orderId)) return [];
    const data = must(await supabase.from("videos").select("*").eq("order_id", orderId).order("created_at", { ascending: false }), "Video lookup failed");
    return (data ?? []).map(fromRow);
  },
  async findByTokenHash(hash) {
    const data = must(await supabase.from("videos").select("*").eq("watch_token_hash", hash).maybeSingle(), "Video lookup failed");
    return data ? fromRow(data) : null;
  },
  async addShareLink(videoId, tokenHash, createdBy) {
    must(
      await supabase.from("video_share_links").insert({ video_id: videoId, token_hash: tokenHash, created_by: createdBy }),
      "Could not save the share link",
    );
  },
  async findByShareHash(hash) {
    const link = must(
      await supabase.from("video_share_links").select("video_id").eq("token_hash", hash).maybeSingle(),
      "Share link lookup failed",
    );
    if (!link) return null;
    const data = must(await supabase.from("videos").select("*").eq("id", link.video_id).maybeSingle(), "Video lookup failed");
    return data ? fromRow(data) : null;
  },
  async listUnsynced(limit) {
    const data = must(
      await supabase.from("videos").select("*").eq("status", VideoStatus.ACTIVE).is("shopify_synced_at", null).limit(limit),
      "Video lookup failed",
    );
    return (data ?? []).map(fromRow);
  },
  async listStaleShopifyLinks(limit) {
    const data = must(
      await supabase
        .from("videos")
        .select("*")
        .eq("status", VideoStatus.DELETED)
        .not("watch_token_hash", "is", null)
        .not("shopify_synced_at", "is", null)
        .limit(limit),
      "Video lookup failed",
    );
    return (data ?? []).map(fromRow);
  },
  async listDueForDeletion(limit) {
    const now = new Date().toISOString();
    const data = must(
      await supabase
        .from("videos")
        .select("*")
        .or(`status.eq.${VideoStatus.EXPIRED},and(status.eq.${VideoStatus.ACTIVE},expires_at.lte.${now})`)
        .limit(limit),
      "Video lookup failed",
    );
    return (data ?? []).map(fromRow);
  },
  async listRecent(limit) {
    const data = must(await supabase.from("videos").select("*").order("created_at", { ascending: false }).limit(limit), "Video lookup failed");
    return (data ?? []).map(fromRow);
  },
};

export const videoRepository: VideoRepository = isMockSupabase ? memoryRepository : supabaseRepository;
