import type { InventoryView } from "@/lib/api/client";

// Tags vary a weapon or armour without a separate item: a +1 silvered longsword is a longsword with
// the tags "+1" and "silvered". The server applies them, so entry names, attacks and AC include them.

// Same rules as the server, so a bad tag is caught before it's sent.
const BONUS_TAG = /^\+[1-9][0-9]?$/;
const WORD_TAG = /^[a-z0-9][a-z0-9_ -]{0,31}$/;

export const BONUS_PRESETS = [1, 2, 3];
export const WORD_PRESETS = ["silvered"];

export const takesTags = (kind?: InventoryView["kind"]) =>
  kind === "weapon" || kind === "armour" || kind === "shield";

export const bonusOf = (tags: string[]) => {
  const tag = tags.find((t) => BONUS_TAG.test(t));
  return tag ? Number(tag.slice(1)) : 0;
};

export const wordsOf = (tags: string[]) => tags.filter((t) => !BONUS_TAG.test(t));

// An entry can only have one +X, so this replaces any it already has.
export const withBonus = (tags: string[], bonus: number) =>
  bonus ? [`+${bonus}`, ...wordsOf(tags)] : wordsOf(tags);

export const toggleWord = (tags: string[], word: string) =>
  tags.includes(word) ? tags.filter((t) => t !== word) : [...tags, word];

// What the user typed added to the tags, or null if it isn't a valid tag.
export const addTypedTag = (tags: string[], typed: string) => {
  const tag = typed.trim().toLowerCase();
  if (BONUS_TAG.test(tag)) return withBonus(tags, Number(tag.slice(1)));
  if (!WORD_TAG.test(tag)) return null;
  return tags.includes(tag) ? tags : [...tags, tag];
};

export const bonusEffect = (kind: InventoryView["kind"], bonus: number) =>
  kind === "weapon" ? `+${bonus} to hit and damage` : `+${bonus} to AC while equipped`;
