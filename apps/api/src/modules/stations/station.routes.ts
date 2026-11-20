import { Router } from "express";
import { stationController } from "./station.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticate, (req, res) => stationController.listStations(req, res));
router.get("/:id", authenticate, (req, res) => stationController.getStation(req, res));

export default router;
