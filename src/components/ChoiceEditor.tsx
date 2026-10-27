import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import {
  getChoiceOptions,
  makeAllocation,
  makeSelection,
  removeSelection,
} from "@/lib/api/characters";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { pretty } from "@/lib/format";
import { C } from "@/lib/colors";

const ABILITY_IDS = ["str", "dex", "con", "int", "wis", "cha"];
const ALLOW_INELIGIBLE = false; // flip to let homebrew/DM rulings through

type Mode = "pick" | "allocate";

export function ChoiceEditor({
  id,
  featureId,
  choiceId,
  title,
  expected,
  initialPicked,
  initialAllocated,
  onClose,
}: {
  id: string;
  featureId: string;
  choiceId: string;
  title: string;
  expected?: number;
  initialPicked?: string[];
  initialAllocated?: Record<string, number>;
  onClose: () => void;
}) {
  const editing = !!initialPicked || !!initialAllocated;

  const options = useQuery({
    queryKey: ["choice-options", id, featureId, choiceId],
    queryFn: () => getChoiceOptions(id, featureId, choiceId),
  });
  const action = useSheetAction(id);

  const [picked, setPicked] = useState<string[]>(initialPicked ?? []);
  const [alloc, setAlloc] = useState<Record<string, number>>(initialAllocated ?? {});
  const [forced, setForced] = useState<Mode | null>(
    initialAllocated ? "allocate" : initialPicked ? "pick" : null
  );

  const looksLikeAbilities =
    !!options.data?.length &&
    options.data.every((o) => ABILITY_IDS.includes(o.option_id ?? ""));
  const mode: Mode = forced ?? (looksLikeAbilities ? "allocate" : "pick");

  const total =
    mode === "allocate"
      ? Object.values(alloc).reduce((a, b) => a + b, 0)
      : picked.length;

  const toggle = (oid: string) =>
    setPicked((p) =>
      p.includes(oid)
        ? p.filter((x) => x !== oid)
        : expected === 1
        ? [oid]
        : [...p, oid]
    );
  const bump = (oid: string, delta: number) =>
    setAlloc((a) => ({ ...a, [oid]: Math.max(0, (a[oid] ?? 0) + delta) }));

  const save = () =>
    action.mutate(
      () =>
        mode === "allocate"
          ? makeAllocation(
              id,
              featureId,
              choiceId,
              Object.fromEntries(Object.entries(alloc).filter(([, v]) => v > 0))
            )
          : makeSelection(id, featureId, choiceId, picked),
      { onSuccess: onClose }
    );

  const remove = () =>
    action.mutate(() => removeSelection(id, featureId, choiceId), {
      onSuccess: onClose,
    });

  const mismatch = expected !== undefined && total !== expected;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 16, paddingTop: 60, backgroundColor: C.bg }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>{title}</Text>

        <View style={{ flexDirection: "row", gap: 8, marginVertical: 8 }}>
          {(["pick", "allocate"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setForced(m)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: mode === m ? C.accent : C.fill,
              }}
            >
              <Text style={{ color: mode === m ? C.surface : C.text, fontWeight: "600" }}>
                {m === "pick" ? "Pick" : "Allocate points"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ color: mismatch ? C.warning : C.muted, marginBottom: 8 }}>
          {mode === "allocate" ? "Points" : "Selected"}: {total}
          {expected !== undefined ? ` (expected ${expected})` : ""}
          {mismatch ? " · the API accepts this but will add a warning" : ""}
        </Text>

        {options.isLoading && <ActivityIndicator style={{ marginTop: 24 }} />}
        {options.error && <Text style={{ color: C.danger }}>{options.error.message}</Text>}
        {action.error && <Text style={{ color: C.danger }}>{action.error.message}</Text>}

        <FlatList
          data={options.data}
          keyExtractor={(o) => o.option_id!}
          renderItem={({ item }) => {
            const oid = item.option_id!;
            const label = item.name ?? pretty(oid);
            const blocked = !item.eligible && !ALLOW_INELIGIBLE;

            if (mode === "allocate") {
              return (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderColor: C.divider,
                    opacity: blocked ? 0.4 : 1,
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 17 }}>{label}</Text>
                  <Step label="−" disabled={blocked} onPress={() => bump(oid, -1)} />
                  <Text style={{ width: 36, textAlign: "center", fontWeight: "700", fontSize: 17 }}>
                    {alloc[oid] ?? 0}
                  </Text>
                  <Step label="+" disabled={blocked} onPress={() => bump(oid, 1)} />
                </View>
              );
            }

            const selected = picked.includes(oid);
            return (
              <Pressable
                disabled={blocked}
                onPress={() => toggle(oid)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderBottomWidth: 1,
                  borderColor: C.divider,
                  backgroundColor: selected ? C.accentSoft : "transparent",
                  opacity: blocked ? 0.4 : 1,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: selected ? "700" : "400" }}>
                  {selected ? "✓ " : ""}
                  {label}
                </Text>
                {!item.eligible && !!item.reason && (
                  <Text style={{ color: C.danger, fontSize: 13 }}>{item.reason}</Text>
                )}
              </Pressable>
            );
          }}
        />

        <Pressable
          disabled={action.isPending}
          onPress={save}
          style={{ backgroundColor: C.accent, opacity: action.isPending ? 0.4 : 1, padding: 14, borderRadius: 8, alignItems: "center", marginTop: 8 }}
        >
          <Text style={{ color: C.onAccent, fontWeight: "700" }}>Save</Text>
        </Pressable>
        {editing && (
          <Pressable disabled={action.isPending} onPress={remove} style={{ padding: 14, alignItems: "center" }}>
            <Text style={{ color: C.danger, fontWeight: "600" }}>Remove this choice</Text>
          </Pressable>
        )}
        <Pressable onPress={onClose} style={{ padding: 14, alignItems: "center" }}>
          <Text style={{ color: C.accent, fontWeight: "600" }}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function Step({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: C.fill, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ fontSize: 20, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}