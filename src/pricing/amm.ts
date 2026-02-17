import { PoolState } from "../types";

/**
 * Applies fee to input amount.
 *
 * dx_after_fee = dx * (feeDen - feeNum) / feeDen
 *
 * All arithmetic is BigInt-safe.
 */
export function applyFee(
  dx: bigint,
  feeNumerator: bigint,
  feeDenominator: bigint
): bigint {
  if (dx <= 0n) return 0n;

  const effectiveMultiplier = feeDenominator - feeNumerator;
  return (dx * effectiveMultiplier) / feeDenominator;
}

/**
 * Computes swap output for constant-product AMM.
 *
 * dy = (y * dx_eff) / (x + dx_eff)
 *
 * Assumes:
 * - x = input token reserve
 * - y = output token reserve
 */
export function swapOutput(
  dx: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeNumerator: bigint,
  feeDenominator: bigint
): bigint {
  if (dx <= 0n) return 0n;
  if (reserveIn <= 0n || reserveOut <= 0n) return 0n;

  const dxEff = applyFee(dx, feeNumerator, feeDenominator);

  if (dxEff === 0n) return 0n;

  return (reserveOut * dxEff) / (reserveIn + dxEff);
}

/**
 * Computes deterministic cross-DEX arbitrage profit.
 *
 * Step 1: Swap input token on Pool A
 * Step 2: Swap output token on Pool B
 *
 * Returns net profit in input token units.
 */
export function computeDeterministicProfit(
  inputAmount: bigint,
  poolA: PoolState,
  poolB: PoolState
): bigint {
  if (inputAmount <= 0n) return 0n;

  // Step 1: Buy token A from pool A using input token (e.g., USDC -> SOL)
  const tokenReceived = swapOutput(
    inputAmount,
    poolA.reserveB, // input reserve
    poolA.reserveA, // output reserve
    poolA.feeNumerator,
    poolA.feeDenominator
  );

  if (tokenReceived === 0n) return 0n;

  // Step 2: Sell received token into pool B (e.g., SOL -> USDC)
  const finalOutput = swapOutput(
    tokenReceived,
    poolB.reserveA, // input reserve
    poolB.reserveB, // output reserve
    poolB.feeNumerator,
    poolB.feeDenominator
  );

  if (finalOutput === 0n) return 0n;

  // Net profit in input token units
  return finalOutput - inputAmount;
}

/**
 * Computes spot price of a pool in basis points (BPS),
 * scaled as:
 *
 * priceBps = (reserveOut / reserveIn) adjusted for decimals,
 * multiplied by 10_000 (basis points scaling).
 *
 * Returned as BigInt.
 */
export function spotPriceBps(
  reserveIn: bigint,
  reserveOut: bigint,
  decimalsIn: number,
  decimalsOut: number
): bigint {
  if (reserveIn <= 0n || reserveOut <= 0n) return 0n;

  // Scale to align decimals:
  // price = (reserveOut * 10^decimalsIn) / (reserveIn * 10^decimalsOut)
  const scaleIn = 10n ** BigInt(decimalsIn);
  const scaleOut = 10n ** BigInt(decimalsOut);

  // Multiply by 10_000 for BPS precision
  const numerator = reserveOut * scaleIn * 10_000n;
  const denominator = reserveIn * scaleOut;

  return numerator / denominator;
}

/**
 * Computes spread between two pools in BPS.
 *
 * spreadBps = priceSell - priceBuy
 *
 * Positive spread means:
 *   buy from poolBuy, sell to poolSell
 *
 * Negative spread means reverse direction.
 */
export function computeSpreadBps(
  poolBuyReserveIn: bigint,
  poolBuyReserveOut: bigint,
  poolBuyDecimalsIn: number,
  poolBuyDecimalsOut: number,
  poolSellReserveIn: bigint,
  poolSellReserveOut: bigint,
  poolSellDecimalsIn: number,
  poolSellDecimalsOut: number
): bigint {
  const priceBuy = spotPriceBps(
    poolBuyReserveIn,
    poolBuyReserveOut,
    poolBuyDecimalsIn,
    poolBuyDecimalsOut
  );

  const priceSell = spotPriceBps(
    poolSellReserveIn,
    poolSellReserveOut,
    poolSellDecimalsIn,
    poolSellDecimalsOut
  );

  return priceSell - priceBuy;
}