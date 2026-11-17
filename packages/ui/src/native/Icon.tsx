import Svg, { Path } from 'react-native-svg';
import { View } from 'react-native';
import { color as c } from '../tokens.generated';
import { baseIcons } from './icons/base';
import { teaIcons } from './icons/tea';
import { studyIcons } from './icons/study';
import { poppinIcons } from './icons/poppin';
import { crewIcons } from './icons/crew';
import { dmIcons } from './icons/dm';
import { discoverIcons } from './icons/discover';
import { youIcons } from './icons/you';
import { safetyIcons } from './icons/safety';
import { hustleIcons } from './icons/hustle';
import { consoleIcons } from './icons/console';

const ICONS = { ...baseIcons, ...teaIcons, ...studyIcons, ...poppinIcons, ...crewIcons, ...dmIcons, ...discoverIcons, ...youIcons, ...safetyIcons, ...hustleIcons, ...consoleIcons } as Record<string, readonly string[]>;

export type IconName = keyof typeof baseIcons | keyof typeof teaIcons | keyof typeof studyIcons | keyof typeof poppinIcons | keyof typeof crewIcons | keyof typeof dmIcons | keyof typeof discoverIcons | keyof typeof youIcons | keyof typeof safetyIcons | keyof typeof hustleIcons | keyof typeof consoleIcons;

/** Inline stroke icons, 2.2px. Decorative by default; pair with a labelled button. */
export function Icon({ name, size = 20, color = c.ink, stroke = 2.2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const paths = ICONS[name] ?? [];
  return (
    <View aria-hidden style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
      </Svg>
    </View>
  );
}
