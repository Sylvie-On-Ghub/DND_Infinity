import { useQuery } from "@tanstack/react-query";
import { Modal, Pressable, Switch, Text, View } from "react-native";
import { getCharacter, getSheet } from "@/lib/api/characters";
import type { ACOption } from "@/lib/api/client";
import { useCharacterPatch } from "@/lib/api/useCharacterPatch";

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
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", paddingTop: 110, paddingHorizontal: 24 }}
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: "white", borderRadius: 12, padding: 16, gap: 12 }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Armour class</Text>
          <Text style={{ fontSize: 28, fontWeight: "700" }}>
            {sheet?.ac ?? "–"}
            {!!detail?.formula && (
              <Text style={{ fontSize: 14, fontWeight: "400", color: "#555" }}>
                {"  "}
                {detail.formula}
                {detail.bonus ? ` ${detail.bonus > 0 ? "+" : ""}${detail.bonus}` : ""}
              </Text>
            )}
          </Text>

          {spellOptions.length === 0 ? (
            <Text style={{ color: "#777" }}>No spells that set your AC.</Text>
          ) : (
            spellOptions.map((o) => {
              const on = override === o.id;
              return (
                <View key={o.id} style={{ gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600" }}>{o.name ?? o.id}</Text>
                      <Text style={{ color: "#777", fontSize: 12 }}>AC {o.value ?? "–"} while active</Text>
                    </View>
                    <Switch
                      value={on}
                      disabled={patch.isPending}
                      onValueChange={(v) => toggle(o, v)}
                    />
                  </View>
                  {o.eligible === false && !!o.reason && (
                    <Text style={{ color: "#e65100", fontSize: 12 }}>{o.reason}</Text>
                  )}
                </View>
              );
            })
          )}

          <Text style={{ color: "#777", fontSize: 12 }}>
            {"Turn a spell on while it's active. The sheet can't tell when it ends, so turn it off again yourself."}
          </Text>

          {patch.error && <Text style={{ color: "#b71c1c" }}>{patch.error.message}</Text>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
