import { municipalityThemeProperties } from "../lib/municipality-themes";

export function MunicipalityTheme({ slug, children }: { slug: string; children: React.ReactNode }) {
  return <div className="municipality-theme" data-municipality-theme={slug} style={municipalityThemeProperties(slug)}>{children}</div>;
}
