import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { AddPetModal } from "@/components/AddPetModal";
import { HpModal } from "@/components/HpModal";
import { Page } from "@/components/Page";
import { Text } from "@/components/Text";
import { changePetForm, getSheet, setPetStatus } from "@/lib/api/characters";
import type { PetSourceView, PetView } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { C } from "@/lib/colors";
import { pretty, shortRange, signed } from "@/lib/format";

const ABILITIES = [
  ["str", "Str"],
  ["dex", "Dex"],
  ["con", "Con"],
  ["int", "Int"],
  ["wis", "Wis"],
  ["cha", "Cha"],
] as const;

const SPEED_ORDER = ["walk", "fly", "swim", "climb", "burrow"];
const SPEED_LABEL: Record<string, string> = { walk: "Walking" };

const ACTION_TYPE: Record<string, string> = {
  action: "Action",
  bonus_action: "Bonus action",
  reaction: "Reaction",
  free: "Free",
  other: "Other",
};

export default function PetsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [adding, setAdding] = useState(false);
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

  // The page is only offered with a pet, so land somewhere sensible if the last one goes.
  const pets = sheet.pets ?? [];
  if (pets.length === 0) return <Redirect href={`/character/${id}` as Href} />;

  return (
    <Page>
      {pets.map((p) => (
        <PetCard
          key={p.id}
          id={id}
          pet={p}
          source={sheet.pet_sources?.find((x) => x.source_id === p.source_id)}
        />
      ))}
      {(sheet.pet_sources ?? []).length > 0 && (
        <Pressable style={s.button} onPress={() => setAdding(true)}>
          <Text style={{ color: C.onAccent, fontWeight: "700" }}>Add another pet</Text>
        </Pressable>
      )}
      {adding && <AddPetModal id={id} onClose={() => setAdding(false)} />}
    </Page>
  );
}

function PetCard({ id, pet, source }: { id: string; pet: PetView; source?: PetSourceView }) {
  const [hpOpen, setHpOpen] = useState(false);
  const [changingForm, setChangingForm] = useState(false);
  const status = useSheetAction(id);
  const dead = pet.status === "dead";
  const dismissed = pet.status === "dismissed";
  // Other forms the pet's source allows; none to offer if it has no source the character still has.
  const forms = (source?.creatures ?? []).filter((cr) => cr.id !== pet.creature_id);
  const current = pet.current_hp ?? 0;
  const max = pet.max_hp ?? 0;
  const temp = pet.temp_hp ?? 0;

  const rank = (k: string) => {
    const i = SPEED_ORDER.indexOf(k);
    return i === -1 ? SPEED_ORDER.length : i;
  };
  const speeds = Object.entries(pet.speeds ?? {})
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
  const skills = Object.entries(pet.skills ?? {})
    .filter(([, v]) => v.level && v.level !== "none")
    .sort(([a], [b]) => a.localeCompare(b));
  const warnings = (pet.warnings ?? []).filter((w) => !w.acknowledged);
  const subtitle = [pet.size, pet.type].filter(Boolean).map(pretty).join(" ");

  return (
    <View style={{ gap: 12 }}>
      {/* Name, creature and status */}
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[s.section, { flexShrink: 1 }]}>{pet.name || pet.creature_name}</Text>
          {pet.status && pet.status !== "active" && (
            <View style={[s.badge, dead && { borderColor: C.danger }]}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: dead ? C.danger : C.muted }}>
                {pretty(pet.status)}
              </Text>
            </View>
          )}
        </View>
        <Text style={s.muted}>
          {[pet.name && pet.creature_name, subtitle].filter(Boolean).join(" · ")}
          {pet.source_id ? ` · from ${pretty(pet.source_id)}` : ""}
        </Text>
      </View>

      {warnings.map((w, i) => (
        <View key={w.key ?? i} style={s.warning}>
          <Text style={{ color: C.warning }}>{w.message}</Text>
        </View>
      ))}

      {/* AC, HP and proficiency */}
      <View style={s.statRow}>
        <View style={s.stat}>
          <Text style={s.statLabel}>AC</Text>
          <Text style={s.statValue}>{pet.ac ?? "–"}</Text>
        </View>
        <Pressable style={[s.stat, { flex: 2 }]} onPress={() => setHpOpen(true)} disabled={dead}>
          <Text style={s.statLabel}>HP</Text>
          <Text style={[s.statValue, dead && { color: C.danger }]}>
            {current} / {max}
            {temp > 0 && <Text style={{ fontSize: 14, color: C.accent }}> +{temp}</Text>}
          </Text>
          {!dead && <Text style={s.hint}>Tap to change</Text>}
        </Pressable>
        <View style={s.stat}>
          <Text style={s.statLabel}>Prof</Text>
          <Text style={s.statValue}>{signed(pet.proficiency_bonus)}</Text>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {forms.length > 0 && (
            <Pressable style={[s.button, s.secondary]} onPress={() => setChangingForm(true)}>
              <Text style={{ fontWeight: "700" }}>Change form</Text>
            </Pressable>
          )}
          <Pressable
            style={[s.button, { flex: 1 }, status.isPending && { opacity: 0.4 }]}
            disabled={status.isPending}
            onPress={() =>
              status.mutate(() => setPetStatus(id, pet.id!, dead || dismissed ? "active" : "dismissed"))
            }
          >
            <Text style={{ color: C.onAccent, fontWeight: "700" }}>
              {dead ? "Revive at full HP" : dismissed ? "Resummon" : "Dismiss"}
            </Text>
          </Pressable>
        </View>
        {status.error && <Text style={{ color: C.danger }}>{status.error.message}</Text>}
      </View>

      {changingForm && (
        <FormModal
          id={id}
          pet={pet}
          forms={forms}
          onClose={() => setChangingForm(false)}
        />
      )}

      {/* Abilities */}
      <View style={[s.box, s.abilities]}>
        {ABILITIES.map(([key, label]) => {
          const a = pet.abilities?.[key];
          return (
            <View key={key} style={s.ability}>
              <Text style={s.statLabel}>{label}</Text>
              <Text style={{ fontSize: 20, fontWeight: "700" }}>{signed(a?.mod)}</Text>
              <Text style={s.muted}>{a?.score ?? "–"}</Text>
              <Text style={[s.hint, a?.save_proficient && { color: C.accent }]}>
                Save {signed(a?.save_bonus)}
              </Text>
            </View>
          );
        })}
      </View>

      <Info label="Speed" text={speeds.map(([k, v]) => `${SPEED_LABEL[k] ?? pretty(k)} ${v}ft`)} />
      <Info label="Skills" text={skills.map(([k, v]) => `${pretty(k)} ${signed(v.bonus)}`)} />
      <Info
        label="Senses"
        text={[
          ...(pet.senses ?? []).map((x) => `${pretty(x.name)}${x.range ? ` ${x.range}ft` : ""}`),
          `Passive Perception ${pet.skills?.perception?.passive ?? "–"}`,
        ]}
      />
      <Info label="Resistances" text={(pet.resistances ?? []).map(pretty)} />
      <Info label="Immunities" text={(pet.immunities ?? []).map(pretty)} />
      <Info label="Languages" text={(pet.languages ?? []).map(pretty)} />
      <Info label="Conditions" text={(pet.conditions ?? []).map(pretty)} />

      {(pet.traits ?? []).length > 0 && (
        <View style={[s.box, { gap: 8 }]}>
          {pet.traits!.map((t, i) => (
            <Text key={i}>
              <Text style={{ fontWeight: "700" }}>{t.name}. </Text>
              {t.description}
            </Text>
          ))}
        </View>
      )}

      {((pet.attacks ?? []).length > 0 || (pet.actions ?? []).length > 0) && (
        <View style={[s.box, { gap: 8 }]}>
          {(pet.attacks ?? []).map((a, i) => (
            <View key={`a${i}`} style={{ gap: 2 }}>
              <Text style={{ fontWeight: "700" }}>
                {a.name}
                <Text style={s.muted}>
                  {"  "}
                  {signed(a.to_hit)} to hit · {a.damage || "–"}
                  {a.range ? ` · ${shortRange(a.range)}` : ""}
                </Text>
              </Text>
              {!!a.description && <Text style={s.muted}>{a.description}</Text>}
            </View>
          ))}
          {(pet.actions ?? []).map((a, i) => (
            <View key={`x${i}`} style={{ gap: 2 }}>
              <Text style={{ fontWeight: "700" }}>
                {a.name}
                {a.type && <Text style={s.muted}>{"  "}{ACTION_TYPE[a.type]}</Text>}
              </Text>
              {!!a.description && <Text style={s.muted}>{a.description}</Text>}
            </View>
          ))}
        </View>
      )}

      <HpModal
        id={id}
        petId={pet.id}
        title={`${pet.name || pet.creature_name}'s hit points`}
        visible={hpOpen}
        onClose={() => setHpOpen(false)}
        current={current}
        max={max}
        temp={temp}
      />
    </View>
  );
}

