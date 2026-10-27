import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { ChoicePicker } from "@/components/ChoicePicker";
import { LevelUpModal } from "@/components/LevelUpModal";
import { getSheet } from "@/lib/api/characters";
import type { PendingChoice } from "@/lib/api/client";
import { Page } from "@/components/Page";

export default function SheetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [activeChoice, setActiveChoice] = useState<PendingChoice | null>(null);

  const { data: sheet, error, isLoading } = useQuery({
    queryKey: ["sheet", id],
    queryFn: () => getSheet(id),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (error || !sheet) {
    return (
      <Text style={{ padding: 16, color: "#b71c1c" }}>
        {error?.message ?? "No sheet returned"}
      </Text>
    );
  }

  return (
    <Page>
      <View style={{ flexDirection: "row", gap: 24, alignItems: "center" }}>
        <Stat label="Level" value={sheet.level} />
        <Stat label="Prof" value={sheet.proficiency_bonus} />
        <Pressable
          onPress={() => setLevelUpOpen(true)}
          style={{ backgroundColor: "#6a1b9a", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>Level up</Text>
        </Pressable>
      </View>

      {!!sheet.warnings?.length && (
        <View style={{ backgroundColor: "#fff8e1", padding: 12, borderRadius: 8 }}>
          <Text style={{ fontWeight: "700", marginBottom: 4 }}>Warnings</Text>
          {sheet.warnings.map((w) => (
            <Text key={w.key}>• {w.message}</Text>
          ))}
        </View>
      )}

      {!!sheet.pending_choices?.length && (
        <View style={{ backgroundColor: "#e8f0fe", padding: 12, borderRadius: 8, gap: 8 }}>
          <Text style={{ fontWeight: "700" }}>Pending choices (tap to resolve)</Text>
          {sheet.pending_choices.map((p) => (
              <Pressable
                key={`${p.feature_id}:${p.choice_id}`}
                onPress={() =>
                  p.feature_id === "character"
                    ? router.replace(`/character/${id}/edit` as Href)
                    : setActiveChoice(p)
                }
              >
                <Text style={{ color: "#1565c0", fontSize: 16 }}>
                  • {p.prompt} ({p.remaining} left)
                </Text>
              </Pressable>
            ))}
        </View>
      )}

      <LevelUpModal id={id} visible={levelUpOpen} onClose={() => setLevelUpOpen(false)} />
      {activeChoice && (
        <ChoicePicker id={id} choice={activeChoice} onClose={() => setActiveChoice(null)} />
      )}
    </Page>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>{value ?? "–"}</Text>
      <Text style={{ color: "#777" }}>{label}</Text>
    </View>
  );
}