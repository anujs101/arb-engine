import { Connection, PublicKey } from "@solana/web3.js";
import { RaydiumV4Pool } from "../indexers/raydiumV4Indexer";
import { subscribeToVault } from "../ingestion/vaultSubscriber";
import { AccountLayout } from "@solana/spl-token";

/**
 * ===============================
 * TYPES
 * ===============================
 */

interface ActivePool {
  metadata: RaydiumV4Pool;
  baseSubId: number;
  quoteSubId: number;
  baseReserve: bigint;
  quoteReserve: bigint;
  lastUpdatedSlot: number;
}

/**
 * ===============================
 * MONITOR MANAGER
 * ===============================
 */

export class MonitorManager {
  private connection: Connection;
  private activePools: Map<string, ActivePool>;

  constructor(connection: Connection) {
    this.connection = connection;
    this.activePools = new Map();
  }

  /**
   * ===============================
   * INITIALIZE MONITORING
   * ===============================
   */

  async initialize(pools: RaydiumV4Pool[]) {
    for (const pool of pools) {
      await this.subscribePool(pool);
    }
  }

  /**
   * ===============================
   * SUBSCRIBE POOL
   * ===============================
   */

  private async subscribePool(pool: RaydiumV4Pool) {
    if (this.activePools.has(pool.address)) return;

    const baseVault = new PublicKey(pool.baseVault);
    const quoteVault = new PublicKey(pool.quoteVault);

    const active: ActivePool = {
      metadata: pool,
      baseSubId: 0,
      quoteSubId: 0,
      baseReserve: 0n,
      quoteReserve: 0n,
      lastUpdatedSlot: 0,
    };

    const baseSubId = this.connection.onAccountChange(
      baseVault,
      (accountInfo, ctx) => {
        const decoded = AccountLayout.decode(accountInfo.data);
        active.baseReserve = BigInt(decoded.amount.toString());
        active.lastUpdatedSlot = ctx.slot;
        console.log(`Update ${pool.address} | base: ${active.baseReserve.toString()} | slot: ${ctx.slot}`);
      },
      "confirmed"
    );

    const quoteSubId = this.connection.onAccountChange(
      quoteVault,
      (accountInfo, ctx) => {
        const decoded = AccountLayout.decode(accountInfo.data);
        active.quoteReserve = BigInt(decoded.amount.toString());
        active.lastUpdatedSlot = ctx.slot;
        console.log(`Update ${pool.address} | quote: ${active.quoteReserve.toString()} | slot: ${ctx.slot}`);
      },
      "confirmed"
    );

    active.baseSubId = baseSubId;
    active.quoteSubId = quoteSubId;

    this.activePools.set(pool.address, active);

    console.log(`Subscribed: ${pool.address}`);
  }

  /**
   * ===============================
   * UNSUBSCRIBE POOL
   * ===============================
   */

  private async unsubscribePool(address: string) {
    const pool = this.activePools.get(address);
    if (!pool) return;

    await this.connection.removeAccountChangeListener(pool.baseSubId);
    await this.connection.removeAccountChangeListener(pool.quoteSubId);

    this.activePools.delete(address);

    console.log(`Unsubscribed: ${address}`);
  }

  /**
   * ===============================
   * ROTATE MONITORING SET
   * Gradually replace 1–2 pools
   * ===============================
   */

  async rotate(targetPools: RaydiumV4Pool[], maxReplace = 2) {
    const currentAddresses = new Set(this.activePools.keys());
    const targetAddresses = new Set(
      targetPools.map((p) => p.address)
    );

    const toRemove = [...currentAddresses].filter(
      (addr) => !targetAddresses.has(addr)
    );

    const toAdd = targetPools.filter(
      (p) => !currentAddresses.has(p.address)
    );

    // Gradual replacement
    const removeSlice = toRemove.slice(0, maxReplace);
    const addSlice = toAdd.slice(0, maxReplace);

    for (const addr of removeSlice) {
      await this.unsubscribePool(addr);
    }

    for (const pool of addSlice) {
      await this.subscribePool(pool);
    }

    console.log(
      `Rotation complete. Active pools: ${this.activePools.size}`
    );
  }

  /**
   * ===============================
   * GET ACTIVE POOLS
   * ===============================
   */

  getActivePools() {
    return Array.from(this.activePools.values());
  }
}