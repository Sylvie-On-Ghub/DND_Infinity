import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { CharacterHeader } from "@/components/CharacterHeader";
import { PageDropdown } from "@/components/PageDropdown";

export default function CharacterLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1 }}>
      <CharacterHeader id={id} />
      <PageDropdown id={id} />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </View>
  );
}