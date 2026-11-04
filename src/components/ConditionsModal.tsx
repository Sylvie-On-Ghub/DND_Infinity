import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { changeConditions } from "@/lib/api/characters";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { C } from "@/lib/colors";
import { pretty } from "@/lib/format";

// The standard conditions, with a short reminder of each. The backend applies poisoned,
// frightened and blinded to the sheet; the rest are recorded for the table to apply.
const CONDITIONS: { id: string; rule: string }[] = [
  { id: "blinded", rule: "Can't see. Attacks against you have advantage; yours have disadvantage." },
  { id: "charmed", rule: "Can't attack the charmer, who has advantage on social checks with you." },
  { id: "deafened", rule: "Can't hear. Fails checks that need hearing." },
  { id: "frightened", rule: "Disadvantage on checks and attacks while the source is in sight." },
  { id: "grappled", rule: "Speed is 0." },
  { id: "incapacitated", rule: "Can't take actions or reactions." },
  { id: "invisible", rule: "Attacks against you have disadvantage; yours have advantage." },
  { id: "paralyzed", rule: "Incapacitated, can't move or speak. Fails Str and Dex saves." },
  { id: "petrified", rule: "Turned to stone. Incapacitated, resistant to all damage." },
  { id: "poisoned", rule: "Disadvantage on attack rolls and ability checks." },
  { id: "prone", rule: "Disadvantage on attacks. Melee attacks against you have advantage." },
  { id: "restrained", rule: "Speed 0. Disadvantage on attacks and Dex saves." },
  { id: "stunned", rule: "Incapacitated, can't move. Fails Str and Dex saves." },
  { id: "unconscious", rule: "Incapacitated and prone. Drops what it's holding." },
];
const AUTOMATED = ["poisoned", "frightened", "blinded"];
const MAX_EXHAUSTION = 6;

export function ConditionsModal({
  id,
  onClose,
  conditions,
  exhaustion,
}: {
  id: string;
  onClose: () => void;
  conditions: string[];
  exhaustion: number;
}) {
  const action = useSheetAction(id);
  const [custom, setCustom] = useState("");
  const busy = action.isPending;

  const toggle = (c: string) =>
    action.mutate(() => changeConditions(id, conditions.includes(c) ? { remove: [c] } : { add: [c] }));
  const setExhaustion = (n: number) => action.mutate(() => changeConditions(id, { exhaustion: n }));
  const addCustom = () => {
    const c = custom.trim().toLowerCase();
    if (!c) return;
    action.mutate(() => changeConditions(id, { add: [c] }), { onSuccess: () => setCustom("") });
  };

  const standard = CONDITIONS.map((c) => c.id);
  const others = conditions.filter((c) => !standard.includes(c));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop: tap outside to dismiss. */}
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: C.backdrop, paddingVertical: 80, paddingHorizontal: 20 }}
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: C.surface, borderRadius: 12, padding: 16, gap: 12, maxHeight: "100%" }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Conditions</Text>

          <ScrollView contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
            {CONDITIONS.map((c) => {
              const on = conditions.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  disabled={busy}
                  onPress={() => toggle(c.id)}
                  style={{
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: on ? C.accentSoft : C.fill,
                    borderWidth: 1,
                    borderColor: on ? C.accent : "transparent",
                    gap: 2,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: on ? "700" : "600" }}>
                    {on ? "✓ " : ""}
                    {pretty(c.id)}
                    {AUTOMATED.includes(c.id) && (
                      <Text style={{ color: C.muted, fontSize: 11, fontWeight: "400" }}> · applied to sheet</Text>
                    )}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{c.rule}</Text>
                </Pressable>
              );
            })}

            {/* Anything outside the standard list (from a spell, a homebrew effect…). */}
            {others.map((c) => (
              <Pressable
                key={c}
                disabled={busy}
                onPress={() => toggle(c)}
                style={{
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: C.accentSoft,
                  borderWidth: 1,
                  borderColor: C.accent,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700" }}>✓ {pretty(c)}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>Custom · tap to remove</Text>
              </Pressable>
            ))}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <TextInput
                value={custom}
                onChangeText={setCustom}
                onSubmitEditing={addCustom}
                placeholder="Other condition"
                returnKeyType="done"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 15,
                  backgroundColor: C.bg,
                }}
              />
              <Pressable
                disabled={busy || !custom.trim()}
                onPress={addCustom}
                style={{
                  backgroundColor: C.accent,
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  justifyContent: "center",
                  opacity: busy || !custom.trim() ? 0.4 : 1,
                }}
              >
                <Text style={{ color: C.onAccent, fontWeight: "700" }}>Add</Text>
              </Pressable>
            </View>

            <Text style={{ fontSize: 16, fontWeight: "700", marginTop: 8 }}>Exhaustion</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {Array.from({ length: MAX_EXHAUSTION + 1 }, (_, n) => {
                const on = n === exhaustion;
                return (
                  <Pressable
                    key={n}
                    disabled={busy || on}
                    onPress={() => setExhaustion(n)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: "center",
                      backgroundColor: on ? (n > 0 ? C.warning : C.accent) : C.fill,
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: on ? C.onAccent : C.text }}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              A long rest lowers exhaustion by 1. Its effects aren&apos;t applied to the sheet.
            </Text>
          </ScrollView>

          {action.error && <Text style={{ color: C.danger }}>{action.error.message}</Text>}

          <Pressable onPress={onClose} style={{ padding: 8, alignItems: "center" }}>
            <Text style={{ color: C.accent, fontWeight: "600" }}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
