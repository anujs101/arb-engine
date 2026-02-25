export interface CpmmParams {
  reserveIn: bigint;
  reserveOut: bigint;
  feeRate: number; // 0.0025 etc
}

export interface ClmmParams {
  sqrtPriceX64: bigint;
  liquidity: bigint;
  feeRate: number;
}

export function simulateCpmmSwap(
  params: CpmmParams,
  amountIn: bigint
): bigint {
  const { reserveIn, reserveOut, feeRate } = params;

  if (amountIn <= 0n) return 0n;

  const feeMultiplier = 1 - feeRate;

  const effectiveIn = BigInt(
    Math.floor(Number(amountIn) * feeMultiplier)
  );

  const numerator = reserveOut * effectiveIn;
  const denominator = reserveIn + effectiveIn;

  if (denominator === 0n) return 0n;

  return numerator / denominator;
}

export function simulateClmmApproxSwap(
  params: ClmmParams,
  amountIn: bigint
): bigint {
  const { sqrtPriceX64, liquidity, feeRate } = params;

  const sqrtP =
    Number(sqrtPriceX64) / 2 ** 64;

  const L = Number(liquidity);

  const xVirtual = BigInt(
    Math.floor(L / sqrtP)
  );

  const yVirtual = BigInt(
    Math.floor(L * sqrtP)
  );

  return simulateCpmmSwap(
    {
      reserveIn: xVirtual,
      reserveOut: yVirtual,
      feeRate,
    },
    amountIn
  );
}

export function simulateRoundTrip(
  amountIn: bigint,
  poolA: {
    type: "CPMM" | "CLMM";
    data: any;
  },
  poolB: {
    type: "CPMM" | "CLMM";
    data: any;
  }
): bigint {

  const amountOutA =
    poolA.type === "CPMM"
      ? simulateCpmmSwap(poolA.data, amountIn)
      : simulateClmmApproxSwap(poolA.data, amountIn);

  if (amountOutA === 0n) return 0n;

  const amountOutB =
    poolB.type === "CPMM"
      ? simulateCpmmSwap(poolB.data, amountOutA)
      : simulateClmmApproxSwap(poolB.data, amountOutA);

  return amountOutB - amountIn;
}