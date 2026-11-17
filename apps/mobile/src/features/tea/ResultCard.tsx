import { router } from 'expo-router';
import { StateCard } from '@bunk3d/ui/native';
import { useApi, type CreatePostResult } from '@bunk3d/api';
import { MutedCard, PendingCard } from './gate';
import { notifyTeaChanged } from './util';

export function ResultCard({ r, onClose }: { r: Extract<CreatePostResult, { ok: false }>; onClose: () => void }) {
  const api = useApi();
  if (r.reason === 'removed') return <StateCard domain="SAFETY" kind="err" title={`Post removed · strike ${r.strike}`} body="Our safety check found it broke the rules. Strikes expire after 90 days." cta={{ label: 'Appeal once', onPress: () => { void api.tea.appealRemoval(r.noticeId).then(() => { notifyTeaChanged(); router.back(); }); } }} alt={{ label: 'Rules', onPress: () => router.push('/onboarding/guidelines') }} />;
  if (r.reason === 'muted') return r.mutedUntil ? <MutedCard until={r.mutedUntil} /> : null;
  if (r.reason === 'not_verified') return <PendingCard />;
  const msg: Record<string, string> = {
    anon_locked: 'Unlocks at 20 karma, 7-day-old account and no active strike. Post as you instead.', empty: 'Write something first.', bad_poll: 'A poll needs 2 to 4 different options.',
    no_destination: 'Pick Feed, Story or both.', anon_story: 'Stories always show your name.', community_story: 'Community posts can’t go to your story.', too_many_photos: 'Up to 10 photos.',
    video_too_long: 'Story videos are 15 seconds or less.', video_too_big: 'That video is too big. Max is 50 MB.',
  };
  return <StateCard domain="TEA" kind={r.reason === 'anon_locked' ? 'info' : 'err'} title={r.reason === 'anon_locked' ? 'Anon’s still locked' : 'Couldn’t post'} body={msg[r.reason] ?? 'Try again.'} cta={{ label: r.reason === 'anon_locked' ? 'Post as you' : 'Got it', onPress: onClose }} />;
}
