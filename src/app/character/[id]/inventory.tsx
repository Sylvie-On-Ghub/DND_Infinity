import { useQueries, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { AddItemModal } from "@/components/inventory/AddItemModal";
import { CoinsModal } from "@/components/inventory/CoinsModal";
import { ConjureModal } from "@/components/inventory/ConjureModal";
import { ItemModal } from "@/components/inventory/ItemModal";
import { Btn } from "@/components/inventory/ui";
import { Page } from "@/components/Page";
import { getCharacter, getItemDef, getRuleset, getSheet, patchEntry } from "@/lib/api/characters";
import type { InventoryView } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { pretty } from "@/lib/format";
import { bondedEntryId, hasPactOfTheBlade } from "@/lib/pactWeapon";
import { C } from "@/lib/colors";

export default function InventoryPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // container entry id, "" = top level
  const [coinsOpen, setCoinsOpen] = useState(false);
  const [conjuring, setConjuring] = useState(false);
  const action = useSheetAction(id);

  const { data: sheet, error, isLoading } = useQuery({
    queryKey: ["sheet", id],
    queryFn: () => getSheet(id),
  });
  const character = useQuery({
    queryKey: ["character", id],
    queryFn: () => getCharacter(id),
  }).data;
  const ruleset = useQuery({
    queryKey: ["ruleset"],
    queryFn: getRuleset,
    staleTime: Infinity,
  }).data;

  // Which items are containers? The inventory view doesn't say, so look up each item's definition.
  const entries = sheet?.inventory ?? [];
  const itemIds = [
    ...new Set(entries.filter((e) => e.item_id && !e.custom).map((e) => e.item_id as string)),
  ];
  const defs = useQueries({
    queries: itemIds.map((iid) => ({
      queryKey: ["item-def", iid],
      queryFn: () => getItemDef(iid),
      staleTime: Infinity,
    })),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (error || !sheet) {
    return (
      <Text style={{ padding: 16, color: C.danger }}>
        {error?.message ?? "No sheet returned"}
      </Text>
    );
  }

  const containerItemIds = new Set(itemIds.filter((_, i) => defs[i]?.data?.container));
  const referenced = new Set(entries.map((e) => e.container).filter(Boolean) as string[]);
  const isContainer = (e: InventoryView) =>
    !!e.entry_id &&
    ((!!e.item_id && containerItemIds.has(e.item_id)) || referenced.has(e.entry_id));

  const containers = entries.filter(isContainer);
  const topLevel = entries.filter((e) => !e.container && !isContainer(e));
  const contentsOf = (cid: string) => entries.filter((e) => e.container === cid);
  const selected = entries.find((e) => e.entry_id === openEntry);
  const addingTo = adding === null ? undefined : containers.find((c) => c.entry_id === adding);

  // Pact of the Blade
  const pactOn = hasPactOfTheBlade(sheet, character);
  const bondedId = pactOn ? bondedEntryId(character) : undefined;
  const bonded = entries.find((e) => e.entry_id === bondedId);

  // Wallet
  const wallet = sheet.wallet;
  const currencies = [...(ruleset?.currencies ?? wallet?.coins ?? [])].sort(
    (a, b) => (b.value ?? 0) - (a.value ?? 0)
  );
  const balances = Object.fromEntries((wallet?.coins ?? []).map((c) => [c.id ?? "", c.amount ?? 0]));
  const gp = currencies.find((c) => c.id === "gp" || c.abbrev === "gp");
  const totalText =
    wallet?.total === undefined
      ? "–"
      : gp?.value
      ? `${Number((wallet.total / gp.value).toFixed(2))} ${gp.abbrev ?? "gp"}`
      : String(wallet.total);

  const carry = sheet.carry;
  const carryText =
    carry?.weight !== undefined
      ? `Carrying ${Math.round(carry.weight * 10) / 10}${carry.capacity ? ` / ${carry.capacity}` : ""} ${carry.unit ?? ""}${carry.state ? ` · ${pretty(carry.state)}` : ""}`
      : "";

  return (
    <Page>
      {/* Wallet */}
      <Pressable style={s.box} onPress={() => setCoinsOpen(true)}>
        <View style={s.coinRow}>
          {currencies.map((c) => (
            <View key={c.id} style={s.coin}>
              <Text style={s.label}>{c.name}</Text>
              <Text style={s.coinValue}>{balances[c.id ?? ""] ?? 0}</Text>
            </View>
          ))}
        </View>
        <Text style={s.total}>Total {totalText}</Text>
        {!!carryText && <Text style={s.muted}>{carryText}</Text>}
        <Text style={s.hint}>Tap to gain, spend or convert coins</Text>
      </Pressable>

      {action.error && <Text style={{ color: C.danger }}>{action.error.message}</Text>}

      {pactOn && (
        <View style={s.box}>
          <Text style={s.section}>Pact weapon</Text>
          <Text style={[s.muted, { textAlign: "left" }]}>
            {bonded
              ? `${bonded.name} is bonded. Tap it to end the bond.`
              : "No pact weapon. Conjure one, or tap a weapon you carry to bond it."}
          </Text>
          <Btn
            label={bonded ? "Conjure a different weapon" : "Conjure pact weapon"}
            color={C.magic}
            onPress={() => setConjuring(true)}
          />
        </View>
      )}

      <Section
        title="Equipment"
        entries={topLevel}
        bondedId={bondedId}
        equipable
        busy={action.isPending}
        onToggleEquip={(e) =>
          action.mutate(() => patchEntry(id, e.entry_id!, { equipped: !e.equipped }))
        }
        onOpen={(e) => setOpenEntry(e.entry_id ?? null)}
        onAdd={() => setAdding("")}
      />

      {containers.map((c) => (
        <Section
          key={c.entry_id}
          title={c.name ?? "Container"}
          subtitle={c.contents ? `Contents weigh ${c.contents}` : undefined}
          entries={contentsOf(c.entry_id!)}
          bondedId={bondedId}
          busy={action.isPending}
          onToggleEquip={() => {}}
          onOpen={(e) => setOpenEntry(e.entry_id ?? null)}
          onOpenHeader={() => setOpenEntry(c.entry_id ?? null)}
          onAdd={() => setAdding(c.entry_id!)}
        />
      ))}

      {coinsOpen && (
        <CoinsModal
          id={id}
          coins={currencies}
          balances={balances}
          totalText={totalText}
          onClose={() => setCoinsOpen(false)}
        />
      )}
      {selected && (
        <ItemModal
          key={selected.entry_id}
          id={id}
          entry={selected}
          containers={containers}
          isContainer={isContainer(selected)}
          hasContents={contentsOf(selected.entry_id!).length > 0}
          pact={
            pactOn && selected.kind === "weapon"
              ? { bonded: selected.entry_id === bondedId, previous: bonded }
              : undefined
          }
          onClose={() => setOpenEntry(null)}
        />
      )}
      {adding !== null && (
        <AddItemModal
          id={id}
          container={adding}
          containerName={adding === "" ? "Equipment" : addingTo?.name ?? "container"}
          onClose={() => setAdding(null)}
        />
      )}
      {conjuring && (
        <ConjureModal id={id} previous={bonded} onClose={() => setConjuring(false)} />
      )}
    </Page>
  );
}

function Section({
  title,
  subtitle,
  entries,
  bondedId,
  equipable,
  busy,
  onToggleEquip,
  onOpen,
  onOpenHeader,
  onAdd,
}: {
  title: string;
  subtitle?: string;
  entries: InventoryView[];
  bondedId?: string;
  equipable?: boolean;
  busy: boolean;
  onToggleEquip: (e: InventoryView) => void;
  onOpen: (e: InventoryView) => void;
  onOpenHeader?: () => void;
  onAdd: () => void;
}) {
  return (
    <View style={s.box}>
      <View style={s.headerRow}>
        <Pressable style={{ flex: 1 }} disabled={!onOpenHeader} onPress={onOpenHeader}>
          <Text style={s.section}>{title}</Text>
          {!!subtitle && <Text style={s.muted}>{subtitle}</Text>}
        </Pressable>
      </View>

      <View style={s.row}>
        {equipable && <View style={{ width: 34 }} />}
        <Text style={[s.head, { flex: 3 }]}>Name</Text>
        <Text style={[s.head, { flex: 0.8, textAlign: "center" }]}>Qty</Text>
        <Text style={[s.head, { flex: 1.3, textAlign: "right" }]}>Cost</Text>
      </View>

      {entries.map((e) => (
        <View key={e.entry_id} style={[s.row, s.item]}>
          {equipable && (
            <Pressable
              disabled={busy}
              onPress={() => onToggleEquip(e)}
              hitSlop={6}
              style={[s.check, e.equipped && s.checkOn]}
            >
              {e.equipped && <Text style={{ color: C.onAccent, fontWeight: "700" }}>✓</Text>}
            </Pressable>
          )}
          <Pressable style={{ flex: 5.1, flexDirection: "row" }} onPress={() => onOpen(e)}>
            <Text style={[s.cell, { flex: 3 }, e.stashed && { color: C.border }]}>
              {e.name}
              {e.attuned && <Text style={s.tag}> ◆</Text>}
              {e.entry_id === bondedId && <Text style={s.pact}> Pact</Text>}
              {e.stashed && <Text style={s.tag}> (stashed)</Text>}
            </Text>
            <Text style={[s.cell, { flex: 0.8, textAlign: "center" }]}>{e.quantity ?? 1}</Text>
            <Text style={[s.cell, { flex: 1.3, textAlign: "right" }]}>
              {e.cost ? `${e.cost.amount} ${e.cost.currency}` : "–"}
            </Text>
          </Pressable>
        </View>
      ))}
      {entries.length === 0 && <Text style={s.muted}>Empty</Text>}
      <View style={{ marginTop: 6 }}>
        <Btn label="Add item" onPress={onAdd} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, backgroundColor: C.surface, gap: 4 },
  coinRow: { flexDirection: "row", justifyContent: "space-around" },
  coin: { alignItems: "center" },
  label: { fontSize: 12, color: C.muted, fontWeight: "600" },
  coinValue: { fontSize: 20, fontWeight: "700" },
  total: { fontSize: 22, fontWeight: "700", textAlign: "center", marginTop: 6 },
  hint: { fontSize: 11, color: C.border, textAlign: "center" },
  muted: { color: C.muted, fontSize: 13, textAlign: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", paddingBottom: 4 },
  section: { fontSize: 20, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  item: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingVertical: 8 },
  head: { fontSize: 12, color: C.muted, fontWeight: "700" },
  cell: { fontSize: 15 },
  tag: { fontSize: 12, color: C.muted },
  pact: { fontSize: 12, color: C.magic, fontWeight: "700" },
  check: { width: 24, height: 24, marginRight: 10, borderRadius: 6, borderWidth: 2, borderColor: C.textSecondary, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
  checkOn: { backgroundColor: C.accent, borderColor: C.accent },
});
