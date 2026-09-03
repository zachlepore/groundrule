"use client";

import { ClearwaterResidentShell } from "./resident-shell";
import { startClearwaterPropertyLookup } from "./actions";

export function ClearwaterEntry() {
  return <ClearwaterResidentShell<never> lookup={startClearwaterPropertyLookup}>{() => null}</ClearwaterResidentShell>;
}
