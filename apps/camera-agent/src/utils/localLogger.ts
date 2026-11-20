export const agentLogger = {
  info: (msg: string, meta?: any) =>
    console.log(`[AGENT ${new Date().toLocaleTimeString()}] [INFO] ${msg}`, meta ? meta : ""),
  warn: (msg: string, meta?: any) =>
    console.warn(`[AGENT ${new Date().toLocaleTimeString()}] [WARN] ${msg}`, meta ? meta : ""),
  error: (msg: string, meta?: any) =>
    console.error(`[AGENT ${new Date().toLocaleTimeString()}] [ERROR] ${msg}`, meta ? meta : ""),
};
