import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { getSheet } from "@/lib/api/characters";
import { C } from "@/lib/colors";
import { pretty } from "@/lib/format";
import { isInfusionWarning, warnsAbout, type KnownInfusion } from "@/lib/infusions";
import { infusionsOf, infusionTag } from "@/lib/itemTags";
import { Chip, ui } from "./ui";

// The item's infusions, each removable, and the character's known infusions to add. The server
// applies them and warns about misuse (wrong item, over the limit) rather than refusing.
export function InfusionEditor({
  id,
  entryId,
  tags,
  known,
  disabled,
  onChange,
}: {
  id: string;
  entryId: string;
  tags: string[];
  known: KnownInfusion[];
  disabled?: boolean;
  onChange: (tags: string[]) => void;
}) {
  const sheet = useQuery({ queryKey: ["sheet", id], queryFn: () => getSheet(id) });
  // An infusion with options (Resistant Armor) waits for one to be picked before it's added.
  const [choosing, setChoosing] = useState<KnownInfusion | null>(null);

  const current = infusionsOf(tags);
  const nameOf = (infId: string) => known.find((k) => k.id === infId)?.name ?? pretty(infId);
  const addable = known.filter((k) => !current.some((c) => c.id === k.id));
  const warnings = (sheet.data?.warnings ?? []).filter(
    (w) => isInfusionWarning(w) && warnsAbout(w, entryId)
  );

  const add = (k: KnownInfusion, option?: string) => {
    setChoosing(null);
    onChange([...tags, infusionTag(k.id, option)]);
  };

  return (
    <View style={{ gap: 8 }}>
      {current.length === 0 && <Text style={ui.muted}>Not infused</Text>}
      {current.map((c) => (
        <View key={c.tag} style={[ui.row, { paddingVertical: 4 }]}>
          <Text style={{ flex: 1, fontSize: 16, color: C.magic, fontWeight: "600" }}>
            {nameOf(c.id)}
            {c.option ? <Text style={ui.muted}> · {pretty(c.option)}</Text> : null}
          </Text>
          <Pressable
            disabled={disabled}
            hitSlop={6}
            accessibilityLabel={`Remove ${nameOf(c.id)}`}
            onPress={() => onChange(tags.filter((t) => t !== c.tag))}
          >
            <Text style={{ color: C.danger, fontWeight: "600" }}>Remove</Text>
          </Pressable>
        </View>
      ))}

      {warnings.map((w) => (
        <Text key={w.key} style={{ color: C.warning, fontSize: 13 }}>
          ⚠ {w.message}
        </Text>
      ))}

      {choosing ? (
        <View style={{ gap: 6 }}>
          <Text style={ui.muted}>{choosing.name}: choose one</Text>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {choosing.options.map((o) => (
              <Chip key={o} label={pretty(o)} active={false} disabled={disabled} onPress={() => add(choosing, o)} />
            ))}
            <Chip label="Cancel" active={false} onPress={() => setChoosing(null)} />
          </View>
        </View>
      ) : (
        addable.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={ui.muted}>Tap an infusion you know to add it</Text>
            <View style={[ui.row, { flexWrap: "wrap" }]}>
              {addable.map((k) => (
                <Chip
                  key={k.id}
                  label={`+ ${k.name}`}
                  active={false}
                  disabled={disabled}
                  onPress={() => (k.options.length ? setChoosing(k) : add(k))}
                />
              ))}
            </View>
          </View>
        )
      )}
    </View>
  );
}
