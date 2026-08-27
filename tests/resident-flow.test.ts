import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const fence = fs.readFileSync("app/clearwater/fence/workflow.tsx", "utf8");
const shed = fs.readFileSync("app/clearwater/shed/workflow.tsx", "utf8");
const fencePage = fs.readFileSync("app/clearwater/fence/page.tsx", "utf8");
const shedPage = fs.readFileSync("app/clearwater/shed/page.tsx", "utf8");

test("first cross-project selection carries the resolved address and opens the selected guide", () => {
  assert.match(fence, /clearwater\/shed\?address=\$\{encodeURIComponent\(confirmedAddress\)\}&project=shed/);
  assert.match(shed, /clearwater\/fence\?address=\$\{encodeURIComponent\(confirmed\)\}&project=fence/);
  for (const [workflow, page, project] of [[fence, fencePage, "fence"], [shed, shedPage, "shed"]]) {
    assert.match(page, /query\.address/);
    assert.match(page, new RegExp(`query\\.project\\s*===\\s*"${project}"`));
    assert.match(workflow, /lookup\(initialAddress, true\)/);
    assert.ok(workflow.includes('showGuide ? "guide" : "project"') || workflow.includes('showGuide?"guide":"project"'));
  }
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
