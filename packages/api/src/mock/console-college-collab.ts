import {
  CREDIT_PRICES, FREE_ACTIONS, PLANS, TDS_194O_THRESHOLD_PAISE, TOPUP, accountBalance, brandFeeCharge, brandPayoutFee, canApprovePayout, computeTakeHome, createLedger,
  creditRefund, creditsFor, financialYear, formatPaise, fundEscrow, gstInvoice, instantFeeSplit, payoutApprovalsNeeded, payoutToStudent, perCreditPaise, planById, planInvoice,
  priceTicket, releaseToClub, releaseToStudent, renewCredits, settleTicketsToClub, ticketSale, topupPerCreditPaise, trialBalance, type CreditAction, type GstInvoice, type LedgerAccount, type PlanId,
} from '@bunk3d/core';
import type { CcActionInput, CcActionResult, CcAuditEntry, CcCell, CcConsole, CcNavItem, CcRow, CcSection, CcTone, CollegeCollabApi } from '../contract';
import type { MockCtx } from './ctx';
import { RAW, type RawRow, type RawSection } from './seed-console-college-collab';

// SEED DATA. Console mock: no ctx.requireUser() (console auth arrives in the backend phase).
// Static copy comes from seed-console-college-collab.ts; anything numeric that business rules can produce is computed with @bunk3d/core.

