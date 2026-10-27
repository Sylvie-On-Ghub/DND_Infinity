import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Modal, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { levelUp, listContent } from "@/lib/api/characters";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { C } from "@/lib/colors";

export function LevelUpModal({
  id,
  visible,
  onClose,
}: {
  id: string;
  visible: boolean;
  onClose: () => void;
}) {
  const classes = useQuery({
    queryKey: ["content", "classes"],
    queryFn: () => listContent("classes"),
    enabled: visible,
  });
  const action = useSheetAction(id);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 16, paddingTop: 60, backgroundColor: C.bg }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Level up in…</Text>

        {classes.isLoading && <ActivityIndicator style={{ marginTop: 24 }} />}
        {classes.error && (
          <Text style={{ color: C.danger }}>{classes.error.message}</Text>
        )}
        {action.error && (
          <Text style={{ color: C.danger }}>{action.error.message}</Text>
        )}

        <FlatList
          data={classes.data}
          keyExtractor={(c) => c.id!}
          renderItem={({ item }) => (
            <Pressable
              disabled={action.isPending}
              onPress={() =>
                action.mutate(() => levelUp(id, item.id!), {
                  onSuccess: onClose,
                })
              }
              style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: C.divider,
                opacity: action.isPending ? 0.4 : 1,
              }}
            >
              <Text style={{ fontSize: 18 }}>{item.name ?? item.id}</Text>
            </Pressable>
          )}
        />

        <Pressable onPress={onClose} style={{ padding: 16, alignItems: "center" }}>
          <Text style={{ color: C.accent, fontWeight: "600" }}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}