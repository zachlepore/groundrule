-- Clearwater Shed planner correction pass. Forward-only rule additions and utilities V2.
begin;

insert into public.regulatory_sources(jurisdiction_id,source_type,title,issuing_body,edition_label,verified_at,notes,source_metadata)
select j.id,'other','Clearwater planner validation — shed installation clarifications','City of Clearwater planner contact','Abi response — 2026-09-02',timestamptz '2026-09-02 00:00:00+00',
  'Direct planner validation from the post-beta walkthrough; roof guidance is a planner interpretation rather than a published Code citation.',
  '{"provenance":"planner_validated","contact":"Abi","received_on":"2026-09-02","published_web_source":false}'::jsonb
from public.jurisdictions j where j.slug='clearwater-fl' on conflict do nothing;

insert into public.source_provisions(regulatory_source_id,locator,display_locator,title,excerpt,source_url,verified_at,notes)
select s.id,v.locator,v.display,v.title,v.excerpt,v.url,timestamptz '2026-09-02 00:00:00+00',v.notes
from public.regulatory_sources s cross join (values
 ('abi-shed-isr-response','Planner response · September 2, 2026','Shed impervious-surface treatment','A shed remains subject to impervious-surface requirements even when it has a dirt floor.',null::text,'Reconciled with CDC § 8-102 because a shed roof is an expressly listed impervious surface.'),
 ('abi-shed-trades-response','Planner response · September 2, 2026','Electrical and plumbing final inspections','Electrical or plumbing work installed for a shed requires the applicable final inspection after completion.','https://www.myclearwater.com/Business-Development/Permitting/Schedule-or-Cancel-an-Inspection','Planner-provided official inspection scheduling next step; does not automate trade-code compliance.'),
 ('abi-shed-roof-response','Planner response · September 2, 2026','Permanent shed roof material','A shed must have permanent roofing material; a tarp is not considered a roof.',null::text,'Planner-validated interpretation; additional published authoritative confirmation is advisable.')
) v(locator,display,title,excerpt,url,notes)
where s.title='Clearwater planner validation — shed installation clarifications' and s.edition_label='Abi response — 2026-09-02'
on conflict(regulatory_source_id,locator) do nothing;

insert into public.rules(rule_set_id,key,title,group_key)
select rs.id,v.key,v.title,v.group_key from public.rule_sets rs cross join (values
 ('site.impervious_surface','Shed impervious-surface applicability','site'),
 ('materials.permanent_roof','Permanent shed roof material','materials')
) v(key,title,group_key) where rs.key='clearwater_shed_v1' on conflict(rule_set_id,key) do nothing;

insert into public.rule_versions(rule_id,version_number,condition,evaluation_mode,research_status,lifecycle_status,research_confidence,summary,explanation_template,research_notes,effective_from,verified_at,published_at,schema_version,supersedes_id)
select r.id,v.version,'{"fact":"project.structure_type","op":"eq","value":"shed"}'::jsonb,'informational','verified','withdrawn',v.confidence,v.summary,v.summary,v.notes,date '2026-09-02',timestamptz '2026-09-02 00:00:00+00',null,1,old.id
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id
join (values
 ('permit.utilities',2,'high','Electrical or plumbing work for a shed requires the applicable final inspection after the work is complete.','Narrow planner-validated next step; no claim about complete trade-code compliance.'),
 ('site.impervious_surface',1,'high','A shed counts toward impervious-surface limits even when it has a dirt floor.','The Code definition expressly includes roofs; the floor material does not remove the shed roof from ISR.'),
 ('materials.permanent_roof',1,'medium','A shed needs permanent roofing material; a tarp does not qualify as a roof.','Planner-validated interpretation without a located published Code provision; additional authoritative confirmation remains advisable.')
) v(key,version,confidence,summary,notes) on v.key=r.key
left join public.rule_versions old on old.rule_id=r.id and old.version_number=1
where rs.key='clearwater_shed_v1' on conflict(rule_id,version_number) do nothing;

insert into public.rule_outcomes(rule_version_id,sequence,outcome_type,subject_input_id,parameters,severity,message_template)
select rv.id,1,v.outcome,null,v.parameters,v.severity,v.message
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id join public.rule_versions rv on rv.rule_id=r.id
join (values
 ('permit.utilities',2,'external_authority_required','{"trades":["electrical","plumbing"],"final_inspection_required":true}'::jsonb,'warning','Adding electrical or plumbing? The applicable final inspection is required after the work is complete.'),
 ('site.impervious_surface',1,'obligation','{"applies_with_dirt_floor":true,"basis":"shed_roof"}'::jsonb,'requirement','Even with a dirt floor, the shed still counts toward your property’s impervious surface limits.'),
 ('materials.permanent_roof',1,'obligation','{"permanent_roof_required":true,"tarp_qualifies":false,"authority":"planner_validated"}'::jsonb,'requirement','A shed needs permanent roofing material. A tarp does not qualify as a roof.')
) v(key,version,outcome,parameters,severity,message) on v.key=r.key and v.version=rv.version_number
where rs.key='clearwater_shed_v1' and rv.published_at is null on conflict(rule_version_id,sequence) do nothing;

