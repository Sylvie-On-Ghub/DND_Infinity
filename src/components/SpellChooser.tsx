import { useQueries, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { getContent } from "@/lib/api/characters";
import type { Character, Sheet, SpellSourceView } from "@/lib/api/client";
import { useCharacterPatch } from "@/lib/api/useCharacterPatch";
import { C } from "@/lib/colors";
import { levelLabel, pretty } from "@/lib/format";

// The content endpoints are untyped in the spec, so type just what we read.
type ClassDef = { spellcasting?: { spell_list_id?: string; pact?: boolean } };
type SpellListDef = { spell_ids?: string[] };
type SpellDef = {
  id?: string;
  name?: string;
  level?: number;
  school?: string;
  casting_time?: string;
  concentration?: boolean;
  ritual?: boolean;
  description?: string;
};

type Key = "cantrips" | "known" | "prepared" | "book";
type Tab = { key: Key; label: string; limit?: number };

// A negative or missing allowance means the rules set no limit.
const limitOf = (n?: number) => (n !== undefined && n >= 0 ? n : undefined);

export function SpellChooser({
  id,
  source,
  character,
  sheet,
  onClose,
}: {
  id: string;
  source: SpellSourceView;
  character: Character;
  sheet: Sheet;
  onClose: () => void;
}) {
  const patch = useCharacterPatch(id);
  const sourceId = source.id ?? "";
  const classId = sourceId.replace(/^class:/, "");
  const saved = character.spellbooks?.[sourceId] ?? {};

  const [draft, setDraft] = useState<Record<Key, string[]>>({
    cantrips: saved.cantrips ?? [],
    known: saved.known ?? [],
    prepared: saved.prepared ?? [],
    book: saved.book ?? [],
  });
  const [search, setSearch] = useState("");

  // Same key as the Edit page's class lookups, so the cache is shared.
  const classDef = useQuery({
    queryKey: ["content", "classes", classId],
    queryFn: () => getContent("classes", classId) as Promise<ClassDef>,
    staleTime: Infinity,
  });
  const listId = classDef.data?.spellcasting?.spell_list_id;
  const list = useQuery({
    queryKey: ["content", "spell-lists", listId],
    queryFn: () => getContent("spell-lists", listId!) as Promise<SpellListDef>,
    enabled: !!listId,
    staleTime: Infinity,
  });

  // Everything on the class list, plus anything already chosen (a subclass can add
  // spells the list doesn't have), so a choice can always be removed.
  const allIds = [
    ...new Set([...(list.data?.spell_ids ?? []), ...Object.values(draft).flat()]),
  ];
  const spellQs = useQueries({
    queries: allIds.map((sid) => ({
      queryKey: ["content", "spells", sid],
      queryFn: () => getContent("spells", sid) as Promise<SpellDef>,
      staleTime: Infinity,
    })),
  });
  const spells = new Map<string, SpellDef>();
  allIds.forEach((sid, i) => spells.set(sid, spellQs[i].data ?? { id: sid }));
  const loadingSpells = spellQs.some((q) => q.isLoading);

  // The highest spell level the character can cast: pact slots for a pact caster,
  // otherwise their highest shared slot.
  const maxLevel = classDef.data?.spellcasting?.pact
    ? sheet.pact_slots?.level ?? 0
    : Math.max(0, ...(sheet.spell_slots ?? []).filter((x) => (x.max ?? 0) > 0).map((x) => x.level ?? 0));

  const tabs: Tab[] = [
    { key: "cantrips", label: "Cantrips", limit: limitOf(source.cantrips_allowed) },
    ...(source.prep === "book"
      ? [
          { key: "book" as const, label: "Spellbook" },
          { key: "prepared" as const, label: "Prepared", limit: limitOf(source.spells_allowed) },
        ]
      : source.prep === "prepared"
        ? [{ key: "prepared" as const, label: "Prepared", limit: limitOf(source.spells_allowed) }]
        : [{ key: "known" as const, label: "Spells known", limit: limitOf(source.spells_allowed) }]),
  ];
  const [tabKey, setTabKey] = useState<Key>(tabs[0].key);
  const tab = tabs.find((t) => t.key === tabKey) ?? tabs[0];
  const chosen = draft[tab.key];
  const full = tab.limit !== undefined && chosen.length >= tab.limit;

  // A spellbook caster prepares from their book; everyone else from the class list.
  const pool =
    tab.key === "cantrips"
      ? allIds.filter((sid) => (spells.get(sid)?.level ?? 0) === 0)
      : tab.key === "prepared" && source.prep === "book"
        ? draft.book
        : allIds.filter((sid) => (spells.get(sid)?.level ?? 0) > 0);
  const q = search.trim().toLowerCase();
  const shown = pool
    .filter((sid) => (spells.get(sid)?.name ?? sid).toLowerCase().includes(q))
    .sort((a, b) => (spells.get(a)?.name ?? a).localeCompare(spells.get(b)?.name ?? b));
  const levels = [...new Set(shown.map((sid) => spells.get(sid)?.level ?? 0))].sort((a, b) => a - b);

  const toggle = (sid: string) =>
    setDraft((d) => {
      const on = d[tab.key].includes(sid);
      const next = { ...d, [tab.key]: on ? d[tab.key].filter((x) => x !== sid) : [...d[tab.key], sid] };
      // Taking a spell out of the book also unprepares it.
      if (on && tab.key === "book") next.prepared = d.prepared.filter((x) => x !== sid);
      return next;
    });

  const changedKeys = (Object.keys(draft) as Key[]).filter(
    (k) => JSON.stringify(draft[k]) !== JSON.stringify(saved[k] ?? [])
  );
  // `spellbooks` merges per source and per field, but each list is replaced whole.
  const save = () =>
    patch.mutate(
      { spellbooks: { [sourceId]: Object.fromEntries(changedKeys.map((k) => [k, draft[k]])) } },
      { onSuccess: onClose }
    );

  const loading = classDef.isLoading || list.isLoading;
  const error = classDef.error ?? list.error;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 16, paddingTop: 60, backgroundColor: C.bg, gap: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>{source.name ?? pretty(sourceId)} spells</Text>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const on = t.key === tab.key;
            const n = draft[t.key].length;
            const over = t.limit !== undefined && n > t.limit;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTabKey(t.key)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: on ? C.accent : C.fill,
                }}
              >
                <Text style={{ color: on ? C.onAccent : over ? C.warning : C.text, fontWeight: "600" }}>
                  {t.label} {n}
                  {t.limit !== undefined ? `/${t.limit}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ color: C.muted, fontSize: 13 }}>
          {tab.key === "prepared" && source.prep === "book"
            ? "Prepare from the spells in your spellbook."
            : tab.key === "cantrips"
              ? "Cantrips can be cast at will."
              : maxLevel > 0
                ? `You can choose spells up to ${levelLabel(maxLevel)} level.`
                : "You have no spell slots yet, so only cantrips can be chosen."}
          {full ? " At the limit: remove one to pick another." : ""}
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search spells"
          style={{
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 16,
            backgroundColor: C.surface,
          }}
        />

        {(loading || loadingSpells) && <ActivityIndicator color={C.accent} />}
        {error && <Text style={{ color: C.danger }}>{error.message}</Text>}
        {!loading && !listId && !error && (
          <Text style={{ color: C.muted }}>This class has no spell list in the loaded content.</Text>
        )}

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {!loading && shown.length === 0 && (
            <Text style={{ color: C.muted }}>
              {tab.key === "prepared" && source.prep === "book" && draft.book.length === 0
                ? "Your spellbook is empty. Add spells on the Spellbook tab first."
                : "No spells match."}
            </Text>
          )}
          {levels.map((lv) => (
            <View key={lv} style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", marginTop: 6, marginBottom: 2 }}>
                {levelLabel(lv)}
              </Text>
              {shown
                .filter((sid) => (spells.get(sid)?.level ?? 0) === lv)
                .map((sid) => {
                  const sp = spells.get(sid)!;
                  const on = chosen.includes(sid);
                  const tooHigh = lv > 0 && lv > maxLevel;
                  const blocked = !on && (full || tooHigh);
                  const meta = [
                    pretty(sp.school),
                    sp.casting_time,
                    sp.concentration ? "Concentration" : "",
                    sp.ritual ? "Ritual" : "",
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <Pressable
                      key={sid}
                      disabled={blocked}
                      onPress={() => toggle(sid)}
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderBottomWidth: 1,
                        borderColor: C.divider,
                        backgroundColor: on ? C.accentSoft : "transparent",
                        opacity: blocked ? 0.4 : 1,
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          marginTop: 1,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: on ? C.accent : C.border,
                          backgroundColor: on ? C.accent : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {on && <Text style={{ color: C.onAccent, fontSize: 13, fontWeight: "800" }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 16, fontWeight: on ? "700" : "500" }}>
                          {sp.name ?? pretty(sid)}
                        </Text>
                        {!!meta && <Text style={{ color: C.muted, fontSize: 12 }}>{meta}</Text>}
                        {tooHigh && (
                          <Text style={{ color: C.warning, fontSize: 12 }}>
                            Needs {levelLabel(lv)}-level slots
                          </Text>
                        )}
                        {!!sp.description && (
                          <Text style={{ color: C.textSecondary, fontSize: 13 }} numberOfLines={2}>
                            {sp.description}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          ))}
        </ScrollView>

        {patch.error && <Text style={{ color: C.danger }}>{patch.error.message}</Text>}
        <Pressable
          disabled={!changedKeys.length || patch.isPending}
          onPress={save}
          style={{
            backgroundColor: C.accent,
            opacity: !changedKeys.length || patch.isPending ? 0.4 : 1,
            padding: 14,
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: C.onAccent, fontWeight: "700" }}>
            {patch.isPending ? "Saving…" : "Save spells"}
          </Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ padding: 10, alignItems: "center" }}>
          <Text style={{ color: C.accent, fontWeight: "600" }}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
