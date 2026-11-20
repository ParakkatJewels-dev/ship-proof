"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const station_controller_js_1 = require("./station.controller.js");
const auth_middleware_js_1 = require("../../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_js_1.authenticate, (req, res) => station_controller_js_1.stationController.listStations(req, res));
router.get("/:id", auth_middleware_js_1.authenticate, (req, res) => station_controller_js_1.stationController.getStation(req, res));
exports.default = router;
