// C:\Projects\animanga-platform\apps\web\src\config\theme.config.ts

export const BRAND_COLORS = {
  cornflower: "#548ccf",
  cornflowerDeep: "#3b76bc",
  cornflowerLight: "#7aa8e0",
  cerulean: "#4ba3e3",
  periwinkle: "#6b7fd7",
} as const;

export const THEME_PALETTE = {
  light: {
    background: "#eef3f9",
    card: "#f6f9fc",
    secondary: "#e1ebf5",
    accent: "#d4e3f3",
    foreground: "#182638",
    mutedForeground: "#4f6580",
    primary: "#3b76bc",
    primaryBrand: "#548ccf",
    fogColor: "#eef3f9",
    sparkleColor: "#548ccf",
  },
  dark: {
    background: "#111926",
    card: "#182334",
    secondary: "#202f45",
    accent: "#263852",
    foreground: "#e6eef8",
    mutedForeground: "#94aac4",
    primary: "#548ccf",
    primaryBrand: "#548ccf",
    fogColor: "#111926",
    sparkleColor: "#7aa8e0",
  },
} as const;

export type ThemeMode = keyof typeof THEME_PALETTE;

export function getThemeTokens(resolvedTheme?: string) {
  return resolvedTheme === "light" ? THEME_PALETTE.light : THEME_PALETTE.dark;
}
