import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { damage, heal, setTempHp } from "@/lib/api/characters";
import { useSheetAction } from "@/lib/api/useSheetAction";

export function HpModal({
  id,
  visible,
  onClose,
  current,
  max,
  temp,
}: {
  id: string;
  visible: boolean;
  onClose: () => void;
  current: number;
  max: number;
  temp: number;
}) {
  const action = useSheetAction(id);
  const [amount, setAmount] = useState("");
  const n = parseInt(amount, 10);
  const valid = Number.isInteger(n) && n >= 0;
  const busy = action.isPending;

  const close = () => {
    setAmount("");
    action.reset();
    onClose();
  };
  const run = (fn: () => ReturnType<typeof damage>) =>
    action.mutate(fn, { onSuccess: close });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {/* Backdrop: tap outside to dismiss. Card sits near the top so the keyboard won't cover it. */}
      <Pressable
        onPress={close}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", paddingTop: 110, paddingHorizontal: 24 }}
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: "white", borderRadius: 12, padding: 16, gap: 12 }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Hit points</Text>
          <Text style={{ fontSize: 28, fontWeight: "700" }}>
            {current} / {max}
            {temp > 0 && (
              <Text style={{ fontSize: 16, color: "#1565c0" }}>{"  "}+{temp} temp</Text>
            )}
          </Text>

          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="Amount"
            autoFocus
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              padding: 12,
              fontSize: 18,
              textAlign: "center",
            }}
          />

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Action
              label="Damage"
              color="#c62828"
              disabled={!valid || n === 0 || busy}
              onPress={() => run(() => damage(id, n))}
            />
            <Action
              label="Heal"
              color="#2e7d32"
              disabled={!valid || n === 0 || busy}
              onPress={() => run(() => heal(id, n))}
            />
            <Action
              label="Set temp"
              color="#1565c0"
              disabled={!valid || busy}
              onPress={() => run(() => setTempHp(id, n))}
            />
          </View>

          <Text style={{ color: "#777", fontSize: 12 }}>
            Damage hits temp HP first. Set temp replaces the current temp HP
            rather than adding to it, and 0 clears it.
          </Text>

          {action.error && (
            <Text style={{ color: "#b71c1c" }}>{action.error.message}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Action({
  label,
  color,
  disabled,
  onPress,
}: {
  label: string;
  color: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        backgroundColor: color,
        opacity: disabled ? 0.4 : 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "white", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}