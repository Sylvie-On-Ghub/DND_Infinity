import { api, unwrap } from "./client";
import type { AddItemRequest, Character, CoinsAction, EntryPatch } from "./client";

export const listCharacters = async () =>
  unwrap(await api.GET("/api/characters"));

export const getSheet = async (id: string) =>
  unwrap(
    await api.GET("/api/characters/{id}/sheet", {
      params: { path: { id } },
    })
  );

export const createCharacter = async (name: string) =>
  unwrap(
    await api.POST("/api/characters", {
      body: { name },
    })
  );

export const damage = async (id: string, amount: number) =>
  unwrap(
    await api.POST("/api/characters/{id}/hp", {
      params: { path: { id } },
      body: { damage: amount },
    })
  );

  export const getCharacter = async (id: string) =>
  unwrap(
    await api.GET("/api/characters/{id}", {
      params: { path: { id } },
    })
  );

export const heal = async (id: string, amount: number) =>
  unwrap(
    await api.POST("/api/characters/{id}/hp", {
      params: { path: { id } },
      body: { heal: amount },
    })
  );

export const rest = async (id: string, type: "short" | "long") =>
  unwrap(
    await api.POST("/api/characters/{id}/rest", {
      params: { path: { id } },
      body: { type },
    })
  );

  export const listContent = async (kind: string) =>
  unwrap(
    await api.GET("/api/content/{kind}", {
      params: { path: { kind } },
    })
  );

// The definition is untyped in the spec, so callers cast to the fields they read.
export const getContent = async (kind: string, contentId: string) =>
  unwrap(
    await api.GET("/api/content/{kind}/{id}", {
      params: { path: { kind, id: contentId } },
    })
  );
  
export const levelUp = async (
  id: string,
  classId: string,
  method: "average" | "max" | "roll" = "average"
) =>
  unwrap(
    await api.POST("/api/characters/{id}/level-up", {
      params: { path: { id } },
      body: { class_id: classId, hp: { method } },
    })
  );

export const getChoiceOptions = async (
  id: string,
  featureId: string,
  choiceId: string
) =>
  unwrap(
    await api.GET("/api/characters/{id}/choice-options", {
      params: {
        path: { id },
        query: { feature_id: featureId, choice_id: choiceId },
      },
    })
  );

export const makeSelection = async (
  id: string,
  featureId: string,
  choiceId: string,
  picked: string[]
) =>
  unwrap(
    await api.POST("/api/characters/{id}/selections", {
      params: { path: { id } },
      body: { feature_id: featureId, choice_id: choiceId, picked },
    })
  );

export const setTempHp = async (id: string, amount: number) =>
  unwrap(
    await api.POST("/api/characters/{id}/hp", {
      params: { path: { id } },
      body: { temp: amount },
    })
  );

export const patchCharacter = async (id: string, body: Character) =>
  unwrap(
    await api.PATCH("/api/characters/{id}", {
      params: { path: { id } },
      body,
    })
  );

// A merge-patch body for the portrait. null clears it, which the generated
// Character type can't express, hence the cast.
export const setPortrait = (url: string | null) =>
  ({ portrait_url: url }) as unknown as Character;

export const setHp = async (id: string, value: number) =>
  unwrap(
    await api.POST("/api/characters/{id}/hp", {
      params: { path: { id } },
      body: { set: value },
    })
  );

export const makeAllocation = async (
  id: string,
  featureId: string,
  choiceId: string,
  allocated: Record<string, number>
) =>
  unwrap(
    await api.POST("/api/characters/{id}/selections", {
      params: { path: { id } },
      body: { feature_id: featureId, choice_id: choiceId, allocated },
    })
  );

export const removeSelection = async (
  id: string,
  featureId: string,
  choiceId: string
) =>
  unwrap(
    await api.DELETE("/api/characters/{id}/selections", {
      params: {
        path: { id },
        query: { feature_id: featureId, choice_id: choiceId },
      },
    })
  );

export const spendSlot = async (id: string, level: number, pact = false) =>
  unwrap(
    await api.POST("/api/characters/{id}/spell-slots", {
      params: { path: { id } },
      body: pact ? { pact: true, spend: 1 } : { level, spend: 1 },
    })
  );

export const restoreSlot = async (id: string, level: number, pact = false) =>
  unwrap(
    await api.POST("/api/characters/{id}/spell-slots", {
      params: { path: { id } },
      body: pact ? { pact: true, restore: 1 } : { level, restore: 1 },
    })
  );

export const spendResource = async (id: string, featureId: string) =>
  unwrap(
    await api.POST("/api/characters/{id}/resources/{featureId}", {
      params: { path: { id, featureId } },
      body: { spend: 1 },
    })
  );

export const restoreResource = async (id: string, featureId: string) =>
  unwrap(
    await api.POST("/api/characters/{id}/resources/{featureId}", {
      params: { path: { id, featureId } },
      body: { restore: 1 },
    })
  );

export const getRuleset = async () => unwrap(await api.GET("/api/ruleset"));

// The item definition is an untyped object in the spec, so type just what we read.
export type ItemDef = {
  container?: { capacity?: number; ignores_contents_weight?: boolean };
};
export const getItemDef = async (itemId: string) =>
  unwrap(
    await api.GET("/api/content/{kind}/{id}", {
      params: { path: { kind: "items", id: itemId } },
    })
  ) as unknown as ItemDef;

export const addItem = async (id: string, body: AddItemRequest) =>
  unwrap(
    await api.POST("/api/characters/{id}/inventory", {
      params: { path: { id } },
      body,
    })
  );

export const patchEntry = async (id: string, entryId: string, body: EntryPatch) =>
  unwrap(
    await api.PATCH("/api/characters/{id}/inventory/{entryId}", {
      params: { path: { id, entryId } },
      body,
    })
  );

export const removeEntry = async (id: string, entryId: string, deleteContents = false) =>
  unwrap(
    await api.DELETE("/api/characters/{id}/inventory/{entryId}", {
      params: {
        path: { id, entryId },
        query: { contents: deleteContents ? "delete" : undefined },
      },
    })
  );

export const moveEntry = async (id: string, entryId: string, container: string) =>
  unwrap(
    await api.POST("/api/characters/{id}/inventory/{entryId}/move", {
      params: { path: { id, entryId } },
      body: { container },
    })
  );

export const changeQuantity = async (id: string, entryId: string, delta: number) =>
  unwrap(
    await api.POST("/api/characters/{id}/inventory/{entryId}/quantity", {
      params: { path: { id, entryId } },
      body: { delta },
    })
  );

export const changeCoins = async (id: string, body: CoinsAction) =>
  unwrap(
    await api.POST("/api/characters/{id}/coins", {
      params: { path: { id } },
      body,
    })
  );
