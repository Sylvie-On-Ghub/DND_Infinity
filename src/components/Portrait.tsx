import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { C } from "@/lib/colors";

// The character's picture, or their initial if they have none or it won't load.
export function Portrait({ uri, name, size }: { uri?: string; name?: string; size: number }) {
  const [broken, setBroken] = useState<string>();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundColor: C.fillStrong,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {uri && uri !== broken ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={150}
          onError={() => setBroken(uri)}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Text style={{ fontSize: size * 0.44, fontWeight: "700", color: C.textSecondary }}>
          {name?.[0]?.toUpperCase() ?? "?"}
        </Text>
      )}
    </View>
  );
}
