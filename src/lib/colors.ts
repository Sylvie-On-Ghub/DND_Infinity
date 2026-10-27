// The app's palette (dark). Change a value here to restyle every screen.
export const C = {
  bg: "#09090b", // page background, behind cards
  surface: "#151518", // cards, inputs, header
  text: "#ededf0",
  textSecondary: "#b4b6bd",
  muted: "#85878f",
  placeholder: "#5b5d65",
  border: "#27272c", // card and input outlines
  divider: "#1e1e22", // rows inside a card
  fill: "#212126", // neutral buttons and chips
  fillStrong: "#2c2c32",

  accent: "#7c7ff7",
  accentDark: "#5f62e8",
  accentSoft: "#1d1d36", // selected rows, highlighted chips
  accentMuted: "#3a3c6e", // disabled accent buttons
  onAccent: "#ffffff", // text on accent, danger and success fills

  danger: "#e5605e",
  dangerDark: "#a83a38",
  success: "#2f9e6f",
  warning: "#e0a03c",
  warningSoft: "#231c10",
  warningBorder: "#4d3b17",
  magic: "#9b7bf0", // pact and magic item actions

  backdrop: "rgba(0,0,0,0.7)",
  shadow: "#000000",
} as const;
