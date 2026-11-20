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

export function validateOrderQuery(query: string): boolean {
  if (!query || typeof query !== "string") return false;
  const clean = query.trim().replace(/^#/, "");
  return clean.length > 0;
}
