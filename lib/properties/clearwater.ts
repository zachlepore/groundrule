import type { StoredPropertyProfile } from "./types";
import { gateClearwaterEvaluation } from "./jurisdiction";

export function requireClearwaterProperty(profile: StoredPropertyProfile) {
  return gateClearwaterEvaluation(profile);
}
