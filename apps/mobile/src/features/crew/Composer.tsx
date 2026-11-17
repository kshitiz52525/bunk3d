import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { color } from '@bunk3d/ui';
import { Icon } from '@bunk3d/ui/native';
import { F } from './parts';

/** Message input with a labelled Send button. Left slot is optional (e.g. send a photo). */
export function Composer({ placeholder, onSend, left, disabled }: { placeholder: string; onSend: (text: string) => Promise<void> | void; left?: React.ReactNode; disabled?: boolean }) {
  const [draft, setDraft] = useState('');
  async function send() {
    const t = draft.trim();
    if (!t || disabled) return;
    setDraft('');
    await onSend(t);
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.bg }}>
      {left}
      <TextInput accessibilityLabel="Message" value={draft} onChangeText={setDraft} onSubmitEditing={send} placeholder={placeholder} placeholderTextColor={color.inkMuted} returnKeyType="send" style={{ flex: 1, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, color: color.ink, fontFamily: F.body, fontSize: 15 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Send" accessibilityState={{ disabled: !draft.trim() || disabled }} disabled={!draft.trim() || disabled} onPress={send} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: draft.trim() && !disabled ? color.lime : color.line }}>
        <Icon name="arrowUp" size={20} color={draft.trim() && !disabled ? color.onLime : color.inkMuted} />
      </Pressable>
    </View>
  );
}
