import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { setPortrait } from "@/lib/api/characters";
import { useCharacterPatch } from "@/lib/api/useCharacterPatch";

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

  const trimmed = url.trim();
  const broken = brokenUrl === trimmed;
  const valid = /^https?:\/\/\S+$/i.test(trimmed);

  const close = () => {
    patch.reset();
    onClose();
  };
  const save = (value: string | null) =>
    patch.mutate(setPortrait(value), { onSuccess: close });

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
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Portrait</Text>

          {valid && (
            <View style={{ alignItems: "center" }}>
              {broken ? (
                <Text style={{ color: "#b71c1c" }}>Couldn’t load an image from that link.</Text>
              ) : (
                <Image
                  source={{ uri: trimmed }}
                  contentFit="cover"
                  onError={() => setBrokenUrl(trimmed)}
                  style={{ width: 120, height: 120, borderRadius: 16, backgroundColor: "#cfd8dc" }}
                />
              )}
            </View>
          )}

          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="Paste an image link (https://…)"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 }}
          />

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Action
              label="Save"
              color="#1565c0"
              disabled={!valid || trimmed === current || busy}
              onPress={() => save(trimmed)}
            />
            <Action
              label="Remove"
              color="#c62828"
              disabled={!current || busy}
              onPress={() => save(null)}
            />
          </View>

          <Text style={{ color: "#777", fontSize: 12 }}>
            Only the link is saved, so the image has to stay online at that address.
          </Text>

          {patch.error && <Text style={{ color: "#b71c1c" }}>{patch.error.message}</Text>}
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
