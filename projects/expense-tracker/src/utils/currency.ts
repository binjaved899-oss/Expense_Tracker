export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'PKR' | 'CAD' | 'AUD';

export interface CurrencyMetadata {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  minorUnitDecimals: number;
  locale: string;
}

export const CURRENCY_CATALOG: Record<SupportedCurrency, CurrencyMetadata> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', minorUnitDecimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', minorUnitDecimals: 2, locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', minorUnitDecimals: 2, locale: 'en-GB' },
  PKR: { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', minorUnitDecimals: 2, locale: 'en-PK' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', minorUnitDecimals: 2, locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', minorUnitDecimals: 2, locale: 'en-AU' },
};

export function assertIntegerCents(value: number, label = 'amountCents'): number {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new RangeError(`${label} must be a finite integer number of cents. Received: ${String(value)}`);
  }
  return value;
}

export function dollarsToCents(amountMajor: number | string): number {
  const raw = typeof amountMajor === 'string' ? amountMajor.replace(/[,$\s]/g, '') : String(amountMajor);
  if (!/^-?\d+(\.\d{1,4})?$/.test(raw)) {
    throw new RangeError(`Invalid monetary amount string: "${String(amountMajor)}"`);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new RangeError(`Non-finite monetary value: "${String(amountMajor)}"`);
  }
  return Math.round(parsed * 100);
}

export function centsToDollars(amountCents: number): number {
  assertIntegerCents(amountCents);
  return Number((amountCents / 100).toFixed(2));
}

export function formatCents(
  amountCents: number,
  currency: SupportedCurrency = 'USD',
  options: { showPlusSign?: boolean; compact?: boolean } = {}
): string {
  assertIntegerCents(amountCents);
  const meta = CURRENCY_CATALOG[currency] ?? CURRENCY_CATALOG.USD;
  const isNegative = amountCents < 0;
  const absMajor = Math.abs(amountCents) / 100;

  let formattedNumber: string;
  if (options.compact && absMajor >= 1000) {
    if (absMajor >= 1_000_000) {
      formattedNumber = `${(absMajor / 1_000_000).toFixed(2)}M`;
    } else {
      formattedNumber = `${(absMajor / 1000).toFixed(1)}k`;
    }
  } else {
    const fixed = absMajor.toFixed(meta.minorUnitDecimals);
    const [intPart, decPart] = fixed.split('.');
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formattedNumber = decPart ? `${withCommas}.${decPart}` : withCommas;
  }

  const signPrefix = isNegative ? '-' : options.showPlusSign && amountCents > 0 ? '+' : '';
  return `${signPrefix}${meta.symbol}${formattedNumber}`;
}

export function allocateCentsProportionally(totalCents: number, weights: number[]): number[] {
  assertIntegerCents(totalCents, 'totalCents');
  if (weights.length === 0) {
    return [];
  }
  const cleanWeights = weights.map((w) => {
    if (!Number.isFinite(w) || w < 0) {
      throw new RangeError(`Split weight must be non-negative finite number. Got: ${String(w)}`);
    }
    return w;
  });
  const weightSum = cleanWeights.reduce((acc, w) => acc + w, 0);
  if (weightSum <= 0) {
    throw new RangeError('Sum of split weights must be greater than zero.');
  }

  const sign = totalCents < 0 ? -1 : 1;
  const absTotal = Math.abs(totalCents);

  const exactShares = cleanWeights.map((w) => (absTotal * w) / weightSum);
  const flooredShares = exactShares.map((s) => Math.floor(s));
  const remainders = exactShares.map((s, idx) => ({
    idx,
    remainder: s - flooredShares[idx],
  }));

  const leftover = absTotal - flooredShares.reduce((acc, v) => acc + v, 0);
  remainders.sort((a, b) => (b.remainder !== a.remainder ? b.remainder - a.remainder : a.idx - b.idx));

  for (let i = 0; i < leftover; i++) {
    flooredShares[remainders[i % remainders.length].idx] += 1;
  }

  return flooredShares.map((v) => v * sign);
}

export function splitCentsEvenly(totalCents: number, parts: number): number[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new RangeError(`parts must be a positive integer. Got: ${String(parts)}`);
  }
  return allocateCentsProportionally(totalCents, Array.from({ length: parts }, () => 1));
}

export function verifySplitSumMatchesTotal(totalCents: number, splitAmountsCents: number[]): {
  valid: boolean;
  sumCents: number;
  differenceCents: number;
} {
  assertIntegerCents(totalCents, 'totalCents');
  const sumCents = splitAmountsCents.reduce((acc, v) => {
    assertIntegerCents(v, 'splitAmountCents');
    return acc + v;
  }, 0);
  const differenceCents = totalCents - sumCents;
  return {
    valid: differenceCents === 0,
    sumCents,
    differenceCents,
  };
}

export function computeUtilizationPct(spentCents: number, limitCents: number): number {
  assertIntegerCents(spentCents, 'spentCents');
  assertIntegerCents(limitCents, 'limitCents');
  if (limitCents <= 0) return 0;
  return Number(((Math.max(0, spentCents) / limitCents) * 100).toFixed(1));
}

export function evaluateBudgetAlertState(
  spentCents: number,
  effectiveLimitCents: number,
  warningThresholdPct = 80
): 'OK' | 'WARNING_80' | 'EXCEEDED_100' {
  const pct = computeUtilizationPct(spentCents, effectiveLimitCents);
  if (pct >= 100) return 'EXCEEDED_100';
  if (pct >= warningThresholdPct) return 'WARNING_80';
  return 'OK';
}

export function computeSavingsRatePct(incomeCents: number, expenseCents: number): number {
  assertIntegerCents(incomeCents, 'incomeCents');
  assertIntegerCents(expenseCents, 'expenseCents');
  if (incomeCents <= 0) return 0;
  const net = incomeCents - expenseCents;
  return Number(((net / incomeCents) * 100).toFixed(1));
}
