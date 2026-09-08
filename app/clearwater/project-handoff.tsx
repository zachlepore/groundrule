"use client";

type ResidentMessage = { title: string; detail: string; severity: "neutral" | "error" };

export function ProjectHandoffStatus({ message, onNewSearch }: { message: ResidentMessage | null; onNewSearch: () => void }) {
  return <section className="address-panel handoff-status" aria-live="polite">
    <p className="eyebrow">Clearwater property guide</p>
    <h1>{message ? message.title : "Loading property guidance…"}</h1>
    {message && <><p role={message.severity === "error" ? "alert" : "status"} className={`address-state ${message.severity}`}><span>{message.detail}</span></p><button className="new-search" onClick={onNewSearch}>← New search</button></>}
  </section>;
}
