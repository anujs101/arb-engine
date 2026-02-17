import { PoolState } from "./types";
import { detectArbitrage } from "./detector/spread";
import { findOptimalInput } from "./optimizer/ternary";
import { logDetection } from "./logger/spreadLogger";

function createMockPools(): { poolA: PoolState; poolB: PoolState } {
  const poolA: PoolState = {
    address: "POOL_A",
    reserveA: 1_000_000_000_000n, // 1000 SOL (lamports)
    reserveB: 100_000_000_000n,   // 100,000 USDC (1e6 units)
    feeNumerator: 3n,
    feeDenominator: 1000n,
    lastUpdatedSlot: 1,
    decimalsA: 9,
    decimalsB: 6,
  };

  const poolB: PoolState = {
    address: "POOL_B",
    reserveA: 1_000_000_000_000n, // 1000 SOL
    reserveB: 102_000_000_000n,  // 102,000 USDC (price higher)
    feeNumerator: 3n,
    feeDenominator: 1000n,
    lastUpdatedSlot: 1,
    decimalsA: 9,
    decimalsB: 6,
  };

  return { poolA, poolB };
}

function runMockTest() {
  const { poolA, poolB } = createMockPools();

  const detection = detectArbitrage(poolA, poolB);

  if (!detection.direction) {
    console.log("No arbitrage opportunity detected.");
    return;
  }

  console.log("Detection Result:", detection);

  logDetection(detection, poolA.lastUpdatedSlot, poolB.lastUpdatedSlot);

  if (detection.microProfit <= 0n) {
    console.log("Micro test not profitable. Skipping optimizer.");
    return;
  }

  const smallerReserve =
    poolA.reserveB < poolB.reserveA
      ? poolA.reserveB
      : poolB.reserveA;

  const upperBound = smallerReserve / 3n;

  const optimization = findOptimalInput(
    detection.direction === "A_TO_B" ? poolA : poolB,
    detection.direction === "A_TO_B" ? poolB : poolA,
    0n,
    upperBound
  );

  console.log("Optimization Result:", {
    optimalInput: optimization.optimalInput.toString(),
    profit: optimization.profit.toString(),
    iterations: optimization.iterations,
  });
}

runMockTest();