"use client";

export function ProjectHandoffStatus({ error, onNewSearch }: { error: string | null; onNewSearch: () => void }) {
  return <section className="address-panel handoff-status" aria-live="polite">
    <p className="eyebrow">Clearwater property guide</p>
    <h1>{error ? "We couldn’t load guidance" : "Loading property guidance…"}</h1>
    {error && <><p role="alert" className="warning">{error}</p><button className="new-search" onClick={onNewSearch}>← New search</button></>}
  </section>;
}
