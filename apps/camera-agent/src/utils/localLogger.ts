/**
 * Hides the user name and password in camera addresses such as rtsp://user:pass@192.168.1.64/...,
 * which ffmpeg repeats in its error messages. Applied to every log line.
 */
export function maskSecrets(text: string): string {
  return text.replace(/\b(rtsps?|https?):\/\/[^\s/@]+@/gi, "$1://***@");
}

const clean = (meta: unknown) => {
  if (meta === undefined || meta === null || meta === "") return "";
  if (typeof meta === "string") return maskSecrets(meta);
  if (meta instanceof Error) return maskSecrets(meta.stack || meta.message);
  try {
    return maskSecrets(JSON.stringify(meta));
  } catch {
    return "";
  }
};

const line = (level: string, msg: string) =>
  `[AGENT ${new Date().toLocaleTimeString()}] [${level}] ${maskSecrets(msg)}`;

export const agentLogger = {
  info: (msg: string, meta?: unknown) => console.log(line("INFO", msg), clean(meta)),
  warn: (msg: string, meta?: unknown) => console.warn(line("WARN", msg), clean(meta)),
  error: (msg: string, meta?: unknown) => console.error(line("ERROR", msg), clean(meta)),
};
