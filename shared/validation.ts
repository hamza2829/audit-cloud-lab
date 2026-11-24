import { SEVERITIES, type CorrectiveAction, type Finding, type Audit } from './types';
import { isIsoDate } from './dates';

export const MAX_IMAGE_BYTES = 150_000;

export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || comma < 0) return Number.NaN;
  const b64 = dataUrl.slice(comma + 1);
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export type Errors = Record<string, string>;

export function validateFinding(f: Partial<Finding>): Errors {
  const e: Errors = {};
  const title = (f.title ?? '').trim();
  if (title.length < 3 || title.length > 120) e.title = 'Title must be 3 to 120 characters.';
  if (!f.severity || !SEVERITIES.includes(f.severity)) e.severity = 'Choose a severity.';
  if (!f.category || !f.category.trim()) e.category = 'Choose a category.';
  if ((f.description ?? '').length > 2000) e.description = 'Description is too long.';
  if (f.imageDataUrl) {
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(f.imageDataUrl)) e.image = 'Only PNG, JPEG or WebP images.';
    else if (dataUrlBytes(f.imageDataUrl) > MAX_IMAGE_BYTES) e.image = 'Image is larger than 150 KB.';
  }
  return e;
}

export function validateAction(a: Partial<CorrectiveAction>): Errors {
  const e: Errors = {};
  if ((a.title ?? '').trim().length < 3) e.title = 'Title must be at least 3 characters.';
  if (!(a.owner ?? '').trim()) e.owner = 'Owner is required.';
  if (!isIsoDate(a.dueDate)) e.dueDate = 'Due date must be a valid date.';
  return e;
}

export function validateAudit(a: Partial<Audit>): Errors {
  const e: Errors = {};
  if ((a.title ?? '').trim().length < 3) e.title = 'Title must be at least 3 characters.';
  if (!a.typeId) e.typeId = 'Choose an audit type.';
  if (!(a.site ?? '').trim()) e.site = 'Site is required.';
  if (!isIsoDate(a.plannedDate)) e.plannedDate = 'Planned date must be a valid date.';
  return e;
}
