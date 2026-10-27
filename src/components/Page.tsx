import type { ReactNode } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/lib/colors";

export function Page({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      showsVerticalScrollIndicator
      style={{ backgroundColor: C.bg }}
      persistentScrollbar // Android: keep the scrollbar visible instead of fading
      contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}