import { supabase, isMockSupabase } from "./db.client.js";
import { config } from "../../config/env.config.js";
import { logger } from "../../utils/logger.js";

export class StorageService {
  private bucket = config.supabase.bucket;

  /**
   * Generates a signed upload URL for the camera agent to upload directly to Supabase Storage.
   */
  async createSignedUploadUrl(filePath: string): Promise<{ signedUrl: string; token: string }> {
    if (isMockSupabase) {
      return {
        signedUrl: `https://mock-storage.supabase.co/upload/${this.bucket}/${filePath}`,
        token: `mock-token-${Date.now()}`,
      };
    }

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      logger.error("Failed to generate signed upload URL", error);
      throw new Error(`Storage error: ${error?.message || "Failed to create upload URL"}`);
    }

    return {
      signedUrl: data.signedUrl,
      token: data.token,
    };
  }

  /**
   * Generates a temporary signed download URL for viewing or customer playback.
   */
  async createSignedDownloadUrl(filePath: string, expiresInSeconds = 3600, downloadAs?: string): Promise<string> {
    if (isMockSupabase) {
      return `https://mock-storage.supabase.co/download/${this.bucket}/${filePath}?token=mock-token`;
    }

    const { data, error } = await supabase.storage
      .from(this.bucket)
      // With downloadAs, the browser saves the file under that name instead of playing it.
      .createSignedUrl(filePath, expiresInSeconds, downloadAs ? { download: downloadAs } : undefined);

    if (error || !data) {
      logger.error("Failed to generate signed download URL", error);
      throw new Error(`Storage error: ${error?.message || "Failed to create download URL"}`);
    }

    return data.signedUrl;
  }

  /** Size in bytes of a stored file, or null when it is not there. */
  async statObject(filePath: string): Promise<number | null> {
    if (isMockSupabase) return 0;
    const slash = filePath.lastIndexOf("/");
    const folder = filePath.slice(0, slash);
    const name = filePath.slice(slash + 1);
    const { data, error } = await supabase.storage.from(this.bucket).list(folder, { search: name, limit: 5 });
    if (error) {
      logger.error(`Could not look up storage file ${filePath}`, error);
      return null;
    }
    const found = data?.find((f) => f.name === name);
    const size = (found?.metadata as { size?: number } | undefined)?.size;
    return found ? (typeof size === "number" ? size : 0) : null;
  }

  /**
   * Deletes video object from storage upon retention expiry.
   */
  async deleteFile(filePath: string): Promise<boolean> {
    if (isMockSupabase) {
      logger.info(`[Mock Storage] Deleted ${filePath}`);
      return true;
    }

    const { error } = await supabase.storage.from(this.bucket).remove([filePath]);
    if (error) {
      logger.error(`Failed to delete storage file: ${filePath}`, error);
      return false;
    }
    return true;
  }
}

export const storageService = new StorageService();
