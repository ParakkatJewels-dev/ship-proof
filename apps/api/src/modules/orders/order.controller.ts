import { Request, Response } from "express";
import { orderService } from "./order.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";

export class OrderController {
  async getOrder(req: Request, res: Response) {
    try {
      const query = String(req.params.query || "");
      if (!query) {
        return sendError(res, "Order query parameter is required", 400);
      }

      const order = await orderService.getOrder(query);
      if (!order) {
        return sendError(res, `Order '${query}' not found in system or Shopify`, 404);
      }

      return sendSuccess(res, order, "Order retrieved successfully");
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  async listOrders(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const orders = await orderService.listOrders(limit);
      return sendSuccess(res, orders);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
}

export const orderController = new OrderController();
