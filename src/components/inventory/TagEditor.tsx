import { useState } from "react";
import { View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { pretty } from "@/lib/format";
import {
  addTypedTag,
  BONUS_PRESETS,
  bonusOf,
  toggleWord,
  withBonus,
  WORD_PRESETS,
  wordsOf,
} from "@/lib/itemTags";
import { Btn, Chip, ui } from "./ui";

export function TagEditor({
  tags,
  disabled,
  onChange,
}: {
  tags: string[];
  disabled?: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [typed, setTyped] = useState("");
  const [invalid, setInvalid] = useState(false);

  const bonus = bonusOf(tags);
  // Whatever the entry already has shows too, such as a +4 or a label typed earlier.
  const bonuses = [...new Set([0, ...BONUS_PRESETS, bonus])].sort((a, b) => a - b);
  const words = [...new Set([...WORD_PRESETS, ...wordsOf(tags)])];

  const addTyped = () => {
    const next = addTypedTag(tags, typed);
    setInvalid(!next);
    if (!next) return;
    setTyped("");
    if (next !== tags) onChange(next);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={[ui.row, { flexWrap: "wrap" }]}>
        {bonuses.map((b) => (
          <Chip
            key={b}
            label={b ? `+${b}` : "No bonus"}
            active={b === bonus}
            disabled={disabled}
            onPress={() => {
              if (b !== bonus) onChange(withBonus(tags, b));
            }}
          />
        ))}
      </View>
      <View style={[ui.row, { flexWrap: "wrap" }]}>
        {words.map((w) => (
          <Chip
            key={w}
            label={pretty(w)}
            active={tags.includes(w)}
            disabled={disabled}
            onPress={() => onChange(toggleWord(tags, w))}
          />
        ))}
      </View>
      <View style={ui.row}>
        <TextInput
          value={typed}
          onChangeText={(t) => {
            setTyped(t);
            setInvalid(false);
          }}
          onSubmitEditing={addTyped}
          autoCapitalize="none"
          placeholder="Other tag, e.g. mithral"
          style={[ui.input, { flex: 1 }]}
        />
        <Btn label="Add tag" disabled={disabled || !typed.trim()} onPress={addTyped} />
      </View>
      {invalid && (
        <Text style={ui.err}>
          Use a +X bonus, or up to 32 letters, numbers, spaces, hyphens or underscores.
        </Text>
      )}
    </View>
  );
}
