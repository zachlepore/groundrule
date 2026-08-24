-- Clearwater resident fence rule update v1. Forward-only; requires the published v1 seed.
begin;

do $$
declare
  expected_rules integer;
begin
  if not exists (select 1 from public.rule_sets where key = 'clearwater_fence_v1' and published_at is not null) then
    raise exception 'Prerequisite published rule set clearwater_fence_v1 is missing';
  end if;
  select count(*) into expected_rules
  from public.rules r join public.rule_sets rs on rs.id = r.rule_set_id
  where rs.key = 'clearwater_fence_v1' and r.active_version_id is not null;
  if expected_rules <> 44 then
    raise exception 'Expected 44 active Clearwater fence seed rules, found %', expected_rules;
  end if;
  if not exists (select 1 from public.source_provisions sp join public.regulatory_sources s on s.id=sp.regulatory_source_id where s.title='Clearwater Community Development Code' and sp.locator='3-904')
     or not exists (select 1 from public.source_provisions sp join public.regulatory_sources s on s.id=sp.regulatory_source_id where s.title='Clearwater Community Development Code' and sp.locator='8-102') then
    raise exception 'Required Clearwater provisions 3-904 and 8-102 are missing';
  end if;
end $$;

insert into public.source_provisions (regulatory_source_id, locator, display_locator, title, excerpt, verified_at, notes)
select s.id, v.locator, v.display_locator, v.title, v.excerpt, timestamptz '2026-08-24 00:00:00+00', v.notes
from public.regulatory_sources s
cross join (values
  ('4-203','§ 4-203','Building permits','Construction, demolition, modification, or renovation of a building or structure may not begin before a building permit is obtained. The Building Official receives the prescribed application and plans, the Community Development Coordinator reviews applicable development standards, and the Building Official reviews applicable building-code conformity.','Permit pathway reconstructed from the authoritative Clearwater code text documented in fence-resident-blocking-research-v1.'),
  ('47.111','§ 47.111','Inspections','On completion, the permit holder or agent must request a final inspection and any other inspection required by the permit.','Final-inspection requirement documented in fence-resident-blocking-research-v1.')
) v(locator,display_locator,title,excerpt,notes)
where s.title='Clearwater Community Development Code'
on conflict (regulatory_source_id, locator) do nothing;

update public.source_provisions sp
set excerpt = 'At street/right-of-way and driveway/right-of-way intersections, the Sight Visibility Triangle figure depicts a triangle measured 20 feet along each applicable intersecting edge. Within it, no structure or landscaping may be installed other than a non-opaque fence not exceeding 30 inches in height. The text also protects views from 30 inches through eight feet above grade and provides for City Engineer approval.',
    verified_at = timestamptz '2026-08-24 00:00:00+00',
    notes = 'Textual requirements and manually recovered authoritative figure associated with § 3-904.A. The figure itself is not stored or shipped; the 20-foot dimensions do not establish property-specific intersection.'
from public.regulatory_sources s
where sp.regulatory_source_id=s.id and s.title='Clearwater Community Development Code' and sp.locator='3-904';

insert into public.input_definitions (key,label,data_type,unit_dimension,canonical_unit,value_scope,default_source_class,gis_derivable,user_input_allowed,authoritative_source_required,validation)
values
 ('project.near_sight_visibility_intersection','Fence is near a driveway or street corner','boolean',null,null,'global','user_provided',false,true,false,'{"required":true}'),
 ('project.in_sight_visibility_triangle','Fence segment intersects the legal sight-visibility triangle','boolean',null,null,'global','either',true,false,true,'{"required":true}'),
 ('project.sight_visibility_exception_approved','City Engineer sight-visibility exception approved','boolean',null,null,'global','official_decision',false,false,true,'{"required":true}')
on conflict (key) do nothing;

do $$ begin
  if (select count(*) from public.input_definitions where key in ('project.near_sight_visibility_intersection','project.in_sight_visibility_triangle','project.sight_visibility_exception_approved','project.structure_type','project.height','project.is_opaque')) <> 6 then
    raise exception 'Resident fence update input prerequisites are incomplete';
  end if;
