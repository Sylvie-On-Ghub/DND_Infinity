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
