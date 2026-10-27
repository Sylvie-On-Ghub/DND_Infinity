import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { PAGES } from "@/lib/pages";
import { C } from "@/lib/colors";
import { usePageNav } from "@/lib/usePageNav";

export function PageDropdown({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const { current, goTo } = usePageNav(id);

  const go = (i: number) => {
    setOpen(false);
    goTo(i);
  };

  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.surface }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: C.surface,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>{current.label}</Text>
        <Text style={{ fontSize: 16 }}>{open ? "▴" : "▾"}</Text>
      </Pressable>

      {open && (
        <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 8, marginTop: 4, backgroundColor: C.surface }}>
          {PAGES.map((p, i) => (
            <Pressable
              key={p.slug || "index"}
              onPress={() => go(i)}
              style={{
                padding: 12,
                backgroundColor: p.slug === current.slug ? C.accentSoft : "transparent",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: p.slug === current.slug ? "700" : "400" }}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}