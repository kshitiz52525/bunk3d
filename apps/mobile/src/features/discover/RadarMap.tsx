import MapView, { Marker } from 'react-native-maps';
import { Text as RNText, View } from 'react-native';
import { color } from '@bunk3d/ui';
import type { RadarMapProps } from './radarTypes';

/** Native map (react-native-maps). Pins are public places and meetups; "you" is an approximate dot, only if ghost mode is off. */
export function RadarMap({ center, pins, you, onPin, height }: RadarMapProps) {
  return (
    <View accessibilityLabel="Map of places and meetups near campus" style={{ height, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: color.line }}>
      <MapView
        style={{ flex: 1 }}
        userInterfaceStyle="dark"
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        {pins.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} onPress={() => onPin(p)} accessibilityLabel={p.name} tracksViewChanges={false}>
            <View style={{ backgroundColor: p.tint, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
              <RNText style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 11, color: color.onLime }}>{p.name}</RNText>
            </View>
          </Marker>
        ))}
        {you ? (
          <Marker coordinate={{ latitude: you.lat, longitude: you.lng }} accessibilityLabel="You, approximate" tracksViewChanges={false}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: color.lime, borderWidth: 3, borderColor: color.bg }} />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}