insert into public.rule_version_inputs(rule_version_id,input_definition_id,role,authority_requirement,notes)
select rv.id,d.id,'applicability','none','Derived from selecting the shed workflow.'
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id join public.rule_versions rv on rv.rule_id=r.id
join public.input_definitions d on d.key='project.structure_type'
where rs.key='clearwater_shed_v1' and r.key in ('permit.utilities','site.impervious_surface','materials.permanent_roof')
and rv.version_number=case when r.key='permit.utilities' then 2 else 1 end and rv.published_at is null
on conflict(rule_version_id,input_definition_id,role) do nothing;

insert into public.rule_citations(rule_version_id,source_provision_id,citation_role,pinpoint_note,sequence)
select rv.id,sp.id,v.role,v.note,v.sequence
from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id join public.rule_versions rv on rv.rule_id=r.id
join (values
 ('permit.utilities',2,'abi-shed-trades-response','primary','Direct planner validation and official City inspection next step.',1),
 ('site.impervious_surface',1,'8-102-isr-definition','definition','Roofs are included in the controlling impervious-surface definition.',1),
 ('site.impervious_surface',1,'abi-shed-isr-response','primary','Planner confirmation of application to dirt-floor sheds.',2),
 ('materials.permanent_roof',1,'abi-shed-roof-response','primary','Planner-validated interpretation; no fabricated Code pinpoint.',1)
) v(key,version,locator,role,note,sequence) on v.key=r.key and v.version=rv.version_number
join public.source_provisions sp on sp.locator=v.locator
join public.regulatory_sources s on s.id=sp.regulatory_source_id and s.jurisdiction_id=rs.jurisdiction_id
where rs.key='clearwater_shed_v1' and rv.published_at is null
on conflict(rule_version_id,source_provision_id,citation_role) do nothing;

do $$ declare versions integer; outcomes integer; inputs integer; citations integer;
begin
 select count(*) into versions from public.rule_versions rv join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and ((r.key='permit.utilities' and rv.version_number=2) or (r.key in ('site.impervious_surface','materials.permanent_roof') and rv.version_number=1));
 select count(*) into outcomes from public.rule_outcomes o join public.rule_versions rv on rv.id=o.rule_version_id join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and ((r.key='permit.utilities' and rv.version_number=2) or (r.key in ('site.impervious_surface','materials.permanent_roof') and rv.version_number=1));
 select count(*) into inputs from public.rule_version_inputs i join public.rule_versions rv on rv.id=i.rule_version_id join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and ((r.key='permit.utilities' and rv.version_number=2) or (r.key in ('site.impervious_surface','materials.permanent_roof') and rv.version_number=1));
 select count(*) into citations from public.rule_citations c join public.rule_versions rv on rv.id=c.rule_version_id join public.rules r on r.id=rv.rule_id join public.rule_sets rs on rs.id=r.rule_set_id where rs.key='clearwater_shed_v1' and ((r.key='permit.utilities' and rv.version_number=2) or (r.key in ('site.impervious_surface','materials.permanent_roof') and rv.version_number=1));
 if versions<>3 or outcomes<>3 or inputs<>3 or citations<>4 then raise exception 'Clearwater Shed clarification rules incomplete (versions %, outcomes %, inputs %, citations %)',versions,outcomes,inputs,citations; end if;
end $$;

update public.rule_versions rv set lifecycle_status='superseded',effective_to=date '2026-09-02' from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id where rv.rule_id=r.id and rs.key='clearwater_shed_v1' and r.key='permit.utilities' and rv.version_number=1 and rv.lifecycle_status='active';
update public.rule_versions rv set lifecycle_status='active',published_at=timestamptz '2026-09-02 00:00:00+00' from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id where rv.rule_id=r.id and rs.key='clearwater_shed_v1' and ((r.key='permit.utilities' and rv.version_number=2) or (r.key in ('site.impervious_surface','materials.permanent_roof') and rv.version_number=1)) and rv.published_at is null;
update public.rules r set active_version_id=rv.id from public.rule_versions rv,public.rule_sets rs where rv.rule_id=r.id and rs.id=r.rule_set_id and rs.key='clearwater_shed_v1' and ((r.key='permit.utilities' and rv.version_number=2) or (r.key in ('site.impervious_surface','materials.permanent_roof') and rv.version_number=1)) and rv.lifecycle_status='active' and rv.published_at is not null;
commit;
