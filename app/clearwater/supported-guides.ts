export const CLEARWATER_SUPPORTED_GUIDES = [
  { key: "fence", label: "Fence", path: "/clearwater/fence" },
  { key: "shed", label: "Shed", path: "/clearwater/shed" },
  { key: "setbacks", label: "Setbacks", path: "/clearwater/setbacks" },
  { key: "short-term-rental", label: "Short-term rental", path: "/clearwater/short-term-rental" },
  { key: "impervious-surface-ratio", label: "Impervious surface ratio", path: "/clearwater/impervious-surface-ratio" },
  { key: "pool", label: "Pool", path: "/clearwater/pool" },
] as const;

export type ClearwaterGuideKey = (typeof CLEARWATER_SUPPORTED_GUIDES)[number]["key"];
