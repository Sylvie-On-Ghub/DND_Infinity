import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { getCharacter, getContent, getSheet, levelUp, listContent, patchCharacter, setHp } from "@/lib/api/characters";
import { ChoiceEditor } from "@/components/ChoiceEditor";
import { LevelUpModal } from "@/components/LevelUpModal";
import { Page } from "@/components/Page";
import type { Character, Sheet } from "@/lib/api/client";
import { useCharacterPatch } from "@/lib/api/useCharacterPatch";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { pretty } from "@/lib/format";
import { C } from "@/lib/colors";

const KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

type Editing = {
  featureId: string;
  choiceId: string;
  title: string;
  expected?: number;
  picked?: string[];
  allocated?: Record<string, number>;
};

export default function EditPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [editing, setEditing] = useState<Editing | null>(null);

  const sheetQ = useQuery({ queryKey: ["sheet", id], queryFn: () => getSheet(id) });
  const charQ = useQuery({ queryKey: ["character", id], queryFn: () => getCharacter(id) });
  const sheet = sheetQ.data;
  const character = charQ.data;

  

  if (!sheet || !character) {
    const err = sheetQ.error ?? charQ.error;
    return err ? (
      <Text style={{ padding: 16, color: C.danger }}>{err.message}</Text>
    ) : (
      <ActivityIndicator style={{ flex: 1 }} />
    );
  }

  const pending = sheet.pending_choices ?? [];
  const made = character.selections ?? [];

  return (
    <Page>
      {!!sheet.warnings?.length && (
        <View style={{ backgroundColor: C.warningSoft, padding: 12, borderRadius: 8 }}>
          <Text style={{ fontWeight: "700", marginBottom: 4 }}>Warnings</Text>
          {sheet.warnings.map((w) => (
            <Text key={w.key}>• {w.message}</Text>
          ))}
        </View>
      )}
      <IdentitySection id={id} character={character} />
        <LevelSection
            key={JSON.stringify(character.classes)}
            id={id}
            character={character}
            sheet={sheet}
        />
      <SubclassSection id={id} character={character} />
      <HpSection
        key={JSON.stringify(character.classes) + character.current_hp}
        id={id}
        character={character}
        sheet={sheet}
      />
      <AbilitySection
        key={JSON.stringify(character.abilities)}
        id={id}
        character={character}
        sheet={sheet}
      />

      <View style={{ gap: 8 }}>
        <Text style={s.section}>Choices</Text>

        <Text style={s.sub}>Pending</Text>
        <View style={s.box}>
          {pending.length === 0 && <Text style={s.muted}>Nothing pending</Text>}
          {pending.some((p) => p.feature_id === "character") && (
  <Text style={s.muted}>
    Race or background still to pick: use Race & Background at the top of this page.
  </Text>
)}
{pending
  .filter((p) => p.feature_id !== "character")
  .map((p) => (
    <Pressable
      key={`${p.feature_id}:${p.choice_id}`}
      style={s.listRow}
      onPress={() =>
        setEditing({
          featureId: p.feature_id!,
          choiceId: p.choice_id!,
          title: p.prompt ?? "Choice",
          expected: p.remaining,
        })
      }
    >
      <Text style={s.link}>
        {p.prompt} ({p.remaining} left)
      </Text>
    </Pressable>
  ))}
        </View>

        <Text style={s.sub}>Made (tap to change or remove)</Text>
        <View style={s.box}>
          {made.length === 0 && <Text style={s.muted}>No choices made yet</Text>}
          {made.map((m) => {
            const total = m.allocated
              ? Object.values(m.allocated).reduce((a, b) => a + b, 0)
              : m.picked?.length;
            const summary = m.allocated
              ? Object.entries(m.allocated)
                  .map(([k, v]) => `${pretty(k)} +${v}`)
                  .join(", ")
              : (m.picked ?? []).map(pretty).join(", ");
            return (
              <Pressable
                key={`${m.feature_id}:${m.choice_id}`}
                style={s.listRow}
                onPress={() =>
                  setEditing({
                    featureId: m.feature_id!,
                    choiceId: m.choice_id!,
                    title: `${pretty(m.feature_id)} › ${pretty(m.choice_id)}`,
                    expected: total,
                    picked: m.allocated ? undefined : m.picked ?? [],
                    allocated: m.allocated,
                  })
                }
              >
                <Text style={{ fontWeight: "600" }}>
                  {pretty(m.feature_id)} › {pretty(m.choice_id)}
                </Text>
                <Text style={s.muted}>{summary || "(empty)"}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {editing && (
        <ChoiceEditor
          key={`${editing.featureId}:${editing.choiceId}`}
          id={id}
          featureId={editing.featureId}
          choiceId={editing.choiceId}
          title={editing.title}
          expected={editing.expected}
          initialPicked={editing.picked}
          initialAllocated={editing.allocated}
          onClose={() => setEditing(null)}
        />
      )}
    </Page>
  );
}

function IdentitySection({ id, character }: { id: string; character: Character }) {
  const patch = useCharacterPatch(id);
  const [picking, setPicking] = useState<"race" | "background" | null>(null);
  const races = useQuery({ queryKey: ["content", "races"], queryFn: () => listContent("races") });
  const backgrounds = useQuery({ queryKey: ["content", "backgrounds"], queryFn: () => listContent("backgrounds") });

  const nameOf = (list: { id?: string; name?: string }[] | undefined, value?: string) =>
    value ? list?.find((x) => x.id === value)?.name ?? pretty(value) : "None";

  const active = picking === "race" ? races : backgrounds;
  const currentValue = picking === "race" ? character.race_id : character.background_id;

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.section}>Race & Background</Text>
      <View style={s.box}>
        <IdentityRow label="Race" value={nameOf(races.data, character.race_id)} onPress={() => setPicking("race")} />
        <IdentityRow label="Background" value={nameOf(backgrounds.data, character.background_id)} onPress={() => setPicking("background")} />
        <Text style={s.muted}>Picks that a race or background grants show up under Choices.</Text>
        {patch.error && <Text style={s.err}>{patch.error.message}</Text>}
      </View>

      {picking && (
        <Modal visible animationType="slide" onRequestClose={() => setPicking(null)}>
          <View style={{ flex: 1, padding: 16, paddingTop: 60, backgroundColor: C.bg }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>
              {picking === "race" ? "Choose race" : "Choose background"}
            </Text>
            {active.isLoading && <ActivityIndicator style={{ marginTop: 24 }} />}
            {active.error && <Text style={s.err}>{active.error.message}</Text>}
            {active.data?.length === 0 && (
              <Text style={s.muted}>The loaded content has none to choose from.</Text>
            )}
            <FlatList
              data={active.data}
              keyExtractor={(x) => x.id!}
              renderItem={({ item }) => (
                <Pressable
                  disabled={patch.isPending}
                  onPress={() =>
                    patch.mutate(
                      picking === "race" ? { race_id: item.id } : { background_id: item.id },
                      { onSuccess: () => setPicking(null) }
                    )
                  }
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor: C.divider,
                    backgroundColor: item.id === currentValue ? C.accentSoft : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 17, fontWeight: item.id === currentValue ? "700" : "400" }}>
                    {item.name ?? item.id}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable onPress={() => setPicking(null)} style={{ padding: 16, alignItems: "center" }}>
              <Text style={{ color: C.accent, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
          </View>
        </Modal>
      )}
    </View>
  );
}

function IdentityRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={[s.inline, { paddingVertical: 6 }]}>
      <Text style={{ width: 100, color: C.textSecondary, fontWeight: "600" }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 16 }}>{value}</Text>
      <Btn label="Change" onPress={onPress} />
    </View>
  );
}
function LevelSection({ id, character, sheet }: { id: string; character: Character; sheet: Sheet }) {
  const queryClient = useQueryClient();
  const classes = character.classes ?? [];
  // Drafts as text so a level can be typed in; parsed and checked before applying.
  const [drafts, setDrafts] = useState<string[]>(classes.map((c) => String(c.level ?? 1)));
  const levels = drafts.map((d) => parseInt(d, 10));
  const valid = levels.every((n) => Number.isInteger(n) && n >= 1 && n <= 20);
  const [method, setMethod] = useState<"average" | "max" | "roll">("average");
  const [levelUpOpen, setLevelUpOpen] = useState(false);

  const diffs = classes.map((c, i) => (valid ? levels[i] - (c.level ?? 1) : 0));
  const anyUp = diffs.some((d) => d > 0);
  const anyDown = diffs.some((d) => d < 0);
  const changed = anyUp || anyDown;

  const apply = useMutation({
    mutationFn: async () => {
      // 1. Lowering: one PATCH. `classes` is replaced whole, so send every class.
      if (anyDown) {
        await patchCharacter(id, {
          classes: classes.map((c, i) =>
            diffs[i] < 0
              ? { ...c, level: levels[i], rolled_hp: (c.rolled_hp ?? []).slice(0, levels[i]) }
              : c
          ),
        });
      }
      // 2. Raising: one level-up per level, so HP is recorded for each.
      for (let i = 0; i < classes.length; i++) {
        for (let n = 0; n < diffs[i]; n++) {
          await levelUp(id, classes[i].class_id!, method);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheet", id] });
      queryClient.invalidateQueries({ queryKey: ["character", id] });
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });

  const setDraft = (i: number, v: string) => setDrafts((p) => p.map((x, j) => (j === i ? v : x)));
  const step = (i: number, d: number) =>
    setDraft(i, String(Math.max(1, Math.min(20, (parseInt(drafts[i], 10) || 1) + d))));

  const summary = classes
    .map((c, i) => (diffs[i] ? `${pretty(c.class_id)} ${c.level} → ${levels[i]}` : null))
    .filter(Boolean)
    .join(", ");

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.section}>Level</Text>
      <View style={s.box}>
        <Text style={s.muted}>
          Type a level or use − and +, then apply. Total level {sheet.level ?? "–"} · proficiency {sheet.proficiency_bonus !== undefined ? `+${sheet.proficiency_bonus}` : "–"}.
          To add a level in a new class, use Level up.
        </Text>
        <View style={{ marginTop: 6 }}>
          <Btn label="Level up" onPress={() => setLevelUpOpen(true)} />
        </View>

        {classes.length === 0 && <Text style={s.muted}>No class yet</Text>}

        {classes.map((c, i) => (
          <View key={i} style={[s.inline, { marginTop: 8 }]}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "600" }}>
              {pretty(c.class_id)}
            </Text>
            {diffs[i] !== 0 && (
              <Text style={s.muted}>was {c.level}</Text>
            )}
            <Pressable style={s.step} onPress={() => step(i, -1)}>
              <Text style={s.stepText}>−</Text>
            </Pressable>
            <TextInput
              value={drafts[i]}
              onChangeText={(v) => setDraft(i, v.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              style={[s.input, { width: 56, minWidth: 0, fontSize: 18, fontWeight: "700" }]}
            />
            <Pressable style={s.step} onPress={() => step(i, 1)}>
              <Text style={s.stepText}>+</Text>
            </Pressable>
          </View>
        ))}

        {anyUp && (
          <View style={{ marginTop: 12, gap: 6 }}>
            <Text style={s.sub}>HP for new levels</Text>
            <View style={s.inline}>
              {(["average", "max", "roll"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMethod(m)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: method === m ? C.accent : C.fill,
                  }}
                >
                  <Text style={{ color: method === m ? C.surface : C.text, fontWeight: "600" }}>
                    {pretty(m)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {!valid && <Text style={[s.muted, { marginTop: 8, color: C.danger }]}>Levels must be 1 to 20.</Text>}

        {anyDown && (
          <Text style={[s.muted, { marginTop: 8, color: C.warning }]}>
            Lowering a level drops that level's HP entry. Choices made at the removed levels
            are not removed automatically, so check Choices below.
          </Text>
        )}

        <View style={{ marginTop: 12, gap: 6 }}>
          {changed && <Text style={s.sub}>{summary}</Text>}
          <Btn
            label={apply.isPending ? "Applying…" : "Apply level changes"}
            disabled={!changed || !valid || apply.isPending}
            onPress={() => apply.mutate()}
          />
          {apply.error && <Text style={s.err}>{apply.error.message}</Text>}
        </View>
      </View>
      <LevelUpModal id={id} visible={levelUpOpen} onClose={() => setLevelUpOpen(false)} />
    </View>
  );
}

type ClassDef = {
  name?: string;
  subclass_level?: number;
  subclasses?: { id?: string; name?: string }[];
};

function SubclassSection({ id, character }: { id: string; character: Character }) {
  const patch = useCharacterPatch(id);
  const [picking, setPicking] = useState<number | null>(null);
  const classes = character.classes ?? [];

  const defs = useQueries({
    queries: classes.map((c) => ({
      queryKey: ["content", "classes", c.class_id],
      queryFn: () => getContent("classes", c.class_id!) as Promise<ClassDef>,
      enabled: !!c.class_id,
    })),
  });

  // `classes` is replaced whole, so send every class.
  const choose = (index: number, subclassId?: string) =>
    patch.mutate(
      { classes: classes.map((c, i) => (i === index ? { ...c, subclass_id: subclassId } : c)) },
      { onSuccess: () => setPicking(null) }
    );

  const pickingClass = picking === null ? undefined : classes[picking];
  const pickingDef = picking === null ? undefined : defs[picking];

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.section}>Subclass</Text>
      <View style={s.box}>
        {classes.length === 0 && <Text style={s.muted}>No class yet</Text>}
        {classes.map((c, i) => {
          const def = defs[i]?.data;
          const name = c.subclass_id
            ? def?.subclasses?.find((x) => x.id === c.subclass_id)?.name ?? pretty(c.subclass_id)
            : "None";
          const early = !!def?.subclass_level && (c.level ?? 1) < def.subclass_level;
          return (
            <View key={i} style={{ paddingVertical: 6, gap: 2 }}>
              <View style={s.inline}>
                <Text style={{ width: 100, color: C.textSecondary, fontWeight: "600" }}>
                  {def?.name ?? pretty(c.class_id)}
                </Text>
                <Text style={{ flex: 1, fontSize: 16 }}>{name}</Text>
                <Btn label="Change" onPress={() => setPicking(i)} />
              </View>
              {early && (
                <Text style={s.muted}>
                  {def?.name ?? pretty(c.class_id)} normally gets a subclass at level {def?.subclass_level}.
                </Text>
              )}
            </View>
          );
        })}
        {patch.error && <Text style={s.err}>{patch.error.message}</Text>}
      </View>

      {pickingClass && (
        <Modal visible animationType="slide" onRequestClose={() => setPicking(null)}>
          <View style={{ flex: 1, padding: 16, paddingTop: 60, backgroundColor: C.bg }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>
              Choose {pickingDef?.data?.name ?? pretty(pickingClass.class_id)} subclass
            </Text>
            {pickingDef?.isLoading && <ActivityIndicator style={{ marginTop: 24 }} />}
            {pickingDef?.error && <Text style={s.err}>{pickingDef.error.message}</Text>}
            {pickingDef?.data && !pickingDef.data.subclasses?.length && (
              <Text style={s.muted}>The loaded content has none to choose from.</Text>
            )}
            <FlatList
              data={[{ id: undefined, name: "None" }, ...(pickingDef?.data?.subclasses ?? [])]}
              keyExtractor={(x) => x.id ?? "__none"}
              renderItem={({ item }) => {
                const current = item.id === pickingClass.subclass_id;
                return (
                  <Pressable
                    disabled={patch.isPending}
                    onPress={() => choose(picking!, item.id)}
                    style={{
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderColor: C.divider,
                      backgroundColor: current ? C.accentSoft : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 17, fontWeight: current ? "700" : "400" }}>
                      {item.name ?? item.id}
                    </Text>
                  </Pressable>
                );
              }}
            />
            {patch.error && <Text style={s.err}>{patch.error.message}</Text>}
            <Pressable onPress={() => setPicking(null)} style={{ padding: 16, alignItems: "center" }}>
              <Text style={{ color: C.accent, fontWeight: "600" }}>Cancel</Text>
            </Pressable>
          </View>
        </Modal>
      )}
    </View>
  );
}

function HpSection({ id, character, sheet }: { id: string; character: Character; sheet: Sheet }) {
  const setHpAction = useSheetAction(id);
  const patch = useCharacterPatch(id);

  const classes = character.classes ?? [];
  const saved = classes.map((c) => (c.rolled_hp ?? []).map(String));
  const [current, setCurrent] = useState(String(character.current_hp ?? 0));
  const [rolls, setRolls] = useState<string[][]>(saved);

  const currentN = parseInt(current, 10);
  const rollsValid = rolls.every((r) => r.every((x) => Number.isInteger(parseInt(x, 10))));
  const rollsChanged = JSON.stringify(rolls) !== JSON.stringify(saved);

  const saveRolls = () =>
    patch.mutate({
      classes: classes.map((c, ci) => ({
        ...c,
        rolled_hp: rolls[ci].map((x) => parseInt(x, 10)),
      })),
    });

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.section}>Hit points</Text>

      <View style={s.box}>
        <Text style={s.sub}>Current HP (max {sheet.max_hp ?? "–"})</Text>
        <View style={s.inline}>
          <TextInput
            value={current}
            onChangeText={setCurrent}
            keyboardType="number-pad"
            style={s.input}
          />
          <Btn
            label="Set"
            disabled={!Number.isInteger(currentN) || setHpAction.isPending}
            onPress={() => setHpAction.mutate(() => setHp(id, currentN))}
          />
        </View>
        <Text style={s.muted}>Set bypasses every rule, so it can go above max HP.</Text>
        {setHpAction.error && <Text style={s.err}>{setHpAction.error.message}</Text>}
      </View>

      <View style={s.box}>
        <Text style={s.sub}>HP gained per level (this is what max HP is built from)</Text>
        {classes.map((c, ci) => (
          <View key={ci} style={{ gap: 4, marginTop: 6 }}>
            <Text style={{ fontWeight: "600" }}>
              {pretty(c.class_id)} · level {c.level}
            </Text>
            {(rolls[ci] ?? []).map((v, li) => (
              <View key={li} style={s.inline}>
                <Text style={{ flex: 1 }}>Level {li + 1}</Text>
                <TextInput
                  value={v}
                  onChangeText={(t) =>
                    setRolls((prev) =>
                      prev.map((r, i) => (i === ci ? r.map((x, j) => (j === li ? t : x)) : r))
                    )
                  }
                  keyboardType="number-pad"
                  style={[s.input, { width: 70 }]}
                />
              </View>
            ))}
          </View>
        ))}
        {classes.length === 0 && <Text style={s.muted}>No classes yet</Text>}
        <View style={{ marginTop: 8 }}>
          <Btn
            label="Save HP per level"
            disabled={!rollsChanged || !rollsValid || patch.isPending}
            onPress={saveRolls}
          />
        </View>
        {patch.error && <Text style={s.err}>{patch.error.message}</Text>}
      </View>
    </View>
  );
}

function AbilitySection({ id, character, sheet }: { id: string; character: Character; sheet: Sheet }) {
  const patch = useCharacterPatch(id);
  const base = (k: string) => String(character.abilities?.[k]?.score ?? 10);
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(KEYS.map((k) => [k, base(k)]))
  );

  const changed = KEYS.filter((k) => draft[k] !== base(k));
  const valid = KEYS.every((k) => Number.isInteger(parseInt(draft[k], 10)));

  const step = (k: string, d: number) =>
    setDraft((p) => ({
      ...p,
      [k]: String(Math.max(1, Math.min(30, (parseInt(p[k], 10) || 0) + d))),
    }));

  const save = () =>
    patch.mutate({
      abilities: Object.fromEntries(
        changed.map((k) => [k, { score: parseInt(draft[k], 10) }])
      ),
    });

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.section}>Ability scores</Text>
      <View style={s.box}>
        <Text style={s.muted}>
          These are base scores. Bonuses from items and features are added on top.
        </Text>
        {KEYS.map((k) => {
          const total = sheet.abilities?.[k]?.score;
          const differs = total !== undefined && String(total) !== base(k);
          return (
            <View key={k} style={[s.inline, { marginTop: 8 }]}>
              <Text style={{ width: 44, fontWeight: "700", fontSize: 16 }}>
                {k.toUpperCase()}
              </Text>
              {differs && <Text style={[s.muted, { width: 70 }]}>total {total}</Text>}
              <View style={{ flex: 1 }} />
              <Pressable style={s.step} onPress={() => step(k, -1)}>
                <Text style={s.stepText}>−</Text>
              </Pressable>
              <TextInput
                value={draft[k]}
                onChangeText={(t) => setDraft((p) => ({ ...p, [k]: t }))}
                keyboardType="number-pad"
                style={[s.input, { width: 56 }]}
              />
              <Pressable style={s.step} onPress={() => step(k, 1)}>
                <Text style={s.stepText}>+</Text>
              </Pressable>
            </View>
          );
        })}
        <View style={{ marginTop: 12 }}>
          <Btn
            label={changed.length ? `Save ${changed.length} change(s)` : "Save scores"}
            disabled={!changed.length || !valid || patch.isPending}
            onPress={save}
          />
        </View>
        {patch.error && <Text style={s.err}>{patch.error.message}</Text>}
      </View>
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
  link: { color: C.accent, fontSize: 16 },
  listRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, textAlign: "center", backgroundColor: C.surface, minWidth: 60 },
  step: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.fill, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 20, fontWeight: "700" },
});