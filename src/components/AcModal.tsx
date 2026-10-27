import { useQuery } from "@tanstack/react-query";
import { Modal, Pressable, Switch, View } from "react-native";
import { Text } from "@/components/Text";
import { getCharacter, getSheet } from "@/lib/api/characters";
import type { ACOption } from "@/lib/api/client";
import { useCharacterPatch } from "@/lib/api/useCharacterPatch";
import { C } from "@/lib/colors";

export function AcModal({
  id,
  visible,
  onClose,
}: {
  id: string;
  visible: boolean;
  onClose: () => void;
}) {
  const patch = useCharacterPatch(id);
  const sheet = useQuery({ queryKey: ["sheet", id], queryFn: () => getSheet(id) }).data;
  const character = useQuery({ queryKey: ["character", id], queryFn: () => getCharacter(id) }).data;

  const detail = sheet?.ac_detail;
  const options = (detail?.options ?? []) as ACOption[];
  const spellOptions = options.filter((o) => o.from_spell);
  const override = character?.ac_formula_override;

  const close = () => {
    patch.reset();
    onClose();
  };

  // The PATCH is a JSON merge patch, so null removes the override and the sheet
  // goes back to the best normal formula.
  const toggle = (o: ACOption, on: boolean) =>
    patch.mutate({ ac_formula_override: on ? o.id : (null as unknown as string) });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        onPress={close}
        style={{ flex: 1, backgroundColor: C.backdrop, paddingTop: 110, paddingHorizontal: 24 }}
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: C.surface, borderRadius: 12, padding: 16, gap: 12 }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Armour class</Text>
          <Text style={{ fontSize: 28, fontWeight: "700" }}>
            {sheet?.ac ?? "–"}
            {!!detail?.formula && (
              <Text style={{ fontSize: 14, fontWeight: "400", color: C.textSecondary }}>
                {"  "}
                {detail.formula}
                {detail.bonus ? ` ${detail.bonus > 0 ? "+" : ""}${detail.bonus}` : ""}
              </Text>
            )}
          </Text>

          {spellOptions.length === 0 ? (
            <Text style={{ color: C.muted }}>No spells that set your AC.</Text>
          ) : (
            spellOptions.map((o) => {
              const on = override === o.id;
              return (
                <View key={o.id} style={{ gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600" }}>{o.name ?? o.id}</Text>
                      <Text style={{ color: C.muted, fontSize: 12 }}>AC {o.value ?? "–"} while active</Text>
                    </View>
                    <Switch trackColor={{ true: C.accent, false: C.fillStrong }}
                      value={on}
                      disabled={patch.isPending}
                      onValueChange={(v) => toggle(o, v)}
                    />
                  </View>
                  {o.eligible === false && !!o.reason && (
                    <Text style={{ color: C.warning, fontSize: 12 }}>{o.reason}</Text>
                  )}
                </View>
              );
            })
          )}

          <Text style={{ color: C.muted, fontSize: 12 }}>
            {"Turn a spell on while it's active. The sheet can't tell when it ends, so turn it off again yourself."}
          </Text>

          {patch.error && <Text style={{ color: C.danger }}>{patch.error.message}</Text>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
