"""Read-only, literal-only extraction of the two checked-in fence SQL seeds.

Does not execute SQL or infer conditions. Unknown seed shapes must be reviewed.
"""
import hashlib
import json
import re
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / 'supabase/migrations/20260823000000_seed_clearwater_fence_rules.sql'
UPDATE = ROOT / 'supabase/migrations/20260824000002_update_clearwater_resident_fence_rules.sql'


def rows(table, path=SEED):
    text = path.read_text()
    start = text.index('insert into public.' + table + ' ')
    rest = text[start:]
    if '(values' in rest.split('\n\n', 1)[0] or table != 'input_definitions':
        chunk = rest.split('(values', 1)[1]
        end = re.search(r'\)\s*v\(', chunk)
        assert end, table
        chunk = chunk[:end.start()] + ')'
    else:
        chunk = re.split(r'\bvalues\s+', rest, maxsplit=1)[1].split('on conflict', 1)[0]
    result = []
    for match in re.finditer(r"\(((?:'(?:[^']|'')*'|[^'()])*)\)", chunk):
        tokens = re.findall(r"'(?:[^']|'')*'(?:\:\:[a-z]+)?|(?:null|true|false|[0-9]+)(?:\:\:[a-z]+)?", match[1])
        row = []
        for token in tokens:
            token = re.sub(r'::[a-z]+$', '', token)
            row.append(token[1:-1].replace("''", "'") if token.startswith("'") else {'null': None, 'true': True, 'false': False}.get(token, int(token) if token.isdigit() else token))
        result.append(row)
    assert result, table
    return result


def main():
    defs = {r[0]: r for r in rows('input_definitions') + rows('input_definitions', UPDATE)}
    rules = []
    for path in [SEED, UPDATE]:
        identities = {r[0]: r for r in rows('rules', path)}
        citations = {}
        for r in rows('rule_citations', path):
            citations.setdefault(r[0], []).append(dict(locator=r[1], role=r[2] if path == UPDATE else 'primary', note=r[3] if path == UPDATE else None))
        for raw in rows('rule_versions', path):
            if path == SEED:
                key, mode, condition, summary, notes = raw
            else:
                key, condition, mode, summary, explanation, notes = raw
            inputs = []
            for row in rows('rule_version_inputs', path):
                rk, ik, role = row[:3]
                if rk != key:
                    continue
                d = defs[ik]
                inputs.append(dict(key=ik, label=d[1], dataType=d[2], unit=d[4], propertyDerived=d[6] == 'property_derived', userInputAllowed=d[8], requiredWhenApplicable=row[3] if path == UPDATE else True, role=role, options=[dict(key=o[1], label=o[2], description=None) for o in rows('input_options') if o[0] == ik]))
            outcomes = [dict(sequence=n, type=t, subjectKey=sub, parameters=json.loads(params), severity=sev, messageTemplate=msg) for rk,n,t,sub,params,sev,msg in rows('rule_outcomes', path) if rk == key]
            rules.append(dict(key=key, title=identities[key][1], groupKey=identities[key][2 if path == UPDATE else 3], versionNumber=1, condition=json.loads(condition), evaluationMode=mode, summary=summary, outcomes=outcomes, inputs=inputs, citationBindings=citations[key]))
    relationships = [dict(fromRuleKey=f, toRuleKey=t, type=typ, rationale=why, scopeCondition=None, metadata=json.loads(meta)) for f,t,typ,why,meta,loc in rows('rule_relationships')]
    sources = [dict(path=str(path.relative_to(ROOT)), sha256=hashlib.sha256(path.read_bytes()).hexdigest()) for path in [SEED, UPDATE]]
    provisions = rows('source_provisions') + [['Clearwater Community Development Code', r[0], r[1], r[2], r[3]] for r in rows('source_provisions', UPDATE)]
    # Preserve the literal source update, not the superseded original visibility excerpt.
    visibility = re.search(r"set excerpt = '((?:[^']|'')*)'", UPDATE.read_text())[1].replace("''", "'")
    next(p for p in provisions if p[1] == '3-904')[4] = visibility
    result = dict(sourceSeeds=sources, rules=rules, relationships=relationships, sourceProvisions=provisions)
    dest = ROOT / 'research/rules/coachman-ridge-v1/base-seed.json'
    text = json.dumps(result, indent=2) + '\n'
    assert len(rules) == 51 and len(relationships) == 6, 'Seed shape changed; review extractor'
    if '--check' in sys.argv:
        assert dest.read_text() == text, 'Seed snapshot differs; regenerate and review'
    else:
        dest.write_text(text)
    print(f'{len(rules)} seed rules, {len(relationships)} relationships; {dest}')


if __name__ == '__main__':
    main()
