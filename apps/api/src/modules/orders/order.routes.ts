import { Router } from "express";
import { orderController } from "./order.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/search/:query", authenticate, (req, res) => orderController.getOrder(req, res));
router.get("/", authenticate, (req, res) => orderController.listOrders(req, res));

export default router;
