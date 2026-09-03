import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const shell = fs.readFileSync("app/clearwater/resident-shell.tsx", "utf8");
const handoff = fs.readFileSync("app/clearwater/project-handoff.tsx", "utf8");

test("cross-Guide selection carries the resolved address and opens the selected Guide", () => {
  assert.match(shell, /selected\.path[\s\S]*address=\$\{encodeURIComponent\(confirmedAddress!\)\}[\s\S]*project=\$\{selected\.key\}/);
  assert.match(shell, /key === activeGuide.*setStage\("guide"\)/);
});

test("cross-Guide routes render a neutral handoff before trusted lookup completes", () => {
  assert.match(handoff, /Loading property guidance…/);
  assert.doesNotMatch(handoff, /Property address|Enter your property address/);
  assert.match(shell, /isProjectHandoff/);
  assert.match(shell, /isProjectHandoff \? "handoff" : "address"/);
  assert.match(shell, /runLookup\(initialAddress, true\)/);
});

test("handoff failures remain safe without exposing the empty address form", () => {
  assert.match(handoff, /role="alert"/);
  assert.match(handoff, /onNewSearch/);
  assert.match(handoff, /We couldn’t load guidance/);
});

test("new search clears address, trusted result, guide, error, and stage", () => {
  assert.match(shell, /setAddress\(""\); setConfirmedAddress\(null\); setGuide\(null\); setError\(null\); setStage\("address"\)/);
});

test("every lookup retains the Clearwater jurisdiction gate", () => {
  for (const name of ["fence", "shed", "setbacks", "short-term-rental", "impervious-surface-ratio", "pool"]) {
    const source = fs.readFileSync(`app/clearwater/${name}/actions.ts`, "utf8");
    assert.match(source, /findPropertyByAddress/);
    assert.match(source, /requireClearwaterProperty\(property\)/);
  }
});
