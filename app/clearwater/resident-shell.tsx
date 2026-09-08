"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProjectHandoffStatus } from "./project-handoff";
import { CLEARWATER_SUPPORTED_GUIDES, type ClearwaterGuideKey } from "./supported-guides";
import { searchClearwaterAddresses } from "./actions";
import type { MunicipalityAddressCandidate } from "../../lib/properties/address-normalization";

type BlockedLookup = { status: "blocked"; reason: "outside" | "unconfirmed"; jurisdictionName?: string | null };
type EligibleLookup<Guide> = { status: "eligible"; displayAddress: string; guide: Guide | null };
type LookupResult<Guide> = EligibleLookup<Guide> | BlockedLookup | null;

const residentAddress = (value: string) => value.toLocaleLowerCase("en-US").replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-US"));

export function ClearwaterResidentShell<Guide>({
  activeGuide,
  guideTitle,
  initialAddress = "",
  openProject = false,
  lookup,
  validateGuide,
  children,
}: {
  activeGuide?: ClearwaterGuideKey;
  guideTitle?: string;
  initialAddress?: string;
  openProject?: boolean;
  lookup: (address: string) => Promise<LookupResult<Guide>>;
  validateGuide?: (guide: Guide) => boolean;
  children: (guide: Guide, openGuide: (key: ClearwaterGuideKey) => void) => ReactNode;
}) {
  const router = useRouter();
  const isProjectHandoff = openProject && initialAddress.trim().length > 0;
  const [address, setAddress] = useState("");
  const [confirmedAddress, setConfirmedAddress] = useState<string | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [stage, setStage] = useState<"address" | "handoff" | "project" | "guide">(isProjectHandoff ? "handoff" : "address");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<MunicipalityAddressCandidate[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    if (stage !== "address" || selectedAddress || address.trim().length < 3) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try { const matches = await searchClearwaterAddresses(address); if (!cancelled) { setSuggestions(matches); setSuggestionsOpen(matches.length > 0); setActiveSuggestion(-1); } }
      catch { if (!cancelled) setSuggestions([]); }
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [address, selectedAddress, stage]);

  const selectSuggestion = (candidate: MunicipalityAddressCandidate) => {
    setAddress(candidate.canonicalAddress); setSelectedAddress(candidate.canonicalAddress);
    setSuggestionsOpen(false); setSuggestions([]); setActiveSuggestion(-1); setError(null);
  };

  const onAddressKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (suggestionsOpen && suggestions.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setActiveSuggestion((current) => event.key === "ArrowDown" ? (current + 1) % suggestions.length : (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Escape") { setSuggestionsOpen(false); }
    else if (event.key === "Enter" && activeSuggestion >= 0 && suggestionsOpen) { event.preventDefault(); selectSuggestion(suggestions[activeSuggestion]); }
    else if (event.key === "Enter" && address.trim()) { runLookup(); }
  };

  const runLookup = (requestedAddress = address, showGuide = false) => startTransition(async () => {
    try {
      const found = await lookup(requestedAddress);
      if (!found) {
        setStage(showGuide ? "handoff" : "address");
        setError("This address isn’t in the limited Clearwater pilot area yet. It was not evaluated.");
        return;
      }
      if (found.status === "blocked") {
        setStage(showGuide ? "handoff" : "address");
        setError(found.reason === "outside"
          ? `THIS PROPERTY IS OUTSIDE CLEARWATER CITY LIMITS · Jurisdiction · ${found.jurisdictionName ?? "Outside Clearwater"}. Clearwater's property rules don't apply to this address.`
          : "THIS PROPERTY’S JURISDICTION COULDN’T BE CONFIRMED. Clearwater rules will not be applied until the jurisdiction is confirmed.");
        return;
      }
      if (found.guide && validateGuide && !validateGuide(found.guide)) {
        setStage(showGuide ? "handoff" : "project");
        setError("Supported guidance couldn’t be established for this property. No generic values were substituted.");
        return;
      }
      setAddress(requestedAddress);
      setConfirmedAddress(found.displayAddress);
      setGuide(found.guide);
      setStage(showGuide && found.guide ? "guide" : "project");
      setError(null);
    } catch {
      setStage(showGuide ? "handoff" : "address");
      setError("That address couldn’t be looked up right now. Please try again later.");
    }
  });

  const opened = useRef(false);
  // A direct Guide route revalidates the address once through that Guide's server action.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (openProject && initialAddress && !opened.current) { opened.current = true; runLookup(initialAddress, true); } }, [initialAddress, openProject]);

  const reset = () => { setAddress(""); setConfirmedAddress(null); setGuide(null); setError(null); setStage("address"); setSelectedAddress(null); setSuggestions([]); };
  const showOtherOptions = () => { setStage("project"); setError(null); };
  const openGuide = (key: ClearwaterGuideKey) => {
    if (key === activeGuide && guide) { setStage("guide"); return; }
    const selected = CLEARWATER_SUPPORTED_GUIDES.find((item) => item.key === key)!;
    router.push(`${selected.path}?address=${encodeURIComponent(confirmedAddress!)}&project=${selected.key}`);
  };

  const propertyChooser = confirmedAddress && <section className="address-panel confirmed-property">
    <div className="resolved-address">
      <span className="resolved-check" aria-hidden="true">✓</span>
      <p className="address-heading">{residentAddress(confirmedAddress)}<small>Clearwater, FL</small></p>
    </div>
    {stage === "project" && <div className="project-choice"><h2>What do you need help with?</h2><div className="project-grid">
      {CLEARWATER_SUPPORTED_GUIDES.map((item) => <button key={item.key} onClick={() => openGuide(item.key)}>{item.label} <span>→</span></button>)}
    </div></div>}
  </section>;

  return <main className="workflow-shell">
    <header className="workflow-brand">
      <span className="municipality-guidance">Clearwater Property Guidance</span>
      <span className="platform-attribution">Powered by Groundrule</span>
    </header>
    {stage === "handoff" && <ProjectHandoffStatus error={error} onNewSearch={reset}/>} 
    {stage === "address" && <section className="address-panel"><p className="eyebrow">Clearwater property guide</p><h1>Enter your property address</h1><p className="workflow-copy">Guidance based on current City rules and property data.</p><div className="address-form"><div className="address-combobox"><input role="combobox" aria-label="Property address" aria-autocomplete="list" aria-expanded={suggestionsOpen} aria-controls="address-suggestions" aria-activedescendant={activeSuggestion >= 0 ? `address-suggestion-${activeSuggestion}` : undefined} autoComplete="street-address" placeholder="Enter a Clearwater property address" value={address} onChange={(event) => { setAddress(event.target.value); setSelectedAddress(null); setSuggestions([]); setSuggestionsOpen(false); setError(null); }} onFocus={() => suggestions.length && setSuggestionsOpen(true)} onKeyDown={onAddressKeyDown}/>{suggestionsOpen && <ul id="address-suggestions" className="address-suggestions" role="listbox" aria-label="Suggested property addresses">{suggestions.map((candidate, index) => <li id={`address-suggestion-${index}`} role="option" aria-selected={activeSuggestion === index} key={candidate.propertyId}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectSuggestion(candidate)}>{candidate.canonicalAddress}{candidate.matchType === "fuzzy" && <small>Suggested address — select to confirm</small>}</button></li>)}</ul>}</div><button disabled={pending || !address.trim()} onClick={() => runLookup()}>{pending ? "Looking…" : "Continue"}</button></div>{error && <p role="alert" className="warning">{error}</p>}</section>}
    {(stage === "project" || stage === "guide") && propertyChooser}
    {stage === "guide" && guide && confirmedAddress && <>
      <div className="active-guide-heading">
        <h1>{guideTitle}</h1>
        <button type="button" onClick={showOtherOptions}>Other options</button>
      </div>
      {children(guide, openGuide)}
      <button className="new-search" onClick={reset}>← New search</button>
    </>}
  </main>;
}
