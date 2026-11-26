import { Router } from "express";
import { UserRole } from "@shipproof/shared";
import { videoController } from "./video.controller.js";
import { authenticate, requireRole } from "../../middlewares/auth.middleware.js";

const router = Router();

// Camera agent endpoints: only a camera station may call these.
router.post("/upload-url", authenticate, requireRole(UserRole.STATION), (req, res) => videoController.requestUploadUrl(req, res));
router.post("/complete", authenticate, requireRole(UserRole.STATION), (req, res) => videoController.completeUpload(req, res));

// Dashboard endpoints: signed-in staff only. None of them return a storage address except playback,
// which is a short-lived link made on request.
const staff = [authenticate, requireRole(UserRole.ADMIN, UserRole.PACKER)];
router.get("/order/:orderId", ...staff, (req, res) => videoController.getVideoForOrder(req, res));
router.get("/order/:orderId/playback", ...staff, (req, res) => videoController.getPlayback(req, res));
router.post("/order/:orderId/trim", ...staff, (req, res) => videoController.trim(req, res));
router.get("/order/:orderId/download", ...staff, (req, res) => videoController.getDownload(req, res));
router.post("/order/:orderId/share", ...staff, (req, res) => videoController.createShareLink(req, res));
router.get("/", ...staff, (req, res) => videoController.listVideos(req, res));

export default router;
