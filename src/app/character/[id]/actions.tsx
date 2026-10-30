import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Page } from "@/components/Page";
import { getSheet } from "@/lib/api/characters";
import type { AttackView, SheetAction, SpellSourceView, SpellView } from "@/lib/api/client";
import { damageText, pretty, signed } from "@/lib/format";
import { C } from "@/lib/colors";

const KNOWN_TYPES = ["action", "bonus_action", "reaction"];

type SourcedSpell = { spell: SpellView; src: SpellSourceView };

// "1 bonus action" -> "bonus_action", "1 reaction, which you take when…" -> "reaction",
// "1 action" -> "action"; anything longer ("1 minute", "10 minutes") -> "other".
function spellType(castingTime?: string) {
  const t = (castingTime ?? "").toLowerCase();
  if (t.includes("bonus")) return "bonus_action";
  if (t.includes("reaction")) return "reaction";
  if (t.includes("action")) return "action";
  return "other";
}

export default function ActionsPage() {
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

  const actions = sheet.actions ?? [];
  const ofType = (t: string) => actions.filter((a) => a.type === t);
  const other = actions.filter((a) => !KNOWN_TYPES.includes(a.type ?? ""));
  const attacks = sheet.attacks ?? [];
  const featureSpells: SourcedSpell[] = (sheet.spellcasting ?? [])
    .filter((x) => x.kind !== "class")
    .flatMap((src) =>
      [...(src.cantrips ?? []), ...(src.spells ?? [])].map((spell) => ({ spell, src }))
    );
  const spellsOfType = (t: string) => featureSpells.filter((x) => spellType(x.spell.casting_time) === t);
  const otherSpells = spellsOfType("other");

  return (
    <Page>
      <Section title="Attacks">
        <View style={s.row}>
          <Text style={[s.head, { flex: 2.6 }]}>Attack</Text>
          <Text style={[s.head, { flex: 1.3 }]}>Range</Text>
          <Text style={[s.head, { flex: 1, textAlign: "right" }]}>To hit</Text>
          <Text style={[s.head, { flex: 1.4, textAlign: "right" }]}>Damage</Text>
        </View>
        {attacks.map((a, i) => (
          <AttackRow key={`${a.item_id ?? a.name}-${i}`} a={a} />
        ))}
        {attacks.length === 0 && <Text style={s.muted}>None</Text>}
      </Section>

      <Section title="Class / Race / Feat actions">
        <ActionList list={ofType("action")} spells={spellsOfType("action")} />
      </Section>

      <Section title="Bonus actions">
        <ActionList list={ofType("bonus_action")} spells={spellsOfType("bonus_action")} />
      </Section>

      <Section title="Reactions">
        <ActionList list={ofType("reaction")} spells={spellsOfType("reaction")} />
      </Section>

      {(other.length > 0 || otherSpells.length > 0) && (
        <Section title="Free & other">
          <ActionList list={other} spells={otherSpells} />
        </Section>
      )}
    </Page>
  );
}

/* ---------- Attacks ---------- */

function rangeText(a: AttackView) {
  if (!a.range_normal || a.range_normal <= 5) return "Melee";
  return `${a.range_normal}${a.range_long ? `/${a.range_long}` : ""}ft`;
}

function AttackRow({ a }: { a: AttackView }) {
  const riders = (a.damage_riders ?? []).map((r) =>
    [r.dice ? `+${r.dice}` : "", r.note ?? pretty(r.source), r.condition ? `(${r.condition})` : ""]
      .filter(Boolean)
      .join(" ")
  );
  const sub = [
    a.damage_type ? pretty(a.damage_type) : "",
    a.versatile_dice ? `versatile ${a.versatile_dice}` : "",
    ...riders,
    ...(a.properties ?? []).map(pretty),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={s.attack}>
      <View style={s.row}>
        <Text style={[s.cell, { flex: 2.6, fontWeight: "700" }]}>
          {a.name}
          {a.advantage && <Text style={{ color: C.success }}> ▲</Text>}
          {a.disadvantage && <Text style={{ color: C.danger }}> ▼</Text>}
        </Text>
        <Text style={[s.cell, { flex: 1.3, color: C.textSecondary }]}>{rangeText(a)}</Text>
        <Text style={[s.cell, { flex: 1, textAlign: "right", fontWeight: "700" }]}>
          {signed(a.to_hit)}
        </Text>
        <Text style={[s.cell, { flex: 1.4, textAlign: "right", fontWeight: "700" }]}>
          {damageText(a.damage_dice, a.damage_bonus)}
        </Text>
      </View>
      {!!sub && <Text style={s.sub}>{sub}</Text>}
      {a.proficient === false && (
        <Text style={[s.sub, { color: C.warning }]}>Not proficient</Text>
      )}
    </View>
  );
}

