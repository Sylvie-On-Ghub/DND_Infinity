import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { Page } from "@/components/Page";
import { getCharacter, getSheet, setDetails } from "@/lib/api/characters";
import type { Character, Sheet } from "@/lib/api/client";
import { useCharacterPatch } from "@/lib/api/useCharacterPatch";
import { pretty } from "@/lib/format";
import { C } from "@/lib/colors";

type Details = NonNullable<Character["details"]>;
type Key = keyof Details;

type Field = { key: Key; label: string; placeholder?: string; long?: boolean; options?: string[] };

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];
const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

const SECTIONS: { title: string; note?: string; fields: Field[] }[] = [
  {
    title: "Identity",
    fields: [
      { key: "alignment", label: "Alignment", options: ALIGNMENTS },
      { key: "faith", label: "Faith", placeholder: "Deity or belief" },
      { key: "gender", label: "Gender" },
      { key: "age", label: "Age" },
    ],
  },
  {
    title: "Appearance",
    note: "Size here is descriptive only. The rules use your race's size.",
    fields: [
      { key: "size", label: "Size", options: SIZES },
      { key: "height", label: "Height", placeholder: "5'8\"" },
      { key: "weight", label: "Weight", placeholder: "150 lb" },
      { key: "eyes", label: "Eyes" },
      { key: "hair", label: "Hair" },
      { key: "skin", label: "Skin" },
      { key: "appearance", label: "Description", long: true, placeholder: "Scars, clothing, mannerisms…" },
    ],
  },
  {
    title: "Personality",
    fields: [
      { key: "personality_traits", label: "Personality traits", long: true },
      { key: "ideals", label: "Ideals", long: true },
      { key: "bonds", label: "Bonds", long: true },
      { key: "flaws", label: "Flaws", long: true },
    ],
  },
];

export default function CharacteristicsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const charQ = useQuery({ queryKey: ["character", id], queryFn: () => getCharacter(id) });
  const sheetQ = useQuery({ queryKey: ["sheet", id], queryFn: () => getSheet(id) });
  const character = charQ.data;
  const sheet = sheetQ.data;

  if (!character || !sheet) {
    const err = charQ.error ?? sheetQ.error;
    return err ? (
      <Text style={{ padding: 16, color: C.danger }}>{err.message}</Text>
    ) : (
      <ActivityIndicator style={{ flex: 1 }} />
    );
  }

  const details = character.details ?? {};
  return (
    <Page>
      {SECTIONS.map((sec, i) => (
        <View key={sec.title} style={{ gap: 20 }}>
          <DetailsSection
            // Reset the draft whenever the saved values change.
            key={JSON.stringify(sec.fields.map((f) => details[f.key] ?? ""))}
            id={id}
            details={details}
            {...sec}
          />
          {i === 0 && <LanguagesSection id={id} character={character} sheet={sheet} />}
        </View>
      ))}
    </Page>
  );
}

function DetailsSection({
  id,
  details,
  title,
  note,
  fields,
}: {
  id: string;
  details: Details;
  title: string;
  note?: string;
  fields: Field[];
}) {
  const patch = useCharacterPatch(id);
  const saved = (k: Key) => details[k] ?? "";
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, saved(f.key)]))
  );
  const set = (k: Key, v: string) => setDraft((p) => ({ ...p, [k]: v }));

  const changed = fields.filter((f) => draft[f.key].trim() !== saved(f.key));

  // Send only what changed; an emptied field is cleared with null.
  const save = () =>
    patch.mutate(
      setDetails(
        Object.fromEntries(changed.map((f) => [f.key, draft[f.key].trim() || null]))
      )
    );

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.section}>{title}</Text>
      <View style={s.box}>
        {note && <Text style={s.muted}>{note}</Text>}
        {fields.map((f) => (
          <View key={f.key} style={{ gap: 4, marginTop: 6 }}>
            <Text style={s.sub}>{f.label}</Text>
            {f.options ? (
              <Dropdown value={draft[f.key]} options={f.options} onChange={(v) => set(f.key, v)} />
            ) : (
              <TextInput
                value={draft[f.key]}
                onChangeText={(t) => set(f.key, t)}
                placeholder={f.placeholder}
                multiline={f.long}
                textAlignVertical={f.long ? "top" : "center"}
                style={[s.input, f.long && { minHeight: 80 }]}
              />
            )}
          </View>
        ))}
        <View style={{ marginTop: 12 }}>
          <Btn
            label={changed.length ? `Save ${changed.length} change(s)` : `Save ${title.toLowerCase()}`}
            disabled={!changed.length || patch.isPending}
            onPress={save}
          />
        </View>
        {patch.error && <Text style={s.err}>{patch.error.message}</Text>}
      </View>
    </View>
  );
}

