import type { Sheet } from "./api/client";

type PageDef = { slug: string; label: string; needsPets?: boolean };

export const PAGES: PageDef[] = [
  { slug: "", label: "Abilities, Saves & Senses" },
  { slug: "defenses", label: "Speed & Defenses" },
  { slug: "skills", label: "Skills & Proficiencies" },
  { slug: "actions", label: "Actions" },
  { slug: "features", label: "Features & Traits" },
  { slug: "spells", label: "Spells" },
  { slug: "inventory", label: "Inventory" },
  { slug: "characteristics", label: "Characteristics" },
  { slug: "pets", label: "Pets", needsPets: true },
  { slug: "edit", label: "Edit Character" },
];
  // later: { slug: "skills", label: "Skills" }, { slug: "spells", label: "Spells" } …

// The pages this character can visit: Pets only shows once they have one.
export const pagesFor = (sheet?: Sheet) =>
  PAGES.filter((p) => !p.needsPets || (sheet?.pets?.length ?? 0) > 0);
