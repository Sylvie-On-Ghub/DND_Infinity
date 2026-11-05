import { useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { changeQuantity, moveEntry, patchEntry, removeEntry } from "@/lib/api/characters";
import type { EntryPatch, InventoryView } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { pretty } from "@/lib/format";
import { bonusEffect, bonusOf, takesTags } from "@/lib/itemTags";
import { bondExisting, endBond, isConjured } from "@/lib/pactWeapon";
import { TagEditor } from "./TagEditor";
import { Btn, ModalShell, ui } from "./ui";
import { C } from "@/lib/colors";

export function ItemModal({
  id,
  entry,
  containers,
  isContainer,
  hasContents,
  pact,
  onSplit,
  onClose,
}: {
  id: string;
  entry: InventoryView;
  containers: InventoryView[];
  isContainer: boolean;
  hasContents: boolean;
  // Set when the character has Pact of the Blade and this entry is a weapon.
  pact?: { bonded: boolean; previous?: InventoryView };
  // Called with the new entry's id when one is split off this stack.
  onSplit: (entryId: string) => void;
  onClose: () => void;
}) {
  const action = useSheetAction(id);
  // Separate so its error shows by the tag buttons, not off-screen at the bottom of the modal.
  const tagAction = useSheetAction(id);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const eid = entry.entry_id!;
  const busy = action.isPending || tagAction.isPending;

  const patch = (body: EntryPatch) => action.mutate(() => patchEntry(id, eid, body));
  const remove = (deleteContents: boolean) =>
    action.mutate(() => removeEntry(id, eid, deleteContents), { onSuccess: onClose });

  const destinations = [
    { id: "", label: "Equipment (not in a container)" },
    ...containers
      .filter((c) => c.entry_id !== eid)
      .map((c) => ({ id: c.entry_id!, label: c.name ?? "Container" })),
  ];
  const here = entry.container ?? "";
  const quantity = entry.quantity ?? 1;
  const bonus = bonusOf(entry.tags ?? []);

  return (
    <ModalShell title={entry.name ?? "Item"} onClose={onClose}>
      <Text style={ui.muted}>
        {[pretty(entry.kind), entry.rarity ? pretty(entry.rarity) : "", entry.weight !== undefined ? `${entry.weight} each` : ""]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      {!!entry.description && <Text style={{ fontSize: 15 }}>{entry.description}</Text>}

      {/* Quantity */}
      <View style={ui.row}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: "600" }}>Quantity</Text>
        <Step label="−" disabled={busy} onPress={() => action.mutate(() => changeQuantity(id, eid, -1))} />
        <Text style={{ width: 40, textAlign: "center", fontSize: 18, fontWeight: "700" }}>
          {entry.quantity ?? 1}
        </Text>
        <Step label="+" disabled={busy} onPress={() => action.mutate(() => changeQuantity(id, eid, 1))} />
      </View>
      <Text style={ui.muted}>Taking the quantity to 0 removes the item.</Text>

      {/* State */}
      <Toggle label="Equipped" value={!!entry.equipped} disabled={busy} onChange={(v) => patch({ equipped: v })} />
      {entry.requires_attunement && (
        <Toggle label="Attuned" value={!!entry.attuned} disabled={busy} onChange={(v) => patch({ attuned: v })} />
      )}
      <Toggle label="Stashed (not carried)" value={!!entry.stashed} disabled={busy} onChange={(v) => patch({ stashed: v })} />

      {/* Tags */}
      {takesTags(entry.kind) && (
        <View style={{ gap: 6 }}>
          <Text style={ui.label}>Tags</Text>
          <TagEditor
            tags={entry.tags ?? []}
            disabled={busy}
            onChange={(tags) => tagAction.mutate(() => patchEntry(id, eid, { tags }))}
          />
          {tagAction.error && <Text style={ui.err}>{tagAction.error.message}</Text>}
          {bonus > 0 && (
            <Text style={ui.muted}>
              {bonusEffect(entry.kind, bonus)}
              {entry.requires_attunement && !entry.attuned ? " once attuned" : ""}
            </Text>
          )}
          {quantity > 1 && (
            <>
              <Text style={ui.muted}>Tags apply to all {quantity} in this stack.</Text>
              <Btn
                label="Split off 1 to tag separately"
                disabled={busy}
                onPress={() =>
                  tagAction.mutate(() => moveEntry(id, eid, here, 1), {
                    onSuccess: (res) => {
                      if (res.entry_id) onSplit(res.entry_id);
                    },
                  })
                }
              />
            </>
          )}
        </View>
      )}

      {/* Pact weapon */}
      {pact && (
        <View style={{ gap: 6 }}>
          <Text style={ui.label}>Pact weapon</Text>
          {pact.bonded ? (
            <>
              <Text style={ui.muted}>
                Bonded: you are proficient with it and attack with Charisma.
              </Text>
              <Btn
                label={isConjured(entry) ? "Dismiss (weapon disappears)" : "End bond"}
                color={C.magic}
                disabled={busy}
                onPress={() =>
                  action.mutate(() => endBond(id, entry), isConjured(entry) ? { onSuccess: onClose } : undefined)
                }
              />
            </>
          ) : (
            <>
              <Text style={ui.muted}>
                Bonding equips it and makes you proficient, attacking with Charisma.
                {pact.previous ? ` This ends the bond with ${pact.previous.name ?? "your current pact weapon"}.` : ""}
              </Text>
              <Btn
                label="Bond as pact weapon"
                color={C.magic}
                disabled={busy}
                onPress={() => action.mutate(() => bondExisting(id, eid, pact.previous))}
              />
            </>
          )}
        </View>
      )}

      {/* Notes */}
      <Text style={ui.label}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} multiline style={[ui.input, { minHeight: 70 }]} />
      <Btn label="Save notes" disabled={busy || notes === (entry.notes ?? "")} onPress={() => patch({ notes })} />

      {/* Move */}
      <Text style={ui.label}>Stored in</Text>
      {destinations.map((d) => (
        <Pressable
          key={d.id || "top"}
          disabled={busy || d.id === here}
          onPress={() => action.mutate(() => moveEntry(id, eid, d.id))}
          style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: d.id === here ? C.accentSoft : C.surface }}
        >
          <Text style={{ fontWeight: d.id === here ? "700" : "400" }}>
            {d.id === here ? "✓ " : ""}
            {d.label}
          </Text>
        </Pressable>
      ))}

      {action.error && <Text style={ui.err}>{action.error.message}</Text>}

      {/* Remove */}
      <View style={{ gap: 8, marginTop: 8 }}>
        <Btn
          label={isContainer && hasContents ? "Remove (contents move out)" : "Remove"}
          color={C.danger}
          disabled={busy}
          onPress={() => remove(false)}
        />
        {isContainer && hasContents && (
          <Btn label="Remove and delete contents" color={C.dangerDark} disabled={busy} onPress={() => remove(true)} />
        )}
      </View>
    </ModalShell>
  );
}

function Toggle({ label, value, disabled, onChange }: { label: string; value: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={ui.row}>
      <Text style={{ flex: 1, fontSize: 16 }}>{label}</Text>
      <Switch trackColor={{ true: C.accent, false: C.fillStrong }} value={value} disabled={disabled} onValueChange={onChange} />
    </View>
  );
}

function Step({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: C.fill, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : 1 }}
    >
      <Text style={{ fontSize: 22, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
