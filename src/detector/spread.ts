import { PoolState } from "../types";
import { computeDeterministicProfit, computeSpreadBps } from "../pricing/amm";

const MICRO_DIVISOR = 10_000n; // micro test size = reserve / 10,000

export interface DetectionResult {
  direction: "A_TO_B" | "B_TO_A" | null;
  spreadBps: bigint;
  microInput: bigint;
  microProfit: bigint;
  timestamp: number;
}

/**
 * Detects potential arbitrage opportunity between two pools.
 *
 * Returns:
 * - direction
 * - fee-adjusted spread
 * - micro trade input size
 * - micro deterministic profit
 *
 * Does NOT call optimizer.
 */
export function detectArbitrage(
  poolA: PoolState,
  poolB: PoolState
): DetectionResult {
  const timestamp = Date.now();

  // Spread assuming A is buy and B is sell
  const spreadAToB = computeSpreadBps(
    poolA.reserveB,
    poolA.reserveA,
    poolA.decimalsB,
    poolA.decimalsA,
    poolB.reserveA,
    poolB.reserveB,
    poolB.decimalsA,
    poolB.decimalsB
  );

  // Spread assuming reverse direction
  const spreadBToA = computeSpreadBps(
    poolB.reserveB,
    poolB.reserveA,
    poolB.decimalsB,
    poolB.decimalsA,
    poolA.reserveA,
    poolA.reserveB,
    poolA.decimalsA,
    poolA.decimalsB
  );

  let direction: DetectionResult["direction"] = null;
  let chosenSpread = 0n;
  let microInput = 0n;
  let microProfit = 0n;

  if (spreadAToB > 0n) {
    direction = "A_TO_B";
    chosenSpread = spreadAToB;

    const smallerReserve = poolA.reserveB < poolB.reserveA
      ? poolA.reserveB
      : poolB.reserveA;

    microInput = smallerReserve / MICRO_DIVISOR;

    microProfit = computeDeterministicProfit(
      microInput,
      poolA,
      poolB
    );

  } else if (spreadBToA > 0n) {
    direction = "B_TO_A";
    chosenSpread = spreadBToA;

    const smallerReserve = poolB.reserveB < poolA.reserveA
      ? poolB.reserveB
      : poolA.reserveA;

    microInput = smallerReserve / MICRO_DIVISOR;

    microProfit = computeDeterministicProfit(
      microInput,
      poolB,
      poolA
    );
  }

  return {
    direction,
    spreadBps: chosenSpread,
    microInput,
    microProfit,
    timestamp,
  };
}