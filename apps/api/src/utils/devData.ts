import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

/**
 * Local demo mode only (no Supabase configured): a folder on this computer that stands in for the
 * database and file storage, so recording, upload, Download and Share can be tested with dummy data
 * without touching production. Never used when Supabase is configured.
 */
export const DEV_DATA_DIR = path.resolve(process.cwd(), ".dev-data");

/**
 * A Map that is saved to .dev-data/<name>.json whenever it changes and loaded again when the API
 * starts, so demo records survive restarts. Without `persist` it is an ordinary in-memory Map.
 */
export function devMap<V>(name: string, persist: boolean): Map<string, V> {
  const map = new Map<string, V>();
  if (!persist) return map;

  const file = path.join(DEV_DATA_DIR, `${name}.json`);
  try {
    if (fs.existsSync(file)) {
      for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, V>)) map.set(k, v);
    }
  } catch (err: any) {
    logger.warn(`Could not read demo data ${file}: ${err.message}. Starting empty.`);
  }

  const save = () => {
    try {
      fs.mkdirSync(DEV_DATA_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(Object.fromEntries(map), null, 2));
    } catch (err: any) {
      logger.warn(`Could not save demo data ${file}: ${err.message}`);
    }
  };
  const set = map.set.bind(map);
  const del = map.delete.bind(map);
  const clear = map.clear.bind(map);
  map.set = (k: string, v: V) => {
    set(k, v);
    save();
    return map;
  };
  map.delete = (k: string) => {
    const had = del(k);
    if (had) save();
    return had;
  };
  map.clear = () => {
    clear();
    save();
  };
  return map;
}
