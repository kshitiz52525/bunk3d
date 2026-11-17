import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native';
import { color } from '@bunk3d/ui';
import { Icon } from '@bunk3d/ui/native';
import type { Media } from '@bunk3d/api';
import { mmss } from './util';

/** Camera filters. Applied as a tint overlay and stored by name on the media. */
export const FILTERS: { name: string; tint: string | null }[] = [
  { name: 'Original', tint: null },
  { name: 'Golden hour', tint: 'rgba(255,170,60,0.22)' },
  { name: 'Night flash', tint: 'rgba(40,60,140,0.22)' },
  { name: 'Lime pop', tint: 'rgba(212,255,58,0.18)' },
  { name: 'Mono', tint: 'rgba(120,120,120,0.55)' },
  { name: 'Monsoon', tint: 'rgba(60,120,140,0.25)' },
];
export const filterTint = (name?: string) => FILTERS.find((f) => f.name === name)?.tint ?? null;

function PlayBadge({ size = 56 }: { size?: number }) {
  return (
    <View aria-hidden style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(13,13,15,0.6)', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="play" size={size * 0.42} color={color.ink} />
    </View>
  );
}

/**
 * A photo or video tile. Seed media have no uri and render a tinted placeholder.
 * `contain` shows the whole original (viewer); otherwise it covers (feed).
 */
export function MediaTile({ media, contain, style, playing, iconSize = 28 }: { media: Media; contain?: boolean; style?: StyleProp<ViewStyle>; playing?: boolean; iconSize?: number }) {
  const tint = filterTint(media.filter);
  return (
    <View accessible accessibilityLabel={media.alt} style={[{ backgroundColor: color.surfaceRaised, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      {media.kind === 'video' && media.uri && playing ? (
        <LivePlayer uri={media.uri} contain={contain} />
      ) : media.uri && media.kind === 'image' ? (
        <Image source={{ uri: media.uri }} contentFit={contain ? 'contain' : 'cover'} style={{ position: 'absolute', inset: 0 }} blurRadius={media.blurred ? 40 : 0} accessibilityLabel={media.alt} />
      ) : (
        <>
          <View aria-hidden style={{ position: 'absolute', inset: 0, backgroundColor: media.tint ?? color.violet, opacity: 0.3 }} />
          {media.kind === 'video' ? <PlayBadge /> : <Icon name="image" size={iconSize} color={color.inkMuted} />}
        </>
      )}
      {media.kind === 'video' && !(media.uri && playing) && media.uri ? <PlayBadge /> : null}
      {tint ? <View aria-hidden pointerEvents="none" style={{ position: 'absolute', inset: 0, backgroundColor: tint }} /> : null}
      {media.kind === 'video' && media.durationSec !== undefined ? (
        <RNText style={{ position: 'absolute', right: 8, bottom: 8, fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.ink, backgroundColor: 'rgba(13,13,15,0.7)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, overflow: 'hidden' }}>{mmss(media.durationSec)}</RNText>
      ) : null}
    </View>
  );
}

function LivePlayer({ uri, contain }: { uri: string; contain?: boolean }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; p.play(); });
  return <VideoView player={player} style={{ position: 'absolute', inset: 0 }} contentFit={contain ? 'contain' : 'cover'} nativeControls={!!contain} />;
}

/** Feed shows photos clamped between 4:5 and 1.91:1; the viewer shows the original. */
export const feedRatio = (r: number) => Math.min(1.91, Math.max(0.8, r));
