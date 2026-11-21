import { useQueries, useQuery } from "@tanstack/react-query";
import { getContent, getSheet } from "@/lib/api/characters";
import type { Feature, Warning } from "@/lib/api/client";

export type KnownInfusion = {
  id: string; // what goes in the item's infusion:<id> tag
  name: string;
  options: string[]; // Resistant Armor's damage types; empty when there's nothing to pick
  requiresAttunement: boolean;
};

// Learned infusions show on the sheet as "Infusion: <name>" features. The sheet doesn't say which
// tag id each one uses, so the feature's content is fetched for its infusion block.
export function useKnownInfusions(id: string): KnownInfusion[] {
  const sheet = useQuery({ queryKey: ["sheet", id], queryFn: () => getSheet(id) });
  const featureIds = [
    ...new Set(
      (sheet.data?.features ?? [])
        .filter((f) => f.name?.startsWith("Infusion: "))
        // Instance ids look like "<feature>@<parent>"; content is looked up by the part before "@".
        .map((f) => (f.feature_id ?? "").split("@")[0])
        .filter(Boolean)
    ),
  ];
  const defs = useQueries({
    queries: featureIds.map((fid) => ({
      queryKey: ["content", "features", fid],
      queryFn: () => getContent("features", fid) as Promise<Feature>,
      staleTime: Infinity,
    })),
  });

  const seen = new Set<string>();
  return defs.flatMap((q) => {
    const inf = q.data?.infusion;
    if (!inf?.id || seen.has(inf.id)) return [];
    seen.add(inf.id);
    return [
      {
        id: inf.id,
        name: (q.data?.name ?? inf.id).replace(/^Infusion: /, ""),
        options: inf.options ?? [],
        requiresAttunement: !!inf.requires_attunement,
      },
    ];
  });
}

export const isInfusionWarning = (w: Warning) => !!w.code?.startsWith("infusion_");

// Per-item infusion warnings carry "<entry id>:..." as their value; the limit warning carries a count.
export const warnsAbout = (w: Warning, entryId: string) =>
  w.value === entryId || !!w.value?.startsWith(`${entryId}:`);
