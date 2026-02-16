export interface PoolState {
  reserveA: bigint;
  reserveB: bigint;
  feeNumerator: bigint;
  feeDenominator: bigint;
  lastUpdatedSlot: number;
}

export interface OptimizationResult {
  optimalInput: bigint;
  profit: bigint;
  iterations: number;
  lowerBound: bigint;
  upperBound: bigint;
  refinementApplied: boolean;
}