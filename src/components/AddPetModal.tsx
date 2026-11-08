import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { addPet, getSheet } from "@/lib/api/characters";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { C } from "@/lib/colors";
import { pretty } from "@/lib/format";

// Pick one of the character's pet sources and a creature it allows, then add it as a pet.
export function AddPetModal({
  id,
  onClose,
  onAdded,
}: {
  id: string;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const action = useSheetAction(id);
  const sheet = useQuery({ queryKey: ["sheet", id], queryFn: () => getSheet(id) }).data;
  const sources = sheet?.pet_sources ?? [];

  const [sourceId, setSourceId] = useState(sources[0]?.source_id);
  const source = sources.find((x) => x.source_id === sourceId) ?? sources[0];
  const [creatureId, setCreatureId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const creatures = source?.creatures ?? [];
  const chosen = creatures.find((cr) => cr.id === creatureId);

  const pickSource = (sid?: string) => {
    setSourceId(sid);
    setCreatureId(null);
  };
  const submit = () => {
    if (!chosen || !source) return;
    action.mutate(
      () =>
        addPet(id, {
          creature_id: chosen.id!,
          source_id: source.source_id,
          name: name.trim() || undefined,
        }),
      {
        onSuccess: () => {
          onClose();
          onAdded?.();
        },
      }
    );
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 16, paddingTop: 60, gap: 12, backgroundColor: C.bg }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>Add pet</Text>

        <Text style={{ fontSize: 14, fontWeight: "600", color: C.textSecondary }}>Granted by</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {sources.map((x) => (
              <Chip
                key={x.source_id}
                label={x.name ?? pretty(x.source_id)}
                on={x.source_id === source?.source_id}
                onPress={() => pickSource(x.source_id)}
              />
            ))}
          </View>
        </ScrollView>
        {!!source?.active && (
          <Text style={{ color: C.warning, fontSize: 13 }}>
            {source.name} already has {source.active} active{" "}
            {source.active === 1 ? "pet" : "pets"}. You may want to dismiss one first.
          </Text>
        )}

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={chosen ? `Name (default: ${chosen.name})` : "Name (optional)"}
          style={{
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            backgroundColor: C.surface,
          }}
        />

        {creatures.length === 0 && (
          <Text style={{ color: C.muted }}>The loaded content has no creatures for this.</Text>
        )}
        <FlatList
          data={creatures}
          keyExtractor={(x) => x.id!}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setCreatureId(item.id!)}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderBottomWidth: 1,
                borderColor: C.divider,
                backgroundColor: item.id === creatureId ? C.accentSoft : "transparent",
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: item.id === creatureId ? "700" : "400" }}>
                {item.name ?? pretty(item.id)}
              </Text>
            </Pressable>
          )}
        />

        {action.error && <Text style={{ color: C.danger }}>{action.error.message}</Text>}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onClose}
            style={{ flex: 1, backgroundColor: C.fillStrong, paddingVertical: 12, borderRadius: 8, alignItems: "center" }}
          >
            <Text style={{ fontWeight: "700" }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={!chosen || action.isPending}
            style={{
              flex: 1,
              backgroundColor: C.accent,
              opacity: !chosen || action.isPending ? 0.4 : 1,
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: C.onAccent, fontWeight: "700" }}>Add</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: on ? C.accent : C.border,
        backgroundColor: on ? C.accentSoft : C.surface,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text style={{ fontWeight: on ? "700" : "400" }}>{label}</Text>
    </Pressable>
  );
}
