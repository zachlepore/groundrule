import { MunicipalityTheme } from "../municipality-theme";

export default function ClearwaterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <MunicipalityTheme slug="clearwater">{children}</MunicipalityTheme>;
}
