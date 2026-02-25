import { eventBus, PoolUpdateEvent } from "./eventBus";

interface InternalState {
  [address: string]: PoolUpdateEvent;
}

export class SpreadEngine {
  private state: InternalState = {};

  constructor() {
    eventBus.on("poolUpdate", (event: PoolUpdateEvent) => {
      this.handleUpdate(event);
    });
  }

  private handleUpdate(event: PoolUpdateEvent) {
    this.state[event.address] = event;

    // Only compare pools with same mint pair
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

  private computeSpread(
    a: PoolUpdateEvent,
    b: PoolUpdateEvent
  ) {
    const priceA = this.getSpotPrice(a);
    const priceB = this.getSpotPrice(b);

    if (!priceA || !priceB) return;

    const spread =
      ((priceA - priceB) / priceB) * 10000;

    console.log(
      `Spread ${a.address} vs ${b.address}: ${spread.toFixed(
        2
      )} bps`
    );
  }

  private getSpotPrice(
    pool: PoolUpdateEvent
  ): number | null {
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