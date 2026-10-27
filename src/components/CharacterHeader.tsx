import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCharacter, getSheet, listContent } from "@/lib/api/characters";
import { AcModal } from "./AcModal";
import { HpModal } from "./HpModal";
import { InspirationModal } from "./InspirationModal";
import { PortraitModal } from "./PortraitModal";
import { RestModal } from "./RestModal";

const pretty = (s?: string) =>
  s ? s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

const signed = (n?: number) => (n === undefined ? "–" : n >= 0 ? `+${n}` : `${n}`);

export function CharacterHeader({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const [hpOpen, setHpOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const [acOpen, setAcOpen] = useState(false);
  const [portraitOpen, setPortraitOpen] = useState(false);
  const [inspirationOpen, setInspirationOpen] = useState(false);
  const [brokenPortrait, setBrokenPortrait] = useState<string>();

  // Same query keys as the screens below, so the cache is shared.
  const sheet = useQuery({ queryKey: ["sheet", id], queryFn: () => getSheet(id) }).data;
  const character = useQuery({ queryKey: ["character", id], queryFn: () => getCharacter(id) }).data;
  const classes = useQuery({
    queryKey: ["content", "classes"],
    queryFn: () => listContent("classes"),
  }).data;

  const className = (cid?: string) =>
    classes?.find((c) => c.id === cid)?.name ?? pretty(cid);
  const classLine =
    character?.classes?.map((c) => `${className(c.class_id)} ${c.level}`).join(" / ") ?? "";

  const current = character?.current_hp ?? 0;
  const max = sheet?.max_hp ?? 0;
  const temp = character?.temp_hp ?? 0;
  const pct = max > 0 ? Math.min(current / max, 1) : 0;
  const conditions = character?.conditions ?? [];
  const inspiration = character?.inspiration ?? 0;
  const portrait = character?.portrait_url;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.titleRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.name}>{character?.name ?? "…"}</Text>
        <Text style={styles.sub}>
          {[pretty(character?.race_id), classLine].filter(Boolean).join(" · ")}
        </Text>
      </View>

      <View style={styles.body}>
        <Pressable style={styles.icon} onPress={() => setPortraitOpen(true)} disabled={!character}>
          {portrait && portrait !== brokenPortrait ? (
            <Image
              source={{ uri: portrait }}
              contentFit="cover"
              transition={150}
              onError={() => setBrokenPortrait(portrait)}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Text style={styles.iconText}>
              {character?.name?.[0]?.toUpperCase() ?? "?"}
            </Text>
          )}
        </Pressable>

        <View style={styles.col}>
          <View style={styles.row}>
            <Box
              label="AC"
              value={sheet?.ac !== undefined ? String(sheet.ac) : "–"}
              onPress={() => setAcOpen(true)}
            />

            <Pressable style={[styles.box, styles.hp]} onPress={() => setHpOpen(true)}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct * 100}%` }]} />
              </View>
              <Text style={styles.hpText}>
                HP {current}/{max}
                {temp > 0 ? `  +${temp} temp` : ""}
              </Text>
            </Pressable>

            <Box
              label="Conditions"
              value={conditions.length ? conditions.join(", ") : "None"}
              grow
            />
          </View>

          <View style={styles.row}>
            <Box label="Initiative" value={signed(sheet?.initiative)} />
            <Box
              label="Inspiration"
              value={inspiration > 0 ? "●".repeat(inspiration) : "–"}
              grow
              onPress={() => setInspirationOpen(true)}
            />
            <Pressable style={[styles.box, styles.rest]} onPress={() => setRestOpen(true)}>
              <Text style={styles.value}>Rest</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <HpModal
        id={id}
        visible={hpOpen}
        onClose={() => setHpOpen(false)}
        current={current}
        max={max}
        temp={temp}
      />
      <RestModal id={id} visible={restOpen} onClose={() => setRestOpen(false)} />
      <AcModal id={id} visible={acOpen} onClose={() => setAcOpen(false)} />
      <InspirationModal
        id={id}
        visible={inspirationOpen}
        onClose={() => setInspirationOpen(false)}
        current={inspiration}
      />
      {/* Mounted only while open, so the input starts from the saved link each time. */}
      {portraitOpen && (
        <PortraitModal
          id={id}
          visible
          onClose={() => setPortraitOpen(false)}
          current={portrait}
        />
      )}
    </View>
  );
}

function Box({
  label,
  value,
  grow,
  onPress,
}: {
  label: string;
  value: string;
  grow?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[styles.box, grow && { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: "#fafafa", paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderColor: "#ddd" },
  titleRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  back: { fontSize: 28, lineHeight: 28, color: "#1565c0", paddingRight: 4 },
  name: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 14, color: "#555", flexShrink: 1 },
  body: { flexDirection: "row", gap: 8 },
  icon: { width: 72, height: 72, borderRadius: 16, backgroundColor: "#cfd8dc", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  iconText: { fontSize: 32, fontWeight: "700", color: "#37474f" },
  col: { flex: 1, gap: 6 },
  row: { flexDirection: "row", gap: 6 },
  box: { borderWidth: 1, borderColor: "#999", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, justifyContent: "center", backgroundColor: "white", minHeight: 33 },
  label: { fontSize: 10, color: "#777" },
  value: { fontSize: 14, fontWeight: "600" },
  hp: { flex: 2, gap: 3 },
  track: { height: 8, backgroundColor: "#eee", borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, backgroundColor: "#c62828" },
  hpText: { fontSize: 13, fontWeight: "700" },
  rest: { backgroundColor: "#e8f0fe", alignItems: "center" },
});