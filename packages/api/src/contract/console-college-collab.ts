// Console contract: College HQ (CO1-CO6), Collab HQ (BR1-BR14), Vendor (VN1-VN2), Finance (FI1-FI8).
// Console auth arrives in the backend phase. "Who may call" notes say what RLS / role checks must enforce.
// Types are prefixed `Cc` so they never clash with the Crew HQ / Ops types in console-crew-ops.ts (same shape, separate names;
// the backend phase should unify them). All money text is computed server-side; amounts are paise, shown with formatPaise.
// Hustle data (gigs, earnings, payouts) lives in the mobile `hustle` slice; consoles here only expose console-side summaries.

export type CcConsole = 'college' | 'collab' | 'vendor' | 'finance';
export type CcTone = 'plain' | 'warn' | 'ok' | 'err' | 'muted';
export type CcCell = { text: string; tone: CcTone };
export type CcKpi = { label: string; value: string; sub: string };
export type CcDetail = { title: string; lines: [string, string][]; actions: string[]; note?: string };
export type CcRow = {
  id: string;
  cells: CcCell[];
  highlight: boolean;
  detail: CcDetail;
  /** Set once an action has been taken on this row, e.g. "Approve". Written to the audit log. */
  resolved?: string;
  seed: true;
};
export type CcNavItem = { id: string; code: string; label: string; wave: 1 | 2 | 3 | 4 };
export type CcSection = {
  console: CcConsole;
  id: string;
  code: string;
  label: string;
  wave: 1 | 2 | 3 | 4;
  title: string;
  desc: string;
  /** Label of the page's primary button. */
  primary: string;
  lock?: string;
  kpis: CcKpi[];
  cols: string[];
  rows: CcRow[];
  seed: true;
};
export type CcActionInput = { console: CcConsole; sectionId: string; rowId?: string; action: string };
export type CcActionResult = { ok: true; message: string; section: CcSection } | { ok: false; message: string };

export type CcAuditEntry = { atMs: number; console: CcConsole; sectionId: string; rowId?: string; action: string; seed: true };

export interface CollegeCollabApi {
  /**
   * Sidebar entries for one console, in display order.
   * Who: any signed-in console user of that console. RLS: college = verified staff of one college; collab = member of one brand;
   * vendor = vendor assigned by a brand; finance = Bunk3d finance role (2FA + device lock).
   */
  ccNav(console: CcConsole): Promise<CcNavItem[]>;
  /**
   * One console page (CO/BR/VN/FI). Rejects for an unknown id.
   * RLS: college sections only return the caller's own college and never any student identity (counts only, never who posted anonymously);
   * collab sections only the caller's brand and never student contact details or earnings; vendor only that vendor's assignments;
   * finance reads the double-entry ledger.
   */
  ccSection(console: CcConsole, sectionId: string): Promise<CcSection>;
  /**
   * Take an action on a row, or press a page's primary button (no rowId). Every call is written to the audit log.
   * Who: role-gated server-side (college: signatory-only for signing; collab: Owner/Manager may spend credits or approve settlements;
   * finance: payout release above Rs 50,000 needs two different Finance users). Credits can only pay for reach, never for payouts or prizes.
   * Returns ok:false with a plain message when a rule blocks it (not enough credits, same second approver).
   */
  ccAct(input: CcActionInput): Promise<CcActionResult>;
  /** Finance: the audit log of actions taken in these consoles this session. Who: finance role. */
  ccAuditLog(): Promise<CcAuditEntry[]>;
}
