import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const fence = fs.readFileSync("app/clearwater/fence/workflow.tsx", "utf8");
const shed = fs.readFileSync("app/clearwater/shed/workflow.tsx", "utf8");
const fencePage = fs.readFileSync("app/clearwater/fence/page.tsx", "utf8");
const shedPage = fs.readFileSync("app/clearwater/shed/page.tsx", "utf8");
const handoff = fs.readFileSync("app/clearwater/project-handoff.tsx", "utf8");

test("first cross-project selection carries the resolved address and opens the selected guide", () => {
  assert.match(fence, /clearwater\/shed\?address=\$\{encodeURIComponent\(confirmedAddress\)\}&project=shed/);
  assert.match(shed, /clearwater\/fence\?address=\$\{encodeURIComponent\(confirmed\)\}&project=fence/);
  for (const [workflow, page, project] of [[fence, fencePage, "fence"], [shed, shedPage, "shed"]]) {
    assert.match(page, /query\.address/);
    assert.match(page, new RegExp(`query\\.project\\s*===\\s*"${project}"`));
    assert.match(workflow, /lookup\(initialAddress,\s*true\)/);
    assert.ok(workflow.includes('showGuide ? "guide" : "project"') || workflow.includes('showGuide?"guide":"project"'));
  }
});

test("cross-project routes render a neutral handoff state before trusted lookup completes", () => {
  assert.match(handoff, /Loading property guidance…/);
  assert.doesNotMatch(handoff, /Property address|Enter your property address/);
  for (const workflow of [fence, shed]) {
    assert.match(workflow, /isProjectHandoff/);
    assert.match(workflow, /isProjectHandoff\s*\?\s*"handoff"\s*:\s*"address"/);
    assert.match(workflow, /stage\s*===?\s*"handoff"/);
    assert.match(workflow, /showGuide\s*\?\s*"handoff"\s*:\s*"address"/);
  }
});

test("handoff failures remain safe without exposing the empty address form", () => {
  assert.match(handoff, /role="alert"/);
  assert.match(handoff, /onNewSearch/);
  assert.match(handoff, /We couldn’t load guidance/);
});

test("same-project choices open locally without navigation or a second lookup", () => {
  assert.match(fence, /onClick=\{\(\) => setStage\("guide"\)\}>Fence/);
  assert.match(shed, /onClick=\{\(\)=>setStage\("guide"\)\}>Shed/);
});

test("new search clears address, trusted result, guide, error, and stage", () => {
  assert.match(fence, /setAddress\(""\); setConfirmedAddress\(null\); setGuide\(null\); setError\(null\); setStage\("address"\)/);
  assert.match(shed, /setAddress\(""\);setConfirmed\(null\);setGuide\(null\);setStage\("address"\);setError\(null\)/);
});

test("every lookup, including route handoff, retains the Clearwater jurisdiction gate", () => {
  for (const action of ["app/clearwater/fence/actions.ts", "app/clearwater/shed/actions.ts"]) {
    const source = fs.readFileSync(action, "utf8");
    assert.match(source, /findPropertyByAddress/);
    assert.match(source, /requireClearwaterProperty\(property\)/);
    assert.match(source, /if\s*\(!?gate\.eligible\)/);
  }
});
