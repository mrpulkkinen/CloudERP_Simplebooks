import { prisma } from './prisma.js';
import { loadEnv } from '../config/env.js';

const { DEFAULT_ORG_ID } = loadEnv();

export interface LineInput {
  quantity: number;
  unitPriceNet: number;
  taxRateId?: string;
}

export interface LineComputationResult {
  lineTotal: number;
  taxAmount: number;
  taxRatePercent?: number;
}

export async function loadTaxRateMap(taxRateIds: string[]) {
  if (taxRateIds.length === 0) {
    return new Map<string, number>();
  }

  const taxRates = await prisma.taxRate.findMany({
    where: { orgId: DEFAULT_ORG_ID, id: { in: taxRateIds } },
    select: { id: true, rate: true }
  });

  const map = new Map<string, number>();
  for (const taxRate of taxRates) {
    map.set(taxRate.id, Number(taxRate.rate));
  }

  return map;
}

export function computeLineTotals(
  lines: LineInput[],
  taxRateMap: Map<string, number>
): LineComputationResult[] {
  return lines.map((line) => {
    const lineTotal = Math.round(line.quantity * line.unitPriceNet);
    const taxRatePercent = line.taxRateId ? taxRateMap.get(line.taxRateId) : undefined;
    const taxAmount =
      taxRatePercent && Number.isFinite(taxRatePercent)
        ? Math.round(lineTotal * (taxRatePercent / 100))
        : 0;

    return {
      lineTotal,
      taxAmount,
      taxRatePercent
    };
  });
}
