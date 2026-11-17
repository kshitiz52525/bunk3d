import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color as c } from '../tokens.generated';

export type IconName =
  | 'back' | 'chevronRight' | 'check' | 'search' | 'camera' | 'lock' | 'mask' | 'eyeOff'
  | 'clock' | 'alert' | 'bank' | 'google' | 'shield' | 'close' | 'arrowUp';

/** Inline stroke icons, 2.2px. Decorative by default; pair with a labelled button. */
export function Icon({ name, size = 20, color = c.ink, stroke = 2.2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <View aria-hidden style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...p} />}
      {name === 'chevronRight' && <Path d="M9 5l7 7-7 7" {...p} />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'arrowUp' && <Path d="M12 19V5M6 11l6-6 6 6" {...p} />}
      {name === 'search' && (<><Circle cx="11" cy="11" r="7" {...p} /><Path d="M20 20l-4-4" {...p} /></>)}
      {name === 'camera' && (<><Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...p} /><Circle cx="12" cy="13" r="3.5" {...p} /></>)}
      {name === 'lock' && (<><Rect x="6" y="11" width="12" height="9" rx="2" {...p} /><Path d="M8 11V8a4 4 0 0 1 8 0v3" {...p} /></>)}
      {name === 'mask' && <Path d="M3 10c2-1.5 4-1.5 6 0h6c2-1.5 4-1.5 6 0-.5 4-2.5 6-5 6-1.6 0-2.5-1-4-1s-2.400 1-4 1c-2.500 0-4.500-2-5-6z" {...p} />}
      {name === 'eyeOff' && (<><Path d="M3 3l18 18" {...p} /><Path d="M10.600 6.100A9 9 0 0 1 12 6c5 0 8.500 4 9.500 6a14 14 0 0 1-2.600 3.300M6.300 7.700A14 14 0 0 0 2.500 12C3.500 14 7 18 12 18c1.300 0 2.500-.3 3.500-.8" {...p} /><Path d="M9.900 9.900a3 3 0 0 0 4.200 4.200" {...p} /></>)}
      {name === 'clock' && (<><Circle cx="12" cy="12" r="9" {...p} /><Path d="M12 7v5l3 2" {...p} /></>)}
      {name === 'alert' && (<><Circle cx="12" cy="12" r="9" {...p} /><Path d="M12 8v5M12 16.500v.01" {...p} /></>)}
      {name === 'shield' && <Path d="M12 3l7 3v6c0 4.500-3 7.500-7 9-4-1.500-7-4.500-7-9V6z" {...p} />}
      {name === 'bank' && <Path d="M3 10l9-6 9 6M5 10v8M9.500 10v8M14.500 10v8M19 10v8M3 20h18" {...p} />}
      {name === 'google' && (<><Path d="M21 12a9 9 0 1 1-3-6.700" {...p} /><Path d="M12 12h9" {...p} /></>)}
    </Svg>
    </View>
  );
}
