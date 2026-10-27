import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { changeCoins } from "@/lib/api/characters";
import type { CoinsAction } from "@/lib/api/client";
import { useSheetAction } from "@/lib/api/useSheetAction";
import { Btn, Chip, ModalShell, ui } from "./ui";

type Coin = { id?: string; name?: string; abbrev?: string };

export function CoinsModal({
  id,
  coins,
  balances,
  totalText,
  onClose,
}: {
  id: string;
  coins: Coin[];
  balances: Record<string, number>;
  totalText: string;
  onClose: () => void;
}) {
  const action = useSheetAction(id);
  const [mode, setMode] = useState<"gain" | "spend" | "convert">("gain");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [from, setFrom] = useState(coins[0]?.id ?? "");
  const [to, setTo] = useState(coins[1]?.id ?? "");
  const [convAmount, setConvAmount] = useState("");

  const map: Record<string, number> = {};
  for (const [k, v] of Object.entries(amounts)) {
    const n = parseInt(v, 10);
    if (n > 0) map[k] = n;
  }
  const convN = parseInt(convAmount, 10);
  const canApply =
    mode === "convert"
      ? convN > 0 && !!from && !!to && from !== to
      : Object.keys(map).length > 0;

  const apply = () => {
    const body: CoinsAction =
      mode === "convert"
        ? { convert: { from, to, amount: convN } }
        : mode === "gain"
        ? { gain: map }
        : { spend: map };
    action.mutate(() => changeCoins(id, body), { onSuccess: onClose });
  };

  return (
    <ModalShell title={`Coins · ${totalText}`} onClose={onClose}>
      <View style={ui.row}>
        <Chip label="Gain" active={mode === "gain"} onPress={() => setMode("gain")} />
        <Chip label="Spend" active={mode === "spend"} onPress={() => setMode("spend")} />
        <Chip label="Convert" active={mode === "convert"} onPress={() => setMode("convert")} />
      </View>

      {mode !== "convert" ? (
        <>
          <Text style={ui.muted}>
            Enter an amount for each coin you want to {mode}. You can fill in several at once.
          </Text>
          {coins.map((c) => (
            <View key={c.id} style={ui.row}>
              <Text style={{ flex: 1, fontSize: 16 }}>
                {c.name} <Text style={ui.muted}>({balances[c.id ?? ""] ?? 0})</Text>
              </Text>
              <TextInput
                value={amounts[c.id ?? ""] ?? ""}
                onChangeText={(t) => setAmounts((p) => ({ ...p, [c.id ?? ""]: t }))}
                keyboardType="number-pad"
                placeholder="0"
                style={[ui.input, { width: 90, textAlign: "center" }]}
              />
            </View>
          ))}
          {mode === "spend" && (
            <Text style={ui.muted}>
              {"Spending exactly the coins you enter. If you don't have enough, the balance goes negative and a warning appears. Use Convert first to make change."}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text style={ui.label}>Convert from</Text>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {coins.map((c) => (
              <Chip key={c.id} label={c.name ?? c.id ?? "?"} active={from === c.id} onPress={() => setFrom(c.id ?? "")} />
            ))}
          </View>
          <Text style={ui.label}>to</Text>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {coins.map((c) => (
              <Chip key={c.id} label={c.name ?? c.id ?? "?"} active={to === c.id} onPress={() => setTo(c.id ?? "")} />
            ))}
          </View>
          <Text style={ui.label}>How many to convert</Text>
          <TextInput
            value={convAmount}
            onChangeText={setConvAmount}
            keyboardType="number-pad"
            placeholder="Amount"
            style={ui.input}
          />
          <Text style={ui.muted}>
            The result must be a whole number of the target coin, otherwise the server refuses.
          </Text>
        </>
      )}

      {action.error && <Text style={ui.err}>{action.error.message}</Text>}
      <Btn label="Apply" disabled={!canApply || action.isPending} onPress={apply} />
    </ModalShell>
  );
}
