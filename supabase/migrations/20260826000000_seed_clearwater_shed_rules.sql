-- Clearwater Shed V1. Forward-only addition using the generalized rule schema.
begin;
insert into public.project_types(key,label,description) values ('shed','Shed','Detached residential storage shed guidance') on conflict(key) do nothing;
insert into public.rule_sets(jurisdiction_id,project_type_id,key,title,scope_description,coverage_status,research_status,effective_from,verified_at,published_at,known_gaps)
select j.id,p.id,'clearwater_shed_v1','Clearwater residential shed rules','Basic detached residential shed permit, location, setback, and height guidance.','limited','verified',date '2024-06-06',timestamptz '2026-08-26 00:00:00+00',timestamptz '2026-08-26 00:00:00+00','["City primary-source confirmation of the small-shed permit exemption boundary", "flood status", "easements", "remaining impervious-surface capacity"]'::jsonb from public.jurisdictions j,public.project_types p where j.slug='clearwater-fl' and p.key='shed' on conflict(jurisdiction_id,project_type_id,key) do nothing;
insert into public.source_provisions(regulatory_source_id,locator,display_locator,title,excerpt,source_url,verified_at,notes)
select s.id,v.locator,v.display,v.title,v.excerpt,'https://library.municode.com/fl/clearwater/codes/community_development_code',timestamptz '2026-08-26 00:00:00+00',v.notes from public.regulatory_sources s cross join (values
('2-202','§ 2-202','LMDR minimum development standards','For detached dwellings in LMDR, the minimum setbacks are 25 feet front, five feet side, and ten feet rear.','Applied through § 3-203.B to accessory structures.'),
('3-203','§ 3-203','Accessory structure general standards','Accessory structures may not be between the right-of-way and principal structure, must comply with zoning-district setbacks, and may not exceed 15 feet in a residential district without flexible approval.','Subsections A, B, and D.'),
('shed-permit-guidance','Clearwater shed permit guidance','Small shed building-permit guidance','City planner lead reports that small sheds at the 100-square-foot boundary may be exempt from a building permit.','Not sufficient authority for final public launch; deliberately retained as a validation gap.')
) v(locator,display,title,excerpt,notes) where s.title='Clearwater Community Development Code' on conflict(regulatory_source_id,locator) do nothing;
insert into public.rules(rule_set_id,key,title,group_key) select rs.id,v.key,v.title,v.group_key from public.rule_sets rs cross join (values
('permit.small_shed_exemption','Small shed building-permit exemption','permit'),('permit.larger_shed_review','Larger shed permit review','permit'),('permit.utilities','Utility work permits','permit'),('location.lmdr_setbacks','LMDR shed location and setbacks','location'),('height.residential_maximum','Residential accessory structure height','height')) v(key,title,group_key) where rs.key='clearwater_shed_v1' on conflict(rule_set_id,key) do nothing;
insert into public.rule_versions(rule_id,version_number,condition,evaluation_mode,research_status,lifecycle_status,research_confidence,summary,explanation_template,research_notes,effective_from,verified_at,published_at,schema_version)
select r.id,1,v.condition,v.mode,v.status,'withdrawn',v.confidence,v.summary,v.summary,v.notes,date '2024-06-06',timestamptz '2026-08-26 00:00:00+00',null,1 from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id join (values
('permit.small_shed_exemption','{"fact":"project.structure_type","op":"eq","value":"shed"}'::jsonb,'informational','verified','medium','A shed no larger than 100 square feet is represented as not requiring a building permit pending planner validation.','The exact boundary still needs a directly accessible City primary source.'),
('permit.larger_shed_review','{"fact":"project.structure_type","op":"eq","value":"shed"}'::jsonb,'informational','verified','high','A shed larger than 100 square feet should be taken through the City building-permit path.','Conditional guidance; no questionnaire.'),
('permit.utilities','{"fact":"project.structure_type","op":"eq","value":"shed"}'::jsonb,'informational','verified','medium','Electrical or plumbing work may require separate trade permits.','City confirmation is appropriate.'),
('location.lmdr_setbacks','{"all":[{"fact":"project.structure_type","op":"eq","value":"shed"},{"fact":"property.zoning_district","op":"eq","value":"lmdr"}]}'::jsonb,'deterministic','verified','high','An LMDR accessory structure follows 25-foot front, five-foot side, and ten-foot rear minimum setbacks and cannot sit between the right-of-way and principal structure.','Property-specific from trusted zoning.'),
('height.residential_maximum','{"all":[{"fact":"project.structure_type","op":"eq","value":"shed"},{"fact":"property.zoning_district","op":"in","values":["ldr","lmdr","mdr","mhdr","hdr","mhp"]}]}'::jsonb,'deterministic','verified','high','Accessory structures in residential zoning districts may not exceed 15 feet without Level One flexible approval and never may exceed principal-structure height.','Base maximum only.')
) v(key,condition,mode,status,confidence,summary,notes) on v.key=r.key where rs.key='clearwater_shed_v1' on conflict(rule_id,version_number) do nothing;
insert into public.rule_outcomes(rule_version_id,sequence,outcome_type,subject_input_id,parameters,severity,message_template)
select rv.id,1,v.outcome,d.id,v.parameters,v.severity,v.message from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id join public.rule_versions rv on rv.rule_id=r.id join (values
('permit.small_shed_exemption','exemption',null::text,'{"exempt_max_sq_ft":100,"exempt_max_inclusive":true,"permit_required_min_exclusive_sq_ft":100}'::jsonb,'advisory','A shed of 100 square feet or smaller does not require a building permit; City development standards still apply.'),
('permit.larger_shed_review','external_authority_required',null::text,'{"trigger_min_exclusive_sq_ft":100}'::jsonb,'warning','If the shed is larger than 100 sq ft, contact Clearwater Permitting for the building-permit path.'),
('permit.utilities','external_authority_required',null::text,'{"trades":["electrical","plumbing"]}'::jsonb,'warning','If the shed will have electricity or plumbing, confirm the required trade permits with Clearwater.'),
('location.lmdr_setbacks','obligation',null::text,'{"front_ft":25,"side_ft":5,"rear_ft":10,"measured_from":"property_line"}'::jsonb,'requirement','Keep the shed at least 25 feet from the front property line, five feet from a side property line, and ten feet from the rear property line.'),
('height.residential_maximum','maximum','project.height','{"value":15,"unit":"ft"}'::jsonb,'requirement','The base maximum accessory-structure height is 15 feet.')
) v(key,outcome,subject_key,parameters,severity,message) on v.key=r.key left join public.input_definitions d on d.key=v.subject_key where rs.key='clearwater_shed_v1' and rv.version_number=1 and rv.published_at is null on conflict(rule_version_id,sequence) do nothing;

