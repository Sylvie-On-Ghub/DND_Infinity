import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { C } from "@/lib/colors";

export function ModalShell({
  title,
  onClose,
  scroll = true,
  children,
}: {
  title: string;
  onClose: () => void;
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, paddingTop: 60, backgroundColor: C.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ flex: 1, fontSize: 22, fontWeight: "700" }} numberOfLines={2}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ color: C.accent, fontWeight: "600", fontSize: 16 }}>Close</Text>
          </Pressable>
        </View>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, padding: 16, gap: 10 }}>{children}</View>
        )}
      </View>
    </Modal>
  );
}

export function Btn({
  label,
  onPress,
  disabled,
  color = C.accent,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ backgroundColor: color, opacity: disabled ? 0.4 : 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, alignItems: "center" }}
    >
      <Text style={{ color: C.onAccent, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: active ? C.accent : C.fill }}
    >
      <Text style={{ color: active ? C.surface : C.text, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export const ui = StyleSheet.create({
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: C.surface },
  label: { fontSize: 12, color: C.muted, fontWeight: "600" },
  muted: { color: C.muted, fontSize: 13 },
  err: { color: C.danger },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
