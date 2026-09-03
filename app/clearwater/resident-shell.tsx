"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProjectHandoffStatus } from "./project-handoff";
import { CLEARWATER_SUPPORTED_GUIDES, type ClearwaterGuideKey } from "./supported-guides";

type BlockedLookup = { status: "blocked"; reason: "outside" | "unconfirmed"; jurisdictionName?: string | null };
type EligibleLookup<Guide> = { status: "eligible"; displayAddress: string; guide: Guide | null };
type LookupResult<Guide> = EligibleLookup<Guide> | BlockedLookup | null;

const residentAddress = (value: string) => value.toLocaleLowerCase("en-US").replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-US"));

export function ClearwaterResidentShell<Guide>({
  activeGuide,
  initialAddress = "",
  openProject = false,
  lookup,
  validateGuide,
  children,
}: {
  activeGuide?: ClearwaterGuideKey;
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

  const runLookup = (requestedAddress = address, showGuide = false) => startTransition(async () => {
    try {
      const found = await lookup(requestedAddress);
      if (!found) {
        setStage(showGuide ? "handoff" : "address");
        setError("This address isn’t in our limited Clearwater pilot area yet. We did not evaluate it.");
        return;
      }
      if (found.status === "blocked") {
        setStage(showGuide ? "handoff" : "address");
        setError(found.reason === "outside"
          ? `THIS PROPERTY IS OUTSIDE CLEARWATER CITY LIMITS · Jurisdiction · ${found.jurisdictionName ?? "Outside Clearwater"}. Clearwater's property rules don't apply to this address.`
          : "WE COULDN’T CONFIRM THIS PROPERTY’S JURISDICTION. Groundrule won’t apply Clearwater rules until it can be confirmed.");
        return;
      }
      if (found.guide && validateGuide && !validateGuide(found.guide)) {
        setStage(showGuide ? "handoff" : "project");
        setError("We couldn’t establish supported guidance for this property. No generic values were substituted.");
        return;
      }
      setAddress(requestedAddress);
      setConfirmedAddress(found.displayAddress);
      setGuide(found.guide);
      setStage(showGuide && found.guide ? "guide" : "project");
      setError(null);
    } catch {
      setStage(showGuide ? "handoff" : "address");
      setError("We couldn’t look up that address right now. Please try again later.");
    }
  });

  const opened = useRef(false);
  // A direct Guide route revalidates the address once through that Guide's server action.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (openProject && initialAddress && !opened.current) { opened.current = true; runLookup(initialAddress, true); } }, [initialAddress, openProject]);

  const reset = () => { setAddress(""); setConfirmedAddress(null); setGuide(null); setError(null); setStage("address"); };
  const openGuide = (key: ClearwaterGuideKey) => {
    if (key === activeGuide && guide) { setStage("guide"); return; }
    const selected = CLEARWATER_SUPPORTED_GUIDES.find((item) => item.key === key)!;
    router.push(`${selected.path}?address=${encodeURIComponent(confirmedAddress!)}&project=${selected.key}`);
  };

  const propertyChooser = confirmedAddress && <section className="address-panel">
    <p className="found">✓ Property found</p>
    <h1 className="address-heading">{residentAddress(confirmedAddress)}<small>Clearwater, FL</small></h1>
    <div className="project-choice"><h2>What do you need help with?</h2><div className="project-grid">
      {CLEARWATER_SUPPORTED_GUIDES.map((item) => <button key={item.key} aria-current={stage === "guide" && item.key === activeGuide ? "page" : undefined} onClick={() => openGuide(item.key)}>{item.label} <span>→</span></button>)}
    </div></div>
  </section>;

  return <main className="workflow-shell">
    <header className="workflow-brand">GROUNDRULE <span>Clearwater, Florida</span></header>
    {stage === "handoff" && <ProjectHandoffStatus error={error} onNewSearch={reset}/>} 
    {stage === "address" && <section className="address-panel"><p className="eyebrow">Clearwater property guide</p><h1>Enter your property address</h1><p className="workflow-copy">Guidance based on current City rules and property data.</p><div className="address-form"><input aria-label="Property address" autoComplete="street-address" placeholder="1950 Drew Plz" value={address} onChange={(event) => setAddress(event.target.value)} onKeyDown={(event) => event.key === "Enter" && address.trim() && runLookup()}/><button disabled={pending || !address.trim()} onClick={() => runLookup()}>{pending ? "Looking…" : "Continue"}</button></div>{error && <p role="alert" className="warning">{error}</p>}</section>}
    {(stage === "project" || stage === "guide") && propertyChooser}
    {stage === "guide" && guide && confirmedAddress && <>{children(guide, openGuide)}<button className="new-search" onClick={reset}>← New search</button></>}
  </main>;
}
