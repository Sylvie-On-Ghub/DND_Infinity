import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { addItem, listContent } from "@/lib/api/characters";
import type { AddItemRequest } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { pretty } from "@/lib/format";
import { Btn, Chip, ModalShell, ui } from "./ui";
import { C } from "@/lib/colors";

export function AddItemModal({
  id,
  container,
  containerName,
  onClose,
}: {
  id: string;
  container: string; // "" = top level
  containerName: string;
  onClose: () => void;
}) {
  const action = useSheetAction(id);
  const [tab, setTab] = useState<"catalogue" | "custom">("catalogue");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [cost, setCost] = useState("");

  const items = useQuery({
    queryKey: ["content", "items"],
    queryFn: () => listContent("items"),
  });

  const q = search.trim().toLowerCase();
  const shown = (items.data ?? [])
    .filter((x) => (x.name ?? x.id ?? "").toLowerCase().includes(q))
    .slice(0, 100);

  const n = parseInt(qty, 10);
  const validQty = Number.isInteger(n) && n > 0;
  const canAdd = validQty && (tab === "catalogue" ? !!picked : !!name.trim());

  const add = () => {
    const body: AddItemRequest =
      tab === "catalogue"
        ? { item_id: picked!, quantity: n, container: container || undefined }
        : {
            custom: {
              name: name.trim(),
              kind: "other",
              weight: parseFloat(weight) || 0,
              cost: parseInt(cost, 10) > 0 ? { amount: parseInt(cost, 10), currency: "gp" } : undefined,
            },
            quantity: n,
            container: container || undefined,
          };
    action.mutate(() => addItem(id, body), { onSuccess: onClose });
  };

  return (
    <ModalShell title={`Add to ${containerName}`} onClose={onClose} scroll={false}>
      <View style={ui.row}>
        <Chip label="Catalogue" active={tab === "catalogue"} onPress={() => setTab("catalogue")} />
        <Chip label="Custom item" active={tab === "custom"} onPress={() => setTab("custom")} />
      </View>

      {tab === "catalogue" ? (
        <>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search items" style={ui.input} />
          {items.isLoading && <Text style={ui.muted}>Loading…</Text>}
          {items.error && <Text style={ui.err}>{items.error.message}</Text>}
          <FlatList
            style={{ flex: 1 }}
            data={shown}
            keyExtractor={(x) => x.id!}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              (items.data?.length ?? 0) > shown.length ? (
                <Text style={ui.muted}>Showing the first {shown.length}. Search to narrow down.</Text>
              ) : undefined
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setPicked(item.id!)}
                style={{ paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: C.divider, backgroundColor: picked === item.id ? C.accentSoft : "transparent" }}
              >
                <Text style={{ fontSize: 16, fontWeight: picked === item.id ? "700" : "400" }}>
                  {picked === item.id ? "✓ " : ""}
                  {item.name ?? pretty(item.id)}
                </Text>
              </Pressable>
            )}
          />
        </>
      ) : (
        <View style={{ gap: 10 }}>
          <TextInput value={name} onChangeText={setName} placeholder="Name" style={ui.input} />
          <View style={ui.row}>
            <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Weight (each)" style={[ui.input, { flex: 1 }]} />
            <TextInput value={cost} onChangeText={setCost} keyboardType="number-pad" placeholder="Cost (gp)" style={[ui.input, { flex: 1 }]} />
          </View>
        </View>
      )}

      {action.error && <Text style={ui.err}>{action.error.message}</Text>}

      <View style={ui.row}>
        <TextInput
          value={qty}
          onChangeText={setQty}
          keyboardType="number-pad"
          style={[ui.input, { width: 80, textAlign: "center" }]}
        />
        <View style={{ flex: 1 }}>
          <Btn label="Add" disabled={!canAdd || action.isPending} onPress={add} />
        </View>
      </View>
    </ModalShell>
  );
}
