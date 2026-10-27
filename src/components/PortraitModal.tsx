import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { setPortrait } from "@/lib/api/characters";
import { useCharacterPatch } from "@/lib/api/useCharacterPatch";
import { C } from "@/lib/colors";
import { listPortraits } from "@/lib/portraits";

export function PortraitModal({
  id,
  visible,
  onClose,
  current,
}: {
  id: string;
  visible: boolean;
  onClose: () => void;
  current?: string;
}) {
  const patch = useCharacterPatch(id);
  const [url, setUrl] = useState(current ?? "");
  // The link that failed to load, so editing the text clears the error.
  const [brokenUrl, setBrokenUrl] = useState<string>();
  const busy = patch.isPending;
  // Cached for an hour to stay well inside GitHub's unauthenticated rate limit.
  const options = useQuery({
    queryKey: ["portraits"],
    queryFn: listPortraits,
    staleTime: 60 * 60 * 1000,
  });

  const trimmed = url.trim();
  const broken = brokenUrl === trimmed;
  const valid = /^https?:\/\/\S+$/i.test(trimmed);
  const fromRepo = options.data?.some((o) => o.url === trimmed);

  const close = () => {
    patch.reset();
    onClose();
  };
  const save = (value: string | null) => patch.mutate(setPortrait(value), { onSuccess: close });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {/* Backdrop: tap outside to dismiss. Card sits near the top so the keyboard won't cover it. */}
      <Pressable
        onPress={close}
        style={{
          flex: 1,
          backgroundColor: C.backdrop,
          paddingTop: 110,
          paddingHorizontal: 24,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: C.surface,
            borderRadius: 12,
            maxHeight: "85%",
          }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ fontSize: 20, fontWeight: "700" }}>Portrait</Text>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: C.textSecondary }}>
                Choose a picture
              </Text>
              {/* Skips the hour-long cache, for pictures just added to the repo. */}
              <Pressable
                onPress={() => options.refetch()}
                disabled={options.isFetching}
                hitSlop={8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 14,
                  backgroundColor: C.fill,
                  opacity: options.isFetching ? 0.6 : 1,
                }}
              >
                {options.isFetching && !options.isLoading ? (
                  <ActivityIndicator size="small" color={C.accent} />
                ) : (
                  <Text style={{ color: C.accent, fontWeight: "700" }}>↻</Text>
                )}
                <Text style={{ color: C.accent, fontSize: 13, fontWeight: "600" }}>Refresh</Text>
              </Pressable>
            </View>
            {options.isLoading && <ActivityIndicator color={C.accent} />}
            {options.error && <Text style={{ color: C.danger }}>{options.error.message}</Text>}
            {options.data?.length === 0 && (
              <Text style={{ color: C.muted }}>No pictures in the repo yet.</Text>
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {options.data?.map((o) => {
                const on = o.url === trimmed;
                return (
                  <Pressable
                    key={o.url}
                    onPress={() => setUrl(o.url)}
                    accessibilityLabel={o.name}
                    style={{
                      width: "31%",
                      aspectRatio: 1,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: on ? C.accent : "transparent",
                      overflow: "hidden",
                      backgroundColor: C.fillStrong,
                    }}
                  >
                    <Image
                      source={{ uri: o.url }}
                      contentFit="cover"
                      transition={150}
                      style={{ flex: 1 }}
                    />
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: C.textSecondary,
              }}
            >
              Or paste a link
            </Text>

            {valid && !fromRepo && (
              <View style={{ alignItems: "center" }}>
                {broken ? (
                  <Text style={{ color: C.danger }}>Couldn’t load an image from that link.</Text>
                ) : (
                  <Image
                    source={{ uri: trimmed }}
                    contentFit="cover"
                    onError={() => setBrokenUrl(trimmed)}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 16,
                      backgroundColor: C.fillStrong,
                    }}
                  />
                )}
              </View>
            )}

            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="Paste an image link (https://…)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
              }}
            />

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Action
                label="Save"
                color={C.accent}
                disabled={!valid || trimmed === current || busy}
                onPress={() => save(trimmed)}
              />
              <Action
                label="Remove"
                color={C.danger}
                disabled={!current || busy}
                onPress={() => save(null)}
              />
            </View>

            <Text style={{ color: C.muted, fontSize: 12 }}>
              Only the link is saved, so the image has to stay online at that address.
            </Text>

            {patch.error && <Text style={{ color: C.danger }}>{patch.error.message}</Text>}
          </ScrollView>
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
      <Text style={{ color: C.onAccent, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
