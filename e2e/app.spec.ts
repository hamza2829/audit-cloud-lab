import { expect, test } from '@playwright/test';
import { addFinding, login, planAudit, PASSWORD } from './helpers';

test('rejects a wrong password', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel('Email')).toBeVisible();
  await page.getByLabel('Email').fill('auditor@demo.test');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Sign in failed');
});

test('auditor sees the seeded dashboard', async ({ page }) => {
  await login(page, 'auditor@demo.test');
  const stat = (name: string) => page.getByRole('group', { name }).getByTestId('stat-value');
  await expect.poll(async () => Number(await stat('Audits').textContent()), { timeout: 30_000 }).toBeGreaterThanOrEqual(40);
  await expect.poll(async () => Number(await stat('Findings').textContent()), { timeout: 30_000 }).toBeGreaterThanOrEqual(300);
  await expect(page.getByRole('heading', { name: 'Recurring root causes (suggested)' })).toBeVisible();
  await expect(page.locator('.rc-list li').first()).toBeVisible();
});

test('audit list and calendar views', async ({ page }) => {
  await login(page, 'auditor@demo.test');
  await page.getByRole('link', { name: 'Audits' }).click();
  await expect.poll(() => page.getByTestId('audit-list').locator('li').count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(40);
  await page.getByLabel('Search').fill('Supplier audit');
  await expect(page.getByTestId('audit-list').locator('li').first()).toContainText('Supplier audit');
  await page.getByRole('button', { name: 'Calendar' }).click();
  await expect(page.getByRole('columnheader')).toHaveCount(7);
  const label = await page.getByTestId('calendar-label').textContent();
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.getByTestId('calendar-label')).not.toHaveText(label ?? '');
});

test('plans an audit, fills the checklist and records a finding with photo', async ({ page }) => {
  await login(page, 'auditor@demo.test');
  await planAudit(page, 'E2E safety walk A');
  await expect(page.getByTestId('audit-status')).toHaveText('planned');
  await page.getByRole('group', { name: 'Required PPE is worn' }).getByLabel('Not OK').check();
  await expect(page.getByTestId('audit-status')).toHaveText('in progress');
  await addFinding(page, 'E2E guard missing on press', true);
  const row = page.locator('[data-finding-title="E2E guard missing on press"]');
  await expect(row.getByRole('img')).toBeVisible();
  // The risk score is written by the onCreate Cloud Function, not by the browser.
  await expect(row.getByTestId('risk')).toHaveText(/risk \d+ \((low|moderate|high|severe)\)/, { timeout: 30_000 });
});

test('creates a corrective action and marks it done', async ({ page }) => {
  await login(page, 'auditor@demo.test');
  await planAudit(page, 'E2E safety walk B');
  await addFinding(page, 'E2E hydraulic leak');
  const row = page.locator('[data-finding-title="E2E hydraulic leak"]');
  await row.getByRole('button', { name: 'Add action' }).click();
  await row.getByLabel('Owner').fill('Maintenance team');
  await row.getByLabel('Due date').fill('2030-01-15');
  await row.getByRole('button', { name: 'Save action' }).click();
  await expect(page.getByTestId('status')).toHaveText('Corrective action saved.');
  await page.getByRole('link', { name: 'Actions' }).click();
  const item = page.getByTestId('action-list').locator('li', { hasText: 'Fix: E2E hydraulic leak' });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Mark done' }).click();
  await page.getByRole('button', { name: 'done', exact: true }).click();
  await expect(page.getByTestId('action-list').locator('li', { hasText: 'Fix: E2E hydraulic leak' })).toContainText('done');
});

test('exports findings of an audit as CSV through the callable function', async ({ page }) => {
  await login(page, 'auditor@demo.test');
  await planAudit(page, 'E2E safety walk C');
  await addFinding(page, 'E2E oil spill, near lathe');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^findings-.+\.csv$/);
  const text = await (await file.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString('utf8'));
  expect(text.split('\r\n')[0]).toBe('id,auditId,title,severity,category,riskScore,createdAt');
  expect(text).toContain('"E2E oil spill, near lathe"');
});

test('manager runs the overdue check', async ({ page }) => {
  await login(page, 'manager@demo.test');
  await page.getByRole('link', { name: 'Actions' }).click();
  await page.getByRole('button', { name: 'Run overdue check' }).click();
  await expect(page.getByTestId('check-result')).toHaveText(/Overdue check updated \d+ actions\./);
  await page.getByRole('button', { name: 'overdue', exact: true }).click();
  await expect(page.getByTestId('action-list').locator('li').first()).toContainText('overdue');
});

test('viewer is read only', async ({ page }) => {
  await login(page, 'viewer@demo.test');
  await page.getByRole('link', { name: 'Audits' }).click();
  await expect(page.getByTestId('audit-list').locator('li').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Plan audit' })).toHaveCount(0);
  await page.getByTestId('audit-list').locator('li a').first().click();
  await expect(page.getByRole('heading', { name: 'Checklist' })).toBeVisible();
  await expect(page.getByRole('form', { name: 'New finding' })).toHaveCount(0);
});

test('works with keyboard only on a phone sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByLabel('Email').focus();
  await page.keyboard.type('auditor@demo.test');
  await page.keyboard.press('Tab');
  await page.keyboard.type(PASSWORD);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('user')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole('link', { name: 'Audits' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/audits$/);
});
