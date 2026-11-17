import { describe, expect, it } from 'vitest';
import { createCollegeCollab } from '../src/mock/console-college-collab';
import { createCtx } from '../src/mock/ctx';

const api = () => createCollegeCollab(createCtx({ latencyMs: 0 }));

describe('console nav and sections', () => {
  it('has every page id from the design', async () => {
    const a = api();
    expect((await a.ccNav('college')).map((n) => n.code)).toEqual(['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6']);
    expect((await a.ccNav('collab')).map((n) => n.code).sort()).toEqual(Array.from({ length: 14 }, (_, i) => `BR${i + 1}`).sort());
    expect((await a.ccNav('vendor')).map((n) => n.code)).toEqual(['VN1', 'VN2']);
    expect((await a.ccNav('finance')).map((n) => n.code)).toEqual(Array.from({ length: 8 }, (_, i) => `FI${i + 1}`));
  });
  it('every section loads, is flagged seed, and rows are seed', async () => {
    const a = api();
    for (const c of ['college', 'collab', 'vendor', 'finance'] as const) {
      for (const n of await a.ccNav(c)) {
        const s = await a.ccSection(c, n.id);
        expect(s.seed).toBe(true);
        expect(s.rows.every((r) => r.seed)).toBe(true);
      }
    }
    await expect(api().ccSection('college', 'nope')).rejects.toThrow();
  });
  it('college pages show no student identity beyond counts', async () => {
    const a = api();
    const text = JSON.stringify(await Promise.all((await a.ccNav('college')).map((n) => a.ccSection('college', n.id))));
    expect(text).not.toMatch(/Student [A-Z]\b/);
  });
});

describe('credits (BR13/BR14)', () => {
  it('plan table matches HANDOFF §4 with GST on top', async () => {
    const s = await api().ccSection('collab', 'br13');
    const g = s.rows.find((r) => r.id === 'br13-growth')!;
    expect(g.cells.map((c) => c.text)).toEqual(['Growth · current', '₹34,999', '400', 'up to 15', '5', '5%']);
    expect(g.detail.lines).toContainEqual(['Monthly invoice', '₹34,999 + ₹6,299.82 GST = ₹41,298.82']);
    expect(g.detail.lines).toContainEqual(['Per credit', '₹87.50 excl. GST']);
    expect(s.rows.find((r) => r.id === 'br13-managed')!.cells[1].text).toBe('from ₹2,50,000 / campaign');
  });
  it('spending credits deducts the exact price and blocks when short', async () => {
    const a = api();
    const r = await a.ccAct({ console: 'collab', sectionId: 'br14', rowId: 'br14-gig_post', action: 'Post a gig' });
    expect(r.ok && r.message).toMatch(/5 credits used/);
    const b = await a.ccSection('collab', 'br13');
    expect(b.kpis[1].value).toBe('54 / 400');
    for (let i = 0; i < 3; i++) await a.ccAct({ console: 'collab', sectionId: 'br14', rowId: 'br14-college_request', action: 'Send request' });
    const short = await a.ccAct({ console: 'collab', sectionId: 'br14', rowId: 'br14-college_request', action: 'Send request' });
    expect(short.ok).toBe(false);
  });
  it('top-up adds 50 credits and invoices Rs 6,000 + 18% GST', async () => {
    const a = api();
    const r = await a.ccAct({ console: 'collab', sectionId: 'br14', action: 'Buy 50 credits' });
    expect(r.ok && r.message).toContain('₹6,000 + ₹1,080 GST = ₹7,080');
    expect((await a.ccSection('collab', 'br13')).kpis[1].value).toBe('109 / 400');
  });
  it('credit menu only lists the HANDOFF prices plus the always-free actions', async () => {
    const s = await api().ccSection('collab', 'br14');
    expect(s.rows.slice(0, 6).map((r) => r.cells[1].text)).toEqual(['5', '2 / campus', '15', '20 / college', '3', '12 / campus']);
    expect(s.rows.slice(6).every((r) => r.cells[1].text === 'Free')).toBe(true);
  });
  it('settlement fee uses the brand plan rate from core', async () => {
    const s = await api().ccSection('collab', 'br10');
    expect(s.kpis[3].value).toBe('₹3,000');
  });
});

describe('finance reads the ledger', () => {
  it('fi1 balances come from balanced entries and the trial balance says so', async () => {
    const s = await api().ccSection('finance', 'fi1');
    const t = s.rows.find((r) => r.id === 'fi1-trial')!;
    expect(t.cells[2]).toEqual({ text: 'Debits equal credits', tone: 'ok' });
    expect(s.kpis[0].label).toBe('HELD IN ESCROW');
  });
  it('payout batch above Rs 50,000 gets a second approval from another user and is audited', async () => {
    const a = api();
    const r = await a.ccAct({ console: 'finance', sectionId: 'fi2', rowId: 'fi2-0', action: 'Approve as 2nd' });
    expect(r.ok).toBe(true);
    expect((await a.ccAuditLog()).map((e) => e.action)).toEqual(['Approve as 2nd']);
    const again = await a.ccAct({ console: 'finance', sectionId: 'fi2', rowId: 'fi2-0', action: 'Approve as 2nd' });
    expect(again.ok).toBe(false);
  });
  it('fi7 has a GST invoice for every fee', async () => {
    const s = await api().ccSection('finance', 'fi7');
    const inv = s.rows.find((r) => r.id === 'fi7-inv')!;
    expect(Number(inv.detail.lines.filter(([k]) => /fee/.test(k)).reduce((n, [, v]) => n + Number(v), 0))).toBeGreaterThanOrEqual(6);
  });
});
