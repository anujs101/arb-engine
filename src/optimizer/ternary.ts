import { OptimizationResult, PoolState } from "../types";
import { computeDeterministicProfit } from "../pricing/amm";

const MAX_ITERATIONS = 80;
const MIN_INTERVAL = 10n; // stop when interval width <= 10 units
const LOCAL_REFINEMENT_RANGE = 20n;

/**
 * Finds optimal input amount that maximizes deterministic arbitrage profit.
 */
export function findOptimalInput(
  poolBuy: PoolState,
  poolSell: PoolState,
  lowerBound: bigint,
  upperBound: bigint
): OptimizationResult {
  let left = lowerBound;
  let right = upperBound;
  let iterations = 0;

  // Ternary Search
  while (
    iterations < MAX_ITERATIONS &&
    right - left > MIN_INTERVAL
  ) {
    const third = (right - left) / 3n;
    const mid1 = left + third;
    const mid2 = right - third;

    const profit1 = computeDeterministicProfit(mid1, poolBuy, poolSell);
    const profit2 = computeDeterministicProfit(mid2, poolBuy, poolSell);

    if (profit1 < profit2) {
      left = mid1;
    } else {
      right = mid2;
    }

    iterations++;
  }

  // Local refinement around peak region
  let bestInput = left;
  let bestProfit = computeDeterministicProfit(bestInput, poolBuy, poolSell);
  let refinementApplied = false;

  const refinementStart =
    left > LOCAL_REFINEMENT_RANGE
      ? left - LOCAL_REFINEMENT_RANGE
      : 0n;

  const refinementEnd = right + LOCAL_REFINEMENT_RANGE;

  for (
    let candidate = refinementStart;
    candidate <= refinementEnd;
    candidate++
  ) {
    const profit = computeDeterministicProfit(candidate, poolBuy, poolSell);

    if (profit > bestProfit) {
      bestProfit = profit;
      bestInput = candidate;
      refinementApplied = true;
    }
  }

  return {
    optimalInput: bestInput,
    profit: bestProfit,
    iterations,
    finalLowerBound: left,
    finalUpperBound: right,
    refinementApplied,
  };
}