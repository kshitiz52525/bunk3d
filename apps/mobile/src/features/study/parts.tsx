import { router } from 'expo-router';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { useSession, type NoteSummary } from '@bunk3d/api';

export const KIND_TINT = { pyq: color.violet, note: color.info } as const;

/** One note or PYQ row (N1 trending, N2 list). */
export function NoteRow({ n, trendingViews }: { n: NoteSummary; trendingViews?: boolean }) {
  const pagesLabel = n.fileKind === 'PDF' ? `PDF · ${n.pages} page${n.pages === 1 ? '' : 's'}` : `Images · ${n.pages}`;
  const meta = trendingViews ? `${n.fileKind === 'PDF' ? 'PDF' : 'Images'} · ${n.authorLabel === 'Anonymous' ? 'Anonymous' : 'by ' + n.authorLabel} · ${n.views} views` : `${pagesLabel} · ${n.authorLabel}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${n.kind === 'pyq' ? 'PYQ' : 'Note'}: ${n.title}, ${n.upvotes} upvotes`} onPress={() => router.push(`/note/${n.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.surface, borderColor: color.line, borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 64 }}>
      <View style={{ width: 42, height: 52, borderRadius: 9, backgroundColor: KIND_TINT[n.kind], alignItems: 'center', justifyContent: 'center' }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: color.onLime }}>{n.kind === 'pyq' ? 'PYQ' : 'NOTE'}</RNText>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <RNText numberOfLines={2} style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: color.ink }}>{n.title}</RNText>
        <RNText numberOfLines={1} style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: color.inkMuted, marginTop: 2 }}>{meta}</RNText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 13, color: color.lime }}>▲ {n.upvotes}</RNText>
        {trendingViews ? null : <RNText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: color.inkMuted }}>{n.saves} saves</RNText>}
      </View>
    </Pressable>
  );
}

export type StudyTab = 'notes' | 'timetable' | 'attendance' | 'deadlines';
const TABS: { key: StudyTab; label: string; href: string }[] = [
  { key: 'notes', label: 'Notes', href: '/study' },
  { key: 'timetable', label: 'Timetable', href: '/timetable' },
  { key: 'attendance', label: 'Attendance', href: '/attendance' },
  { key: 'deadlines', label: 'Deadlines', href: '/deadlines' },
];

/** Notes | Timetable | Attendance | Deadlines. The last three are wave 2 and stay hidden on wave-1 campuses. */
export function StudyTabs({ active }: { active: StudyTab }) {
  const wave = useSession()?.wave ?? 1;
  const tabs = wave >= 2 ? TABS : TABS.slice(0, 1);
  if (tabs.length === 1 && active === 'notes') return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0 }}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="button"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: on }}
            // Sibling sections of Study swap in place so Back still returns to where Study was opened from.
            onPress={() => {
              if (on) return;
              if (t.key === 'notes') router.back();
              else if (active === 'notes') router.push(t.href as never);
              else router.replace(t.href as never);
            }}
            style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? color.lime : 'transparent', borderWidth: on ? 0 : 1, borderColor: color.line }}
          >
            <RNText style={{ fontFamily: on ? 'Inter_800ExtraBold' : 'Inter_600SemiBold', fontSize: 12, color: on ? color.onLime : '#C9C9C3' }}>{t.label}</RNText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