insert into public.rule_version_inputs(rule_version_id,input_definition_id,role,authority_requirement,notes)
select rv.id,d.id,v.role,case when d.authoritative_source_required then 'authoritative' else 'none' end,v.notes
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id
join public.rule_versions rv on rv.rule_id=r.id and rv.version_number=1
join (values
('permit.small_shed_exemption','project.structure_type','applicability','Derived from selecting the shed workflow.'),
('permit.larger_shed_review','project.structure_type','applicability','Derived from selecting the shed workflow.'),
('permit.utilities','project.structure_type','applicability','Derived from selecting the shed workflow.'),
('location.lmdr_setbacks','project.structure_type','applicability','Derived from selecting the shed workflow.'),
('location.lmdr_setbacks','property.zoning_district','applicability','Property-derived zoning determines applicability.'),
('height.residential_maximum','project.structure_type','applicability','Derived from selecting the shed workflow.'),
('height.residential_maximum','property.zoning_district','applicability','Property-derived zoning determines applicability.'),
('height.residential_maximum','project.height','compliance','The maximum applies to shed height.')
) v(rule_key,input_key,role,notes) on v.rule_key=r.key
join public.input_definitions d on d.key=v.input_key
where rs.key='clearwater_shed_v1' and rv.published_at is null
on conflict(rule_version_id,input_definition_id,role) do nothing;

insert into public.rule_citations(rule_version_id,source_provision_id,citation_role,pinpoint_note,sequence)
select rv.id,sp.id,'primary',v.note,1 from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id join public.rule_versions rv on rv.rule_id=r.id join (values
('permit.small_shed_exemption','shed-permit-guidance','Planner lead pending authoritative confirmation.'),('permit.larger_shed_review','shed-permit-guidance','Conservative resident handoff.'),('permit.utilities','shed-permit-guidance','Separate trade-permit warning pending validation.'),('location.lmdr_setbacks','2-202','Table values plus § 3-203.A–B.'),('height.residential_maximum','3-203','Subsection D.')) v(key,locator,note) on v.key=r.key join public.source_provisions sp on sp.locator=v.locator join public.regulatory_sources s on s.id=sp.regulatory_source_id and s.jurisdiction_id=rs.jurisdiction_id where rs.key='clearwater_shed_v1' and rv.version_number=1 and rv.published_at is null on conflict(rule_version_id,source_provision_id,citation_role) do nothing;

do $$
declare version_count integer; outcome_count integer; citation_count integer; input_count integer;
begin
  select count(*) into version_count from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id join public.rule_versions rv on rv.rule_id=r.id and rv.version_number=1 where rs.key='clearwater_shed_v1';
  select count(*) into outcome_count from public.rule_outcomes o join public.rule_versions rv on rv.id=o.rule_version_id join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and rv.version_number=1;
  select count(*) into citation_count from public.rule_citations c join public.rule_versions rv on rv.id=c.rule_version_id join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and rv.version_number=1 and c.citation_role='primary';
  select count(*) into input_count from public.rule_version_inputs i join public.rule_versions rv on rv.id=i.rule_version_id join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and rv.version_number=1;
  if version_count <> 5 or outcome_count <> 5 or citation_count <> 5 or input_count <> 8 then
    raise exception 'Clearwater Shed V1 is incomplete (versions %, outcomes %, primary citations %, inputs %)',version_count,outcome_count,citation_count,input_count;
  end if;
end;
$$;

update public.rule_versions rv set lifecycle_status='active',published_at=timestamptz '2026-08-26 00:00:00+00' from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id where rv.rule_id=r.id and rs.key='clearwater_shed_v1' and rv.version_number=1 and rv.published_at is null;
update public.rules r set active_version_id=rv.id from public.rule_versions rv,public.rule_sets rs where rv.rule_id=r.id and rs.id=r.rule_set_id and rs.key='clearwater_shed_v1' and rv.version_number=1 and rv.lifecycle_status='active' and rv.published_at is not null and r.active_version_id is distinct from rv.id;
commit;
