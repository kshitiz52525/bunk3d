import type {
  Badges, Me, MyProfile, Notice, NoticeKind, NotificationPrefs, ProfileItem, ProfileTab, PublicProfile, SearchResults,
  SearchType, Settings, YouApi,
} from '../contract';
import type { MockCtx } from './ctx';
import { personById } from './seed-people';
import { SEED_CAMPUSES } from './seed';
import { SEARCH_DOCS, SEED_KARMA, SEED_MY_CLUBS, SEED_MY_ITEMS, SEED_NOTICES, SEED_PUBLIC_POSTS } from './seed-you';

const DAY = 86_400_000;
const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// SEED DATA lives in seed-you.ts and seed-people.ts, flagged `seed: true`. Mock only.
export function createYou(ctx: MockCtx): YouApi {
  let settings: Settings = {
    notifications: { replies: true, dms: true, notices: true, events: true, quietHours: true, readReceipts: false },
    quietStart: '22:00',
    quietEnd: '08:00',
    deletionAt: null,
  };
  const read = new Set<string>();
  const notices: Notice[] = SEED_NOTICES.map((n) => ({
    id: n.id, kind: n.kind, short: n.short, from: n.from, badge: n.badge, at: ctx.now() - n.ageMin * 60_000, urgent: n.urgent,
    title: n.title, body: n.body, read: false, seed: true as const,
  }));
  const me = (): Me => {
    const p = ctx.profile;
    const name = p?.name ?? 'Student';
    return { id: ctx.requireUser(), name, initials: initialsOf(name), username: p?.username ?? 'student', campusName: SEED_CAMPUSES.find((c) => c.id === ctx.getSession()?.campusId)?.name ?? 'Atria University', photoUri: p?.photoUri };
  };
  const liveNotices = () => notices.map((n) => ({ ...n, read: read.has(n.id) }));
  const isSeedUser = () => ctx.requireUser() === 'u_returning';

  return {
    async me() {
      await ctx.wait(60);
      return me();
    },
    async badges(): Promise<Badges> {
      return { unreadDms: false, unreadNotices: liveNotices().filter((n) => !n.read).length };
    },
    async myProfile(): Promise<MyProfile> {
      await ctx.wait(80);
      const p = ctx.profile;
      return {
        ...me(),
        degree: p?.degree ?? '', dept: p?.dept ?? '', year: p?.year ?? '',
        verified: ctx.getSession()?.verified === 'verified',
        isMod: isSeedUser(), // SEED: the returning mock user is a Campus Mod.
        karma: SEED_KARMA,
        clubs: SEED_MY_CLUBS.map((c) => ({ ...c })),
        seed: true,
      };
    },
    async myContent(tab: ProfileTab): Promise<ProfileItem[]> {
      await ctx.wait(100);
      ctx.requireUser();
      return SEED_MY_ITEMS[tab].map((i) => ({ ...i }));
    },
    async userProfile(id): Promise<PublicProfile> {
      await ctx.wait(100);
      const u = ctx.requireUser();
      const person = personById(id);
      if (!person) throw new Error('Not found');
      return {
        id: person.id, name: person.name, initials: person.initials, username: person.username, degree: person.degree, dept: person.dept,
        year: person.year, bio: person.bio, verified: true, clubs: person.clubs.map((c) => ({ ...c })),
        posts: SEED_PUBLIC_POSTS[id] ?? [], notesCount: 0, connected: id === 'u_rhea', blocked: false, isSelf: id === u, seed: true,
      };
    },
    async settings() { await ctx.wait(60); ctx.requireUser(); return { ...settings, notifications: { ...settings.notifications } }; },
    async updateSettings(patch) {
      await ctx.wait(60); ctx.requireUser();
      const n: NotificationPrefs = { ...settings.notifications, ...patch.notifications };
      settings = { ...settings, notifications: n, quietStart: patch.quietStart ?? settings.quietStart, quietEnd: patch.quietEnd ?? settings.quietEnd };
      return { ...settings, notifications: { ...n } };
    },
    async requestAccountDeletion() { await ctx.wait(100); ctx.requireUser(); settings = { ...settings, deletionAt: ctx.now() + 30 * DAY }; return { ...settings }; },
    async cancelAccountDeletion() { await ctx.wait(100); ctx.requireUser(); settings = { ...settings, deletionAt: null }; return { ...settings }; },
    async notices(filter: 'All' | NoticeKind = 'All') {
      await ctx.wait(100); ctx.requireUser();
      return liveNotices()
        .filter((n) => filter === 'All' || n.kind === filter)
        .sort((a, b) => Number(a.read) - Number(b.read) || Number(b.urgent) - Number(a.urgent) || b.at - a.at);
    },
    async markNoticeRead(id) { await ctx.wait(30); read.add(id); },
    async markAllNoticesRead() { await ctx.wait(30); notices.forEach((n) => read.add(n.id)); },
    async search(query, type: SearchType = 'All'): Promise<SearchResults> {
      await ctx.wait(100); ctx.requireUser();
      const q = query.trim().toLowerCase();
      const hit = q ? SEARCH_DOCS.filter((d) => d.text.includes(q) || d.title.toLowerCase().includes(q)) : [];
      const pick = (kinds: string[]) => hit.filter((d) => kinds.includes(d.kind)).map(({ text: _t, ...r }) => ({ ...r, seed: true as const }));
      const notes = pick(['note', 'subject']), posts = pick(['post']), events = pick(['event']), clubs = pick(['club']);
      const want = (t: SearchType) => type === 'All' || type === t;
      return {
        query,
        notes: want('Notes') ? notes : [], posts: want('Posts') ? posts : [], events: want('Events') ? events : [], clubs: want('Clubs') ? clubs : [],
        notesTotal: notes.length, postsTotal: posts.length, eventsTotal: events.length, clubsTotal: clubs.length,
      };
    },
  };
}
