"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const video_controller_js_1 = require("./video.controller.js");
const auth_middleware_js_1 = require("../../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
// Camera agent endpoints
router.post("/upload-url", auth_middleware_js_1.authenticate, (req, res) => video_controller_js_1.videoController.requestUploadUrl(req, res));
router.post("/complete", auth_middleware_js_1.authenticate, (req, res) => video_controller_js_1.videoController.completeUpload(req, res));
// Admin & customer queries
router.get("/order/:orderId", (req, res) => video_controller_js_1.videoController.getVideoForOrder(req, res));
router.get("/", auth_middleware_js_1.authenticate, (req, res) => video_controller_js_1.videoController.listVideos(req, res));
exports.default = router;
