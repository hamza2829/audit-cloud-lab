import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'demo-password';

export async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('user')).toContainText(email);
}

/** Creates a fresh audit through the UI so tests do not depend on each other. */
export async function planAudit(page: Page, title: string) {
  await page.getByRole('link', { name: 'Audits' }).click();
  await page.getByRole('button', { name: 'Plan audit' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Type').selectOption({ label: 'Workplace safety walk' });
  await page.getByRole('button', { name: 'Create audit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

// 1x1 PNG
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export async function addFinding(page: Page, title: string, withPhoto = false) {
  const form = page.getByRole('form', { name: 'New finding' });
  await form.getByLabel('Title').fill(title);
  await form.getByLabel('Severity').selectOption('high');
  await form.getByLabel('Category').selectOption('Maintenance');
  if (withPhoto) {
    await form.getByLabel('Photo (optional)').setInputFiles({ name: 'guard.png', mimeType: 'image/png', buffer: PNG });
    await expect(form.getByAltText('Photo preview')).toBeVisible();
  }
  await form.getByRole('button', { name: 'Add finding' }).click();
  await expect(page.locator(`[data-finding-title="${title}"]`)).toBeVisible();
}
