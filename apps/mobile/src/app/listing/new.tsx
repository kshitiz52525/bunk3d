import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { SWAP_CATEGORIES, SWAP_CONDITIONS, SWAP_MAX_PHOTOS } from '@bunk3d/core';
import { color } from '@bunk3d/ui';
import { HustleError, useApi, useAsync, type ListingInput, type SwapListing } from '@bunk3d/api';
import { Btn, Cap, Chips, Page, T, VIOLET, f } from '@/features/hustle/kit';

const input = { minHeight: 52, borderRadius: 14, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, paddingHorizontal: 14, color: color.ink, fontFamily: f.semi, fontSize: 15 } as const;

/** Q3 Create listing. Lists under the seller's real name, visible to their campus only. */
export default function NewListing() {
  const api = useApi();
  const me = useAsync(() => api.you.me(), []);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [neg, setNeg] = useState(true);
  const [cond, setCond] = useState<ListingInput['condition']>('Good');
  const [cat, setCat] = useState<ListingInput['category']>('Gear');
  const [photos, setPhotos] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [posted, setPosted] = useState<SwapListing | null>(null);
  const ok = title.trim().length > 2 && price !== '';
  const nm = me.status === 'ready' ? me.data.name.split(' ') : [];
  const shortName = nm.length > 1 ? `${nm[0]} ${nm[nm.length - 1]![0]}.` : nm[0] ?? 'you';

  const addPhoto = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: SWAP_MAX_PHOTOS - photos });
      if (!r.canceled) setPhotos(Math.min(SWAP_MAX_PHOTOS, photos + r.assets.length));
    } catch { setErr('Couldn’t open your photos.'); }
  };
  const post = async () => {
    setBusy(true); setErr(null);
    try { setPosted(await api.hustle.createListing({ title, pricePaise: parseInt(price, 10) * 100, negotiable: neg, condition: cond, category: cat, photoCount: photos })); }
    catch (e) { setErr(e instanceof HustleError ? e.message : 'That didn’t post. Try again.'); }
    finally { setBusy(false); }
  };

  if (posted) {
    return (
      <Page title="Sell something">
        <View style={{ gap: 10, paddingTop: 24 }}>
          <T size={11} weight="bold" c={VIOLET} style={{ letterSpacing: 1 }}>LIVE ON SWAP</T>
          <T size={22} weight="bold">{posted.title}</T>
          <T size={16} weight="bold" c={color.violet}>₹{parseInt(price, 10).toLocaleString('en-IN')}</T>
          <T size={13} c="#C9C9C3">Buyers will message you. Mark it sold when it’s gone.</T>
          <Btn label="Back to Swap" kind="violet" onPress={() => router.navigate('/swap')} />
        </View>
      </Page>
    );
  }
  return (
    <Page title="Sell something" footer={<><Btn label="Post listing" kind="violet" disabled={!ok} busy={busy} onPress={post} />{err ? <T size={13} c={color.error}>{err}</T> : null}</>}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add photos. ${photos} of ${SWAP_MAX_PHOTOS} added`} onPress={addPhoto} style={{ minHeight: 96, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4A4A54', alignItems: 'center', justifyContent: 'center' }}>
        <T size={13} weight="bold" c={color.inkMuted}>{photos ? `${photos} photo${photos > 1 ? 's' : ''} added` : '+ Photo (up to 5)'}</T>
      </Pressable>
      <TextInput accessibilityLabel="What are you selling" value={title} onChangeText={setTitle} placeholder="What are you selling?" placeholderTextColor={color.inkMuted} style={input} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T size={20} weight="bold">₹</T>
        <TextInput accessibilityLabel="Price" value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, '').slice(0, 6))} inputMode="numeric" keyboardType="number-pad" placeholder="0" placeholderTextColor={color.inkMuted} style={[input, { flex: 1 }]} />
        <Pressable accessibilityRole="switch" accessibilityLabel="Negotiable" accessibilityState={{ checked: neg }} onPress={() => setNeg(!neg)} style={{ minHeight: 52, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', borderWidth: 1, borderColor: neg ? VIOLET : '#2E2E36', backgroundColor: neg ? color.anonTile : 'transparent' }}><T size={13} weight="bold" c={neg ? color.anonInk : '#C9C9C3'}>Negotiable</T></Pressable>
      </View>
      <Cap>Condition</Cap>
      <View style={{ marginHorizontal: -16 }}><Chips items={SWAP_CONDITIONS.map((k) => ({ key: k, label: k }))} value={cond} onChange={setCond} tone="violet" /></View>
      <Cap>Category</Cap>
      <View style={{ marginHorizontal: -16 }}><Chips items={SWAP_CATEGORIES.map((k) => ({ key: k, label: k }))} value={cat} onChange={setCat} tone="violet" /></View>
      <T size={12} c={color.inkMuted}>Listed under your real name ({shortName}) and visible to your campus only. No weapons, meds, notes-for-cash on exams, or anything from the banned list. Bunk3d doesn’t handle Swap payments.</T>
    </Page>
  );
}
