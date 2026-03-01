import { eventBus, PoolUpdateEvent } from "./eventBus";
import { SolPriceOracle } from "./oracle/solPriceOracle";
import { simulateRoundTrip } from "./pricing/simulator";

interface InternalState {
  [address: string]: PoolUpdateEvent;
}

export class SpreadEngine {
  private state: InternalState = {};

  constructor(private solOracle: SolPriceOracle) {
    eventBus.on("poolUpdate", (event: PoolUpdateEvent) => {
    this.handleUpdate(event);
  });
}

  private handleUpdate(event: PoolUpdateEvent) {
    this.state[event.address] = event;

    const candidates = Object.values(this.state).filter(
      (p) =>
        p.baseMint === event.baseMint &&
        p.quoteMint === event.quoteMint &&
        p.address !== event.address
    );

    for (const other of candidates) {
      this.computeSpread(event, other);
    }
  }

  private computeSpread(a: PoolUpdateEvent, b: PoolUpdateEvent) {
  const spotA = this.getSpotPrice(a);
  const spotB = this.getSpotPrice(b);
    console.log(
  `SpotA: ${spotA}, SpotB: ${spotB}`
);
  if (!spotA || !spotB) return;
  if (spotA === spotB) return;

  // ---------------------------------------
  // 1️⃣ Direction Pre-check
  // ---------------------------------------
  const buyPool = spotA < spotB ? a : b;
  const sellPool = spotA < spotB ? b : a;

  // ---------------------------------------
  // 2️⃣ Compute Micro Size (USD normalized)
  // ---------------------------------------
  const microUsd = this.computeMicroUsd(buyPool, sellPool);
  if (microUsd <= 0) return;

  const microQuote = this.usdToQuote(microUsd);

  // ---------------------------------------
  // 3️⃣ Simulate Round Trip (with pool fees)
  // ---------------------------------------
  const rawProfitQuote = simulateRoundTrip(
    BigInt(Math.floor(microQuote)),
    this.buildSimParams(buyPool),
    this.buildSimParams(sellPool)
  );

  if (rawProfitQuote <= 0n) return;

  const quoteDecimals = buyPool.quoteDecimals;
  const profitQuote =
    Number(rawProfitQuote) / 10 ** quoteDecimals;

  // ---------------------------------------
  // 4️⃣ Execution Cost Modeling
  // ---------------------------------------
  const solPrice = this.solOracle.getPrice();

  const txFeeSol = 0.000005;        // base tx
  const priorityFeeSol = 0.00002;   // Jito tip (example)

  const executionCostUsd =
    (txFeeSol + priorityFeeSol) * solPrice;

  const netProfitUsd = profitQuote - executionCostUsd;

  const executable = netProfitUsd > 0;

// ---------------------------------------
// 5️⃣ Logging
// ---------------------------------------
const opportunity: SpreadOpportunity = {
  buyPool: buyPool.address,
  sellPool: sellPool.address,
  microUsd,
  grossUsd: profitQuote,
  netUsd: netProfitUsd,
  slot: Math.max(buyPool.slot, sellPool.slot),
};

eventBus.emit("spreadOpportunity", opportunity);
}

  private computeMicroUsd(
    a: PoolUpdateEvent,
    b: PoolUpdateEvent
  ): number {
    const liqA = this.getEffectiveLiquidityUsd(a);
    const liqB = this.getEffectiveLiquidityUsd(b);

    const minLiq = Math.min(liqA, liqB);

    const alpha = Math.sqrt(liqA * liqB) / minLiq;

    return minLiq * 0.0005 * alpha; // adaptive % depth
  }

  private getEffectiveLiquidityUsd(pool: PoolUpdateEvent): number {
    if (pool.type === "CPMM") {
      if (!pool.baseReserve || !pool.quoteReserve) return 0;
      return Number(pool.quoteReserve) / 1e6;
    }

    if (pool.type === "CLMM") {
  if (!pool.sqrtPriceX64) return 0;

  const sqrt = Number(pool.sqrtPriceX64) / 2 ** 64;
  const rawPrice = sqrt * sqrt;

  const decimalAdjust =
    10 ** pool.baseDecimals /
    10 ** pool.quoteDecimals;

  return rawPrice * decimalAdjust;
}

    return 0;
  }

  private usdToQuote(usd: number): number {
    return usd * 1e6; // USDT assumption
  }

  private buildSimParams(pool: PoolUpdateEvent) {
    if (pool.type === "CPMM") {
      return {
        type: "CPMM" as const,
        data: {
          reserveIn: pool.baseReserve!,
          reserveOut: pool.quoteReserve!,
          feeRate: pool.feeRate,
        },
      };
    }

    return {
      type: "CLMM" as const,
      data: {
        sqrtPriceX64: pool.sqrtPriceX64!,
        liquidity: pool.liquidity!,
        feeRate: pool.feeRate,
      },
    };
  }

  private getSpotPrice(pool: PoolUpdateEvent): number | null {
    if (pool.type === "CPMM") {
      if (!pool.baseReserve || !pool.quoteReserve)
        return null;

      return (
        Number(pool.quoteReserve) /
        Number(pool.baseReserve)
      );
    }

    if (pool.type === "CLMM") {
      if (!pool.sqrtPriceX64) return null;

      const sqrtP =
        Number(pool.sqrtPriceX64) / 2 ** 64;

      return sqrtP * sqrtP;
    }

    return null;
  }
}
export interface SpreadOpportunity {
  buyPool: string;
  sellPool: string;
  microUsd: number;
  grossUsd: number;
  netUsd: number;
  slot: number;
}