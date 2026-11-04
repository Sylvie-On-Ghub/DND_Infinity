import { Modal, Pressable } from "react-native";
import { Text } from "@/components/Text";
import { spendResource, spendSlot } from "@/lib/api/characters";
import type { ActionResponse, Sheet, SpellSourceView, SpellView } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { C } from "@/lib/colors";
import { levelLabel, pretty } from "@/lib/format";

type Option = {
  key: string;
  label: string;
  detail?: string;
  empty?: boolean;
  // Nothing to spend (a ritual, or an at-will feature spell) when missing.
  run?: () => Promise<ActionResponse>;
};

// A feature or item's uses live on "feature:<id>" when the spell grant carries them, or
// on the feature's own id when the feature has the resource.
export const sourceResource = (sheet: Sheet, src: SpellSourceView) => {
  const bare = (src.id ?? "").replace(/^(feature|item):/, "");
  return (sheet.resources ?? []).find((r) => r.feature_id === src.id || r.feature_id === bare);
};

// What upcasting at this slot level does, from the spell's effect table.
const upcastAt = (sp: SpellView, lv: number) =>
  (sp.effects ?? [])
    .flatMap((e) => (e.upcast ?? []).filter((u) => u.slot_level === lv).map((u) => u.dice))
    .filter(Boolean)
    .join(" · ");

export function CastModal({
  id,
  sheet,
  sp,
  src,
  onClose,
}: {
  id: string;
  sheet: Sheet;
  sp: SpellView;
  src: SpellSourceView;
  onClose: () => void;
}) {
  const action = useSheetAction(id);
  const level = sp.level ?? 1;
  const options: Option[] = [];

  if (src.kind !== "class") {
    const res = sourceResource(sheet, src);
    options.push(
      res
        ? {
            key: "source",
            label: `Use ${res.name ?? src.name ?? pretty(src.id)}`,
            detail: `${res.remaining ?? 0}/${res.max ?? 0} left`,
            empty: (res.remaining ?? 0) <= 0,
            run: () => spendResource(id, res.feature_id!),
          }
        : { key: "source", label: `From ${src.name ?? pretty(src.id)}`, detail: "No cost" }
    );
  }

  if (sp.ritual) options.push({ key: "ritual", label: "As a ritual", detail: "No slot · takes 10 minutes longer" });

  for (const sl of sheet.spell_slots ?? []) {
    const lv = sl.level ?? 0;
    if ((sl.max ?? 0) <= 0 || lv < level) continue;
    const up = lv > level ? upcastAt(sp, lv) : "";
    options.push({
      key: `slot:${lv}`,
      label: `${levelLabel(lv)}-level slot`,
      detail: [`${sl.remaining ?? 0}/${sl.max} left`, lv > level && (up ? `Upcast: ${up}` : "Upcast")]
        .filter(Boolean)
        .join(" · "),
      empty: (sl.remaining ?? 0) <= 0,
      run: () => spendSlot(id, lv),
    });
  }

  const pact = sheet.pact_slots;
  if ((pact?.max ?? 0) > 0 && (pact?.level ?? 0) >= level) {
    const lv = pact!.level!;
    const up = lv > level ? upcastAt(sp, lv) : "";
    options.push({
      key: "pact",
      label: `Pact slot (${levelLabel(lv)})`,
      detail: [`${pact!.remaining ?? 0}/${pact!.max} left`, lv > level && (up ? `Upcast: ${up}` : "Upcast")]
        .filter(Boolean)
        .join(" · "),
      empty: (pact!.remaining ?? 0) <= 0,
      run: () => spendSlot(id, lv, true),
    });
  }

  const cast = (o: Option) => {
    if (!o.run) return onClose();
    action.mutate(o.run, { onSuccess: onClose });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop: tap outside to dismiss. */}
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: C.backdrop, paddingTop: 110, paddingHorizontal: 24 }}
      >
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: C.surface, borderRadius: 12, padding: 16, gap: 10 }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Cast {sp.name}</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>
            {levelLabel(level)} level · {src.name ?? pretty(src.id)}
          </Text>

          {options.map((o) => {
            const disabled = o.empty || action.isPending;
            return (
              <Pressable
                key={o.key}
                disabled={disabled}
                onPress={() => cast(o)}
                style={{
                  backgroundColor: C.fill,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  opacity: disabled ? 0.4 : 1,
                  gap: 2,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600" }}>{o.label}</Text>
                {!!o.detail && <Text style={{ color: C.muted, fontSize: 12 }}>{o.detail}</Text>}
              </Pressable>
            );
          })}
          {options.length === 0 && (
            <Text style={{ color: C.muted }}>
              No slots of {levelLabel(level)} level or higher to cast this with.
            </Text>
          )}

          {action.error && <Text style={{ color: C.danger }}>{action.error.message}</Text>}

          <Pressable onPress={onClose} style={{ padding: 8, alignItems: "center" }}>
            <Text style={{ color: C.accent, fontWeight: "600" }}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
