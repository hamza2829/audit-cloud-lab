// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StatCard from '@/components/StatCard.vue';
import SeverityChart from '@/components/SeverityChart.vue';
import ChecklistEditor from '@/components/ChecklistEditor.vue';
import FindingForm from '@/components/FindingForm.vue';
import ActionForm from '@/components/ActionForm.vue';
import ActionList from '@/components/ActionList.vue';
import CalendarMonth from '@/components/CalendarMonth.vue';
import RootCauseList from '@/components/RootCauseList.vue';
import type { CorrectiveAction } from '@shared/types';
import { setup } from './helpers';

describe('components', () => {
  it('StatCard renders label, value and an accessible group', () => {
    const w = mount(StatCard, { props: { label: 'Audits', value: 40, hint: '3 closed' } });
    expect(w.get('[role=group]').attributes('aria-label')).toBe('Audits');
    expect(w.get('[data-testid=stat-value]').text()).toBe('40');
  });
  it('SeverityChart scales bars to the max count', () => {
    const w = mount(SeverityChart, { props: { counts: { low: 10, medium: 5, high: 0, critical: 1 } } });
    expect(w.get('.bar.sev-low').attributes('style')).toContain('width: 100%');
    expect(w.get('.bar.sev-medium').attributes('style')).toContain('width: 50%');
    expect(w.get('[data-testid=sev-count-critical]').text()).toBe('1');
  });
  it('ChecklistEditor emits the selected result', async () => {
    const w = mount(ChecklistEditor, { props: { items: [{ id: 'q1', text: 'Item', result: null }] } });
    await w.findAll('input[type=radio]')[1]!.setValue(true);
    expect(w.emitted('change')![0]).toEqual(['q1', 'nok']);
  });
  it('ChecklistEditor disables inputs when read only', () => {
    const w = mount(ChecklistEditor, { props: { items: [{ id: 'q1', text: 'Item', result: 'ok' }], disabled: true } });
    expect(w.get('fieldset').attributes('disabled')).toBeDefined();
  });
  it('FindingForm shows validation errors and does not emit', async () => {
    const w = mount(FindingForm);
    await w.get('form').trigger('submit');
    expect(w.findAll('[role=alert]').length).toBeGreaterThanOrEqual(3);
    expect(w.emitted('submit')).toBeUndefined();
  });
  it('FindingForm emits a valid finding and resets', async () => {
    const w = mount(FindingForm);
    await w.get('input[name=title]').setValue('Guard missing on press');
    await w.get('select[name=severity]').setValue('high');
    await w.get('select[name=category]').setValue('Maintenance');
    await w.get('form').trigger('submit');
    expect(w.emitted('submit')![0]![0]).toMatchObject({ title: 'Guard missing on press', severity: 'high', category: 'Maintenance' });
    expect((w.get('input[name=title]').element as HTMLInputElement).value).toBe('');
  });
  it('ActionForm requires owner and due date', async () => {
    const w = mount(ActionForm, { props: { findingTitle: 'Leak' } });
    expect((w.get('input[name=actionTitle]').element as HTMLInputElement).value).toBe('Fix: Leak');
    await w.get('form').trigger('submit');
    expect(w.emitted('submit')).toBeUndefined();
    await w.get('input[name=owner]').setValue('QA');
    await w.get('input[name=dueDate]').setValue('2026-12-24');
    await w.get('form').trigger('submit');
    expect(w.emitted('submit')![0]![0]).toEqual({ title: 'Fix: Leak', owner: 'QA', dueDate: '2026-12-24' });
  });
  const actions: CorrectiveAction[] = [
    { id: '1', findingId: 'f', auditId: 'a', title: 'Late', owner: 'o', dueDate: '2026-01-01', status: 'open' },
    { id: '2', findingId: 'f', auditId: 'a', title: 'Future', owner: 'o', dueDate: '2027-01-01', status: 'open' },
    { id: '3', findingId: 'f', auditId: 'a', title: 'Done', owner: 'o', dueDate: '2026-01-01', status: 'done' },
  ];
  it('ActionList filters overdue and done', () => {
    const overdue = mount(ActionList, { props: { actions, filter: 'overdue', today: '2026-06-01', canWrite: true } });
    expect(overdue.findAll('li').map((l) => l.attributes('data-action-id'))).toEqual(['1']);
    const done = mount(ActionList, { props: { actions, filter: 'done', today: '2026-06-01', canWrite: true } });
    expect(done.findAll('li')).toHaveLength(1);
    expect(done.find('button').exists()).toBe(false);
  });
  it('ActionList emits complete and hides buttons for viewers', async () => {
    const w = mount(ActionList, { props: { actions, filter: 'open', today: '2026-06-01', canWrite: true } });
    await w.get('button').trigger('click');
    expect(w.emitted('complete')![0]).toEqual(['1']);
    const ro = mount(ActionList, { props: { actions, filter: 'open', today: '2026-06-01', canWrite: false } });
    expect(ro.find('button').exists()).toBe(false);
  });
  it('CalendarMonth places audits on their day and navigates', async () => {
    const { router } = setup({ small: true });
    const audit = { id: 'x', title: 'Safety walk', typeId: 'safety', site: 's', auditor: 'a', plannedDate: '2026-11-05', status: 'planned' as const, checklist: [] };
    const w = mount(CalendarMonth, { props: { audits: [audit], year: 2026, month: 11 }, global: { plugins: [router] } });
    expect(w.get('[data-testid=calendar-label]').text()).toBe('November 2026');
    expect(w.get('td[data-date="2026-11-05"]').text()).toContain('Safety walk');
    await w.get('button[aria-label="Next month"]').trigger('click');
    expect(w.emitted('navigate')![0]).toEqual([1]);
  });
  it('RootCauseList shows an empty state', () => {
    const w = mount(RootCauseList, { props: { suggestions: [] } });
    expect(w.text()).toContain('Not enough similar findings');
  });
});