end $$;

insert into public.rules (rule_set_id,key,title,group_key,legacy_key)
select rs.id,v.key,v.title,v.group_key,v.legacy_key from public.rule_sets rs cross join (values
 ('permit.building_required','Building permit required','permit','CLR-FENCE-038'),
 ('permit.review_path','Permit review and plans','permit','CLR-FENCE-039'),
 ('permit.final_inspection','Final inspection required','permit','CLR-FENCE-040'),
 ('visibility.triangle_restriction','Sight-visibility triangle fence restriction','visibility','CLR-FENCE-021'),
 ('visibility.triangle_conflict','Fence conflicts with sight-visibility restriction','visibility','CLR-FENCE-041'),
 ('visibility.applicability_review','Sight-triangle location must be confirmed','visibility','CLR-FENCE-042'),
 ('visibility.city_engineer_exception','City Engineer visibility exception','visibility','CLR-FENCE-043')
) v(key,title,group_key,legacy_key) where rs.key='clearwater_fence_v1'
on conflict (rule_set_id,key) do nothing;

insert into public.rule_versions (rule_id,version_number,condition,evaluation_mode,research_status,lifecycle_status,research_confidence,summary,explanation_template,research_notes,effective_from,verified_at,schema_version)
select r.id,1,v.condition,v.mode,'verified','withdrawn','high',v.summary,v.explanation,v.notes,date '2026-08-24',timestamptz '2026-08-24 00:00:00+00',1
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id
join (values
 ('permit.building_required','{"fact":"project.structure_type","op":"eq","value":"fence"}'::jsonb,'deterministic','An anchored fence requires a City building permit before construction.','Permit required before construction.','Result-only duty; permit status is deliberately not an input.'),
 ('permit.review_path','{"fact":"project.structure_type","op":"eq","value":"fence"}'::jsonb,'informational','The permit application follows zoning/development-standard and building-code review and includes applicable plans.','Submit the City application and applicable plans. The Community Development Coordinator reviews development standards, and the Building Official reviews building-code conformity.','Does not promise issuance or invent a fence-specific document checklist.'),
 ('permit.final_inspection','{"fact":"project.structure_type","op":"eq","value":"fence"}'::jsonb,'informational','The permit holder or agent must request the supported final inspection.','Request the final inspection when work is complete.','Does not invent intermediate inspections.'),
 ('visibility.triangle_restriction','{"fact":"project.in_sight_visibility_triangle","op":"is_true"}'::jsonb,'deterministic','Inside the 20-foot by 20-foot sight-visibility triangle, only a non-opaque fence no higher than 30 inches is permitted.','Inside the sight-visibility triangle, use only a non-opaque fence no higher than 30 inches.','Legal geometry is structured; applicability requires authoritative geometry or City confirmation.'),
 ('visibility.triangle_conflict','{"all":[{"fact":"project.in_sight_visibility_triangle","op":"is_true"},{"any":[{"fact":"project.is_opaque","op":"is_true"},{"fact":"project.height","op":"gt","value":2.5,"unit":"ft"}]},{"not":{"fact":"project.sight_visibility_exception_approved","op":"is_true"}}]}'::jsonb,'deterministic','An opaque fence or fence above 30 inches conflicts with the sight-visibility triangle standard unless the City Engineer approves otherwise.','This design conflicts with the sight-visibility rule: within the triangle, a fence must be non-opaque and no higher than 30 inches.','The text separately protects the vertical view band from 30 inches through eight feet.'),
 ('visibility.applicability_review','{"all":[{"fact":"project.near_sight_visibility_intersection","op":"is_true"},{"fact":"project.in_sight_visibility_triangle","op":"is_unknown"}]}'::jsonb,'external','A coarse near-driveway/corner answer cannot establish legal triangle intersection.','Confirm the proposed fence line with the City because it is near a driveway or street corner.','No GIS or resident answer is treated as exact legal geometry.'),
 ('visibility.city_engineer_exception','{"all":[{"fact":"project.in_sight_visibility_triangle","op":"is_true"},{"fact":"project.sight_visibility_exception_approved","op":"is_true"}]}'::jsonb,'external','The City Engineer may approve an exception to the sight-visibility obstruction standard.','A documented City Engineer approval may provide an exception to the standard.','Official-decision input only; never a normal resident question.')
) v(key,condition,mode,summary,explanation,notes) on v.key=r.key
where rs.key='clearwater_fence_v1' and not exists (select 1 from public.rule_versions rv where rv.rule_id=r.id and rv.version_number=1);

