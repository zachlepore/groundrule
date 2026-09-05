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

test("direct Pool access selects Pool in the collapsed shell", () => {
  const page = fs.readFileSync("app/clearwater/pool/page.tsx", "utf8");
  const workflow = fs.readFileSync("app/clearwater/pool/workflow.tsx", "utf8");
  assert.match(page, /query|const q/);
  assert.match(page, /project==="pool"/);
  assert.match(workflow, /activeGuide="pool"/);
  assert.match(workflow, /guideTitle="Pool guidance"/);
  assert.doesNotMatch(workflow, /<h1>Pool guidance<\/h1>/);
  assert.equal(CLEARWATER_SUPPORTED_GUIDES.length, 6);
});

test("the canonical selector is shown only when no Guide is selected", () => {
  const shell = fs.readFileSync("app/clearwater/resident-shell.tsx", "utf8");
  assert.match(shell, /stage === "project" && <div className="project-choice">/);
  assert.match(shell, /stage === "guide" && guide && confirmedAddress/);
  assert.doesNotMatch(shell, /stage === "guide" \|\| stage === "project"\) && <div className="project-choice">/);
});

test("Other options keeps the property and returns only to the canonical selector", () => {
  const shell = fs.readFileSync("app/clearwater/resident-shell.tsx", "utf8");
  assert.match(shell, /const showOtherOptions = \(\) => \{ setStage\("project"\); setError\(null\); \}/);
  assert.match(shell, /onClick=\{showOtherOptions\}>Other options<\/button>/);
  const handler = shell.match(/const showOtherOptions = .*?;/)?.[0] ?? "";
  assert.doesNotMatch(handler, /setAddress|setConfirmedAddress|router|reset/);
  assert.match(shell, /if \(key === activeGuide && guide\) \{ setStage\("guide"\); return; \}/);
});

test("the shell owns one Guide heading row and its responsive utility action", () => {
  const shell = fs.readFileSync("app/clearwater/resident-shell.tsx", "utf8");
  const css = fs.readFileSync("app/globals.css", "utf8");
  assert.match(shell, /className="active-guide-heading"/);
  assert.match(shell, /<h1>\{guideTitle\}<\/h1>/);
  assert.match(css, /\.active-guide-heading \{[^}]*display: flex/);
  assert.match(css, /\.active-guide-heading \{ align-items: flex-start; flex-direction: column/);
  assert.match(css, /\.active-guide-heading button \{[^}]*min-height: 2\.75rem;[^}]*border: 1px solid var\(--municipality-primary\);[^}]*border-radius: \.2rem;[^}]*background: transparent;[^}]*color: var\(--municipality-primary\)/);
  assert.match(css, /\.active-guide-heading button:hover \{ background: var\(--municipality-surface\); \}/);
  assert.match(css, /\.active-guide-heading button:focus-visible \{[^}]*outline: 2px solid var\(--municipality-primary\);[^}]*outline-offset: 2px/);
  assert.doesNotMatch(css, /\.active-guide-heading button \{[^}]*border-bottom:/);
  for (const name of workflowNames) {
    const workflow = fs.readFileSync(`app/clearwater/${name}/workflow.tsx`, "utf8");
    assert.match(workflow, /guideTitle="[^"]+"/);
    assert.doesNotMatch(workflow, /<h1>/);
  }
});

test("resolved Guide context stays compact while the Guide title remains primary", () => {
  const shell = fs.readFileSync("app/clearwater/resident-shell.tsx", "utf8");
  const css = fs.readFileSync("app/globals.css", "utf8");
  assert.match(shell, /<span className="municipality-guidance">Clearwater Property Guidance<\/span>/);
  assert.match(shell, /<span className="platform-attribution">Powered by Groundrule<\/span>/);
  assert.doesNotMatch(shell, /Property found|Clearwater, Florida/);
  assert.match(shell, /<p className="address-heading">.*<small>Clearwater, FL<\/small><\/p>/);
  assert.match(css, /\.confirmed-property \{[^}]*margin-top: clamp\(2rem, 5vh, 3\.5rem\)/);
  assert.match(css, /\.property-context \{ margin: 0; color:/);
  assert.doesNotMatch(css, /\.property-context \{[^}]*background:/);
});

test("resident guidance keeps Groundrule to one restrained shared attribution", () => {
  const residentFiles = ["app/clearwater/resident-shell.tsx", ...workflowNames.map((name) => `app/clearwater/${name}/workflow.tsx`), "lib/guides/fence.ts", "lib/guides/short-term-rental.ts", "lib/guides/impervious-surface-ratio.ts"];
  const residentCopy = residentFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.equal((residentCopy.match(/Powered by Groundrule/g) ?? []).length, 1);
  assert.doesNotMatch(residentCopy, /Groundrule (?:does not|cannot|can’t|has not|uses|can show|won’t)/i);
  const css = fs.readFileSync("app/globals.css", "utf8");
  assert.match(css, /\.workflow-brand \{[^}]*flex-direction: column/);
  assert.match(css, /\.platform-attribution \{[^}]*font-size: \.68rem/);
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

test("all contextual Guide handoffs use the shared compact secondary action", () => {
  const pool = fs.readFileSync("app/clearwater/pool/workflow.tsx", "utf8");
  const setbacks = fs.readFileSync("app/clearwater/setbacks/workflow.tsx", "utf8");
  const shed = fs.readFileSync("app/clearwater/shed/workflow.tsx", "utf8");
  const css = fs.readFileSync("app/globals.css", "utf8");

  assert.equal((pool.match(/className="related-guide-action"/g) ?? []).length, 5);
  assert.match(setbacks, /relatedGuides\.map\(guide=><button className="related-guide-action"/);
  assert.match(shed, /<button className="related-guide-action" onClick=\{onOpenIsr\}>/);
  assert.match(css, /\.related-guide-action \{[^}]*min-height: 2\.75rem;[^}]*border: 1px solid var\(--municipality-primary\);[^}]*border-radius: \.2rem;[^}]*background: transparent;[^}]*color: var\(--municipality-primary\);[^}]*font: inherit;[^}]*font-size: \.88rem;[^}]*font-weight: 700/);
  assert.match(css, /\.related-guide-action \{[^}]*text-decoration: none;/);
  assert.match(css, /\.related-guide-action:hover \{ background: var\(--municipality-surface\); \}/);
  assert.match(css, /\.related-guide-action:focus-visible \{[^}]*outline: 2px solid var\(--municipality-primary\);[^}]*outline-offset: 2px/);
});
