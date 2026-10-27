import { useQuery } from "@tanstack/react-query";
import { FlatList, Pressable } from "react-native";
import { Text } from "@/components/Text";
import { listContent } from "@/lib/api/characters";
import type { InventoryView } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { pretty } from "@/lib/format";
import { conjure } from "@/lib/pactWeapon";
import { ModalShell, ui } from "./ui";
import { C } from "@/lib/colors";

export function ConjureModal({
  id,
  previous,
  onClose,
}: {
  id: string;
  previous?: InventoryView;
  onClose: () => void;
}) {
  const action = useSheetAction(id);
  const items = useQuery({
    queryKey: ["content", "items"],
    queryFn: () => listContent("items"),
  });
  const weapons = (items.data ?? []).filter((x) => x.kind === "weapon");

  return (
    <ModalShell title="Conjure pact weapon" onClose={onClose} scroll={false}>
      <Text style={ui.muted}>
        The weapon appears in your hand, equipped and bonded: you are proficient with it and use
        Charisma for its attacks.
        {previous ? ` This ends the bond with ${previous.name ?? "your current pact weapon"}.` : ""}
      </Text>
      {items.isLoading && <Text style={ui.muted}>Loading…</Text>}
      {items.error && <Text style={ui.err}>{items.error.message}</Text>}
      {action.error && <Text style={ui.err}>{action.error.message}</Text>}
      <FlatList
        style={{ flex: 1 }}
        data={weapons}
        keyExtractor={(x) => x.id!}
        renderItem={({ item }) => (
          <Pressable
            disabled={action.isPending}
            onPress={() =>
              action.mutate(() => conjure(id, item.id!, previous), { onSuccess: onClose })
            }
            style={{ paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: C.divider, opacity: action.isPending ? 0.5 : 1 }}
          >
            <Text style={{ fontSize: 16 }}>{item.name ?? pretty(item.id)}</Text>
          </Pressable>
        )}
      />
    </ModalShell>
  );
}