// Pick a new form for the pet, as when recasting Find Familiar.
function FormModal({
  id,
  pet,
  forms,
  onClose,
}: {
  id: string;
  pet: PetView;
  forms: NonNullable<PetSourceView["creatures"]>;
  onClose: () => void;
}) {
  const action = useSheetAction(id);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 16, paddingTop: 60, gap: 12, backgroundColor: C.bg }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>
          Change {pet.name || pet.creature_name}&apos;s form
        </Text>
        <Text style={s.muted}>
          It keeps its name. HP resets to the new form&apos;s maximum, and temp HP and conditions
          clear.
        </Text>
        <FlatList
          data={forms}
          keyExtractor={(x) => x.id!}
          renderItem={({ item }) => (
            <Pressable
              disabled={action.isPending}
              onPress={() =>
                action.mutate(() => changePetForm(id, pet.id!, item.id!), { onSuccess: onClose })
              }
              style={{ paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: C.divider }}
            >
              <Text style={{ fontSize: 17 }}>{item.name ?? pretty(item.id)}</Text>
            </Pressable>
          )}
        />
        {action.error && <Text style={{ color: C.danger }}>{action.error.message}</Text>}
        <Pressable onPress={onClose} style={{ padding: 16, alignItems: "center" }}>
          <Text style={{ color: C.accent, fontWeight: "600" }}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// A labelled row, left out when it has nothing to say.
function Info({ label, text }: { label: string; text: string[] }) {
  if (text.length === 0) return null;
  return (
    <Text>
      <Text style={{ fontWeight: "700" }}>{label} </Text>
      {text.join(", ")}
    </Text>
  );
}

const s = StyleSheet.create({
  section: { fontSize: 24, fontWeight: "600" },
  muted: { color: C.muted },
  hint: { fontSize: 11, color: C.muted },
  box: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, backgroundColor: C.surface },
  badge: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  warning: {
    borderWidth: 1,
    borderColor: C.warningBorder,
    backgroundColor: C.warningSoft,
    borderRadius: 10,
    padding: 10,
  },
  statRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 8,
    backgroundColor: C.surface,
  },
  statLabel: { fontSize: 13, fontWeight: "700", color: C.textSecondary },
  statValue: { fontSize: 22, fontWeight: "700" },
  abilities: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  ability: { width: "32%", alignItems: "center", gap: 1 },
  button: { backgroundColor: C.accent, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  secondary: { flex: 1, backgroundColor: C.fillStrong },
});