const ME_FINANCE = 'Seed Approver B';
const FIRST_APPROVER = 'Seed Approver A';
const rs = (n: number) => Math.round(n * 100);
const f = formatPaise;
const TONES: Record<string, CcTone> = { '!': 'warn', '+': 'ok', '-': 'err', '~': 'muted' };
const parseCell = (t: string): CcCell => (TONES[t.charAt(0)] ? { text: t.slice(1), tone: TONES[t.charAt(0)] } : { text: t, tone: 'plain' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (ms: number) => { const d = new Date(ms); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const T0 = Date.UTC(2026, 9, 24);

const NO_RESOLVE = /^(View|Open|Download|Message|Edit|Contact|Talk|Query|Calendar|Templates)/;

type Raw = { id: string; code: string; label: string; wave: 1 | 2 | 3 | 4; title: string; desc: string; primary: string; lock?: string; kpis: [string, string, string][]; cols: string[]; rows: RawRow[] };

export function createCollegeCollab(ctx: MockCtx): CollegeCollabApi {
  // ---------- mutable per-session state ----------
  let planId: PlanId = 'growth';
  let credits = 59; // seed balance
  const resolved = new Map<string, string>();
  const audit: CcAuditEntry[] = [];
  const approvals: string[] = [FIRST_APPROVER]; // PB-1024 approvals

  // ---------- seed ledger (Finance reads from this) ----------
  const ledger = createLedger();
  let seq = 0;
  const post = (memo: string, atMs: number, lines: Parameters<typeof ledger.post>[0]['lines']) => ledger.post({ id: `T${String(++seq).padStart(3, '0')}`, atMs, memo, lines });
  const invoices: GstInvoice[] = [];
  const inv = (kind: GstInvoice['kind'], fee: number) => invoices.push(gstInvoice(`SEED-INV-${String(invoices.length + 1).padStart(4, '0')}`, kind, fee));
  const OWNERS: Record<string, string> = {
    'camp-alpha': 'Brand Alpha · Q4 campus ambassadors', 'camp-beta': 'Brand Beta · Sampling Saturdays', 'club-dev': 'Seed Dev Club', 'club-robo': 'Seed Robotics Society',
    'evt-hack': 'Seed Hackathon', 'stu-a': 'Student A', 'stu-b': 'Student B', 'stu-c': 'Student C',
  };
  (() => {
    post('Brand Alpha funds campaign escrow', T0 - 20 * 86400000, fundEscrow('camp-alpha', rs(300000)));
    post('Brand Beta funds campaign escrow', T0 - 12 * 86400000, fundEscrow('camp-beta', rs(120000)));
    const bf = brandPayoutFee('growth', rs(60000))!;
    post('Brand fee on settled payouts', T0 - 3 * 86400000, brandFeeCharge('camp-alpha', bf.feePaise, bf.gstPaise));
    inv('brand_fee', bf.feePaise);
    post('Club share released', T0 - 3 * 86400000, releaseToClub('camp-alpha', 'club-dev', rs(42000)));
    for (const s of ['stu-a', 'stu-b', 'stu-c']) {
      const th = computeTakeHome({ payPaise: rs(6000), kind: 'paid', lifetimeEarnedPaise: rs(5000) });
      post('Student gig pay released', T0 - 2 * 86400000, releaseToStudent({ campaignId: 'camp-alpha', studentId: s, payPaise: th.payPaise, feePaise: th.feePaise, gstPaise: th.gstPaise }));
      inv('student_fee', th.feePaise);
    }
    const tk = priceTicket({ pricePaise: rs(199), qty: 25 });
    post('Ticket sales', T0 - 6 * 86400000, ticketSale('evt-hack', tk));
    inv('ticket_platform_fee', tk.platformFeePaise);
    post('Ticket money to club after event', T0 - 1 * 86400000, settleTicketsToClub('evt-hack', 'club-robo', tk.subtotalPaise));
    const one = priceTicket({ pricePaise: rs(199), qty: 1 });
    const sale = post('Ticket sale (refunded)', T0 - 5 * 86400000, ticketSale('evt-hack', one));
    ledger.reverse(sale.id, T0 - 4 * 86400000, `T${String(++seq).padStart(3, '0')}`);
    post('Instant payout', T0, payoutToStudent({ studentId: 'stu-a', amountPaise: rs(5000), instant: true }));
    inv('instant_fee', instantFeeSplit().netPaise);
  })();
  const txns = () => ledger.all();
  const bal = (a: LedgerAccount, owner?: string) => accountBalance(txns(), a, owner);
  const lastEntry = (a: LedgerAccount) => { const ms = txns().filter((t) => t.lines.some((l) => l.account === a)).map((t) => t.atMs); return ms.length ? day(Math.max(...ms)) : '—'; };
  const owners = (a: LedgerAccount) => [...new Set(txns().flatMap((t) => t.lines.filter((l) => l.account === a && l.ownerId).map((l) => l.ownerId!)))];
  const ownerLines = (a: LedgerAccount): [string, string][] => owners(a).map((o) => [OWNERS[o] ?? o, f(bal(a, o))] as [string, string]).filter(([, v]) => v !== '₹0');

  // ---------- builders ----------
  const mk = (console: CcConsole, raw: Raw, overrides: Partial<Pick<CcSection, 'kpis' | 'rows' | 'cols' | 'desc' | 'primary' | 'title'>> = {}): CcSection => ({
    console, id: raw.id, code: raw.code, label: raw.label, wave: raw.wave as CcSection['wave'], title: overrides.title ?? raw.title, desc: overrides.desc ?? raw.desc, primary: overrides.primary ?? raw.primary,
    lock: raw.lock, kpis: overrides.kpis ?? raw.kpis.map(([label, value, sub]) => ({ label, value, sub })), cols: overrides.cols ?? raw.cols,
    rows: overrides.rows ?? rawRows(raw),
    seed: true,
  });
  const rawRows = (raw: Raw): CcRow[] => raw.rows.map((r, i) => row(`${raw.id}-${i}`, r.cells, r.hl, { title: r.title, lines: r.lines, actions: r.actions, note: r.note || undefined }));
  const row = (id: string, cells: string[], highlight: boolean, detail: CcRow['detail']): CcRow => ({ id, cells: cells.map(parseCell), highlight, detail, resolved: resolved.get(id), seed: true });
  const kpi = (label: string, value: string, sub = '') => ({ label, value, sub });
  const sec = (console: CcConsole, id: string) => {
    const raw = (RAW[console] as Raw[]).find((s) => s.id === id);
    if (!raw) throw new Error(`Unknown page ${id}`);
    return raw;
  };
  const plan = () => planById(planId);
  const allowance = () => plan().credits ?? 0;
  const planPrice = (id: PlanId) => { const p = planById(id); return id === 'starter' ? 'Free' : p.priceBasis === 'campaign' ? `from ${f(p.pricePaise)} / campaign` : f(p.pricePaise); };

  // ---------- Collab HQ overrides ----------
  const collab = (id: string): CcSection => {
    const raw = sec('collab', id);
    const base = mk('collab', raw);
    const settled = rs(60000);
    const fee = brandPayoutFee(planId, settled);
    const feeRate = plan().brandFeeBp === null ? 'negotiated' : `${plan().brandFeeBp! / 100}%`;
    if (id === 'br1') {
      base.kpis = base.kpis.map((k) => k.label === 'PLAN' ? kpi('PLAN', plan().name, `${planPrice(planId)}/mo excl. GST`) : k.label === 'CREDITS LEFT' ? kpi('CREDITS LEFT', `${credits} / ${allowance()}`, 'unused roll over one month') : k);
      base.rows = base.rows.map((r, i) => i === 1 ? row(r.id, raw.rows[1].cells, true, { ...r.detail, lines: [['Policy review', 'Not submitted'], ['Credits left', String(credits)]], actions: ['Submit for review', `Top up ${TOPUP.credits} · ${f(TOPUP.pricePaise)} + GST`] }) : r);
    }
    if (id === 'br2') {
      base.kpis = base.kpis.map((k) => k.label === 'FEE ON PAYOUTS' ? kpi(k.label, feeRate, `${plan().name} plan, + GST · students pay their own fee + GST`) : k.label === 'CREDITS' ? kpi('CREDITS', `${credits} left`, 'posting + promotion') : k);
    }
    if (id === 'br6' && fee) {
      const one = brandPayoutFee(planId, rs(2500))!;
      base.rows = base.rows.map((r, i) => i === 0 ? row(r.id, raw.rows[0].cells, true, { ...r.detail, lines: r.detail.lines.map(([k, v]) => k === 'Gig pay' ? [k, `${f(rs(2500))} · you pay +${feeRate} = ${f(one.feePaise)} + ${f(one.gstPaise)} GST`] as [string, string] : [k, v]) }) : r);
    }
    if (id === 'br10') {
      const held = bal('escrow', 'camp-alpha');
      const funded = txns().filter((t) => t.lines.some((l) => l.account === 'escrow' && l.ownerId === 'camp-alpha' && l.creditPaise > 0)).reduce((s, t) => s + t.lines.filter((l) => l.account === 'escrow').reduce((a, l) => a + l.creditPaise, 0), 0);
      const settledNow = funded - held;
      const f2 = brandPayoutFee(planId, settledNow);
      base.kpis = [kpi('FUNDED', f(funded), 'payouts only, never credits'), kpi('HELD', f(held), ''), kpi('SETTLED', f(settledNow), ''), f2 ? kpi('FEE ON PAYOUTS', f(f2.feePaise), `${feeRate} of ${f(settledNow)} settled (${plan().name}), + ${f(f2.gstPaise)} GST`) : kpi('FEE ON PAYOUTS', 'Negotiated', '')];
      const aw = brandPayoutFee(planId, rs(42000));
      base.rows = base.rows.map((r, i) => i === 0 && aw ? row(r.id, raw.rows[0].cells, true, { ...r.detail, lines: [['Club', f(rs(29400))], ['Students', `${f(rs(12600))} across 6, before their own fee + GST`], [`Your fee (${feeRate})`, `${f(aw.feePaise)} + ${f(aw.gstPaise)} GST, on top`], ['Deliverables', 'All approved']] }) : r);
    }
    if (id === 'br13') {
      const growth = (p: PlanId) => planById(p);
      base.kpis = [kpi('CURRENT PLAN', plan().name, `${planPrice(planId)}/mo excl. GST`), kpi('CREDITS LEFT', `${credits} / ${allowance()}`, 'monthly allowance'), kpi('ROLLOVER', `up to ${allowance()}`, 'unused credits last one more month'),
        kpi('TOP-UP', `${TOPUP.credits} for ${f(TOPUP.pricePaise)}`, `${f(topupPerCreditPaise())} a credit · lasts ${TOPUP.validMonths} months · excl. GST`)];
      base.cols = ['PLAN', 'PRICE / MONTH (EXCL. GST)', 'CREDITS', 'CAMPUSES', 'SEATS', 'FEE ON PAYOUTS'];
      base.rows = PLANS.map((p) => {
        const cur = p.id === planId;
        const pc = perCreditPaise(p.id);
        const inv1 = p.priceBasis === 'month' && p.pricePaise ? planInvoice(p.id) : null;
        const ann = p.priceBasis === 'month' && p.pricePaise ? planInvoice(p.id, 'annual') : null;
        return row(`br13-${p.id}`, [`${p.name}${cur ? ' · current' : ''}`, planPrice(p.id), p.id === 'starter' ? '1 free gig post / month' : p.credits === null ? 'included' : p.credits.toLocaleString('en-IN'), p.campuses === null ? 'unlimited' : p.campuses === 1 ? '1' : `up to ${p.campuses}`, p.seats === null ? 'unlimited' : String(p.seats), p.brandFeeBp === null ? 'negotiated' : `${p.brandFeeBp / 100}%`], cur, {
          title: cur ? `${p.name} (current)` : p.name,
          lines: ([
            pc !== null ? ['Per credit', `${f(pc)} excl. GST`] : null,
            inv1 ? ['Monthly invoice', `${f(inv1.taxablePaise)} + ${f(inv1.gstPaise)} GST = ${f(inv1.totalPaise)}`] : null,
            ann ? ['Annual', `pay 10 months, get 12: ${f(ann.taxablePaise)} + ${f(ann.gstPaise)} GST`] : null,
            p.id === 'managed' ? ['How it works', 'Bunk3d runs the campaign end to end in Collab HQ'] : null,
          ].filter(Boolean) as [string, string][]),
          actions: cur ? ['Buy top-up', ...(p.priceBasis === 'month' && p.pricePaise ? ['Switch to annual'] : [])] : p.id === 'managed' ? ['Talk to sales'] : [growth(p.id).pricePaise > plan().pricePaise ? `Upgrade to ${p.name}` : `Switch to ${p.name}`],
          note: p.id === 'starter' ? undefined : 'Credits buy reach and visibility, never access to a student.',
        });
      });
    }
    if (id === 'br14') {
      base.kpis = [kpi('POSTING', `${creditsFor([{ action: 'gig_post' }])} credits`, 'gig, 30 days, 1 campus'), kpi('LOW-RESPONSE REFUND', 'auto', 'under 3 applicants in 7 days'), kpi('MODERATION REFUND', 'auto', 'removed, not your fault'), kpi('CREDITS DO NOT PAY OUT', 'escrow', 'payouts and prizes are funded separately')];
      base.cols = ['ACTION', 'CREDITS', 'WHAT YOU GET'];
      const labels: Record<CreditAction, string> = { gig_post: 'Post a gig', extra_campus: 'Add campus', bulk_gig: 'Post bulk gig', college_request: 'Send request', ai_shortlist: 'Run shortlist', sponsored_poll: 'Create poll' };
      base.rows = [
        ...CREDIT_PRICES.map((c) => row(`br14-${c.action}`, [c.label, `${c.credits}${c.per ? ` / ${c.per}` : ''}`, c.note], false, {
          title: c.label, lines: [['Credits', `${c.credits}${c.per ? ` per ${c.per}` : ''}`], ['You have', `${credits}`], ...(c.action === 'gig_post' ? [['Refund', 'automatic if fewer than 3 applicants in 7 days'] as [string, string]] : [])], actions: [labels[c.action]], note: 'Credits buy reach, never access to a student.',
        })),
        ...FREE_ACTIONS.map((a) => row(`br14-free-${a}`, [a.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase()), 'Free', 'Always free on every plan'], false, { title: a.replaceAll('_', ' '), lines: [['Credits', 'none']], actions: [] })),
      ];
    }
    return base;
  };

  // ---------- Finance overrides ----------
  const FINANCE_LABELS: [LedgerAccount, string, string][] = [
    ['escrow', 'Escrow', 'Liability'], ['student_payable', 'Student payable', 'Liability'], ['club_balance', 'Club balances', 'Liability'], ['ticket_sales', 'Ticket sales held', 'Liability'],
    ['fee_revenue', 'Bunk3d fee revenue', 'Revenue'], ['gst_payable', 'GST payable', 'Liability'], ['instant_fee', 'Instant payout fees', 'Revenue'], ['tds_payable', 'TDS 194-O payable', 'Liability'],
  ];
  const finance = (id: string): CcSection => {
    const raw = sec('finance', id);
    const base = mk('finance', raw);
    const tb = trialBalance(txns());
    if (id === 'fi1') {
      base.kpis = [kpi('HELD IN ESCROW', f(bal('escrow')), 'campaigns + gigs'), kpi('STUDENT PAYABLE', f(bal('student_payable')), `${owners('student_payable').length} students, after fees`), kpi('CLUB BALANCES', f(bal('club_balance')), `${owners('club_balance').length} clubs`),
        kpi('FEE REVENUE', f(bal('fee_revenue')), 'brand fees + student fees + ticket platform fees, excl. GST')];
      const feeSplit = (prefix: string) => txns().flatMap((t) => t.lines).filter((l) => l.account === 'fee_revenue' && (l.ownerId ?? '').startsWith(prefix)).reduce((s, l) => s + l.creditPaise - l.debitPaise, 0);
      base.rows = [
        ...FINANCE_LABELS.map(([a, label, type]) => row(`fi1-${a}`, [label, type, f(bal(a)), lastEntry(a)], a === 'fee_revenue', {
          title: label,
          lines: a === 'fee_revenue' ? [['Brand fees', f(feeSplit('camp'))], ['Student fees', f(feeSplit('stu'))], ['Ticket platform fees', f(feeSplit('evt'))], ['Instant payout fees', `${f(bal('instant_fee'))}, booked separately`]] : ownerLines(a).length ? ownerLines(a) : [['Entries', 'none']],
          actions: ['View entries', ...(a === 'fee_revenue' ? ['Export for CA'] : [])],
          note: a === 'fee_revenue' ? 'Fees are deducted at the payment partner’s split settlement. Bunk3d never holds gig money in its own account.' : undefined,
        })),
        row('fi1-trial', ['Trial balance', 'Check', tb.balanced ? 'Debits equal credits' : 'DOES NOT BALANCE', `${txns().length} entries`], !tb.balanced, { title: 'Trial balance', lines: [['Debits', f(tb.debitPaise)], ['Credits', f(tb.creditPaise)], ['Reversals', String(txns().filter((t) => t.reverses).length)]], actions: [], note: 'Every entry balances. Nothing is edited, only reversed.' }),
      ];
      base.rows[base.rows.length - 1].cells[2].tone = tb.balanced ? 'ok' : 'err';
    }
    if (id === 'fi2') {
      const need = payoutApprovalsNeeded(rs(184300));
      const rowsOut = base.rows.map((r, i) => i === 0 ? row(r.id, [`PB-1024 · 24 Oct`, '612', f(rs(184300)), `${approvals.length < need ? '!' : '+'}${approvals.length} of ${need} · ${approvals.join(', ')}`, approvals.length < need ? 'Waiting' : 'Released'], approvals.length < need, { ...r.detail, lines: [['First approver', `${FIRST_APPROVER} (Finance)`], ['Second approver', approvals.length >= need ? `${approvals[1]}` : 'Needed · not the first approver'], ['Flagged', '9 held for review']], actions: approvals.length < need ? r.detail.actions : ['View report'] }) : r);
      base.rows = rowsOut;
      base.kpis = base.kpis.map((k) => k.label === 'APPROVALS' ? kpi('APPROVALS', `${approvals.length} of ${need}`, 'needed above ₹50k') : k);
    }
    if (id === 'fi7') {
      const gstOnFees = bal('gst_payable');
      const tds = bal('tds_payable');
      const total = invoices.reduce((s, i) => s + i.totalPaise, 0);
      base.kpis = [kpi('TDS DEDUCTED', f(tds), financialYear(new Date(ctx.now()))), kpi('TDS THRESHOLD', f(TDS_194O_THRESHOLD_PAISE), 'per student per year, set by tax rules; confirm with your CA'), kpi('GST ON FEES', f(gstOnFees), 'since the ledger started'), kpi('GST INVOICES', String(invoices.length), `${f(total)} incl. GST`)];
      base.rows = [
        row('fi7-gst', ['GST on fees', 'All entries', '+Decided'], false, { title: 'GST on the Bunk3d fee', lines: [['Fee revenue', f(bal('fee_revenue') + bal('instant_fee'))], ['GST payable', f(gstOnFees)], ['Decision', 'Fee + 18% GST on the fee, charged extra'], ['Example', `${f(rs(2500))} gig: fee ${f(rs(125))} + GST ${f(rs(22.5))} → take-home ${f(rs(2352.5))}`], ['Applies to', 'student fees, ticket platform fees, brand fees, plan prices']], actions: ['View GST invoices'], note: 'GST is never charged on the student’s pay, only on the Bunk3d fee.' }),
        row('fi7-inv', ['GST invoices', 'One per fee', `${invoices.length} issued`], false, { title: 'GST invoices', lines: [...(['student_fee', 'brand_fee', 'ticket_platform_fee', 'instant_fee'] as const).map((k) => [k.replaceAll('_', ' '), String(invoices.filter((i) => i.kind === k).length)] as [string, string]), ['Taxable value', f(invoices.reduce((s, i) => s + i.taxablePaise, 0))], ['GST', f(invoices.reduce((s, i) => s + i.gstPaise, 0))]], actions: ['Export for accountant'] }),
        row('fi7-tds', ['TDS 194-O', financialYear(new Date(ctx.now())), tds === 0 ? '~None deducted yet' : '!To file'], false, { title: 'TDS 194-O', lines: [['Deducted', f(tds)], ['Threshold', `${f(TDS_194O_THRESHOLD_PAISE)} gross per student per year`]], actions: ['Prepare return'], note: 'Rate and threshold are parameters in the core rules; confirm with the CA.' }),
        row('fi7-16a', ['Form 16A', 'After each TDS return', tds === 0 ? '~Nothing to issue' : '!To issue'], false, { title: 'Form 16A', lines: [['Students with TDS', tds === 0 ? '0' : 'see TDS report']], actions: [] }),
        row('fi7-gstr', ['GSTR-1', 'Monthly', '!Prepare from invoices'], true, { title: 'GSTR-1', lines: [['Platform fee invoices', String(invoices.length)]], actions: ['Prepare'] }),
      ];
    }
    if (id === 'fi8') {
      const brands: { name: string; plan: PlanId; left: number; used: number }[] = [
        { name: 'Brand Alpha', plan: planId, left: credits, used: allowance() - credits },
        { name: 'Brand Gamma', plan: 'scale', left: 610, used: 690 },
        { name: 'Brand Delta', plan: 'launch', left: 22, used: 78 },
        { name: 'Seed Coffee Co', plan: 'starter', left: 0, used: 0 },
      ];
      const mrr = brands.reduce((s, b) => s + planById(b.plan).pricePaise, 0);
      const refunds = [{ brand: 'Brand Beta', spent: 5, applicants: 1, days: 8 }, { brand: 'Brand Delta', spent: 15, applicants: 2, days: 9 }].map((g) => ({ ...g, r: creditRefund({ creditsSpent: g.spent, applicants: g.applicants, daysSincePosted: g.days }) }));
      const refunded = refunds.reduce((s, g) => s + g.r.refund, 0);
      const expiring = brands.reduce((s, b) => s + renewCredits(b.plan, b.left).expired, 0);
      base.kpis = [kpi('SUBSCRIPTION MRR', f(mrr), `${brands.filter((b) => planById(b.plan).pricePaise > 0).length} paying brands, excl. GST`), kpi('CREDITS LEFT', String(brands.reduce((s, b) => s + b.left, 0)), 'across brands'), kpi('CREDITS REFUNDED', String(refunded), 'low response + moderation'), kpi('EXPIRING', String(expiring), 'above the rollover allowance')];
      base.rows = [
        ...brands.map((b) => { const p = planById(b.plan); return row(`fi8-${b.name}`, [b.name, `${p.name} · ${planPrice(b.plan)}`, p.credits ? `${b.left} / ${p.credits}` : String(b.left), b.used ? `${b.used} used` : p.freeGigPostsPerMonth ? '1 free gig post' : '0 used', b.plan === 'starter' ? '~Upgrade lead' : p.credits && b.left < p.credits / 5 ? '!Low credits' : '+Healthy'], !!p.credits && b.left < p.credits / 5, { title: b.name, lines: [['Marketplace fee', p.brandFeeBp === null ? 'negotiated' : `${p.brandFeeBp / 100}%`], ['Monthly invoice', p.pricePaise ? f(planInvoice(b.plan).totalPaise) + ' incl. GST' : 'none']], actions: p.pricePaise ? ['Offer top-up', 'Issue invoice'] : ['Send Launch offer'] }); }),
        row('fi8-refunds', ['Low-response refunds', 'Auto', `${refunded} credits to ${refunds.filter((g) => g.r.refund).length} brands`, 'seed log', '+Refunded'], false, { title: 'Automatic refunds', lines: [['Rule', 'gig with fewer than 3 applicants in 7 days'], ['Credits returned', String(refunded)]], actions: ['View log'], note: 'Credits never fund payouts or prize pools; those are held in escrow.' }),
      ];
    }
    return base;
  };

  const college = (id: string) => mk('college', sec('college', id));
  const vendor = (id: string) => mk('vendor', sec('vendor', id));
  const build = (console: CcConsole, id: string): CcSection => {
    const s = console === 'college' ? college(id) : console === 'collab' ? collab(id) : console === 'vendor' ? vendor(id) : finance(id);
    s.rows = s.rows.map((r) => ({ ...r, resolved: resolved.get(r.id) }));
    return s;
  };

  const act = (i: CcActionInput): CcActionResult => {
    const section = build(i.console, i.sectionId);
    const r = i.rowId ? section.rows.find((x) => x.id === i.rowId) : undefined;
    const logged = (msg: string): CcActionResult => {
      audit.push({ atMs: ctx.now(), console: i.console, sectionId: i.sectionId, rowId: i.rowId, action: i.action, seed: true });
      if (r && !NO_RESOLVE.test(i.action)) resolved.set(r.id, i.action);
      return { ok: true, message: msg, section: build(i.console, i.sectionId) };
    };
    if (i.rowId && !r) return { ok: false, message: 'That item is gone. Reload the page.' };
    const topUp = () => { credits += TOPUP.credits; const tax = Math.round(TOPUP.pricePaise * 0.18); return logged(`${TOPUP.credits} credits added. Invoice ${f(TOPUP.pricePaise)} + ${f(tax)} GST = ${f(TOPUP.pricePaise + tax)}.`); };
    if (i.console === 'collab') {
      if (i.action === 'Buy 50 credits' || i.action === 'Buy top-up' || i.action.startsWith('Top up')) return topUp();
      const spend = i.rowId?.startsWith('br14-') ? CREDIT_PRICES.find((c) => `br14-${c.action}` === i.rowId) : undefined;
      if (spend) {
        const cost = creditsFor([{ action: spend.action }]);
        if (credits < cost) return { ok: false, message: `Not enough credits: ${cost} needed, ${credits} left. A top-up is ${TOPUP.credits} credits for ${f(TOPUP.pricePaise)} + GST.` };
        credits -= cost;
        return logged(`${cost} credits used for ${spend.label.toLowerCase()}. ${credits} left. Credits buy reach only; payouts are funded into escrow.`);
      }
      const sw = /^(?:Switch to|Upgrade to) (\w+)$/.exec(i.action);
      if (sw) {
        const target = PLANS.find((p) => p.name === sw[1]);
        if (target && target.id !== 'managed') { planId = target.id; return logged(`Plan changed to ${target.name}. Takes effect at the next renewal; you keep your ${credits} credits.`); }
      }
    }
    if (i.console === 'finance' && i.action === 'Approve as 2nd' && i.rowId === 'fi2-0') {
      if (!canApprovePayout(approvals, ME_FINANCE)) return { ok: false, message: 'The second approver must be a different Finance user.' };
      approvals.push(ME_FINANCE);
      return logged('Batch PB-1024 approved by two people. Released.');
    }
    return logged(`${i.action}${r ? ` · ${r.detail.title}` : ''} saved and written to the audit log.`);
  };

  return {
    async ccNav(console) {
      await ctx.wait();
      return (RAW[console] as Raw[]).map((s): CcNavItem => ({ id: s.id, code: s.code, label: s.label, wave: s.wave as CcNavItem['wave'] }));
    },
    async ccSection(console, id) {
      await ctx.wait();
      return build(console, id);
    },
    async ccAct(input) {
      await ctx.wait();
      return act(input);
    },
    async ccAuditLog() {
      await ctx.wait();
      return [...audit];
    },
  };
}
