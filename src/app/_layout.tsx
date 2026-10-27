import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";

export const unstable_settings = { initialRouteName: "index" };

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="character/[id]" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}