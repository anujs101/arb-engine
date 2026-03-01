export interface ExecutionParams {
  txFeeSol: number;
  priorityFeeSol: number;
  solPriceUsd: number;
}

export function computeExecutionCostUsd(
  params: ExecutionParams
): number {
  const totalSol =
    params.txFeeSol + params.priorityFeeSol;

  return totalSol * params.solPriceUsd;
}