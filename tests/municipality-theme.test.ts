import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { defaultMunicipalityTheme, getMunicipalityTheme, municipalityThemes, municipalityThemeProperties } from "../lib/municipality-themes";

test("Clearwater has one reusable, complete municipality theme", () => {
  assert.deepEqual(getMunicipalityTheme("clearwater"), municipalityThemes.clearwater);
  assert.equal(Object.keys(municipalityThemes.clearwater).length, 6);
  assert.equal(municipalityThemeProperties("clearwater")["--municipality-primary"], "#1d5273");
});

test("unknown municipalities safely receive the default Groundrule theme", () => {
  assert.deepEqual(getMunicipalityTheme("future-town"), defaultMunicipalityTheme);
  assert.equal(municipalityThemeProperties("future-town")["--municipality-surface"], defaultMunicipalityTheme.surface);
});

test("Clearwater routes apply the theme once without Guide color forks", () => {
  const layout = fs.readFileSync("app/clearwater/layout.tsx", "utf8");
  assert.match(layout, /<MunicipalityTheme slug="clearwater">/);
  for (const file of fs.readdirSync("app/clearwater", { recursive: true }).map(String).filter(file => file.endsWith(".tsx"))) {
    const source = fs.readFileSync(`app/clearwater/${file}`, "utf8");
    if (file !== "layout.tsx") assert.doesNotMatch(source, /#1d5273|#9a7446|#f2f7f9|#d5e3e9|#fbf7ef/i);
  }
});

test("Setbacks regulatory answers and quiet trust treatment remain intact", () => {
  const workflow = fs.readFileSync("app/clearwater/setbacks/workflow.tsx", "utf8");
  for (const copy of ["Building something else?", "Specific situations", "Based on Clearwater’s current development standards", "Groundrule uses official City of Clearwater codes and property data to generate this guidance.", "View Clearwater codes"]) assert.match(workflow, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(workflow, /item.answer/);
  assert.doesNotMatch(workflow, /municipalityThemes|getMunicipalityTheme/);
});
