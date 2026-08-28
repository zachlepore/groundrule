import type { CSSProperties } from "react";

export type MunicipalityTheme = {
  primary: string;
  onPrimary: string;
  secondary: string;
  surface: string;
  divider: string;
  secondarySurface: string;
};

export const defaultMunicipalityTheme: MunicipalityTheme = {
  primary: "#1e4d39",
  onPrimary: "#ffffff",
  secondary: "#7f9188",
  surface: "#f3f7f4",
  divider: "#c9ceca",
  secondarySurface: "#faf7ed",
};

export const municipalityThemes = {
  clearwater: {
    primary: "#1d5273",
    onPrimary: "#ffffff",
    secondary: "#9a7446",
    surface: "#f2f7f9",
    divider: "#d5e3e9",
    secondarySurface: "#fbf7ef",
  },
} as const satisfies Record<string, MunicipalityTheme>;

type MunicipalityThemeProperties = CSSProperties & Record<`--municipality-${string}`, string>;

export function getMunicipalityTheme(slug: string): MunicipalityTheme {
  return municipalityThemes[slug as keyof typeof municipalityThemes] ?? defaultMunicipalityTheme;
}

export function municipalityThemeProperties(slug: string): MunicipalityThemeProperties {
  const theme = getMunicipalityTheme(slug);
  return {
    "--municipality-primary": theme.primary,
    "--municipality-on-primary": theme.onPrimary,
    "--municipality-secondary": theme.secondary,
    "--municipality-surface": theme.surface,
    "--municipality-divider": theme.divider,
    "--municipality-secondary-surface": theme.secondarySurface,
  };
}
