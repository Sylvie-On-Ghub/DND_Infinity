import { router, usePathname, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PAGES } from "@/lib/pages";

export function PageDropdown({ id }: { id: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const current =
    PAGES.find((p) => p.slug && pathname.endsWith(`/${p.slug}`)) ?? PAGES[0];

  const go = (slug: string) => {
    setOpen(false);
    if (slug === current.slug) return;
    // replace, not push, so switching pages doesn't build a back stack
    router.replace(`/character/${id}${slug ? `/${slug}` : ""}` as Href);
  };

  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fafafa" }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: "#999",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: "white",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>{current.label}</Text>
        <Text style={{ fontSize: 16 }}>{open ? "▴" : "▾"}</Text>
      </Pressable>

      {open && (
        <View style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginTop: 4, backgroundColor: "white" }}>
          {PAGES.map((p) => (
            <Pressable
              key={p.slug || "index"}
              onPress={() => go(p.slug)}
              style={{
                padding: 12,
                backgroundColor: p.slug === current.slug ? "#e8f0fe" : "transparent",
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