insert into public.rule_outcomes (rule_version_id,sequence,outcome_type,subject_input_id,parameters,severity,message_template)
select rv.id,v.sequence,v.outcome_type,d.id,v.parameters,v.severity,v.message
from (values
 ('permit.building_required',1,'obligation',null::text,'{"presentation_group":"before_you_build"}'::jsonb,'requirement','Permit required before construction.'),
 ('permit.review_path',1,'information',null::text,'{"presentation_group":"before_you_build"}'::jsonb,'advisory','Submit the prescribed application and applicable plans for Coordinator and Building Official review.'),
 ('permit.final_inspection',1,'obligation',null::text,'{"presentation_group":"before_you_build"}'::jsonb,'requirement','Request the final inspection after completion.'),
 ('visibility.triangle_restriction',1,'maximum','project.height','{"value":2.5,"unit":"ft","display_value":30,"display_unit":"in","horizontal_leg_1_ft":20,"horizontal_leg_2_ft":20,"presentation_group":"what_you_can_do","presentation_asset_id":"clearwater_sight_visibility_triangle_v1"}'::jsonb,'requirement','Within the triangle, fence height must not exceed 30 inches.'),
 ('visibility.triangle_restriction',2,'required_value','project.is_opaque','{"value":false,"meaning":"non-opaque","presentation_group":"what_you_can_do","presentation_asset_id":"clearwater_sight_visibility_triangle_v1"}'::jsonb,'requirement','Within the triangle, the fence must be non-opaque.'),
 ('visibility.triangle_conflict',1,'prohibition',null::text,'{"presentation_group":"check_this","protected_vertical_band":{"from_in":30,"through_ft":8},"presentation_asset_id":"clearwater_sight_visibility_triangle_v1"}'::jsonb,'warning','The proposed fence conflicts with the sight-visibility standard unless the City Engineer approves otherwise.'),
 ('visibility.applicability_review',1,'external_authority_required',null::text,'{"presentation_group":"check_this","reason":"property_and_fence_geometry_unavailable","presentation_asset_id":"clearwater_sight_visibility_triangle_v1"}'::jsonb,'warning','Confirm whether the fence enters the 20-foot by 20-foot sight-visibility triangle.'),
 ('visibility.city_engineer_exception',1,'permission_pathway',null::text,'{"presentation_group":"check_this"}'::jsonb,'advisory','A documented City Engineer approval supplies the exception pathway.')
) v(rule_key,sequence,outcome_type,subject_key,parameters,severity,message)
join public.rules r on r.key=v.rule_key join public.rule_sets rs on rs.id=r.rule_set_id and rs.key='clearwater_fence_v1'
join public.rule_versions rv on rv.rule_id=r.id and rv.version_number=1
left join public.input_definitions d on d.key=v.subject_key
where rv.published_at is null;

