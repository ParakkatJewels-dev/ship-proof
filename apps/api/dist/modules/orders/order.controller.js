"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderController = exports.OrderController = void 0;
const order_service_js_1 = require("./order.service.js");
const response_js_1 = require("../../utils/response.js");
class OrderController {
    async getOrder(req, res) {
        try {
            const query = String(req.params.query || "");
            if (!query) {
                return (0, response_js_1.sendError)(res, "Order query parameter is required", 400);
            }
            const order = await order_service_js_1.orderService.getOrder(query);
            if (!order) {
                return (0, response_js_1.sendError)(res, `Order '${query}' not found in system or Shopify`, 404);
            }
            return (0, response_js_1.sendSuccess)(res, order, "Order retrieved successfully");
        }
        catch (err) {
            return (0, response_js_1.sendError)(res, err.message, 500);
        }
    }
    async listOrders(req, res) {
        try {
            const limit = parseInt(req.query.limit, 10) || 20;
            const orders = await order_service_js_1.orderService.listOrders(limit);
            return (0, response_js_1.sendSuccess)(res, orders);
        }
        catch (err) {
            return (0, response_js_1.sendError)(res, err.message, 500);
        }
    }
}
exports.OrderController = OrderController;
exports.orderController = new OrderController();
