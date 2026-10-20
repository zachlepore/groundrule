# Rule 005 unsupported/NCOD investigation

Read the unsupported-population report, regulatory-readiness report and decision memo. The exact proposed cohort contains 227, not 228: one existing coverage hold is excluded. All analyst current-readiness recommendations are ambiguous/known-information; zero new approvals.

Maps and full 2,832-address data are in the separately delivered downloadable packet, outside Git. The map renderer depicts combined GIS codes, not an invented separate overlay layer. Original QA/status/codes remain unchanged; every owner-QC answer is blank.

Reproduce with Node and existing frozen npm dependencies, Python 3 + Shapely 2.1.2 + matplotlib 3.10.8:

```sh
node --max-old-space-size=4096 scripts/gis/measure-clearwater-rule005.mjs SOURCE APPROVED004 SOURCE_ZIP NEW_MEASURED
./node_modules/.bin/tsx scripts/gis/audit-clearwater-rule005-fence.ts NEW_EVALUATOR_AUDIT.json
PYTHONPATH=/path/to/shapely python3 scripts/gis/analyze-clearwater-rule005.py SOURCE NEW_MEASURED BIG_FISH_ANALYSIS NEW_ANALYSIS
XDG_CACHE_HOME=/writable/cache PYTHONPATH=/path/to/shapely python3 scripts/gis/render-clearwater-rule005-qc.py NEW_ANALYSIS NEW_MAPS
python3 scripts/gis/report-clearwater-rule005.py NEW_ANALYSIS NEW_EVALUATOR_AUDIT.json NEW_REPORTS
PYTHONPATH=/path/to/shapely python3 tests/clearwater-rule005.test.py
```

Use the immutable September 28 Release and validated Rule 004 export from the prior hosted workflow. Inputs/outputs are SHA-pinned in the evidence and manifests; existing output directories are refused. The prior Big Fish package can be regenerated with its existing scripts. No live City/Municode or Supabase content was silently substituted.
