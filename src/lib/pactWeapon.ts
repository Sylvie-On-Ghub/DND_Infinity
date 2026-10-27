import { addItem, patchEntry, removeEntry } from "@/lib/api/characters";
import type { ActionResponse, Character, InventoryView, Sheet } from "@/lib/api/client";

// Marks entries we conjured, so ending the bond deletes them instead of just unbonding.
export const CONJURED_NOTE = "Conjured pact weapon";

// The engine doesn't tie the bond to the invocation, so the front end gates it.
export const hasPactOfTheBlade = (sheet?: Sheet, character?: Character) =>
  !!sheet?.actions?.some((a) => a.name === "Conjure Pact Weapon") ||
  !!character?.selections?.some((s) => s.picked?.includes("pact_of_the_blade"));

// The sheet's inventory view doesn't carry the bond flags; the stored character does.
export const bondedEntryId = (character?: Character) =>
  character?.inventory?.find((e) => e.proficient && e.ability_override === "cha")?.id;

export const isConjured = (entry?: InventoryView) => entry?.notes === CONJURED_NOTE;

// PATCH is a merge patch, so null clears a field.
const unbond = (id: string, entryId: string) =>
  patchEntry(id, entryId, {
    proficient: null as unknown as boolean,
    ability_override: null as unknown as string,
  });

export const endBond = (id: string, entry: InventoryView) =>
  isConjured(entry) ? removeEntry(id, entry.entry_id!) : unbond(id, entry.entry_id!);

const bond = (id: string, entryId: string) =>
  patchEntry(id, entryId, { equipped: true, proficient: true, ability_override: "cha" });

// Re-casting on another weapon ends the bond on the previous one first.
async function endPrevious(id: string, previous?: InventoryView, keep?: string) {
  if (previous?.entry_id && previous.entry_id !== keep) await endBond(id, previous);
}

export async function bondExisting(
  id: string,
  entryId: string,
  previous?: InventoryView
): Promise<ActionResponse> {
  await endPrevious(id, previous, entryId);
  return bond(id, entryId);
}

export async function conjure(
  id: string,
  itemId: string,
  previous?: InventoryView
): Promise<ActionResponse> {
  await endPrevious(id, previous);
  // new_stack so it doesn't merge into a normal copy of the same weapon.
  const added = await addItem(id, { item_id: itemId, new_stack: true, notes: CONJURED_NOTE });
  return bond(id, added.entry_id!);
}
