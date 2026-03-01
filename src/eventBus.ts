import { EventEmitter } from "events";

export const eventBus = new EventEmitter();

export interface PoolUpdateEvent {
  address: string;
  type: "CPMM" | "CLMM";

  baseMint: string;
  quoteMint: string;

  baseDecimals: number;
  quoteDecimals: number;

  feeRate: number;

  baseReserve?: bigint;
  quoteReserve?: bigint;

  sqrtPriceX64?: bigint;
  liquidity?: bigint;

  slot: number;
}