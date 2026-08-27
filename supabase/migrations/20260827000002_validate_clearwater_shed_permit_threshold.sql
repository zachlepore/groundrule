-- Planner-validated Clearwater shed permit threshold. Forward-only V2 versions.
begin;

insert into public.regulatory_sources(jurisdiction_id,source_type,title,issuing_body,edition_label,verified_at,notes,source_metadata)
select j.id,'other','Clearwater planner validation — shed permit threshold','City of Clearwater planner contact','Abi response — 2026-08-27',timestamptz '2026-08-27 00:00:00+00',
  'Direct planner validation; not published City guidance or independently verified Code language.',
  '{"provenance":"planner_validated","contact":"Abi","received_on":"2026-08-27","published_web_source":false}'::jsonb
from public.jurisdictions j where j.slug='clearwater-fl'
on conflict do nothing;

insert into public.source_provisions(regulatory_source_id,locator,display_locator,title,excerpt,verified_at,notes)
select s.id,'abi-shed-threshold-response','Planner response · August 27, 2026','Shed permit threshold, measurement, and zoning applicability',
  'Exactly 100 SF doesn’t need one still. We measure the 100 SF by the pad or footprint by the exterior dimensions. And yes still has to follow normal zoning/setback rules or you risk a code stop work order where they’ll make you take it down',
  timestamptz '2026-08-27 00:00:00+00','Planner-validated interpretation. Utilities and trade permits were not addressed.'
from public.regulatory_sources s join public.jurisdictions j on j.id=s.jurisdiction_id
where j.slug='clearwater-fl' and s.title='Clearwater planner validation — shed permit threshold' and s.edition_label='Abi response — 2026-08-27'
on conflict(regulatory_source_id,locator) do nothing;

insert into public.rule_versions(rule_id,version_number,condition,evaluation_mode,research_status,lifecycle_status,research_confidence,summary,explanation_template,research_notes,effective_from,verified_at,published_at,schema_version,supersedes_id)
select r.id,2,'{"fact":"project.structure_type","op":"eq","value":"shed"}'::jsonb,'informational','verified','withdrawn','high',v.summary,v.summary,v.notes,date '2026-08-27',timestamptz '2026-08-27 00:00:00+00',null,1,old.id
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id
join public.rule_versions old on old.rule_id=r.id and old.version_number=1
join (values
  ('permit.small_shed_exemption','A shed with a footprint of 100 square feet or smaller does not require a building permit.','Planner-validated inclusive boundary; pad or footprint is measured using exterior dimensions. Zoning and setback rules remain independently applicable.'),
  ('permit.larger_shed_review','A shed larger than 100 square feet follows the City building-permit path.','The greater-than-100 boundary is the complement of the planner-validated inclusive exemption; no area questionnaire is introduced.')
) v(key,summary,notes) on v.key=r.key
where rs.key='clearwater_shed_v1'
on conflict(rule_id,version_number) do nothing;

insert into public.rule_outcomes(rule_version_id,sequence,outcome_type,subject_input_id,parameters,severity,message_template)
select rv.id,1,v.outcome,null,v.parameters,v.severity,v.message
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id join public.rule_versions rv on rv.rule_id=r.id and rv.version_number=2
join (values
  ('permit.small_shed_exemption','exemption','{"exempt_max_sq_ft":100,"exempt_max_inclusive":true,"measurement_basis":"pad_or_footprint","dimension_basis":"exterior_dimensions","exempts":"building_permit","zoning_setbacks_still_apply":true}'::jsonb,'advisory','A shed of 100 square feet or smaller does not require a building permit; measure the pad or footprint using exterior dimensions. Zoning and setback rules still apply.'),
  ('permit.larger_shed_review','external_authority_required','{"trigger_min_exclusive_sq_ft":100,"measurement_basis":"pad_or_footprint","dimension_basis":"exterior_dimensions"}'::jsonb,'warning','If the shed is larger than 100 sq ft, contact Clearwater Permitting for the building-permit path.')
) v(key,outcome,parameters,severity,message) on v.key=r.key
where rs.key='clearwater_shed_v1' and rv.published_at is null
on conflict(rule_version_id,sequence) do nothing;

insert into public.rule_version_inputs(rule_version_id,input_definition_id,role,authority_requirement,notes)
select rv.id,d.id,'applicability','none','Derived from selecting the shed workflow.'
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id join public.rule_versions rv on rv.rule_id=r.id and rv.version_number=2
join public.input_definitions d on d.key='project.structure_type'
where rs.key='clearwater_shed_v1' and r.key in ('permit.small_shed_exemption','permit.larger_shed_review') and rv.published_at is null
on conflict(rule_version_id,input_definition_id,role) do nothing;

insert into public.rule_citations(rule_version_id,source_provision_id,citation_role,pinpoint_note,sequence)
select rv.id,sp.id,'primary','Direct planner validation; not published Code or web guidance.',1
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id join public.rule_versions rv on rv.rule_id=r.id and rv.version_number=2
join public.regulatory_sources s on s.jurisdiction_id=rs.jurisdiction_id and s.title='Clearwater planner validation — shed permit threshold' and s.edition_label='Abi response — 2026-08-27'
join public.source_provisions sp on sp.regulatory_source_id=s.id and sp.locator='abi-shed-threshold-response'
where rs.key='clearwater_shed_v1' and r.key in ('permit.small_shed_exemption','permit.larger_shed_review') and rv.published_at is null
on conflict(rule_version_id,source_provision_id,citation_role) do nothing;

do $$
declare version_count integer; outcome_count integer; citation_count integer; input_count integer;
begin
  select count(*) into version_count from public.rule_versions rv join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and rv.version_number=2;
  select count(*) into outcome_count from public.rule_outcomes o join public.rule_versions rv on rv.id=o.rule_version_id join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and rv.version_number=2;
  select count(*) into citation_count from public.rule_citations c join public.rule_versions rv on rv.id=c.rule_version_id join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and rv.version_number=2 and c.citation_role='primary';
  select count(*) into input_count from public.rule_version_inputs i join public.rule_versions rv on rv.id=i.rule_version_id join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and rv.version_number=2;
  if version_count<>2 or outcome_count<>2 or citation_count<>2 or input_count<>2 then raise exception 'Clearwater Shed permit V2 is incomplete (versions %, outcomes %, primary citations %, inputs %)',version_count,outcome_count,citation_count,input_count; end if;
end;
$$;

update public.rule_versions rv set lifecycle_status='superseded',effective_to=date '2026-08-27'
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id
where rv.rule_id=r.id and rs.key='clearwater_shed_v1' and r.key in ('permit.small_shed_exemption','permit.larger_shed_review') and rv.version_number=1 and rv.lifecycle_status='active';
update public.rule_versions rv set lifecycle_status='active',published_at=timestamptz '2026-08-27 00:00:00+00'
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id
where rv.rule_id=r.id and rs.key='clearwater_shed_v1' and rv.version_number=2 and rv.published_at is null;
update public.rules r set active_version_id=rv.id
from public.rule_versions rv,public.rule_sets rs
where rv.rule_id=r.id and rs.id=r.rule_set_id and rs.key='clearwater_shed_v1' and rv.version_number=2 and rv.lifecycle_status='active' and rv.published_at is not null and r.active_version_id is distinct from rv.id;

commit;
