"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOrderQuery = validateOrderQuery;
function validateOrderQuery(query) {
    if (!query || typeof query !== "string")
        return false;
    const clean = query.trim().replace(/^#/, "");
    return clean.length > 0;
}
//# sourceMappingURL=index.js.map