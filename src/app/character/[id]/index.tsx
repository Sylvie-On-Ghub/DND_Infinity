import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Page } from "@/components/Page";
import { getSheet } from "@/lib/api/characters";
import type { AbilityView, Modifier } from "@/lib/api/client";
import { C } from "@/lib/colors";

const ABILITIES = [
  ["str", "Str"],
  ["dex", "Dex"],
  ["con", "Con"],
  ["int", "Int"],
  ["wis", "Wis"],
  ["cha", "Cha"],
] as const;

const PASSIVES = [
  ["perception", "Passive Perception"],
  ["investigation", "Passive Investigation"],
  ["insight", "Passive Insight"],
] as const;

const signed = (n?: number) => (n === undefined ? "–" : n >= 0 ? `+${n}` : `${n}`);
const pretty = (s?: string) =>
  s ? s.replace(/[-_:]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

export default function AbilitiesPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: sheet, error, isLoading } = useQuery({
    queryKey: ["sheet", id],
    queryFn: () => getSheet(id),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (error || !sheet) {
    return (
      <Text style={{ padding: 16, color: C.danger }}>
        {error?.message ?? "No sheet returned"}
      </Text>
    );
  }

  const notes = sheet.notes ?? [];
  const senses = sheet.senses ?? [];

  return (
    <Page>
      {/* Ability grid */}
      <View style={s.grid}>
        {ABILITIES.map(([key, label]) => (
          <AbilityTile key={key} label={label} a={sheet.abilities?.[key]} />
        ))}
      </View>

      {/* Situational modifiers */}
      {notes.length > 0 && (
        <View style={s.box}>
          {notes.map((m, i) => (
            <NoteRow key={i} m={m} />
          ))}
        </View>
      )}

      {/* Passives */}
      <View style={{ gap: 8 }}>
        <Text style={s.section}>Passives</Text>
        <View style={[s.box, { gap: 8 }]}>
          {PASSIVES.map(([key, label]) => (
            <View key={key} style={s.passiveRow}>
              <View style={s.passiveValue}>
                <Text style={{ fontWeight: "700" }}>
                  {sheet.skills?.[key]?.passive ?? "–"}
                </Text>
              </View>
              <Text style={s.passiveLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Senses */}
      <View style={{ gap: 8 }}>
        <Text style={s.section}>Senses</Text>
        <View style={[s.box, { minHeight: 70 }]}>
          {senses.length === 0 && <Text style={{ color: C.muted }}>None</Text>}
          {senses.map((x, i) => (
            <Text key={i} style={{ fontSize: 16 }}>
              {pretty(x.name)}
              {x.range ? ` ${x.range}ft` : ""}
            </Text>
          ))}
        </View>
      </View>
    </Page>
  );
}

function AbilityTile({ label, a }: { label: string; a?: AbilityView }) {
  const prof = !!a?.save_proficient;
  return (
    <View style={s.tile}>
      <Text style={s.abilityLabel}>{label}</Text>
      <Text style={s.mod}>{signed(a?.mod)}</Text>
      <View style={s.score}>
        <Text style={{ fontWeight: "600" }}>{a?.score ?? "–"}</Text>
      </View>

      {/* Save box, overlapping the tile's right edge */}
      <View style={[s.save, prof ? s.saveProf : s.saveBase]}>
        <Text style={[s.saveLabel, prof && s.saveTextProf]}>SAVE</Text>
        <Text style={[s.saveValue, prof && s.saveTextProf]}>
          {prof ? "●" : "○"} {signed(a?.save_bonus)}
        </Text>
      </View>
    </View>
  );
}
function noteText(m: Modifier): string {
  const where = m.target ? ` on ${pretty(m.target).toLowerCase()}` : "";
  const cond = m.condition ? ` (${m.condition})` : "";
  if (m.note) return m.note + cond;
  switch (m.kind) {
    case "advantage":
      return `Advantage${where}${cond}`;
    case "disadvantage":
      return `Disadvantage${where}${cond}`;
    case "add":
      return `${signed(m.value)}${where}${cond}`;
    case "set":
      return `Set${where} to ${m.value}${cond}`;
    case "min":
      return `Minimum ${m.value}${where}${cond}`;
    case "multiply":
      return `×${m.value}${where}${cond}`;
    default:
      return `${pretty(m.kind)}${where}${cond}`;
  }
}

function NoteRow({ m }: { m: Modifier }) {
  const icon =
    m.kind === "advantage" ? { t: "▲", c: C.success }
    : m.kind === "disadvantage" ? { t: "▼", c: C.danger }
    : m.kind === "add" ? { t: (m.value ?? 0) >= 0 ? "+" : "−", c: C.accent }
    : { t: "•", c: C.textSecondary };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
      <View style={s.noteIcon}>
        <Text style={{ color: icon.c, fontWeight: "700" }}>{icon.t}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 14 }}>
        {noteText(m)}
        {!!m.source_id && (
          <Text style={{ color: C.muted }}> ({pretty(m.source_id)})</Text>
        )}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
grid: {
  backgroundColor: C.surface,
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  rowGap: 14,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 12,
  paddingVertical: 12,
  paddingLeft: 10,
  paddingRight: 22, // extra room so the right column's save boxes stay inside the frame
},
tile: {
  width: "29%",
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 10,
  paddingVertical: 6,
  paddingLeft: 6,
  paddingRight: 24, // keeps the modifier clear of the save box
  alignItems: "center",
  backgroundColor: C.surface,
  overflow: "visible",
},
abilityLabel: { fontSize: 14, fontWeight: "700", alignSelf: "flex-start" },
mod: { fontSize: 26, fontWeight: "700", marginVertical: 2 },

save: {
  position: "absolute",
  right: -14, // how far the box sticks out past the tile
  top: "50%",
  marginTop: -20, // half the box height, to center it vertically
  minWidth: 50,
  alignItems: "center",
  borderRadius: 8,
  borderWidth: 1.5,
  paddingHorizontal: 6,
  paddingVertical: 4,
  shadowColor: C.shadow,
  shadowOpacity: 0.15,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 2,
},
saveBase: { backgroundColor: C.surface, borderColor: C.border },
saveProf: { backgroundColor: C.accent, borderColor: C.accentDark },
saveLabel: { fontSize: 9, fontWeight: "700", color: C.muted, letterSpacing: 0.5 },
saveValue: { fontSize: 15, fontWeight: "700", color: C.text },
saveTextProf: { color: C.onAccent },
  score: { minWidth: 36, alignItems: "center", borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  box: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, backgroundColor: C.surface },
  section: { fontSize: 24, fontWeight: "600" },
  passiveRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 8 },
  passiveValue: { minWidth: 36, alignItems: "center", borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingVertical: 4 },
  passiveLabel: { flex: 1, textAlign: "center", fontSize: 16 },
  noteIcon: { width: 24, height: 24, borderWidth: 1, borderColor: C.border, borderRadius: 6, alignItems: "center", justifyContent: "center" },
});