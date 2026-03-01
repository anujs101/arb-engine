// ---------------------------------------------
// Types
// ---------------------------------------------

export interface CpmmParams {
  reserveIn: bigint;
  reserveOut: bigint;
  feeRate: number; // 0.0025 etc
}

export interface ClmmParams {
  sqrtPriceX64: bigint;  // Q64.64
  liquidity: bigint;     // raw liquidity
  feeRate: number;
}

// ---------------------------------------------
// Constants
// ---------------------------------------------

const Q64 = 2n ** 64n;

// ---------------------------------------------
// CPMM Swap
// ---------------------------------------------

export function simulateCpmmSwap(
  params: CpmmParams,
  amountIn: bigint
): bigint {
  const { reserveIn, reserveOut, feeRate } = params;

  if (amountIn <= 0n) return 0n;
  if (reserveIn <= 0n || reserveOut <= 0n) return 0n;

  // apply fee
  const effectiveIn = BigInt(
    Math.floor(Number(amountIn) * (1 - feeRate))
  );

  if (effectiveIn <= 0n) return 0n;

  const numerator = reserveOut * effectiveIn;
  const denominator = reserveIn + effectiveIn;

  if (denominator === 0n) return 0n;

  return numerator / denominator;
}

// ---------------------------------------------
// CLMM Single-Tick Swap (REAL math)
// ---------------------------------------------

export function simulateClmmSwap(
  params: ClmmParams,
  amountIn: bigint,
  direction: "baseToQuote" | "quoteToBase"
): bigint {
  const { sqrtPriceX64, liquidity, feeRate } = params;

  if (amountIn <= 0n) return 0n;
  if (liquidity <= 0n) return 0n;
  if (sqrtPriceX64 <= 0n) return 0n;

  // apply fee first
  const amountAfterFee = BigInt(
    Math.floor(Number(amountIn) * (1 - feeRate))
  );

  if (amountAfterFee <= 0n) return 0n;

  const sqrtP = sqrtPriceX64; // Q64
  const L = liquidity;

  if (direction === "baseToQuote") {
    // token0 in
    // newSqrt = 1 / (1/sqrtP + dx/L)

    const numerator = L * Q64;
    const denom = (L * Q64) / sqrtP + amountAfterFee;

    if (denom === 0n) return 0n;

    const newSqrt = numerator / denom;

    if (newSqrt >= sqrtP) return 0n;

    const dy = (L * (sqrtP - newSqrt)) / Q64;

    return dy > 0n ? dy : 0n;
  }

  if (direction === "quoteToBase") {
    // token1 in
    // newSqrt = sqrtP + dy/L

    const newSqrt =
      sqrtP + (amountAfterFee * Q64) / L;

    if (newSqrt <= sqrtP) return 0n;

    const dx =
      (L * (newSqrt - sqrtP)) /
      (newSqrt * sqrtP / Q64);

    return dx > 0n ? dx : 0n;
  }

  return 0n;
}

// ---------------------------------------------
// Round Trip Simulation
// ---------------------------------------------

export function simulateRoundTrip(
  amountIn: bigint,
  poolA: {
    type: "CPMM" | "CLMM";
    data: CpmmParams | ClmmParams;
  },
  poolB: {
    type: "CPMM" | "CLMM";
    data: CpmmParams | ClmmParams;
  }
): bigint {

  if (amountIn <= 0n) return 0n;

  let amountOutA: bigint;

  if (poolA.type === "CPMM") {
    amountOutA = simulateCpmmSwap(
      poolA.data as CpmmParams,
      amountIn
    );
  } else {
    amountOutA = simulateClmmSwap(
      poolA.data as ClmmParams,
      amountIn,
      "baseToQuote"
    );
  }

  if (amountOutA <= 0n) return 0n;

  let amountOutB: bigint;

  if (poolB.type === "CPMM") {
    amountOutB = simulateCpmmSwap(
      poolB.data as CpmmParams,
      amountOutA
    );
  } else {
    amountOutB = simulateClmmSwap(
      poolB.data as ClmmParams,
      amountOutA,
      "quoteToBase"
    );
  }

  if (amountOutB <= 0n) return 0n;

  return amountOutB - amountIn;
}