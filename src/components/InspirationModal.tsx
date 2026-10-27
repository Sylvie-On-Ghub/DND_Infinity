import { useQuery } from "@tanstack/react-query";
import { Modal, Pressable, Text, View } from "react-native";
import { getRuleset } from "@/lib/api/characters";
import { useCharacterPatch } from "@/lib/api/useCharacterPatch";

export function InspirationModal({
  id,
  visible,
  onClose,
  current,
}: {
  id: string;
  visible: boolean;
  onClose: () => void;
  current: number;
}) {
  const patch = useCharacterPatch(id);
  const ruleset = useQuery({
    queryKey: ["ruleset"],
    queryFn: getRuleset,
    staleTime: Infinity,
  }).data;
  // 0 or missing means the ruleset sets no cap.
  const max = ruleset?.max_inspiration || undefined;
  const busy = patch.isPending;

  const close = () => {
    patch.reset();
    onClose();
  };
  const change = (d: number) => patch.mutate({ inspiration: current + d });

  const canLower = current > 0 && !busy;
  const canRaise = (max === undefined || current < max) && !busy;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {/* Backdrop: tap outside to dismiss. */}
      <Pressable
        onPress={close}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", paddingTop: 110, paddingHorizontal: 24 }}
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: "white", borderRadius: 12, padding: 16, gap: 12 }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Inspiration</Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Step label="−" disabled={!canLower} onPress={() => change(-1)} />
            <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 32, fontWeight: "700" }}>
                {current}
                {max !== undefined && <Text style={{ fontSize: 18, color: "#777" }}> / {max}</Text>}
              </Text>
              <Text style={{ fontSize: 18, color: "#1565c0" }}>
                {current > 0 ? "●".repeat(Math.min(current, 10)) : "–"}
              </Text>
            </View>
            <Step label="+" disabled={!canRaise} onPress={() => change(1)} />
          </View>

          {patch.error && <Text style={{ color: "#b71c1c" }}>{patch.error.message}</Text>}

          <Pressable onPress={close} style={{ padding: 8, alignItems: "center" }}>
            <Text style={{ color: "#1565c0", fontWeight: "600" }}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Step({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={{
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: "#e0e0e0",
        opacity: disabled ? 0.35 : 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
