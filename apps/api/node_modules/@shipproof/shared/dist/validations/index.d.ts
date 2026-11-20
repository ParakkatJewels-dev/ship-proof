export interface StartPackingInput {
    orderNumberOrId: string;
    stationId: string;
    packerId: string;
}
export interface VerifyItemInput {
    sessionId: string;
    sku: string;
    verified: boolean;
    quantityVerified: number;
}
export interface FinishPackingInput {
    sessionId: string;
    notes?: string;
}
export declare function validateOrderQuery(query: string): boolean;
//# sourceMappingURL=index.d.ts.map