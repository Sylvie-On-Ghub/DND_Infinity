import Constants from "expo-constants";
import createClient from "openapi-fetch";
import { Platform } from "react-native";
import type { components, paths } from "./schema";

/**
 * The backend runs on the same machine as the dev server, so reuse whatever
 * host the app was loaded from (LAN IP, Tailscale IP, MagicDNS name...).
 * Set EXPO_PUBLIC_API_URL to override.
 */
function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const port = process.env.EXPO_PUBLIC_API_PORT ?? "8080";
  const host =
    Platform.OS === "web"
      ? globalThis.location?.hostname
      : Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host || "localhost"}:${port}`;
}

const baseUrl = resolveBaseUrl();

export const api = createClient<paths>({ baseUrl });

// Handy aliases so screens don't import from `components` directly.
export type Character = components["schemas"]["Character"];
export type CharacterSummary = components["schemas"]["CharacterSummary"];
export type Sheet = components["schemas"]["Sheet"];
export type ApiError = components["schemas"]["ErrorResponse"];
export type ActionResponse = components["schemas"]["ActionResponse"];
export type PendingChoice = components["schemas"]["PendingChoice"];
export type EligibleOption = components["schemas"]["EligibleOption"];
export type AbilityView = components["schemas"]["AbilityView"];
export type Modifier = components["schemas"]["Modifier"];
export type Selection = components["schemas"]["Selection"];
export type AttackView = components["schemas"]["AttackView"];
export type SheetAction = components["schemas"]["Action"];
export type SpellSourceView = components["schemas"]["SpellSourceView"];
export type SpellView = components["schemas"]["SpellView"];
export type SpellEffectView = components["schemas"]["SpellEffectView"];
export type SlotView = components["schemas"]["SlotView"];
export type InventoryView = components["schemas"]["InventoryView"];
export type AddItemRequest = components["schemas"]["AddItemRequest"];
export type EntryPatch = components["schemas"]["EntryPatch"];
export type CoinsAction = components["schemas"]["CoinsAction"];
export type ACOption = components["schemas"]["ACOption"];
export type ResourceView = components["schemas"]["ResourceView"];
export type FeatureView = NonNullable<Sheet["features"]>[number];

/**
 * openapi-fetch returns { data, error } instead of throwing.
 * This unwraps it so TanStack Query can handle failures normally.
 */
export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (result.error !== undefined || result.data === undefined) {
    const err = result.error as ApiError | undefined;
    throw new Error(
      err?.error?.message ?? `HTTP ${result.response.status}`
    );
  }
  return result.data;
}