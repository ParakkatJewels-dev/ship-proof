"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.isMockSupabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_config_js_1 = require("../../config/env.config.js");
const logger_js_1 = require("../../utils/logger.js");
// Check if credentials are mock/default
exports.isMockSupabase = env_config_js_1.config.supabase.url.includes("mock.supabase.co");
if (exports.isMockSupabase) {
    logger_js_1.logger.warn("Using mock Supabase instance. Live DB operations will run on in-memory mock store.");
}
exports.supabase = (0, supabase_js_1.createClient)(env_config_js_1.config.supabase.url, env_config_js_1.config.supabase.serviceKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
