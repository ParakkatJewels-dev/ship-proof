"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_js_1 = require("./order.controller.js");
const auth_middleware_js_1 = require("../../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
router.get("/search/:query", auth_middleware_js_1.authenticate, (req, res) => order_controller_js_1.orderController.getOrder(req, res));
router.get("/", auth_middleware_js_1.authenticate, (req, res) => order_controller_js_1.orderController.listOrders(req, res));
exports.default = router;
