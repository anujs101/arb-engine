import { Connection, PublicKey } from "@solana/web3.js";
import { AccountLayout } from "@solana/spl-token";
import { MonitoredPool } from "../types";
import { PoolInfoLayout } from "@raydium-io/raydium-sdk";
import { eventBus } from "../eventBus";
interface ActivePool {
  metadata: MonitoredPool;
  subIds: number[];
  baseReserve?: bigint;
  quoteReserve?: bigint;
  liquidity?: bigint;
  sqrtPriceX64?: bigint;
  lastUpdatedSlot: number;
}

export class MonitorManager {
  private connection: Connection;
  private activePools: Map<string, ActivePool>;

  constructor(connection: Connection) {
    this.connection = connection;
    this.activePools = new Map();
  }

  async initialize(pools: MonitoredPool[]) {
    for (const pool of pools) {
      await this.subscribePool(pool);
    }
  }

  private async subscribePool(pool: MonitoredPool) {
    if (this.activePools.has(pool.address)) return;

    const active: ActivePool = {
      metadata: pool,
      subIds: [],
      lastUpdatedSlot: 0,
    };

    if (pool.type === "CPMM") {
      await this.subscribeCpmm(pool, active);
    } else if (pool.type === "CLMM") {
      await this.subscribeClmm(pool, active);
    }

    this.activePools.set(pool.address, active);
    console.log(`Subscribed: ${pool.address} (${pool.type})`);
  }

  /**
   * ===============================
   * CPMM SUBSCRIPTION
   * ===============================
   */
  private async subscribeCpmm(
  pool: MonitoredPool,
  active: ActivePool
) {
  if (!pool.baseVault || !pool.quoteVault) return;

  const baseVault = new PublicKey(pool.baseVault);
  const quoteVault = new PublicKey(pool.quoteVault);

  let lastBase = 0n;
  let lastQuote = 0n;

  active.baseReserve = 0n;
  active.quoteReserve = 0n;

  let baseSlot = 0;
  let quoteSlot = 0;

  const maybeEmitUpdate = () => {
    if (
      active.baseReserve === 0n ||
      active.quoteReserve === 0n
    )
      return;

    // 🚨 FIX: ensure both updated in same slot
    if (baseSlot !== quoteSlot) return;

    const slot = baseSlot;

    const price =
      Number(active.quoteReserve) /
      Number(active.baseReserve);

    console.log(
      `CPMM ${pool.address} | slot ${slot} | price: ${price}`
    );

        eventBus.emit("poolUpdate", {
      address: pool.address,
      type: "CPMM",
      baseMint: pool.baseMint,
      quoteMint: pool.quoteMint,
      slot,
      baseReserve: active.baseReserve,
      quoteReserve: active.quoteReserve,
    });
  };

  const baseSubId = this.connection.onAccountChange(
    baseVault,
    (accountInfo, ctx) => {
      const decoded = AccountLayout.decode(accountInfo.data);
      const newReserve = BigInt(decoded.amount.toString());

      if (newReserve === lastBase) return;

      lastBase = newReserve;
      active.baseReserve = newReserve;

      baseSlot = ctx.slot;
      active.lastUpdatedSlot = ctx.slot;

      maybeEmitUpdate();
    },
    "confirmed"
  );

  const quoteSubId = this.connection.onAccountChange(
    quoteVault,
    (accountInfo, ctx) => {
      const decoded = AccountLayout.decode(accountInfo.data);
      const newReserve = BigInt(decoded.amount.toString());

      if (newReserve === lastQuote) return;

      lastQuote = newReserve;
      active.quoteReserve = newReserve;

      quoteSlot = ctx.slot;
      active.lastUpdatedSlot = ctx.slot;

      maybeEmitUpdate();
    },
    "confirmed"
  );

  active.subIds.push(baseSubId, quoteSubId);
}
  /**
   * ===============================
   * CLMM SUBSCRIPTION
   * ===============================
   */
  private async subscribeClmm(
  pool: MonitoredPool,
  active: ActivePool
) {
  const poolState = new PublicKey(pool.address);

  const subId = this.connection.onAccountChange(
    poolState,
    (accountInfo, ctx) => {

      const decoded = PoolInfoLayout.decode(
        accountInfo.data
      );

      active.sqrtPriceX64 = BigInt(
        decoded.sqrtPriceX64.toString()
      );

      active.liquidity = BigInt(
        decoded.liquidity.toString()
      );

      active.lastUpdatedSlot = ctx.slot;

      // Compute spot price from sqrtPriceX64
      const sqrtP =
        Number(active.sqrtPriceX64) / 2 ** 64;

      const price = sqrtP * sqrtP;

      console.log(
        `CLMM ${pool.address} | slot ${ctx.slot} | price: ${price}`
      );
            eventBus.emit("poolUpdate", {
        address: pool.address,
        type: "CLMM",
        baseMint: pool.baseMint,
        quoteMint: pool.quoteMint,
        slot: ctx.slot,
        sqrtPriceX64: active.sqrtPriceX64,
        liquidity: active.liquidity,
      });
    },
    "confirmed"
  );

  active.subIds.push(subId);
}

  /**
   * ===============================
   * UNSUBSCRIBE
   * ===============================
   */
  private async unsubscribePool(address: string) {
    const pool = this.activePools.get(address);
    if (!pool) return;

    for (const subId of pool.subIds) {
      await this.connection.removeAccountChangeListener(subId);
    }

    this.activePools.delete(address);
    console.log(`Unsubscribed: ${address}`);
  }

  getActivePools() {
    return Array.from(this.activePools.values());
  }
}