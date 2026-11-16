import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { changeForms } from "@/lib/api/characters";
import type { FormView, Sheet } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { C } from "@/lib/colors";

type Picks = Record<string, string[]>;

// Shape forms (Wild Shape) carry their limits on the view; the backend tells them apart the same way.
export const isShapeForm = (f: FormView) => !!f.max_cr;

// Temporary forms such as Rage, Bladesong or Wild Shape. Starting one spends a use of its resource
// (unless it has none) and may ask for picks, or for a beast; a long rest ends them all.
export function FormsModal({
  id,
  onClose,
  forms,
  shape,
}: {
  id: string;
  onClose: () => void;
  forms: FormView[];
  shape?: Sheet["shape"];
}) {
  const action = useSheetAction(id);
  const busy = action.isPending;
  // The form whose picks (or beast) are being chosen, before starting it or changing them.
  const [selecting, setSelecting] = useState<string | null>(null);
  const [picks, setPicks] = useState<Picks>({});
  const [creature, setCreature] = useState<string | undefined>();

  const done = { onSuccess: () => setSelecting(null) };
  const start = (f: FormView, free = false) =>
    action.mutate(
      () => changeForms(id, { start: { id: f.id, picks, free, creature_id: isShapeForm(f) ? creature : undefined } }),
      done
    );
  const end = (f: FormView) => action.mutate(() => changeForms(id, { end: f.id }));
  // The API has no edit for picks: end the form and start it again for free with the new ones.
  const repick = (f: FormView) =>
    action.mutate(async () => {
      await changeForms(id, { end: f.id });
      return changeForms(id, { start: { id: f.id, picks, free: true } });
    }, done);

  const open = (f: FormView) => {
    action.reset();
    setSelecting(f.id!);
    setPicks(f.picks ?? {});
    setCreature(f.active && shape?.form_id === f.id ? shape?.creature_id : undefined);
  };
  const toggle = (choiceId: string, optionId: string, count: number) =>
    setPicks((p) => {
      const cur = p[choiceId] ?? [];
      if (cur.includes(optionId)) return { ...p, [choiceId]: cur.filter((x) => x !== optionId) };
      if (count === 1) return { ...p, [choiceId]: [optionId] };
      return cur.length >= count ? p : { ...p, [choiceId]: [...cur, optionId] };
    });
  const pickKnownForms = () => {
    onClose();
    router.push({ pathname: "/character/[id]/edit", params: { id } });
  };

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
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Forms</Text>

          <ScrollView contentContainerStyle={{ gap: 6 }}>
            {forms.map((f) => {
              const on = !!f.active;
              const isShape = isShapeForm(f);
              const beast = on && isShape && shape?.form_id === f.id ? shape : undefined;
              const known = f.known_forms ?? [];
              const choices = f.choices ?? [];
              const costs = !!f.resource_id;
              const left = f.uses_left ?? 0;
              const outOfUses = costs && left <= 0;
              const isSelecting = selecting === f.id;
              const ready =
                choices.every(
                  (ch) => (picks[ch.id!] ?? []).length >= Math.min(ch.count ?? 1, ch.options?.length ?? 0)
                ) &&
                (!isShape || (!!creature && (!on || creature !== beast?.creature_id || !!choices.length)));
              const pickedNames = choices.flatMap((ch) =>
                (f.picks?.[ch.id!] ?? []).map((o) => ch.options?.find((x) => x.id === o)?.name ?? o)
              );

              const onPress = () => {
                if (on) end(f);
                // Picks or a beast to choose, or no uses left so only a free start is possible.
                else if (choices.length || isShape || outOfUses) open(f);
                else start(f);
              };

              return (
                <View
                  key={f.id}
                  style={{
                    borderRadius: 10,
                    backgroundColor: on ? C.accentSoft : C.fill,
                    borderWidth: 1,
                    borderColor: on ? C.accent : "transparent",
                    overflow: "hidden",
                  }}
                >
                  <Pressable
                    disabled={busy || isSelecting}
                    onPress={onPress}
                    style={{ paddingVertical: 8, paddingHorizontal: 12, gap: 2 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: on ? "700" : "600", flex: 1 }}>
                        {on ? "✓ " : ""}
                        {f.name}
                        {beast?.name ? `: ${beast.name}` : ""}
                      </Text>
                      <Text style={{ fontSize: 12, color: outOfUses ? C.danger : C.muted }}>
                        {costs ? `${left} ${left === 1 ? "use" : "uses"} left` : "Free"}
                      </Text>
                    </View>
                    {isShape && (
                      <Text style={{ color: C.textSecondary, fontSize: 12 }}>
                        {[
                          `Max CR ${f.max_cr}`,
                          f.fly_allowed ? "flying allowed" : "no flying",
                          f.temp_hp ? `+${f.temp_hp} temp HP` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    )}
                    {on && pickedNames.length > 0 && (
                      <Text style={{ color: C.textSecondary, fontSize: 12 }}>{pickedNames.join(" · ")}</Text>
                    )}
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      {on
                        ? "Active · tap to end"
                        : outOfUses
                          ? "No uses left · tap to start free"
                          : "Tap to start"}
                    </Text>
                  </Pressable>

                  {/* The beast's own traits, and what it can't do. */}
                  {beast && !isSelecting && (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 6, gap: 4 }}>
                      <Text style={{ color: C.muted, fontSize: 12 }}>
                        {[beast.size && `${beast.size}`, beast.cr && `CR ${beast.cr}`, !beast.can_cast && "can't cast spells"]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                      {beast.traits?.map((t) => (
                        <Text key={t.name} style={{ fontSize: 12 }}>
                          <Text style={{ fontWeight: "700" }}>{t.name}. </Text>
                          {t.description}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Changing picks restarts the form without spending a use; changing beast may spend one. */}
                  {on && (choices.length > 0 || isShape) && !isSelecting && (
                    <Pressable
                      disabled={busy}
                      onPress={() => open(f)}
                      style={{ paddingHorizontal: 12, paddingBottom: 8 }}
                    >
                      <Text style={{ color: C.accent, fontSize: 13, fontWeight: "600" }}>
                        {isShape ? "Change beast" : "Change picks"}
                      </Text>
                    </Pressable>
                  )}

                  {isSelecting && (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 8 }}>
                      {isShape && (
                        <View style={{ gap: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: "600" }}>Choose a Known Form</Text>
                          {known.length === 0 && (
                            <Pressable onPress={pickKnownForms}>
                              <Text style={{ color: C.muted, fontSize: 12 }}>
                                You haven&apos;t learned any forms yet.{" "}
                                <Text style={{ color: C.accent, fontWeight: "600" }}>Pick them under Edit › Choices</Text>
                              </Text>
                            </Pressable>
                          )}
                          {known.map((o) => (
                            <Option
                              key={o.id}
                              label={`${o.name ?? o.id}${o.cr ? ` · CR ${o.cr}` : ""}`}
                              reason={o.eligible ? undefined : o.reason}
                              selected={creature === o.id}
                              disabled={busy || !o.eligible}
                              onPress={() => setCreature(creature === o.id ? undefined : o.id)}
                            />
                          ))}
                        </View>
                      )}

                      {choices.map((ch) => (
                        <View key={ch.id} style={{ gap: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: "600" }}>
                            {ch.prompt}
                            {(ch.count ?? 1) > 1 && (
                              <Text style={{ color: C.muted, fontWeight: "400" }}> · pick {ch.count}</Text>
                            )}
                          </Text>
                          {ch.options?.map((o) => (
                            <Option
                              key={o.id}
                              label={o.name ?? o.id ?? ""}
                              selected={(picks[ch.id!] ?? []).includes(o.id!)}
                              disabled={busy}
                              onPress={() => toggle(ch.id!, o.id!, ch.count ?? 1)}
                            />
                          ))}
                        </View>
                      ))}

                      <SelectButtons
                        busy={busy}
                        ready={ready}
                        // A new beast is a new use of the form; new picks alone are free.
                        spends={costs && (!on || isShape)}
                        outOfUses={outOfUses}
                        label={on ? (isShape ? "Change" : "Save") : "Start"}
                        onCancel={() => setSelecting(null)}
                        onFree={() => start(f, true)}
                        onConfirm={() => (on && !isShape ? repick(f) : start(f))}
                      />
                    </View>
                  )}
                </View>
              );
            })}

            <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
              Ending a form doesn&apos;t refund its use. A long rest ends every form.
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

function Option({
  label,
  reason,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  reason?: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: selected ? C.accentSoft : C.surface,
        borderWidth: 1,
        borderColor: selected ? C.accent : C.border,
        opacity: reason ? 0.5 : 1,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: selected ? "700" : "400" }}>
        {selected ? "✓ " : ""}
        {label}
      </Text>
      {!!reason && <Text style={{ color: C.danger, fontSize: 12 }}>{reason}</Text>}
    </Pressable>
  );
}

function SelectButtons({
  busy,
  ready,
  spends,
  outOfUses,
  label,
  onCancel,
  onFree,
  onConfirm,
}: {
  busy: boolean;
  ready: boolean;
  spends: boolean;
  outOfUses: boolean;
  label: string;
  onCancel: () => void;
  onFree: () => void;
  onConfirm: () => void;
}) {
  const blocked = busy || !ready || (spends && outOfUses);
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <Pressable onPress={onCancel} style={{ padding: 8 }}>
        <Text style={{ color: C.muted, fontWeight: "600" }}>Cancel</Text>
      </Pressable>
      <View style={{ flex: 1 }} />
      {spends && (
        <Pressable
          disabled={busy || !ready}
          onPress={onFree}
          style={{ padding: 8, opacity: busy || !ready ? 0.4 : 1 }}
        >
          <Text style={{ color: C.accent, fontWeight: "600" }}>{label} free</Text>
        </Pressable>
      )}
      <Pressable
        disabled={blocked}
        onPress={onConfirm}
        style={{
          backgroundColor: C.accent,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
          opacity: blocked ? 0.4 : 1,
        }}
      >
        <Text style={{ color: C.onAccent, fontWeight: "700" }}>{label}</Text>
      </Pressable>
    </View>
  );
}
