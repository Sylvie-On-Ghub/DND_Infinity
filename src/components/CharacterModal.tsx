import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { deleteCharacter } from "@/lib/api/characters";
import { useCharacterPatch } from "@/lib/api/useCharacterPatch";
import { C } from "@/lib/colors";

const CONFIRM_WORD = "delete";

// Rename the character, or delete it once they've typed the confirm word.
export function CharacterModal({
  id,
  onClose,
  name,
}: {
  id: string;
  onClose: () => void;
  name: string;
}) {
  const queryClient = useQueryClient();
  const patch = useCharacterPatch(id);
  const [draft, setDraft] = useState(name);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  const remove = useMutation({
    mutationFn: () => deleteCharacter(id),
    onSuccess: () => {
      // Leave first, so the screens don't refetch a character that's gone.
      router.dismissTo("/");
      queryClient.removeQueries({ queryKey: ["character", id] });
      queryClient.removeQueries({ queryKey: ["sheet", id] });
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });

  const trimmed = draft.trim();
  const busy = patch.isPending || remove.isPending;
  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop: tap outside to dismiss. Card sits near the top so the keyboard won't cover it. */}
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: C.backdrop, paddingTop: 110, paddingHorizontal: 24 }}
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: C.surface, borderRadius: 12, maxHeight: "85%" }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {confirming ? (
              <>
                <Text style={{ fontSize: 20, fontWeight: "700" }}>Delete {name}?</Text>
                <Text style={{ color: C.textSecondary }}>
                  This deletes the character and everything on their sheet for good. It can’t be
                  undone.
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: C.textSecondary }}>
                  Type “{CONFIRM_WORD}” to confirm
                </Text>
                <TextInput
                  value={typed}
                  onChangeText={setTyped}
                  placeholder={CONFIRM_WORD}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  style={inputStyle}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Action
                    label="Cancel"
                    color={C.fillStrong}
                    disabled={remove.isPending}
                    onPress={() => {
                      setConfirming(false);
                      setTyped("");
                      remove.reset();
                    }}
                  />
                  <Action
                    label={remove.isPending ? "Deleting…" : "Delete"}
                    color={C.danger}
                    disabled={!confirmed || busy}
                    onPress={() => remove.mutate()}
                  />
                </View>
                {remove.error && <Text style={{ color: C.danger }}>{remove.error.message}</Text>}
              </>
            ) : (
              <>
                <Text style={{ fontSize: 20, fontWeight: "700" }}>Character</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: C.textSecondary }}>Name</Text>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Character name"
                  autoCorrect={false}
                  style={inputStyle}
                />
                <View style={{ flexDirection: "row" }}>
                  <Action
                    label={patch.isPending ? "Saving…" : "Save name"}
                    color={C.accent}
                    disabled={!trimmed || trimmed === name || busy}
                    onPress={() => patch.mutate({ name: trimmed }, { onSuccess: onClose })}
                  />
                </View>
                {patch.error && <Text style={{ color: C.danger }}>{patch.error.message}</Text>}

                <View style={{ height: 1, backgroundColor: C.divider, marginVertical: 4 }} />

                <View style={{ flexDirection: "row" }}>
                  <Action
                    label="Delete character"
                    color={C.dangerDark}
                    disabled={busy}
                    onPress={() => setConfirming(true)}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
} as const;

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
      <Text style={{ color: C.onAccent, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