/* ---------- Actions ---------- */

function ActionList({
  list,
  spells = [],
}: {
  list: SheetAction[];
  spells?: SourcedSpell[];
}) {
  if (list.length === 0 && spells.length === 0) return <Text style={s.muted}>None</Text>;
  return (
    <>
      {list.map((a, i) => {
        const atk = a.is_attack ? a.attack : undefined;
        const lines = [
          a.description ?? "",
          atk
            ? `${atk.damage_dice ?? atk.flat_damage ?? ""} ${pretty(atk.damage_type)} · ${
                atk.ranged ? `${atk.range_normal}${atk.range_long ? `/${atk.range_long}` : ""}ft` : "Melee"
              }`.trim()
            : "",
        ].filter(Boolean);
        return <Item key={`${a.name}-${i}`} title={a.name ?? "Unnamed"} meta={a.duration} lines={lines} />;
      })}
      {spells.map(({ spell, src }) => (
        <SpellItem key={`${src.id}:${spell.id}`} sp={spell} src={src} />
      ))}
    </>
  );
}

/* ---------- Spells ---------- */

function SpellItem({ sp, src }: { sp: SpellView; src: SpellSourceView }) {
  const source = [
    `From ${src.name ?? pretty(src.id)}`,
    src.save_dc !== undefined ? `Save DC ${src.save_dc}` : "",
    src.attack_bonus !== undefined ? `${signed(src.attack_bonus)} to hit` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Item
      title={sp.name ?? pretty(sp.id)}
      meta={[sp.level === 0 ? "Cantrip" : `Lv ${sp.level}`, sp.casting_time].filter(Boolean).join(" · ")}
      lines={[
        source,
        [
          sp.range && `Range: ${sp.range}`,
          sp.duration && `Duration: ${sp.duration}${sp.concentration ? " (concentration)" : ""}`,
        ]
          .filter(Boolean)
          .join(" · "),
        sp.components ? `Components: ${sp.components}` : "",
        sp.attack
          ? `Spell attack ${signed(sp.attack_bonus)}`
          : sp.save_ability
          ? `${sp.save_ability.toUpperCase()} save DC ${sp.save_dc}${sp.save_effect ? `, ${sp.save_effect}` : ""}`
          : "",
        sp.description ?? "",
        sp.higher_levels ? `At higher levels: ${sp.higher_levels}` : "",
      ].filter(Boolean) as string[]}
    />
  );
}

/* ---------- Shared pieces ---------- */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.section}>{title}</Text>
      {!!subtitle && <Text style={s.legend}>{subtitle}</Text>}
      <View style={s.box}>{children}</View>
    </View>
  );
}

function Item({ title, meta, lines }: { title: string; meta?: string; lines: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((o) => !o)} style={s.item}>
      <View style={s.itemHead}>
        <Text style={s.itemName}>{title}</Text>
        {!!meta && <Text style={s.meta}>{meta}</Text>}
        <Text style={s.caret}>{open ? "▴" : "▾"}</Text>
      </View>
      {open && lines.map((l, i) => <Text key={i} style={s.body}>{l}</Text>)}
    </Pressable>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 24, fontWeight: "600" },
  legend: { fontSize: 12, color: C.muted },
  box: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, backgroundColor: C.surface, gap: 2 },
  muted: { color: C.muted, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  head: { fontSize: 12, color: C.muted, fontWeight: "700" },
  cell: { fontSize: 15 },
  attack: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingVertical: 2 },
  sub: { fontSize: 12, color: C.muted, paddingBottom: 4 },
  item: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.border, gap: 4 },
  itemHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { flex: 1, fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 12, color: C.textSecondary },
  caret: { fontSize: 14, color: C.muted },
  body: { fontSize: 14, color: C.text },
});
