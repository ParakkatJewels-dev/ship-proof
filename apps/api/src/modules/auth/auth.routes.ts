import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authController } from "./auth.controller.js";

const router = Router();

router.post("/login", (req, res) => authController.login(req, res));
router.post("/refresh", (req, res) => authController.refresh(req, res));
router.get("/me", authenticate, (req, res) => authController.me(req, res));
router.post("/logout", (req, res) => authController.logout(req, res));

export default router;
