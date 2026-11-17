import * as Location from 'expo-location';

/**
 * The device position, asked for only when the person starts a share. The API rounds it to about 150 m and never keeps
 * the exact point. Returns undefined if permission is refused or the position takes too long (the mock then uses the campus).
 */
export async function getDevicePosition(): Promise<{ lat: number; lng: number } | undefined> {
  try {
    const perm = await Promise.race([Location.requestForegroundPermissionsAsync(), new Promise<null>((r) => setTimeout(() => r(null), 3000))]);
    if (!perm || perm.status !== 'granted') return undefined;
    const pos = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
    return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : undefined;
  } catch {
    return undefined;
  }
}
