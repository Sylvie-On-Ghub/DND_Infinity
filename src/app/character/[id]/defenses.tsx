import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Page } from "@/components/Page";
import { getSheet } from "@/lib/api/characters";
import { pretty } from "@/lib/format";

// Walking first, then the rest in this order; unknown types go last.
const SPEED_ORDER = ["walk", "fly", "swim", "climb", "burrow"];
const SPEED_LABEL: Record<string, string> = { walk: "Walking" };

export default function DefensesPage() {
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

  const rank = (k: string) => {
    const i = SPEED_ORDER.indexOf(k);
    return i === -1 ? SPEED_ORDER.length : i;
  };
  const speeds = Object.entries(sheet.speeds ?? {})
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));

  return (
    <Page>
      <View style={{ gap: 8 }}>
        <Text style={s.section}>Speed</Text>
        <View style={[s.box, s.speedRow]}>
          {speeds.length === 0 && <Text style={s.muted}>None</Text>}
          {speeds.map(([k, v]) => (
            <View key={k} style={s.speed}>
              <Text style={s.speedValue}>{v}ft</Text>
              <Text style={s.speedLabel}>{SPEED_LABEL[k] ?? pretty(k)}</Text>
            </View>
          ))}
        </View>
      </View>

      <DamageList title="Resistances" items={sheet.resistances} />
      {/* The API calls these vulnerabilities. */}
      <DamageList title="Weaknesses" items={sheet.vulnerabilities} />
      <DamageList title="Immunities" items={sheet.immunities} />
    </Page>
  );
}

function DamageList({ title, items = [] }: { title: string; items?: string[] }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.section}>{title}</Text>
      <View style={[s.box, s.chips]}>
        {items.length === 0 && <Text style={s.muted}>None</Text>}
        {items.map((x) => (
          <View key={x} style={s.chip}>
            <Text style={{ fontSize: 15, fontWeight: "600" }}>{pretty(x)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 24, fontWeight: "600" },
  box: { borderWidth: 1, borderColor: "#999", borderRadius: 12, padding: 10 },
  muted: { color: "#777" },
  speedRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  speed: {
    minWidth: 90,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "white",
  },
  speedValue: { fontSize: 22, fontWeight: "700" },
  speedLabel: { fontSize: 13, color: "#555" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "white",
  },
});
