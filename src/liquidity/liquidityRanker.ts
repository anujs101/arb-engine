import { Connection, PublicKey } from "@solana/web3.js";
import { RaydiumV4Pool } from "../indexers/raydiumV4Indexer";
import { AccountLayout } from "@solana/spl-token";

/**
 * ===============================
 * TYPES
 * ===============================
 */

export interface RankedPool extends RaydiumV4Pool {
  baseReserve: bigint;
  quoteReserve: bigint;
  liquidity: bigint; // sqrt(x*y)
}

/**
 * ===============================
 * MAIN RANKING FUNCTION
 * ===============================
 */

export async function rankPoolsByLiquidity(
  connection: Connection,
  pools: RaydiumV4Pool[]
): Promise<RankedPool[]> {
  const ranked: RankedPool[] = [];

  const vaultPubkeys: PublicKey[] = [];

  for (const pool of pools) {
    vaultPubkeys.push(new PublicKey(pool.baseVault));
    vaultPubkeys.push(new PublicKey(pool.quoteVault));
  }

  const vaultAccounts =
    await connection.getMultipleAccountsInfo(vaultPubkeys);

  for (let i = 0; i < pools.length; i++) {
    const baseAccount = vaultAccounts[i * 2];
    const quoteAccount = vaultAccounts[i * 2 + 1];

    if (!baseAccount || !quoteAccount) continue;

    const baseData = AccountLayout.decode(baseAccount.data);
    const quoteData = AccountLayout.decode(quoteAccount.data);

    const baseReserve = BigInt(baseData.amount.toString());
    const quoteReserve = BigInt(quoteData.amount.toString());

    if (baseReserve === 0n || quoteReserve === 0n) continue;

    const liquidity = sqrtBigInt(baseReserve * quoteReserve);

    ranked.push({
      ...pools[i],
      baseReserve,
      quoteReserve,
      liquidity,
    });
  }

  ranked.sort((a, b) =>
    b.liquidity > a.liquidity ? 1 : -1
  );

  return ranked;
}

/**
 * ===============================
 * UTIL — BigInt sqrt
 * ===============================
 */

function sqrtBigInt(value: bigint): bigint {
  if (value < 0n) {
    throw new Error("Cannot sqrt negative bigint");
  }

  if (value < 2n) return value;

  let x0 = value;
  let x1 = (x0 + 1n) >> 1n;

  while (x1 < x0) {
    x0 = x1;
    x1 = (x1 + value / x1) >> 1n;
  }

  return x0;
}