export function simulateClmmSwap(
  amountIn: number,
  pool: PoolUpdateEvent,
  direction: "baseToQuote" | "quoteToBase"
): number {

  const L = Number(pool.liquidity);
  const sqrtP = Number(pool.sqrtPriceX64) / 2 ** 64;

  if (direction === "baseToQuote") {
    // token0 in
    const newInv = 1 / sqrtP + amountIn / L;
    const newSqrt = 1 / newInv;
    const dy = L * (sqrtP - newSqrt);
    return dy * (1 - pool.feeRate);
  }

  if (direction === "quoteToBase") {
    const newSqrt = sqrtP + amountIn / L;
    const dx = L * (1 / sqrtP - 1 / newSqrt);
    return dx * (1 - pool.feeRate);
  }

  return 0;
}