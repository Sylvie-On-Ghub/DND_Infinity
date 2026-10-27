import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from "react-native";
// Gesture-handler's ScrollView, so scrolling the chip row wins over the page-swipe gesture.
import { ScrollView } from "react-native-gesture-handler";
import { Text, TextInput } from "@/components/Text";
import { Page } from "@/components/Page";
import { getSheet, restoreSlot, spendSlot } from "@/lib/api/characters";
import type { Sheet, SpellEffectView, SpellSourceView, SpellView } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { damageText, levelLabel, pretty, shortRange, shortTime, signed } from "@/lib/format";
import { C } from "@/lib/colors";

export default function SpellsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sourceId, setSourceId] = useState<string | "all">("all");
  const [level, setLevel] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [upcast, setUpcast] = useState(false);

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

  const sources = sheet.spellcasting ?? [];

  if (sources.length === 0) {
    return (
      <Page>
        <Slots id={id} sheet={sheet} />
        <Text style={s.muted}>No spellcasting on this character.</Text>
      </Page>
    );
  }

  // Only class sources are filter options; feature spells show under "All".
  const classSources = sources.filter((x) => x.kind === "class");
  const picked = classSources.find((x) => x.id === sourceId);
  const selected = picked ? [picked] : sources;
  const showSource = selected.length > 1;

  const all = selected.flatMap((src) =>
    [...(src.cantrips ?? []), ...(src.spells ?? [])].map((sp) => ({ sp, src }))
  );
  const levels = [...new Set(all.map(({ sp }) => sp.level ?? 0))].sort((a, b) => a - b);
  const visible = all
    .filter(
      ({ sp }) =>
        (level === "all" || (sp.level ?? 0) === level) &&
        (sp.name ?? "").toLowerCase().includes(search.trim().toLowerCase())
    )
    .sort((a, b) => (a.sp.name ?? "").localeCompare(b.sp.name ?? ""));
  const groups = levels
    .map((lv) => ({ lv, list: visible.filter(({ sp }) => (sp.level ?? 0) === lv) }))
    .filter((g) => g.list.length > 0);

  // Only class casting stats are shown; feature spells still use their own numbers per row.
  const statSources = classSources.length ? classSources : selected;

  const modOf = (src: SpellSourceView) =>
    src.ability ? sheet.abilities?.[src.ability]?.mod : undefined;

  return (
    <Page>
      {sources.length > 1 && classSources.length > 0 && (
        <View style={s.chips}>
          <Chip label="All" active={!picked} onPress={() => setSourceId("all")} />
          {classSources.map((x) => (
            <Chip
              key={x.id}
              label={x.name ?? pretty(x.id)}
              active={picked?.id === x.id}
              onPress={() => setSourceId(x.id ?? "all")}
            />
          ))}
        </View>
      )}

      {/* Filter */}
      <View style={{ gap: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search spells"
          style={s.input}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Chip label="All" active={level === "all"} onPress={() => setLevel("all")} />
          {levels.map((lv) => (
            <Chip
              key={lv}
              label={levelLabel(lv)}
              active={level === lv}
              onPress={() => setLevel(lv)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Casting stats */}
      {statSources.length > 1 ? (
        <View style={s.box}>
          {statSources.map((src) => (
            <View key={src.id} style={s.row}>
              <Text style={[s.cell, { flex: 2, fontWeight: "600" }]}>{src.name ?? pretty(src.id)}</Text>
              <Text style={[s.cell, s.statCell]}>{signed(modOf(src))}</Text>
              <Text style={[s.cell, s.statCell]}>{signed(src.attack_bonus)} hit</Text>
              <Text style={[s.cell, s.statCell]}>DC {src.save_dc ?? "–"}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={s.stats}>
          <Stat label="Mod." value={signed(modOf(statSources[0]))} />
          <Stat label="Spell attack" value={signed(statSources[0].attack_bonus)} />
          <Stat
            label="Save DC"
            value={statSources[0].save_dc !== undefined ? String(statSources[0].save_dc) : "–"}
          />
        </View>
      )}

      <Slots id={id} sheet={sheet} />

      {/* Spell list */}
      <View style={s.box}>
        <View style={s.toggleRow}>
          <Text style={{ flex: 1, fontSize: 15 }}>Show upcast</Text>
          <Switch trackColor={{ true: C.accent, false: C.fillStrong }} value={upcast} onValueChange={setUpcast} />
        </View>

        <View style={s.row}>
          <Text style={[s.head, { flex: 2.3 }]}>Spell</Text>
          <Text style={[s.head, { flex: 0.8 }]}>Time</Text>
          <Text style={[s.head, { flex: 1.2 }]}>Range</Text>
          <Text style={[s.head, { flex: 1.1 }]}>Hit/DC</Text>
          <Text style={[s.head, { flex: 1.7 }]}>Effect</Text>
        </View>

        {groups.map((g) => (
          <View key={g.lv}>
            <Text style={s.levelHead}>{levelLabel(g.lv)}</Text>
            {g.list.map(({ sp, src }) => (
              <SpellRow
                key={`${src.id}:${sp.id}`}
                sp={sp}
                src={src}
                upcast={upcast}
                showSource={showSource}
              />
            ))}
          </View>
        ))}
        {groups.length === 0 && <Text style={s.muted}>No spells match.</Text>}
      </View>
    </Page>
  );
}

/* ---------- Spell rows ---------- */

function effectText(e: SpellEffectView) {
  const main = e.dice ? damageText(e.dice, e.bonus) : e.bonus ? signed(e.bonus) : "";
  const text = [main, e.damage_type ? pretty(e.damage_type) : ""].filter(Boolean).join(" ");
  return text || e.note || pretty(e.kind);
}

function SpellRow({
  sp,
  src,
  upcast,
  showSource,
}: {
  sp: SpellView;
  src: SpellSourceView;
  upcast: boolean;
  showSource: boolean;
}) {
  const [open, setOpen] = useState(false);
  const effects = sp.effects ?? [];

  const hit = sp.attack
    ? signed(sp.attack_bonus ?? src.attack_bonus)
    : sp.save_ability
    ? `${sp.save_dc ?? src.save_dc ?? "–"} ${sp.save_ability.toUpperCase()}`
    : "–";

  const upcastLines = effects
    .filter((e) => (e.upcast ?? []).length > 0)
    .map((e) =>
      (e.upcast ?? [])
        .map((u) => `${sp.level === 0 ? "Lv" : "Slot"} ${u.slot_level}: ${u.dice}`)
        .join(" · ")
    );

  const details = [
    [pretty(sp.school), sp.ritual ? "Ritual" : "", sp.concentration ? "Concentration" : ""]
      .filter(Boolean)
      .join(" · "),
    sp.duration ? `Duration: ${sp.duration}` : "",
    sp.components ? `Components: ${sp.components}` : "",
    sp.description ?? "",
    sp.higher_levels ? `At higher levels: ${sp.higher_levels}` : "",
  ].filter(Boolean);

  return (
    <Pressable onPress={() => setOpen((o) => !o)} style={s.spell}>
      <View style={s.row}>
        <Text style={[s.cell, { flex: 2.3, fontWeight: "700" }]}>
          {sp.name}
          {sp.concentration && <Text style={s.tag}> C</Text>}
          {sp.ritual && <Text style={s.tag}> R</Text>}
          {showSource && <Text style={s.source}>{"\n"}{src.name ?? pretty(src.id)}</Text>}
        </Text>
        <Text style={[s.cell, { flex: 0.8 }]}>{shortTime(sp.casting_time)}</Text>
        <Text style={[s.cell, { flex: 1.2 }]}>{shortRange(sp.range)}</Text>
        <Text style={[s.cell, { flex: 1.1 }]}>{hit}</Text>
        <Text style={[s.cell, { flex: 1.7 }]}>
          {effects.length ? effects.map(effectText).join(" · ") : "–"}
        </Text>
      </View>

      {upcast &&
        upcastLines.map((l, i) => (
          <Text key={i} style={s.upcast}>
            Upcast – {l}
          </Text>
        ))}

      {open && details.map((l, i) => <Text key={i} style={s.body}>{l}</Text>)}
    </Pressable>
  );
}

/* ---------- Slots ---------- */

function Slots({ id, sheet }: { id: string; sheet: Sheet }) {
  const action = useSheetAction(id);
  const slots = (sheet.spell_slots ?? []).filter((x) => (x.max ?? 0) > 0);
  const pact = (sheet.pact_slots?.max ?? 0) > 0 ? sheet.pact_slots : undefined;
  if (slots.length === 0 && !pact) return null;

  return (
    <View style={s.box}>
      <Text style={s.sub}>Spell slots · tap a full slot to spend it, an empty one to restore it</Text>
      {slots.map((sl) => (
        <PipRow
          key={sl.level}
          label={levelLabel(sl.level ?? 1)}
          max={sl.max ?? 0}
          remaining={sl.remaining ?? 0}
          busy={action.isPending}
          onSpend={() => action.mutate(() => spendSlot(id, sl.level!))}
          onRestore={() => action.mutate(() => restoreSlot(id, sl.level!))}
        />
      ))}
      {pact && (
        <PipRow
          label={`Pact (${levelLabel(pact.level ?? 1)})`}
          max={pact.max ?? 0}
          remaining={pact.remaining ?? 0}
          busy={action.isPending}
          onSpend={() => action.mutate(() => spendSlot(id, pact.level ?? 1, true))}
          onRestore={() => action.mutate(() => restoreSlot(id, pact.level ?? 1, true))}
        />
      )}
      {action.error && <Text style={{ color: C.danger }}>{action.error.message}</Text>}
    </View>
  );
}

function PipRow({
  label,
  max,
  remaining,
  busy,
  onSpend,
  onRestore,
}: {
  label: string;
  max: number;
  remaining: number;
  busy: boolean;
  onSpend: () => void;
  onRestore: () => void;
}) {
  return (
    <View style={s.pipRow}>
      <Text style={{ width: 80, fontWeight: "600" }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", flex: 1 }}>
        {Array.from({ length: max }, (_, i) => {
          const full = i < remaining;
          return (
            <Pressable
              key={i}
              disabled={busy}
              onPress={full ? onSpend : onRestore}
              hitSlop={6}
              style={[s.pip, full && s.pipFull, busy && { opacity: 0.5 }]}
            />
          );
        })}
      </View>
      <Text style={s.muted}>
        {remaining}/{max}
      </Text>
    </View>
  );
}

/* ---------- Small pieces ---------- */

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={{ color: active ? C.surface : C.text, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, backgroundColor: C.surface, gap: 4 },
  muted: { color: C.muted, fontSize: 13 },
  sub: { fontSize: 12, color: C.muted },
  label: { fontSize: 12, color: C.muted, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, backgroundColor: C.surface },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: C.fill },
  chipActive: { backgroundColor: C.accent },
  stats: { flexDirection: "row" },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  head: { fontSize: 12, color: C.muted, fontWeight: "700" },
  levelHead: { fontSize: 20, fontWeight: "600", marginTop: 10, marginBottom: 2 },
  spell: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingVertical: 2 },
  cell: { fontSize: 14 },
  tag: { fontSize: 11, color: C.muted, fontWeight: "700" },
  source: { fontSize: 11, color: C.muted, fontWeight: "400" },
  statCell: { flex: 1, textAlign: "right" },
  upcast: { fontSize: 12, color: C.accent, paddingBottom: 4 },
  body: { fontSize: 14, color: C.text, paddingBottom: 4 },
  pipRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  pip: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.accent, backgroundColor: C.surface },
  pipFull: { backgroundColor: C.accent },
});
