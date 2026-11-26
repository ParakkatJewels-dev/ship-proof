import { Router } from "express";
import { stationController } from "./station.controller.js";
import { authenticate, requireRole } from "../../middlewares/auth.middleware.js";
import { UserRole } from "@shipproof/shared";

const router = Router();

router.get("/", authenticate, (req, res) => stationController.listStations(req, res));
// Must come before "/:id" so "active-device" isn't treated as a station id.
router.get("/active-device", authenticate, (req, res) => stationController.getActiveDevice(req, res));
// The camera device posts its status here (authenticated with its station key).
router.post("/heartbeat", authenticate, requireRole(UserRole.STATION), (req, res) => stationController.reportStatus(req, res));
router.get("/:id", authenticate, (req, res) => stationController.getStation(req, res));

export default router;
