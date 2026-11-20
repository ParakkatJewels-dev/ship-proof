import { Router } from "express";
import { videoController } from "./video.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

// Camera agent endpoints
router.post("/upload-url", authenticate, (req, res) => videoController.requestUploadUrl(req, res));
router.post("/complete", authenticate, (req, res) => videoController.completeUpload(req, res));

// Admin & customer queries
router.get("/order/:orderId", (req, res) => videoController.getVideoForOrder(req, res));
router.get("/", authenticate, (req, res) => videoController.listVideos(req, res));

export default router;
