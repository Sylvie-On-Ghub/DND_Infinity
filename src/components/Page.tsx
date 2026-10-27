import type { ReactNode } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Page({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      showsVerticalScrollIndicator
      persistentScrollbar // Android: keep the scrollbar visible instead of fading
      contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}