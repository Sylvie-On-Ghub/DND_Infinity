import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { getChoiceOptions, makeSelection } from "@/lib/api/characters";
import type { PendingChoice } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";

// The API only reports eligibility. Flip this to let homebrew/DM rulings through.
const ALLOW_INELIGIBLE = false;

export function ChoicePicker({
  id,
  choice,
  onClose,
}: {
  id: string;
  choice: PendingChoice;
  onClose: () => void;
}) {
  const options = useQuery({
    queryKey: ["choice-options", id, choice.feature_id, choice.choice_id],
    queryFn: () => getChoiceOptions(id, choice.feature_id!, choice.choice_id!),
  });
  const action = useSheetAction(id);
  const [picked, setPicked] = useState<string[]>([]);
  const max = choice.remaining ?? 1;

  const toggle = (optionId: string) =>
    setPicked((p) => {
      if (p.includes(optionId)) return p.filter((x) => x !== optionId);
      if (max === 1) return [optionId];
      return p.length >= max ? p : [...p, optionId];
    });

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 16, paddingTop: 60 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>{choice.prompt}</Text>
        <Text style={{ color: "#777", marginBottom: 8 }}>
          Pick {max} · selected {picked.length}
        </Text>

        {options.isLoading && <ActivityIndicator style={{ marginTop: 24 }} />}
        {options.error && (
          <Text style={{ color: "#b71c1c" }}>{options.error.message}</Text>
        )}
        {action.error && (
          <Text style={{ color: "#b71c1c" }}>{action.error.message}</Text>
        )}

        <FlatList
          data={options.data}
          keyExtractor={(o) => o.option_id!}
          renderItem={({ item }) => {
            const selected = picked.includes(item.option_id!);
            const blocked = !item.eligible && !ALLOW_INELIGIBLE;
            return (
              <Pressable
                disabled={blocked}
                onPress={() => toggle(item.option_id!)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderBottomWidth: 1,
                  borderColor: "#eee",
                  backgroundColor: selected ? "#e8f0fe" : "transparent",
                  opacity: blocked ? 0.4 : 1,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: selected ? "700" : "400" }}>
                  {selected ? "✓ " : ""}
                  {item.name ?? item.option_id}
                </Text>
                {!item.eligible && !!item.reason && (
                  <Text style={{ color: "#b71c1c", fontSize: 13 }}>
                    {item.reason}
                  </Text>
                )}
              </Pressable>
            );
          }}
        />

        <Pressable
          disabled={picked.length === 0 || action.isPending}
          onPress={() =>
            action.mutate(
              () => makeSelection(id, choice.feature_id!, choice.choice_id!, picked),
              { onSuccess: onClose }
            )
          }
          style={{
            backgroundColor: "#1565c0",
            opacity: picked.length === 0 || action.isPending ? 0.4 : 1,
            padding: 14,
            borderRadius: 8,
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            Confirm ({picked.length}/{max})
          </Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ padding: 16, alignItems: "center" }}>
          <Text style={{ color: "#1565c0", fontWeight: "600" }}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}