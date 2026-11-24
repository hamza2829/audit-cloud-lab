import type { Severity } from './types';

const SEVERITY_WEIGHT: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Deterministic risk score in [0, 100].
 * severity contributes 20 points per level, repeated findings of the same
 * category add 5 points each (max 4 repeats), a missing photo adds 0.
 */
export function riskScore(severity: Severity, repeatCount = 0): number {
  const base = SEVERITY_WEIGHT[severity];
  if (base === undefined) throw new Error(`unknown severity: ${String(severity)}`);
  const repeats = Math.max(0, Math.min(4, Math.floor(repeatCount)));
  return Math.min(100, base * 20 + repeats * 5);
}

export function riskBand(score: number): 'low' | 'moderate' | 'high' | 'severe' {
  if (score >= 75) return 'severe';
  if (score >= 55) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}
