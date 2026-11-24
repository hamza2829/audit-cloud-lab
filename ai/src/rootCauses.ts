import { buildTfidf } from './tfidf';
import { clusterVectors } from './cluster';

export interface RootCauseSuggestion {
  cluster: number;
  size: number;
  keywords: string[];
  rootCause: string;
  example: string;
  memberIds: string[];
}

/** Keyword lexicon mapping cluster vocabulary to a human readable root cause. */
const LEXICON: { cause: string; words: string[] }[] = [
  { cause: 'Calibration management gaps', words: ['calibration', 'calibrated', 'certificate', 'gauge', 'caliper', 'wrench', 'scale'] },
  { cause: 'Document control not followed', words: ['instruction', 'record', 'revision', 'document', 'signed', 'obsolete', 'batch'] },
  { cause: 'Training and qualification gaps', words: ['trained', 'training', 'qualification', 'operator', 'employee', 'matrix'] },
  { cause: 'Poor housekeeping', words: ['spill', 'blocked', 'pallet', 'bins', 'overflowing', 'cleaned', 'route', 'escape'] },
  { cause: 'PPE discipline', words: ['glasse', 'safety', 'hearing', 'protection', 'gloves', 'worn', 'ppe'] },
  { cause: 'Labelling and identification', words: ['label', 'tagged', 'hazard', 'unreadable', 'container', 'nonconforming'] },
  { cause: 'Preventive maintenance backlog', words: ['maintenance', 'guard', 'leak', 'hydraulic', 'loose', 'preventive', 'overdue'] },
];

export function nameRootCause(keywords: string[]): string {
  let best = { cause: 'Unclassified recurring issue', score: 0 };
  for (const entry of LEXICON) {
    const score = keywords.reduce((s, k, rank) => s + (entry.words.includes(k) ? keywords.length - rank : 0), 0);
    if (score > best.score) best = { cause: entry.cause, score };
  }
  return best.cause;
}

export function suggestRootCauses(
  items: { id: string; text: string }[],
  opts: { threshold?: number; minSize?: number; topK?: number } = {},
): RootCauseSuggestion[] {
  const { threshold = 0.08, minSize = 3, topK = 4 } = opts;
  if (items.length === 0) return [];
  const model = buildTfidf(items.map((i) => i.text));
  const labels = clusterVectors(model.vectors, threshold);
  const groups = new Map<number, number[]>();
  labels.forEach((l, i) => groups.set(l, [...(groups.get(l) ?? []), i]));
  const out: RootCauseSuggestion[] = [];
  for (const [cluster, members] of groups) {
    if (members.length < minSize) continue;
    const centroid = new Map<string, number>();
    for (const m of members) for (const [t, w] of model.vectors[m]!) centroid.set(t, (centroid.get(t) ?? 0) + w);
    const keywords = [...centroid.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .filter(([t]) => !t.startsWith('#'))
      .slice(0, topK)
      .map(([t]) => t);
    out.push({
      cluster,
      size: members.length,
      keywords,
      rootCause: nameRootCause(keywords),
      example: items[members[0]!]!.text,
      memberIds: members.map((m) => items[m]!.id),
    });
  }
  return out.sort((a, b) => b.size - a.size);
}
