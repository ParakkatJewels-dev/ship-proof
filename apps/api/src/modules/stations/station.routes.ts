import { Router } from "express";
import { stationController } from "./station.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, (req, res) => stationController.listStations(req, res));
// Must come before "/:id" so "active-device" isn't treated as a station id.
router.get("/active-device", authenticate, (req, res) => stationController.getActiveDevice(req, res));
router.get("/:id", authenticate, (req, res) => stationController.getStation(req, res));

export default router;
