const SUFFIXES: Record<string, string> = {
  ST: "ST", STREET: "ST", RD: "RD", ROAD: "RD", AVE: "AVE", AVENUE: "AVE",
  DR: "DR", DRIVE: "DR", PL: "PL", PLACE: "PL", PLZ: "PLZ", PLAZA: "PLZ",
  CT: "CT", COURT: "CT", LN: "LN", LANE: "LN", BLVD: "BLVD", BOULEVARD: "BLVD",
  HWY: "HWY", HIGHWAY: "HWY", PKWY: "PKWY", PARKWAY: "PKWY", CIR: "CIR",
  CIRCLE: "CIR", TER: "TER", TERRACE: "TER",
};

/** Conservative, municipality-independent comparison form. Display addresses remain untouched. */
export function normalizeAddress(address: string): string {
  return address
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((token) => SUFFIXES[token] ?? token)
    .join(" ");
}

export type AddressMatchType = "exact" | "prefix" | "fuzzy";

export interface MunicipalityAddressCandidate {
  propertyId: string;
  canonicalAddress: string;
  municipality: string;
  matchType: AddressMatchType;
}