// The sheet lists every language known: those granted by race, background and
// choices, plus the extras stored on the character. Only the extras can be removed here.
function LanguagesSection({ id, character, sheet }: { id: string; character: Character; sheet: Sheet }) {
  const patch = useCharacterPatch(id);
  const [draft, setDraft] = useState("");
  const extras = character.languages ?? [];
  const known = sheet.languages ?? [];
  const granted = known.filter((l) => !extras.includes(l));

  // Stored like the content ids ("deep_speech"), so they match granted languages.
  const newId = draft.trim().toLowerCase().replace(/\s+/g, "_");
  const duplicate = known.includes(newId) || extras.includes(newId);

  // `languages` is replaced whole, so send the full list.
  const add = () =>
    patch.mutate({ languages: [...extras, newId] }, { onSuccess: () => setDraft("") });
  const remove = (l: string) => patch.mutate({ languages: extras.filter((x) => x !== l) });

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.section}>Languages</Text>
      <View style={s.box}>
        <View style={[s.langs, { marginTop: 4 }]}>
          {known.length === 0 && extras.length === 0 && <Text style={s.muted}>None</Text>}
          {granted.map((l) => (
            <View key={l} style={s.lang}>
              <Text style={s.langText}>{pretty(l)}</Text>
            </View>
          ))}
          {extras.map((l) => (
            <Pressable
              key={l}
              onPress={() => remove(l)}
              disabled={patch.isPending}
              style={[s.lang, s.langExtra]}
              hitSlop={4}
            >
              <Text style={s.langText}>{pretty(l)}</Text>
              <Text style={{ color: C.danger, fontWeight: "700" }}>×</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[s.muted, { marginTop: 4 }]}>
          Languages from your race, background and choices are listed automatically. Tap × to remove
          one you added.
        </Text>
        <View style={[s.inline, { marginTop: 8 }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a language"
            autoCapitalize="words"
            onSubmitEditing={() => newId && !duplicate && add()}
            style={[s.input, { flex: 1 }]}
          />
          <Btn label="Add" disabled={!newId || duplicate || patch.isPending} onPress={add} />
        </View>
        {duplicate && <Text style={s.muted}>Already known.</Text>}
        {patch.error && <Text style={s.err}>{patch.error.message}</Text>}
      </View>
    </View>
  );
}

// Same look as the page picker: opens a list in place. "" means none.
function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Keep a saved value that isn't one of the options, so it isn't lost.
  const items = ["", ...options, ...(value && !options.includes(value) ? [value] : [])];
  const pick = (v: string) => {
    setOpen(false);
    onChange(v);
  };

  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} style={s.dropdown}>
        <Text style={{ fontSize: 16, color: value ? C.text : C.placeholder }}>{value || "None"}</Text>
        <Text style={{ fontSize: 16 }}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      {open && (
        <View style={s.menu}>
          {items.map((o) => (
            <Pressable
              key={o || "__none"}
              onPress={() => pick(o)}
              style={{ padding: 12, backgroundColor: o === value ? C.accentSoft : "transparent" }}
            >
              <Text style={{ fontSize: 16, fontWeight: o === value ? "700" : "400" }}>
                {o || "None"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function Btn({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ backgroundColor: C.accent, opacity: disabled ? 0.4 : 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: "center" }}
    >
      <Text style={{ color: C.onAccent, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 24, fontWeight: "600" },
  sub: { fontSize: 14, fontWeight: "600", color: C.textSecondary },
  box: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, backgroundColor: C.surface, gap: 4 },
  muted: { color: C.muted, fontSize: 13 },
  err: { color: C.danger },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, backgroundColor: C.surface },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: C.surface },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  langs: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  lang: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: C.surface },
  langExtra: { borderColor: C.accent, backgroundColor: C.accentSoft },
  langText: { fontSize: 15, fontWeight: "600" },
  menu: { borderWidth: 1, borderColor: C.border, borderRadius: 8, marginTop: 4, backgroundColor: C.surface },
});
