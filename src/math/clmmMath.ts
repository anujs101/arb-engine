import { PoolUpdateEvent } from "../types";

const Q64 = 2n ** 64n;

export function simulateClmmSwap(
  pool: PoolUpdateEvent,
  amountIn: bigint,
  direction: "baseToQuote" | "quoteToBase"
): bigint {

  if (!pool.sqrtPriceX64 || !pool.liquidity) return 0n;

  const sqrtP = pool.sqrtPriceX64;        // Q64
  const L = pool.liquidity;               // liquidity as bigint
  const fee = pool.feeRate;

  // apply fee first
  const amountAfterFee = BigInt(
    Math.floor(Number(amountIn) * (1 - fee))
  );

  if (amountAfterFee <= 0n) return 0n;

  if (direction === "baseToQuote") {
    // token0 in

    // newSqrt = 1 / (1/sqrtP + dx/L)
    const numerator = L * Q64;
    const denom = (L * Q64) / sqrtP + amountAfterFee;
    const newSqrt = numerator / denom;

    const dy = (L * (sqrtP - newSqrt)) / Q64;

    return dy > 0n ? dy : 0n;
  }

  if (direction === "quoteToBase") {
    // token1 in

    const newSqrt =
      sqrtP + (amountAfterFee * Q64) / L;

    const dx =
      (L * (newSqrt - sqrtP)) /
      (newSqrt * sqrtP / Q64);

    return dx > 0n ? dx : 0n;
  }

  return 0n;
}