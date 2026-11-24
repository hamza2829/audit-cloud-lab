import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildTfidf, cosine, features, tokenize } from '@ai/tfidf';
import { clusterTexts } from '@ai/cluster';
import { nameRootCause, suggestRootCauses } from '@ai/rootCauses';
import { adjustedRandIndex, pairwise, purity } from '@ai/metrics';
import { evaluate } from '@ai/evaluate';

describe('tokenizer and tf-idf', () => {
  it('drops stopwords, ids and short tokens', () => {
    expect(tokenize('The torque wrench TW-12 is not calibrated')).toEqual(['torque', 'wrench', 'calibrated']);
  });
  it('adds character 4-grams', () => {
    expect(features('label')).toContain('#_lab');
  });
  it('produces unit length vectors', () => {
    const { vectors } = buildTfidf(['oil spill on floor', 'calibration expired']);
    expect(cosine(vectors[0]!, vectors[0]!)).toBeCloseTo(1, 6);
  });
  it('rates similar texts higher than unrelated ones', () => {
    const { vectors } = buildTfidf(['calibration of gauge expired', 'gauge calibration overdue', 'oil spill near lathe']);
    expect(cosine(vectors[0]!, vectors[1]!)).toBeGreaterThan(cosine(vectors[0]!, vectors[2]!));
  });
});

describe('clustering', () => {
  it('groups near duplicate findings', () => {
    const labels = clusterTexts([
      'Safety glasses not worn at grinder',
      'Safety glasses not worn at press',
      'Hydraulic leak on press',
      'Hydraulic leak on lathe',
    ]);
    expect(labels[0]).toBe(labels[1]);
    expect(labels[2]).toBe(labels[3]);
    expect(labels[0]).not.toBe(labels[2]);
  });
  it('keeps everything separate with a threshold above 1', () => {
    expect(new Set(clusterTexts(['a b c', 'a b c'], 1.01)).size).toBe(2);
  });
  it('names root causes from keywords', () => {
    expect(nameRootCause(['calibration', 'gauge'])).toBe('Calibration management gaps');
    expect(nameRootCause(['zebra'])).toBe('Unclassified recurring issue');
  });
  it('suggests root causes only for clusters above min size', () => {
    const items = ['Hearing protection missing at press', 'Hearing protection missing at saw', 'Hearing protection missing at mill', 'Oil spill']
      .map((text, i) => ({ id: String(i), text }));
    const out = suggestRootCauses(items, { minSize: 3 });
    expect(out).toHaveLength(1);
    expect(out[0]!.size).toBe(3);
    expect(out[0]!.keywords).toContain('hearing');
  });
  it('returns nothing for empty input', () => {
    expect(suggestRootCauses([])).toEqual([]);
  });
});

describe('metrics', () => {
  it('scores a perfect clustering as 1', () => {
    const gold = ['a', 'a', 'b', 'b'];
    expect(purity([0, 0, 1, 1], gold)).toBe(1);
    expect(pairwise([0, 0, 1, 1], gold).f1).toBe(1);
    expect(adjustedRandIndex([5, 5, 9, 9], gold)).toBeCloseTo(1);
  });
  it('gives low ARI to a single big cluster', () => {
    expect(adjustedRandIndex([0, 0, 0, 0], ['a', 'a', 'b', 'b'])).toBeCloseTo(0);
  });
  it('beats a trivial baseline on the labeled evaluation set', () => {
    const { items } = JSON.parse(readFileSync('ai/eval/labeled-findings.json', 'utf8'));
    const [row] = evaluate(items, [0.08]);
    expect(items).toHaveLength(63);
    expect(row!.ari).toBeGreaterThan(0.3);
    expect(row!.purity).toBeGreaterThan(0.8);
  });
});
