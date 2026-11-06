export const signed = (n?: number) =>
  n === undefined ? "–" : n >= 0 ? `+${n}` : `${n}`;

export const pretty = (s?: string) =>
  s ? s.replace(/[-_:]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

// ("1d8", 2) -> "1d8+2", ("1d6", -1) -> "1d6-1", (undefined, 3) -> "3"
export const damageText = (dice?: string, bonus?: number) =>
  dice ? `${dice}${bonus ? signed(bonus) : ""}` : String(bonus ?? 0);

// "1 action" -> "1A", "1 bonus action" -> "1B", "1 reaction" -> "1R"; anything else unchanged
export const shortTime = (t?: string) => {
  if (!t) return "–";
  const m = t.toLowerCase().match(/^(\d+)\s*(action|bonus action|reaction)/);
  if (!m) return t;
  return `${m[1]}${m[2] === "action" ? "A" : m[2] === "reaction" ? "R" : "B"}`;
};

// "120 feet" -> "120ft"
export const shortRange = (r?: string) =>
  r ? r.replace(/\s*(feet|foot)\b/i, "ft") : "–";

export const levelLabel = (n: number) =>
  n === 0 ? "Cantrip" : ["", "1st", "2nd", "3rd"][n] || `${n}th`;

const ABILITY_NAMES: Record<string, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

const TARGET_LABELS: Record<string, string> = {
  ac: "AC",
  "hp.max": "max HP",
  "spell.attack": "spell attacks",
  "spell.save_dc": "spell save DC",
  "damage.all": "damage",
};

// A modifier's target as words, to read after "on": "save.str" -> "Strength saves",
// "skill.sleight_of_hand" -> "Sleight of Hand", "damage.melee" -> "melee damage"
export const targetLabel = (target: string) => {
  if (TARGET_LABELS[target]) return TARGET_LABELS[target];
  const [group, ...rest] = target.split(".");
  const name = rest.join(" ");
  const lower = pretty(name).toLowerCase();
  const titled = pretty(name).replace(/ Of /g, " of ");
  const subject = ABILITY_NAMES[name] ?? lower;
  switch (group) {
    case "ability":
      return `${subject} score`;
    case "attack":
      return `${lower} attacks`;
    case "check":
      return `${subject} checks`;
    case "damage":
      return rest[0] === "cantrip" ? `${pretty(rest[1])} cantrip damage` : `${lower} damage`;
    case "passive":
      return `passive ${titled}`;
    case "save":
      return `${subject} saves`;
    case "sense":
    case "skill":
      return titled;
    case "speed":
      return `${lower} speed`;
    case "spell":
      return rest[0] === "cantrips" ? `${pretty(rest[1])} cantrips known` : lower;
    default:
      return pretty(target.replace(/\./g, " ")).toLowerCase();
  }
};
