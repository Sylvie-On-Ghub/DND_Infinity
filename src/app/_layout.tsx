import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { clearVersions } from "@/lib/api/versions";
import { restoreSession, useSessionStatus } from "@/lib/auth/session";
import { C } from "@/lib/colors";

export const unstable_settings = { initialRouteName: "index" };

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const session = useSessionStatus();

  useEffect(() => {
    restoreSession();
  }, []);

  // Don't leave one account's characters in the cache for the next sign-in.
  useEffect(() => {
    if (session === "signedOut") {
      queryClient.clear();
      clearVersions();
    }
  }, [session, queryClient]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        {session === "loading" ? (
          <ActivityIndicator style={{ flex: 1, backgroundColor: C.bg }} />
        ) : (
          <Stack screenOptions={{ contentStyle: { backgroundColor: C.bg } }}>
            <Stack.Protected guard={session === "signedIn"}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="character/[id]" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={session === "signedOut"}>
              <Stack.Screen name="login" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
