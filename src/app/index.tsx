import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { createCharacter, listCharacters } from "@/lib/api/characters";
import { C } from "@/lib/colors";

export default function Index() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data, error, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["characters"],
    queryFn: listCharacters,
  });

  const create = useMutation({
    mutationFn: createCharacter,
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, padding: 16, paddingTop: 60 }}>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>Characters</Text>

      <View style={{ flexDirection: "row", gap: 8, marginVertical: 12 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New character name"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 8,
            paddingHorizontal: 12,
          }}
        />
        <Pressable
          disabled={!name.trim() || create.isPending}
          onPress={() => create.mutate(name.trim())}
          style={{
            backgroundColor: !name.trim() || create.isPending ? C.accentMuted : C.accent,
            paddingHorizontal: 16,
            justifyContent: "center",
            borderRadius: 8,
          }}
        >
          <Text style={{ color: C.onAccent, fontWeight: "600" }}>
            {create.isPending ? "…" : "Create"}
          </Text>
        </Pressable>
      </View>

      {create.error && (
        <Text style={{ color: C.danger }}>{create.error.message}</Text>
      )}
      {error && (
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: C.danger, marginVertical: 8 }}>
            {error.message} (tap to retry)
          </Text>
        </Pressable>
      )}

      <FlatList
        data={data}
        keyExtractor={(c) => c.id!}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={<Text>No characters yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/character/[id]", params: { id: item.id! } })
            }
            style={{ paddingVertical: 12 }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600" }}>{item.name}</Text>
            <Text style={{ color: C.muted }}>
              Level {item.level ?? 0}
              {item.class_ids?.length ? ` · ${item.class_ids.join(", ")}` : ""}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}