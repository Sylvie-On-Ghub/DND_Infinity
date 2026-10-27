import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Page } from "@/components/Page";
import { getSheet } from "@/lib/api/characters";
import { pretty, signed } from "@/lib/format";

type Level = "none" | "half" | "trained" | "expert";
const UNKNOWN = { letter: "?", bg: "#ffe0b2", fg: "#e65100" };

const LEVELS: Record<Level, { letter: string; bg: string; fg: string }> = {
  none: { letter: "U", bg: "#eceff1", fg: "#78909c" },
  half: { letter: "H", bg: "#e1f5fe", fg: "#0277bd" },
  trained: { letter: "T", bg: "#1565c0", fg: "white" },
  expert: { letter: "E", bg: "#f9a825", fg: "#3e2723" },
  
};

const list = (xs?: string[]) =>
  xs && xs.length ? xs.map(pretty).join(", ") : "None";

export default function SkillsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: sheet, error, isLoading } = useQuery({
    queryKey: ["sheet", id],
    queryFn: () => getSheet(id),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (error || !sheet) {
    return (
      <Text style={{ padding: 16, color: "#b71c1c" }}>
        {error?.message ?? "No sheet returned"}
      </Text>
    );
  }

  const skills = Object.entries(sheet.skills ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const tools = Object.entries(sheet.tools ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <Page>
      {/* Prof bonus + armour/weapon proficiencies */}
      <View style={{ flexDirection: "row", gap: 12, alignItems: "stretch" }}>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={s.label}>Prof Bonus</Text>
          <View style={s.profBox}>
            <Text style={{ fontSize: 24, fontWeight: "700" }}>
              {signed(sheet.proficiency_bonus)}
            </Text>
          </View>
        </View>

        <View style={[s.box, { flex: 1, gap: 8 }]}>
          <View>
            <Text style={s.label}>Armour</Text>
            <Text style={s.profText}>{list(sheet.armour_profs)}</Text>
          </View>
          <View>
            <Text style={s.label}>Weapon</Text>
            <Text style={s.profText}>{list(sheet.weapon_profs)}</Text>
          </View>
        </View>
      </View>

      {/* Skills */}
      <View style={{ gap: 6 }}>
        <Text style={s.section}>Skills</Text>
        <Text style={s.legend}>U untrained · H half · T trained · E expert</Text>
        <View style={s.box}>
          <HeaderRow />
          {skills.map(([key, sk]) => (
            <Row
              key={key}
              name={pretty(key)}
              ability={sk.ability}
              level={sk.level}
              bonus={sk.bonus}
              advantage={sk.advantage}
              disadvantage={sk.disadvantage}
            />
          ))}
          {skills.length === 0 && <Text style={s.empty}>None</Text>}
        </View>
      </View>

      {/* Tools */}
      <View style={{ gap: 6 }}>
        <Text style={s.section}>Tools</Text>
        <View style={s.box}>
          <HeaderRow />
          {tools.map(([key, t]) => (
            <Row
              key={key}
              name={pretty(key)}
              level={t.level}
              bonus={t.prof_bonus}
            />
          ))}
          {tools.length === 0 && <Text style={s.empty}>None</Text>}
        </View>
      </View>
    </Page>
  );
}

function HeaderRow() {
  return (
    <View style={[s.row, { borderBottomWidth: 1, borderColor: "#999" }]}>
      <Text style={[s.head, { flex: 3.2 }]}>Name</Text>
      <Text style={[s.head, { flex: 1.1 }]}>Ability</Text>
      <Text style={[s.head, { flex: 1, textAlign: "center" }]}>Prof.</Text>
      <Text style={[s.head, { flex: 1, textAlign: "right" }]}>Bonus</Text>
    </View>
  );
}

function Row({
  name,
  ability,
  level,
  bonus,
  advantage,
  disadvantage,
}: {
  name: string;
  ability?: string;
  level?: string;
  bonus?: number;
  advantage?: boolean;
  disadvantage?: boolean;
}) {
  const lv = LEVELS[(level || "none") as Level] ?? UNKNOWN;
  const strong = level === "trained" || level === "expert";
  return (
    <View style={s.row}>
      <Text style={[s.cell, { flex: 3.2, fontWeight: strong ? "700" : "400" }]}>
        {name}
        {advantage && <Text style={{ color: "#2e7d32" }}> ▲</Text>}
        {disadvantage && <Text style={{ color: "#c62828" }}> ▼</Text>}
      </Text>
      <Text style={[s.cell, { flex: 1.1, color: "#555" }]}>
        {ability ? ability.toUpperCase() : ""}
      </Text>
      <View style={{ flex: 1, alignItems: "center" }}>
        <View style={[s.badge, { backgroundColor: lv.bg }]}>
          <Text style={{ color: lv.fg, fontWeight: "700", fontSize: 12 }}>
            {lv.letter}
          </Text>
        </View>
      </View>
      <Text style={[s.cell, { flex: 1, textAlign: "right", fontWeight: "700" }]}>
        {signed(bonus)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 24, fontWeight: "600" },
  legend: { fontSize: 12, color: "#777" },
  label: { fontSize: 12, color: "#777", fontWeight: "600" },
  box: { borderWidth: 1, borderColor: "#999", borderRadius: 12, padding: 10 },
  profBox: { width: 64, height: 64, borderWidth: 1, borderColor: "#999", borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  profText: { fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  head: { fontSize: 12, color: "#777", fontWeight: "700" },
  cell: { fontSize: 15 },
  badge: { width: 26, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  empty: { color: "#777", paddingVertical: 6 },
});