insert into public.rule_version_inputs (rule_version_id,input_definition_id,role,required_when_applicable,authority_requirement,notes)
select rv.id,d.id,v.role,v.required,v.authority,v.notes
from (values
 ('permit.building_required','project.structure_type','applicability',true,'none','Derived from selecting the fence workflow; never ask permit status.'),
 ('permit.review_path','project.structure_type','applicability',true,'none','Derived from workflow.'),('permit.final_inspection','project.structure_type','applicability',true,'none','Derived from workflow.'),
 ('visibility.triangle_restriction','project.in_sight_visibility_triangle','applicability',true,'authoritative','City/property geometry determination, not an ordinary resident attestation.'),
 ('visibility.triangle_conflict','project.in_sight_visibility_triangle','applicability',true,'authoritative','Exact applicability.'),('visibility.triangle_conflict','project.is_opaque','compliance',true,'none','Derived from resident material answer.'),('visibility.triangle_conflict','project.height','compliance',true,'none','Resident planned height.'),('visibility.triangle_conflict','project.sight_visibility_exception_approved','applicability',false,'authoritative','Official decision only.'),
 ('visibility.applicability_review','project.near_sight_visibility_intersection','applicability',true,'none','Derived from near-driveway or near-corner location answer.'),('visibility.applicability_review','project.in_sight_visibility_triangle','applicability',false,'authoritative','Never directly ask the resident to classify legal geometry.'),
 ('visibility.city_engineer_exception','project.in_sight_visibility_triangle','applicability',true,'authoritative','Exact applicability.'),('visibility.city_engineer_exception','project.sight_visibility_exception_approved','applicability',true,'authoritative','Official decision only.')
) v(rule_key,input_key,role,required,authority,notes)
join public.rules r on r.key=v.rule_key join public.rule_sets rs on rs.id=r.rule_set_id and rs.key='clearwater_fence_v1' join public.rule_versions rv on rv.rule_id=r.id and rv.version_number=1 join public.input_definitions d on d.key=v.input_key where rv.published_at is null;

insert into public.rule_citations (rule_version_id,source_provision_id,citation_role,pinpoint_note,sequence)
select rv.id,sp.id,v.role,v.note,v.sequence from (values
 ('permit.building_required','4-203','primary','§ 4-203.A.1 permit duty.',1),('permit.building_required','8-102','definition','Anchored fence is a structure.',2),
 ('permit.review_path','4-203','primary','§ 4-203.B application and dual review.',1),('permit.final_inspection','47.111','primary','Final inspection request.',1),
 ('visibility.triangle_restriction','3-904','primary','§ 3-904.A and authoritative Sight Visibility Triangle figure: 20 ft by 20 ft; non-opaque fence no higher than 30 inches.',1),
 ('visibility.triangle_conflict','3-904','primary','Textual 30-inch-through-eight-foot band and figure exception.',1),('visibility.applicability_review','3-904','primary','Street/right-of-way and driveway/right-of-way corners depicted.',1),('visibility.city_engineer_exception','3-904','primary','City Engineer exception authority.',1)
) v(rule_key,locator,role,note,sequence)
join public.rules r on r.key=v.rule_key join public.rule_sets rs on rs.id=r.rule_set_id and rs.key='clearwater_fence_v1' join public.rule_versions rv on rv.rule_id=r.id and rv.version_number=1
join public.source_provisions sp on sp.locator=v.locator join public.regulatory_sources s on s.id=sp.regulatory_source_id and s.jurisdiction_id=rs.jurisdiction_id where rv.published_at is null;

update public.rule_versions rv set lifecycle_status='active',published_at=timestamptz '2026-08-24 00:00:00+00'
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id where rv.rule_id=r.id and rs.key='clearwater_fence_v1' and r.key like any(array['permit.%','visibility.%']) and rv.published_at is null;
update public.rules r set active_version_id=rv.id from public.rule_versions rv,public.rule_sets rs where rv.rule_id=r.id and rs.id=r.rule_set_id and rs.key='clearwater_fence_v1' and rv.version_number=1 and r.key like any(array['permit.%','visibility.%']);

update public.rule_sets set known_gaps=(select coalesce(jsonb_agg(value),'[]'::jsonb) from jsonb_array_elements(known_gaps) value where value <> '"Sight-triangle horizontal geometry"'::jsonb), verified_at=timestamptz '2026-08-24 00:00:00+00' where key='clearwater_fence_v1';

commit;
