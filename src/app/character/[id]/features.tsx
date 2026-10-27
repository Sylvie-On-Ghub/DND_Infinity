import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Page } from "@/components/Page";
import { UsesCounter } from "@/components/UsesCounter";
import { getCharacter, getSheet, restoreResource, spendResource } from "@/lib/api/characters";
import type { FeatureView, ResourceView, Selection } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { pretty, signed } from "@/lib/format";

type Group = "class" | "race" | "background" | "feat" | "other";

const GROUPS: { key: Group; title: string; always: boolean }[] = [
  { key: "class", title: "Class features", always: true },
  { key: "race", title: "Race traits", always: true },
  { key: "background", title: "Background", always: false },
  { key: "feat", title: "Feats", always: true },
  { key: "other", title: "Other features", always: false },
];

const groupOf = (f: FeatureView): Group =>
  f.source === "class" || f.source === "race" || f.source === "background" || f.source === "feat"
    ? f.source
    : "other";

// Instance ids look like "ability_score_improvement@warlock_asi_4:feat"; picks use the part before "@".
const baseId = (featureId?: string) => (featureId ?? "").split("@")[0];

export default function FeaturesPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const action = useSheetAction(id);

  const sheetQ = useQuery({ queryKey: ["sheet", id], queryFn: () => getSheet(id) });
  const charQ = useQuery({ queryKey: ["character", id], queryFn: () => getCharacter(id) });
  const sheet = sheetQ.data;
  const character = charQ.data;

  const err = sheetQ.error ?? charQ.error;
  if (err) return <Text style={{ padding: 16, color: "#b71c1c" }}>{err.message}</Text>;
  if (!sheet) return <ActivityIndicator style={{ flex: 1 }} />;

  const features = sheet.features ?? [];
  const resources = sheet.resources ?? [];
  // A feature's resource_id matches the resource's feature_id.
  const resByKey = new Map<string, ResourceView>();
  resources.forEach((r) => r.feature_id && resByKey.set(r.feature_id, r));

  // The race and background entries are headers for their traits, so hide them
  // when there are real traits beneath them.
  const roots = [character?.race_id, character?.background_id].filter((x): x is string => !!x);
  const hidden = new Set(
    roots.filter((r) => {
      const root = features.find((f) => f.feature_id === r);
      return !!root && features.some((f) => f !== root && groupOf(f) === groupOf(root));
    })
  );

  // A feature granted by another in the same section is nested under it. One in
  // a different section (a background's feat) stays put; its parent names it as an option.
  const byId = new Map<string, FeatureView>();
  features.forEach((f) => f.feature_id && byId.set(f.feature_id, f));
  const parentOf = (f: FeatureView) => {
    const p = f.granted_by ? byId.get(f.granted_by) : undefined;
    return p && p !== f && !hidden.has(p.feature_id ?? "") && groupOf(p) === groupOf(f)
      ? p
      : undefined;
  };
  const children = new Map<string, FeatureView[]>();
  features.forEach((f) => {
    const p = parentOf(f);
    if (p) children.set(p.feature_id!, [...(children.get(p.feature_id!) ?? []), f]);
  });

  const selections = new Map<string, Selection[]>();
  (character?.selections ?? []).forEach(
    (sel) =>
      sel.feature_id &&
      selections.set(sel.feature_id, [...(selections.get(sel.feature_id) ?? []), sel])
  );
  // Option lines for a feature, leaving out picks already shown as nested cards.
  const optionsOf = (featureId?: string) => {
    const nested = new Set((children.get(featureId ?? "") ?? []).map((c) => baseId(c.feature_id)));
    return (selections.get(featureId ?? "") ?? []).flatMap((sel) => {
      const picked = (sel.picked ?? []).filter((x) => !nested.has(x));
      const allocated = Object.entries(sel.allocated ?? {});
      const values = [
        ...picked.map((x) => {
          const f = features.find((g) => baseId(g.feature_id) === x);
          return f?.name ?? pretty(x);
        }),
        ...allocated.map(([k, v]) => `${k.toUpperCase()} ${signed(v)}`),
      ];
      return values.length ? [{ label: pretty(sel.choice_id), value: values.join(", ") }] : [];
    });
  };

  const sections = GROUPS.map((g) => {
    let list = features.filter(
      (f) => groupOf(f) === g.key && !hidden.has(f.feature_id ?? "") && !parentOf(f)
    );
    if (g.key === "class") {
      list = [...list].sort((a, b) => (a.level ?? 99) - (b.level ?? 99));
    }
    const rootNotes = features
      .filter((f) => groupOf(f) === g.key && hidden.has(f.feature_id ?? ""))
      .flatMap((f) => optionsOf(f.feature_id));
    return { ...g, list, rootNotes };
  });

  // A resource can be shared by several features (a feature and its spells).
  // Show its counter once, on the first feature that points at it.
  const owner = new Map<string, string>();
  const claim = (f: FeatureView) => {
    if (f.resource_id && resByKey.has(f.resource_id) && !owner.has(f.resource_id)) {
      owner.set(f.resource_id, f.feature_id ?? "");
    }
    (children.get(f.feature_id ?? "") ?? []).forEach(claim);
  };
  sections.forEach((sec) => sec.list.forEach(claim));
  // Safety net: a resource no visible feature claims still gets a counter.
  const orphans = resources.filter((r) => r.feature_id && !owner.has(r.feature_id));

  const counter = (res: ResourceView) => (
    <UsesCounter
      res={res}
      busy={action.isPending}
      onSpend={() => action.mutate(() => spendResource(id, res.feature_id!))}
      onRestore={() => action.mutate(() => restoreResource(id, res.feature_id!))}
    />
  );

  const renderProps: CardRender = {
    childrenOf: (f) => children.get(f.feature_id ?? "") ?? [],
    optionsOf: (f) => optionsOf(f.feature_id),
    footerOf: (f) => {
      const res =
        f.resource_id && owner.get(f.resource_id) === f.feature_id
          ? resByKey.get(f.resource_id)
          : undefined;
      return res ? counter(res) : undefined;
    },
  };

  return (
    <Page>
      {action.error && <Text style={s.err}>{action.error.message}</Text>}

      {sections.map((sec) => {
        if (sec.list.length === 0 && !sec.always) return null;
        return (
          <View key={sec.key} style={{ gap: 8 }}>
            <Text style={s.section}>{sec.title}</Text>
            {sec.rootNotes.map((o) => (
              <Text key={o.label} style={s.muted}>
                {o.label}: {o.value}
              </Text>
            ))}
            {sec.list.length === 0 && <Text style={s.muted}>None</Text>}
            {sec.list.map((f, i) => (
              <FeatureCard key={f.feature_id ?? i} f={f} render={renderProps} />
            ))}
          </View>
        );
      })}

      {orphans.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={s.section}>Other limited-use</Text>
          {orphans.map((r) => (
            <View key={r.feature_id} style={s.card}>
              <Text style={s.name}>{r.name ?? pretty(r.feature_id)}</Text>
              {counter(r)}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

type CardRender = {
  childrenOf: (f: FeatureView) => FeatureView[];
  optionsOf: (f: FeatureView) => { label: string; value: string }[];
  footerOf: (f: FeatureView) => ReactNode;
};

function FeatureCard({
  f,
  render,
  nested = false,
}: {
  f: FeatureView;
  render: CardRender;
  nested?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const meta = [
    !nested && f.source_id && f.source === "class" ? pretty(f.source_id) : "",
    !nested && f.level ? `Lv ${f.level}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const options = render.optionsOf(f);
  const kids = render.childrenOf(f);

  return (
    <View style={nested ? s.nested : s.card}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <View style={s.cardHead}>
          <Text style={nested ? s.nestedName : s.name}>{f.name ?? pretty(f.feature_id)}</Text>
          {!!meta && <Text style={s.meta}>{meta}</Text>}
        </View>
        {!!f.description && (
          <Text style={s.desc} numberOfLines={open ? undefined : nested ? 2 : 3}>
            {f.description}
          </Text>
        )}
      </Pressable>
      {options.map((o) => (
        <Text key={o.label} style={s.option}>
          <Text style={{ fontWeight: "700" }}>{o.label}:</Text> {o.value}
        </Text>
      ))}
      {kids.map((c, i) => (
        <FeatureCard key={c.feature_id ?? i} f={c} render={render} nested />
      ))}
      {render.footerOf(f)}
    </View>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 24, fontWeight: "600" },
  muted: { color: "#777", fontSize: 13 },
  err: { color: "#b71c1c" },
  card: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 12,
    padding: 10,
    gap: 8,
    backgroundColor: "white",
  },
  cardHead: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  name: { fontSize: 17, fontWeight: "700" },
  meta: { fontSize: 12, color: "#777" },
  desc: { fontSize: 14, color: "#333", marginTop: 2 },
  option: { fontSize: 14, color: "#1565c0" },
  nested: { borderLeftWidth: 3, borderColor: "#1565c0", paddingLeft: 10, gap: 6 },
  nestedName: { fontSize: 15, fontWeight: "700" },
});
