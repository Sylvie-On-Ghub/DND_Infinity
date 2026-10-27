import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import type { ResourceView } from "@/lib/api/client";
import { C } from "@/lib/colors";

const RECHARGE: Record<string, string> = {
  short_rest: "Short rest",
  long_rest: "Long rest",
  dawn: "Dawn",
  none: "No recharge",
};

export function UsesCounter({
  res,
  busy,
  onSpend,
  onRestore,
}: {
  res: ResourceView;
  busy: boolean;
  onSpend: () => void;
  onRestore: () => void;
}) {
  const max = res.max ?? 0;
  const remaining = res.remaining ?? Math.max(0, max - (res.used ?? 0));
  const canSpend = remaining > 0;
  const canRestore = remaining < max;

  return (
    <View style={s.uses}>
      <Pressable
        disabled={busy || !canSpend}
        onPress={onSpend}
        style={[s.stepBtn, (busy || !canSpend) && s.dim]}
        hitSlop={6}
      >
        <Text style={s.stepText}>−</Text>
      </Pressable>

      <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
        <Text style={s.count}>
          {remaining} / {max}
        </Text>
        {max > 0 && max <= 10 && (
          <View style={s.pips}>
            {Array.from({ length: max }, (_, i) => (
              <View key={i} style={[s.pip, i < remaining && s.pipFull]} />
            ))}
          </View>
        )}
        <Text style={s.meta}>Uses left · {RECHARGE[res.recharge ?? "none"]}</Text>
      </View>

      <Pressable
        disabled={busy || !canRestore}
        onPress={onRestore}
        style={[s.stepBtn, (busy || !canRestore) && s.dim]}
        hitSlop={6}
      >
        <Text style={s.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  uses: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    paddingTop: 8,
  },
  count: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 12, color: C.muted },
  pips: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  pip: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: C.surface,
  },
  pipFull: { backgroundColor: C.accent },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: C.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontSize: 26, fontWeight: "700" },
  dim: { opacity: 0.35 },
});
