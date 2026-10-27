import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Page } from "@/components/Page";
import { getCharacter, setDetails } from "@/lib/api/characters";
import type { Character } from "@/lib/api/client";
import { useCharacterPatch } from "@/lib/api/useCharacterPatch";

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
  const character = charQ.data;

  if (!character) {
    return charQ.error ? (
      <Text style={{ padding: 16, color: "#b71c1c" }}>{charQ.error.message}</Text>
    ) : (
      <ActivityIndicator style={{ flex: 1 }} />
    );
  }

  const details = character.details ?? {};
  return (
    <Page>
      {SECTIONS.map((sec) => (
        <DetailsSection
          // Reset the draft whenever the saved values change.
          key={sec.title + JSON.stringify(sec.fields.map((f) => details[f.key] ?? ""))}
          id={id}
          details={details}
          {...sec}
        />
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
        <Text style={{ fontSize: 16, color: value ? "#000" : "#999" }}>{value || "None"}</Text>
        <Text style={{ fontSize: 16 }}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      {open && (
        <View style={s.menu}>
          {items.map((o) => (
            <Pressable
              key={o || "__none"}
              onPress={() => pick(o)}
              style={{ padding: 12, backgroundColor: o === value ? "#e8f0fe" : "transparent" }}
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
      style={{ backgroundColor: "#1565c0", opacity: disabled ? 0.4 : 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: "center" }}
    >
      <Text style={{ color: "white", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 24, fontWeight: "600" },
  sub: { fontSize: 14, fontWeight: "600", color: "#555" },
  box: { borderWidth: 1, borderColor: "#999", borderRadius: 12, padding: 10, gap: 4 },
  muted: { color: "#777", fontSize: 13 },
  err: { color: "#b71c1c" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, backgroundColor: "white" },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: "white" },
  menu: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginTop: 4, backgroundColor: "white" },
});
