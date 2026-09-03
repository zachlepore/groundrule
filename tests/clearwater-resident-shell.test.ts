import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CLEARWATER_SUPPORTED_GUIDES } from "../app/clearwater/supported-guides";

const workflowNames = ["fence", "shed", "setbacks", "short-term-rental", "impervious-surface-ratio", "pool"];

test("Clearwater has one canonical, complete, duplicate-free supported Guide registry", () => {
  assert.deepEqual(CLEARWATER_SUPPORTED_GUIDES.map(({ key, label }) => ({ key, label })), [
    { key: "fence", label: "Fence" },
    { key: "shed", label: "Shed" },
    { key: "setbacks", label: "Setbacks" },
    { key: "short-term-rental", label: "Short-term rental" },
    { key: "impervious-surface-ratio", label: "Impervious surface ratio" },
    { key: "pool", label: "Pool" },
  ]);
  assert.equal(new Set(CLEARWATER_SUPPORTED_GUIDES.map((guide) => guide.key)).size, 6);
});

test("all workflows use the resident shell rather than cloning the primary selector", () => {
  for (const name of workflowNames) {
    const source = fs.readFileSync(`app/clearwater/${name}/workflow.tsx`, "utf8");
    assert.match(source, /<ClearwaterResidentShell activeGuide=/);
    assert.doesNotMatch(source, /What do you need help with\?/);
    assert.doesNotMatch(source, /className="project-grid"/);
  }
  const shell = fs.readFileSync("app/clearwater/resident-shell.tsx", "utf8");
  assert.match(shell, /CLEARWATER_SUPPORTED_GUIDES\.map/);
  assert.match(shell, /What do you need help with\?/);
});

test("direct Pool access selects Pool while the shell supplies all six choices", () => {
  const page = fs.readFileSync("app/clearwater/pool/page.tsx", "utf8");
  const workflow = fs.readFileSync("app/clearwater/pool/workflow.tsx", "utf8");
  assert.match(page, /query|const q/);
  assert.match(page, /project==="pool"/);
  assert.match(workflow, /activeGuide="pool"/);
  assert.equal(CLEARWATER_SUPPORTED_GUIDES.length, 6);
});

test("Guide switching preserves the address and New Search clears shell state", () => {
  const shell = fs.readFileSync("app/clearwater/resident-shell.tsx", "utf8");
  assert.match(shell, /address=\$\{encodeURIComponent\(confirmedAddress!\)\}/);
  for (const key of ["shed", "setbacks", "short-term-rental"]) {
    assert.ok(CLEARWATER_SUPPORTED_GUIDES.some((guide) => guide.key === key));
  }
  assert.match(shell, /setAddress\(""\); setConfirmedAddress\(null\); setGuide\(null\); setError\(null\); setStage\("address"\)/);
});

test("server revalidation and Clearwater jurisdiction gating remain per Guide", () => {
  for (const name of workflowNames) {
    const action = fs.readFileSync(`app/clearwater/${name}/actions.ts`, "utf8");
    assert.match(action, /findPropertyByAddress/);
    assert.match(action, /requireClearwaterProperty/);
    assert.match(action, /evaluateProjectRules/);
  }
  const shell = fs.readFileSync("app/clearwater/resident-shell.tsx", "utf8");
  assert.match(shell, /direct Guide route revalidates the address/);
});

test("contextual handoffs remain intentionally narrow and separate", () => {
  const pool = fs.readFileSync("app/clearwater/pool/workflow.tsx", "utf8");
  assert.match(pool, /openGuide\("fence"\)/);
  assert.match(pool, /openGuide\("impervious-surface-ratio"\)/);
  assert.doesNotMatch(pool, /openGuide\("shed"\)/);
  const setbacks = fs.readFileSync("app/clearwater/setbacks/workflow.tsx", "utf8");
  assert.match(setbacks, /relatedGuides = \[\{key:"fence".*\{key:"shed"/);
});
