import type { CorrectiveAction } from './types';

export function isOverdue(action: Pick<CorrectiveAction, 'status' | 'dueDate'>, today: string): boolean {
  return action.status === 'open' && action.dueDate < today;
}

/** Returns the ids whose stored `overdue` flag differs from the computed state. */
export function overdueUpdates(actions: CorrectiveAction[], today: string): { id: string; overdue: boolean }[] {
  return actions
    .map((a) => ({ id: a.id, overdue: isOverdue(a, today), prev: Boolean(a.overdue) }))
    .filter((u) => u.overdue !== u.prev)
    .map(({ id, overdue }) => ({ id, overdue }));
}
