import { EventEmitter } from "events";

export const eventBus = new EventEmitter();

export type PoolUpdateEvent = {
  address: string;
  type: "CPMM" | "CLMM";
  baseMint: string;
  quoteMint: string;
  slot: number;

  // CPMM
  baseReserve?: bigint;
  quoteReserve?: bigint;

  // CLMM
  sqrtPriceX64?: bigint;
  liquidity?: bigint;
};