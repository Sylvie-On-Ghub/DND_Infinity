import { Modal, Pressable, Text } from "react-native";
import { rest } from "@/lib/api/characters";
import { useSheetAction } from "@/lib/api/useSheetAction";

export function RestModal({
  id,
  visible,
  onClose,
}: {
  id: string;
  visible: boolean;
  onClose: () => void;
}) {
  const action = useSheetAction(id);

  const close = () => {
    action.reset();
    onClose();
  };
  const take = (type: "short" | "long") =>
    action.mutate(() => rest(id, type), { onSuccess: close });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        onPress={close}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 24 }}
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: "white", borderRadius: 12, padding: 16, gap: 12 }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Take a rest</Text>

          <Choice
            title="Short rest"
            body="Pact slots and short-rest resources come back."
            disabled={action.isPending}
            onPress={() => take("short")}
          />
          <Choice
            title="Long rest"
            body="HP to max, temp HP cleared, all spell slots and long-rest resources back, half your hit dice back, death saves cleared, exhaustion down by 1."
            disabled={action.isPending}
            onPress={() => take("long")}
          />

          {action.error && (
            <Text style={{ color: "#b71c1c" }}>{action.error.message}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Choice({
  title,
  body,
  disabled,
  onPress,
}: {
  title: string;
  body: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderWidth: 1,
        borderColor: "#bbb",
        borderRadius: 8,
        padding: 12,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: "#555", marginTop: 2 }}>{body}</Text>
    </Pressable>
  );
}