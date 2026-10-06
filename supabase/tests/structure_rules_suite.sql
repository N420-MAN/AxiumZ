-- AxiumZ structure-rules suite
-- ============================================================================
-- Verifies the whole Programmes -> Niveaux -> Classes structure and the people
-- rules that hang off it, at the DATABASE level:
--   - programmes (type + audience), niveaux (ordered, one programme each),
--     classes (programme -> niveau -> free name; teacher/capacity optional)
--   - starter niveaux A1-C2, copying niveaux, reordering niveaux
--   - an ELEVE always has a parent; a STAGIAIRE may have a supervisor, with
--     the stagiaire's consent recorded; a parent only links to an eleve and a
--     supervisor to a stagiaire
--   - create_student_with_family() is all-or-nothing (nothing left behind if
--     any step is refused)
--   - the waiting list ("classe souhaitee"): requests are fulfilled
--     automatically when the person is placed; batch placement is all-or-nothing
--   - programme audience (eleves / stagiaires / both) is enforced
--   - chapters belong to a class; who can see and edit them
--   - the old programs / school years / enrollments are really gone
--
-- HOW TO RUN: paste into the Supabase SQL editor and run as one script.
-- The final report lists any failure, then the total of passes. It builds its
-- own throwaway organizations ('ST Test Org', 'ST Other Org') and removes
-- everything before finishing.
-- ============================================================================

create temp table if not exists st_results (n serial, test text, outcome text);

do $$
declare
  v_org uuid; v_org2 uuid;
  v_admin uuid := 'f5000000-0000-0000-0000-000000000001';
  v_teach uuid := 'f5000000-0000-0000-0000-000000000002';
  v_parent_user uuid := 'f5000000-0000-0000-0000-000000000003';
  v_stranger uuid := 'f5000000-0000-0000-0000-000000000099';
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p_other uuid;
  l1a uuid; l1b uuid; l1x uuid; l2a1 uuid; l3a1 uuid;
  c1 uuid; c2 uuid; c3 uuid; c5 uuid; c6 uuid; v_teacher_row uuid;
  r jsonb; e1 uuid; par1 uuid; e3 uuid; e4 uuid; s1 uuid; sup1 uuid; e5 uuid;
  v_count int; v_msg text; v_ok boolean; v_placed int;
  eleve_json text := '{"kind":"eleve","first_name":"E","last_name":"ST","school_name":"Lycee X","grade_level":"6eme annee","email":"%s"}';
  stag_json text := '{"kind":"stagiaire","first_name":"S","last_name":"ST","phone":"0600000050","email":"%s"}';
  new_parent text := '{"first_name":"Pa","last_name":"ST","email":"%s","phone":"0600000001","address":"Casablanca"}';
  new_sup text := '{"first_name":"Su","last_name":"ST","email":"%s","phone":"0600000002","company":"ACME"}';
begin
  insert into organizations (name) values ('ST Test Org') returning id into v_org;
  insert into organizations (name) values ('ST Other Org') returning id into v_org2;
  insert into auth.users (id,email) values (v_admin,'st-admin@example.com'),(v_teach,'st-teacher@example.com'),(v_parent_user,'st-parentlogin@example.com');
  insert into organization_members (organization_id,user_id,role_id) values (v_org,v_admin,2),(v_org,v_teach,3),(v_org,v_parent_user,5);
  insert into teachers (organization_id,user_id,first_name,last_name,email,phone) values (v_org,v_teach,'T','ST','st-teacher@example.com','0600000099') returning id into v_teacher_row;

  ------------------------------------------------------------------ PROGRAMMES
  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_admin)::text, true);
  v_ok := true;
  begin insert into programs (organization_id,name,kind,audience) values (v_org,'ST Soutien','scolaire','eleves') returning id into p1;
  exception when others then v_ok := false; v_msg := sqlerrm; end;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into st_results(test,outcome) values ('admin can create a programme', case when v_ok then 'PASS' else 'FAIL: '||v_msg end);

  begin insert into programs (organization_id,name,kind) values (v_org,'  st soutien ','scolaire');
    insert into st_results(test,outcome) values ('duplicate programme name (case/spaces) rejected','FAIL (accepted)');
  exception when unique_violation then insert into st_results(test,outcome) values ('duplicate programme name (case/spaces) rejected','PASS'); end;
  begin insert into programs (organization_id,name,kind) values (v_org,'ST Sport','sport');
    insert into st_results(test,outcome) values ('unknown programme type rejected','FAIL (accepted)');
  exception when check_violation then insert into st_results(test,outcome) values ('unknown programme type rejected','PASS'); end;

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_teach)::text, true);
  v_ok := false;
  begin insert into programs (organization_id,name,kind) values (v_org,'Teacher programme','scolaire'); exception when others then v_ok := true; end;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into st_results(test,outcome) values ('teacher cannot create programmes', case when v_ok then 'PASS' else 'FAIL (accepted)' end);

  insert into programs (organization_id,name,kind,audience) values (v_org,'ST Langues','langues','both') returning id into p2;
  insert into programs (organization_id,name,kind,audience) values (v_org,'ST Formation','langues','stagiaires') returning id into p3;
  insert into programs (organization_id,name,kind,audience) values (v_org2,'ST Foreign','scolaire','both') returning id into p_other;

  ---------------------------------------------------------------------- NIVEAUX
  insert into levels (organization_id,program_id,name) values (v_org,p1,'6eme') returning id into l1a;
  insert into levels (organization_id,program_id,name) values (v_org,p1,'5eme') returning id into l1b;
  insert into st_results(test,outcome) values ('new niveaux are numbered in order',
    case when (select position from levels where id=l1a)=1 and (select position from levels where id=l1b)=2 then 'PASS' else 'FAIL' end);

  begin insert into levels (organization_id,program_id,name) values (v_org,p1,' 6EME ');
    insert into st_results(test,outcome) values ('duplicate niveau in one programme rejected','FAIL (accepted)');
  exception when unique_violation then insert into st_results(test,outcome) values ('duplicate niveau in one programme rejected','PASS'); end;
  begin insert into levels (organization_id,program_id,name) values (v_org,p1,'A1') returning id into l1x;
    insert into st_results(test,outcome) values ('the same niveau name in another programme is fine','PASS');
  exception when others then insert into st_results(test,outcome) values ('the same niveau name in another programme is fine','FAIL: '||sqlerrm); end;
  begin insert into levels (organization_id,program_id,name) values (v_org2,p1,'Wrong org');
    insert into st_results(test,outcome) values ('a niveau cannot sit in another organization''s programme','FAIL (accepted)');
  exception when foreign_key_violation then insert into st_results(test,outcome) values ('a niveau cannot sit in another organization''s programme','PASS'); end;

  v_count := public.add_starter_levels(p2);
  insert into st_results(test,outcome) values ('starter niveaux A1 to C2 are added in order to a language programme',
    case when v_count=6 and (select string_agg(name, ',' order by position) from levels where program_id=p2)='A1,A2,B1,B2,C1,C2' then 'PASS' else 'FAIL: '||v_count end);
  insert into st_results(test,outcome) values ('adding the starter niveaux twice adds nothing', case when public.add_starter_levels(p2)=0 then 'PASS' else 'FAIL' end);
  begin perform public.add_starter_levels(p1);
    insert into st_results(test,outcome) values ('starter niveaux refused for a school programme','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('starter niveaux refused for a school programme', case when sqlerrm like '%only for language%' then 'PASS' else 'FAIL: '||sqlerrm end); end;
  select id into l2a1 from levels where program_id=p2 and name='A1';

  v_count := public.copy_levels(p2, p3);
  insert into st_results(test,outcome) values ('copy niveaux from another programme', case when v_count=6 and public.copy_levels(p2,p3)=0 then 'PASS' else 'FAIL: '||v_count end);
  select id into l3a1 from levels where program_id=p3 and name='A1';

  perform public.move_level(l1b, -1);
  insert into st_results(test,outcome) values ('moving a niveau up reorders the list', case when (select string_agg(name, ',' order by position) from levels where program_id=p1)='5eme,6eme,A1' then 'PASS' else 'FAIL: '||(select string_agg(name||position, ',' order by position) from levels where program_id=p1) end);
  perform public.move_level(l1b, -1);
  insert into st_results(test,outcome) values ('moving the first niveau up changes nothing', case when (select string_agg(name, ',' order by position) from levels where program_id=p1)='5eme,6eme,A1' then 'PASS' else 'FAIL' end);
  perform public.move_level(l1b, 1);
  insert into st_results(test,outcome) values ('moving a niveau down reorders the list', case when (select string_agg(name, ',' order by position) from levels where program_id=p1)='6eme,5eme,A1' then 'PASS' else 'FAIL' end);

  ----------------------------------------------------------------------- CLASSES
  insert into classes (organization_id,program_id,level_id,name,capacity) values (v_org,p1,l1a,'maths - classe A',2) returning id into c1;
  insert into classes (organization_id,program_id,level_id,name) values (v_org,p2,l2a1,'english - groupe 1') returning id into c2;
  insert into classes (organization_id,program_id,level_id,name) values (v_org,p3,l3a1,'business english') returning id into c3;
  insert into classes (organization_id,program_id,level_id,name) values (v_org,p1,l1a,'maths - classe B (no limit)') returning id into c6;
  insert into st_results(test,outcome) values ('classes need no teacher and no capacity', case when (select teacher_id from classes where id=c2) is null and (select capacity from classes where id=c2) is null then 'PASS' else 'FAIL' end);

  begin insert into classes (organization_id,program_id,level_id,name) values (v_org,p1,l2a1,'wrong niveau');
    insert into st_results(test,outcome) values ('a class cannot use a niveau from another programme','FAIL (accepted)');
  exception when foreign_key_violation then insert into st_results(test,outcome) values ('a class cannot use a niveau from another programme','PASS'); end;
  begin insert into classes (organization_id,program_id,level_id,name,capacity) values (v_org,p1,l1a,'zero',0);
    insert into st_results(test,outcome) values ('zero capacity rejected','FAIL (accepted)');
  exception when check_violation then insert into st_results(test,outcome) values ('zero capacity rejected','PASS'); end;
  begin insert into classes (organization_id,program_id,level_id,name) values (v_org,p1,l1a,'   ');
    insert into st_results(test,outcome) values ('blank class name rejected','FAIL (accepted)');
  exception when check_violation then insert into st_results(test,outcome) values ('blank class name rejected','PASS'); end;

  begin delete from levels where id = l1a;
    insert into st_results(test,outcome) values ('a niveau used by a class cannot be deleted','FAIL (accepted)');
  exception when foreign_key_violation then insert into st_results(test,outcome) values ('a niveau used by a class cannot be deleted','PASS'); end;
  begin delete from programs where id = p1;
    insert into st_results(test,outcome) values ('a programme with classes cannot be deleted','FAIL (accepted)');
  exception when foreign_key_violation then insert into st_results(test,outcome) values ('a programme with classes cannot be deleted','PASS'); end;
  begin update programs set kind = 'langues' where id = p1;
    insert into st_results(test,outcome) values ('a programme with classes cannot change type','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('a programme with classes cannot change type', case when sqlerrm like '%cannot change its type%' then 'PASS' else 'FAIL: '||sqlerrm end); end;
  insert into programs (organization_id,name,kind) values (v_org,'ST Temp','scolaire') returning id into p4;
  insert into levels (organization_id,program_id,name) values (v_org,p4,'T1');
  update programs set kind = 'langues' where id = p4;
  delete from programs where id = p4;
  insert into st_results(test,outcome) values ('an empty programme can change type and be deleted with its niveaux', case when not exists (select 1 from levels where program_id=p4) then 'PASS' else 'FAIL' end);

  ------------------------------------------------------------ PEOPLE: ELEVES
  r := public.create_student_with_family(v_org, format(eleve_json,'st-e1@example.com')::jsonb, array[c1], '[]'::jsonb, null, format(new_parent,'st-p1@example.com')::jsonb, false);
  e1 := (r->>'student_id')::uuid; par1 := (r->>'guardian_id')::uuid;
  insert into st_results(test,outcome) values ('creates an eleve with a new parent, link and class in one go',
    case when (select kind from students where id=e1)='eleve' and (select kind from parents where id=par1)='parent'
          and exists (select 1 from parent_students where student_id=e1 and parent_id=par1)
          and exists (select 1 from class_students where student_id=e1 and class_id=c1) and (r->>'guardian_created')::boolean then 'PASS' else 'FAIL' end);

  begin
    perform public.create_student_with_family(v_org, format(eleve_json,'st-noparent@example.com')::jsonb, array[c6], '[]'::jsonb);
    set constraints all immediate;
    insert into st_results(test,outcome) values ('an eleve without a parent is refused','FAIL (accepted)');
  exception when others then
    insert into st_results(test,outcome) values ('an eleve without a parent is refused', case when sqlerrm like '%must have a parent%' and not exists (select 1 from students where email='st-noparent@example.com') then 'PASS' else 'FAIL: '||sqlerrm end);
  end;
  set constraints all deferred;

  begin
    perform public.create_student_with_family(v_org, '{"kind":"eleve","first_name":"E","last_name":"ST","email":"st-nogr@example.com","school_name":"Lycee X"}'::jsonb, array[c6], '[]'::jsonb, null, format(new_parent,'st-pnogr@example.com')::jsonb);
    insert into st_results(test,outcome) values ('an eleve without an annee scolaire is refused','FAIL (accepted)');
  exception when check_violation then insert into st_results(test,outcome) values ('an eleve without an annee scolaire is refused','PASS'); end;
  begin
    perform public.create_student_with_family(v_org, '{"kind":"eleve","first_name":"E","last_name":"ST","email":"st-nosch@example.com","grade_level":"6eme"}'::jsonb, array[c6], '[]'::jsonb, null, format(new_parent,'st-pnosch@example.com')::jsonb);
    insert into st_results(test,outcome) values ('an eleve without an etablissement is refused','FAIL (accepted)');
  exception when check_violation then insert into st_results(test,outcome) values ('an eleve without an etablissement is refused','PASS'); end;
  begin
    perform public.create_student_with_family(v_org, '{"kind":"eleve","first_name":"E","last_name":"ST","school_name":"X","grade_level":"6eme"}'::jsonb, array[c6], '[]'::jsonb, null, format(new_parent,'st-pnoem@example.com')::jsonb);
    insert into st_results(test,outcome) values ('a person without an email is refused','FAIL (accepted)');
  exception when check_violation then insert into st_results(test,outcome) values ('a person without an email is refused','PASS'); end;
  begin
    perform public.create_student_with_family(v_org, format(eleve_json,'st-nogoal@example.com')::jsonb, '{}'::uuid[], '[]'::jsonb, null, format(new_parent,'st-pgoal@example.com')::jsonb);
    insert into st_results(test,outcome) values ('registering with no class and no wish is refused','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('registering with no class and no wish is refused', case when sqlerrm like '%at least one class%' and not exists (select 1 from students where email='st-nogoal@example.com') then 'PASS' else 'FAIL: '||sqlerrm end); end;
  begin
    perform public.create_student_with_family(v_org, format(eleve_json,'st-dupmail@example.com')::jsonb, array[c6], '[]'::jsonb, null, format(new_parent,'ST-P1@example.com')::jsonb);
    insert into st_results(test,outcome) values ('a duplicate parent email refuses the whole registration','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('a duplicate parent email refuses the whole registration', case when sqlerrm like '%already used%' and not exists (select 1 from students where email='st-dupmail@example.com') then 'PASS' else 'FAIL: '||sqlerrm end); end;

  r := public.create_student_with_family(v_org, format(eleve_json,'st-e3@example.com')::jsonb, array[c1], '[]'::jsonb, par1);
  e3 := (r->>'student_id')::uuid;
  insert into st_results(test,outcome) values ('a sibling reuses the existing parent',
    case when not (r->>'guardian_created')::boolean and (select count(*) from parent_students where parent_id=par1)=2 then 'PASS' else 'FAIL' end);

  begin
    perform public.create_student_with_family(v_org, format(eleve_json,'st-e2@example.com')::jsonb, array[c1], '[]'::jsonb, par1);
    insert into st_results(test,outcome) values ('a full class refuses another student','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('a full class refuses another student', case when sqlerrm like '%at capacity%' and not exists (select 1 from students where email='st-e2@example.com') then 'PASS' else 'FAIL: '||sqlerrm end); end;

  ------------------------------------------------------------- WAITING LIST
  insert into classes (organization_id,program_id,level_id,name,capacity) values (v_org,p1,l1b,'physique - classe A',5) returning id into c5;
  r := public.create_student_with_family(v_org, format(eleve_json,'st-e4@example.com')::jsonb, '{}'::uuid[],
        format('[{"program_id":"%s","level_id":"%s","note":"physique"},{"program_id":"%s","level_id":"%s","note":"maths"}]', p1, l1b, p1, l1a)::jsonb, par1);
  e4 := (r->>'student_id')::uuid;
  insert into st_results(test,outcome) values ('registers someone on the waiting list with a class wish',
    case when (select count(*) from class_wishes where student_id=e4 and fulfilled_at is null)=2 then 'PASS' else 'FAIL' end);
  begin insert into class_wishes (organization_id,student_id,program_id,level_id,note) values (v_org,e4,p1,l1b,' PHYSIQUE ');
    insert into st_results(test,outcome) values ('the same waiting-list wish twice is refused','FAIL (accepted)');
  exception when unique_violation then insert into st_results(test,outcome) values ('the same waiting-list wish twice is refused','PASS'); end;
  insert into class_students (class_id,student_id) values (c5,e4);
  insert into st_results(test,outcome) values ('placing someone in a class fulfils only the matching wish',
    case when (select fulfilled_at from class_wishes where student_id=e4 and level_id=l1b) is not null
          and (select fulfilled_at from class_wishes where student_id=e4 and level_id=l1a) is null then 'PASS' else 'FAIL' end);

  r := public.create_student_with_family(v_org, format(eleve_json,'st-e5@example.com')::jsonb, '{}'::uuid[],
        format('[{"program_id":"%s","level_id":"%s","note":"physique"}]', p1, l1b)::jsonb, par1);
  e5 := (r->>'student_id')::uuid;
  -- Placed first, checked in a separate statement: a statement cannot see its own function's changes.
  v_placed := public.place_students_in_class(c5, array[e5]);
  insert into st_results(test,outcome) values ('batch placement places everyone and fulfils their wishes',
    case when v_placed = 1 and (select fulfilled_at from class_wishes where student_id=e5) is not null then 'PASS' else 'FAIL' end);
  begin perform public.place_students_in_class(c1, array[e4]);
    insert into st_results(test,outcome) values ('a batch that would overflow a class is refused as a whole','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('a batch that would overflow a class is refused as a whole', case when sqlerrm like '%at capacity%' and not exists (select 1 from class_students where class_id=c1 and student_id=e4) then 'PASS' else 'FAIL: '||sqlerrm end); end;

  ------------------------------------------------------- PEOPLE: STAGIAIRES
  r := public.create_student_with_family(v_org, format(stag_json,'st-s1@example.com')::jsonb, array[c3], '[]'::jsonb);
  s1 := (r->>'student_id')::uuid;
  insert into st_results(test,outcome) values ('a stagiaire needs no guardian and no school', case when (select kind from students where id=s1)='stagiaire' and (r->>'guardian_id') is null then 'PASS' else 'FAIL' end);
  begin
    perform public.create_student_with_family(v_org, '{"kind":"stagiaire","first_name":"S","last_name":"ST","email":"st-nophone@example.com"}'::jsonb, array[c3], '[]'::jsonb);
    insert into st_results(test,outcome) values ('a stagiaire without a phone is refused','FAIL (accepted)');
  exception when check_violation then insert into st_results(test,outcome) values ('a stagiaire without a phone is refused','PASS'); end;

  begin
    perform public.create_student_with_family(v_org, format(stag_json,'st-s2@example.com')::jsonb, array[c3], '[]'::jsonb, null, format(new_sup,'st-sup@example.com')::jsonb, false);
    insert into st_results(test,outcome) values ('a supervisor without the stagiaire''s consent is refused','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('a supervisor without the stagiaire''s consent is refused', case when sqlerrm like '%consent is required%' and not exists (select 1 from students where email='st-s2@example.com') then 'PASS' else 'FAIL: '||sqlerrm end); end;
  r := public.create_student_with_family(v_org, format(stag_json,'st-s2@example.com')::jsonb, array[c3], '[]'::jsonb, null, format(new_sup,'st-sup@example.com')::jsonb, true);
  sup1 := (r->>'guardian_id')::uuid;
  insert into st_results(test,outcome) values ('a supervisor with consent is linked and the consent is recorded',
    case when (select kind from parents where id=sup1)='superviseur' and (select consent_confirmed_at from parent_students where parent_id=sup1) is not null then 'PASS' else 'FAIL' end);

  begin
    perform public.create_student_with_family(v_org, format(eleve_json,'st-wrongkind@example.com')::jsonb, array[c6], '[]'::jsonb, sup1, null, true);
    insert into st_results(test,outcome) values ('an eleve cannot be linked to a supervisor','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('an eleve cannot be linked to a supervisor', case when sqlerrm like '%can only be linked%' then 'PASS' else 'FAIL: '||sqlerrm end); end;
  begin
    perform public.create_student_with_family(v_org, format(stag_json,'st-wrongkind2@example.com')::jsonb, array[c3], '[]'::jsonb, par1, null, true);
    insert into st_results(test,outcome) values ('a stagiaire cannot be linked to a parent','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('a stagiaire cannot be linked to a parent', case when sqlerrm like '%can only be linked%' then 'PASS' else 'FAIL: '||sqlerrm end); end;

  ---------------------------------------------------- PROGRAMME AUDIENCE RULE
  begin
    perform public.create_student_with_family(v_org, format(eleve_json,'st-aud1@example.com')::jsonb, array[c3], '[]'::jsonb, null, format(new_parent,'st-paud1@example.com')::jsonb);
    insert into st_results(test,outcome) values ('an eleve cannot join a stagiaires-only programme','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('an eleve cannot join a stagiaires-only programme', case when sqlerrm like '%not open to this type%' and not exists (select 1 from students where email='st-aud1@example.com') then 'PASS' else 'FAIL: '||sqlerrm end); end;
  begin
    perform public.create_student_with_family(v_org, format(stag_json,'st-aud2@example.com')::jsonb, array[c6], '[]'::jsonb);
    insert into st_results(test,outcome) values ('a stagiaire cannot join an eleves-only programme','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('a stagiaire cannot join an eleves-only programme', case when sqlerrm like '%not open to this type%' then 'PASS' else 'FAIL: '||sqlerrm end); end;
  begin
    perform public.create_student_with_family(v_org, format(stag_json,'st-aud3@example.com')::jsonb, '{}'::uuid[], format('[{"program_id":"%s","level_id":"%s"}]', p1, l1a)::jsonb);
    insert into st_results(test,outcome) values ('a stagiaire cannot wish for an eleves-only programme','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('a stagiaire cannot wish for an eleves-only programme', case when sqlerrm like '%not open to this type%' then 'PASS' else 'FAIL: '||sqlerrm end); end;
  insert into class_students (class_id,student_id) values (c2,s1);
  insert into class_students (class_id,student_id) values (c2,e1);
  begin update programs set audience = 'eleves' where id = p2;
    insert into st_results(test,outcome) values ('a programme cannot exclude a type that is already in it','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('a programme cannot exclude a type that is already in it', case when sqlerrm like '%excluded type%' then 'PASS' else 'FAIL: '||sqlerrm end); end;

  ---------------------------------------------------------------- PARENT RULES
  begin delete from parent_students where student_id = e4 and parent_id = par1;
    insert into st_results(test,outcome) values ('the last parent of an eleve cannot be removed','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('the last parent of an eleve cannot be removed', case when sqlerrm like '%last parent%' then 'PASS' else 'FAIL: '||sqlerrm end); end;
  begin delete from parents where id = par1;
    insert into st_results(test,outcome) values ('deleting the only parent of an eleve is refused','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('deleting the only parent of an eleve is refused', case when sqlerrm like '%last parent%' then 'PASS' else 'FAIL: '||sqlerrm end); end;
  r := public.add_guardian_to_student(e1, null, format(new_parent,'st-p2@example.com')::jsonb, false);
  delete from parent_students where student_id = e1 and parent_id = par1;
  insert into st_results(test,outcome) values ('a parent can be removed once the eleve has another', case when exists (select 1 from parent_students where student_id=e1) and not exists (select 1 from parent_students where student_id=e1 and parent_id=par1) then 'PASS' else 'FAIL' end);
  delete from parent_students where parent_id = sup1;
  insert into st_results(test,outcome) values ('a stagiaire''s supervisor can be removed freely', case when not exists (select 1 from parent_students where parent_id=sup1) then 'PASS' else 'FAIL' end);
  begin update students set kind = 'stagiaire' where id = e1;
    insert into st_results(test,outcome) values ('a person''s type cannot change once linked','FAIL (accepted)');
  exception when others then insert into st_results(test,outcome) values ('a person''s type cannot change once linked', case when sqlerrm like '%cannot be changed%' then 'PASS' else 'FAIL: '||sqlerrm end); end;
  delete from students where id = e1;
  insert into st_results(test,outcome) values ('deleting an eleve is not blocked by their parent link', case when not exists (select 1 from students where id=e1) then 'PASS' else 'FAIL' end);

  update parents set user_id = v_parent_user where id = par1;
  insert into class_wishes (organization_id,student_id,program_id,level_id,note) values (v_org,e3,p1,l1b,'own child wish');
  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_parent_user)::text, true);
  select count(*) into v_count from class_wishes where student_id = e3;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into st_results(test,outcome) values ('a parent sees their own child''s wishes', case when v_count=1 then 'PASS' else 'FAIL: '||v_count end);

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_stranger)::text, true);
  select count(*) into v_count from class_wishes where organization_id = v_org;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into st_results(test,outcome) values ('an outsider sees no wishes', case when v_count=0 then 'PASS' else 'FAIL: '||v_count end);

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_teach)::text, true);
  v_ok := false;
  begin insert into levels (organization_id,program_id,name) values (v_org,p1,'Teacher niveau'); exception when others then v_ok := true; end;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into st_results(test,outcome) values ('a teacher cannot create niveaux', case when v_ok then 'PASS' else 'FAIL (accepted)' end);

  ---------------------------------------------------------------------- CHAPTERS
  update classes set teacher_id = v_teacher_row where id = c1;
  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_admin)::text, true);
  v_ok := true;
  begin insert into syllabus_items (class_id,title,position) values (c1,'Chapitre 1',1); exception when others then v_ok := false; v_msg := sqlerrm; end;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into st_results(test,outcome) values ('an admin can add a chapter to a class', case when v_ok then 'PASS' else 'FAIL: '||v_msg end);

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_teach)::text, true);
  select count(*) into v_count from syllabus_items where class_id = c1;
  v_ok := false;
  begin insert into syllabus_items (class_id,title,position) values (c1,'Teacher chapter',2); exception when others then v_ok := true; end;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into st_results(test,outcome) values ('the class''s teacher can see its chapters but not add any', case when v_count=1 and v_ok then 'PASS' else 'FAIL: seen='||v_count||' blocked='||v_ok end);

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_stranger)::text, true);
  select count(*) into v_count from syllabus_items where class_id = c1;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into st_results(test,outcome) values ('an outsider sees no chapters', case when v_count=0 then 'PASS' else 'FAIL: '||v_count end);

  insert into syllabus_items (class_id,title,position) values (c1,'Chapitre 2',2);
  v_count := public.copy_syllabus(c1, c5);
  insert into st_results(test,outcome) values ('chapters can be copied from one class to another', case when v_count=2 and (select count(*) from syllabus_items where class_id=c5)=2 then 'PASS' else 'FAIL: '||v_count end);

  insert into st_results(test,outcome) values ('the old programs, years and enrollments are gone',
    case when to_regclass('public.courses') is null and to_regclass('public.school_years') is null and to_regclass('public.enrollments') is null
          and to_regprocedure('public.set_current_school_year(uuid)') is null and to_regprocedure('public.enrollments_guard()') is null then 'PASS' else 'FAIL' end);
  insert into st_results(test,outcome) values ('materials has one access rule per action',
    case when (select max(c) from (select count(*) as c from pg_policies where schemaname='public' and tablename='materials' group by cmd) x) = 1 then 'PASS' else 'FAIL' end);

  -- cleanup: clear the acting identity first (the audit log records it), and
  -- remove students before parents so protected parents can be deleted
  perform set_config('request.jwt.claims','',true);
  delete from students where organization_id in (v_org, v_org2);
  delete from parents where organization_id in (v_org, v_org2);
  delete from classes where organization_id in (v_org, v_org2);
  delete from programs where organization_id in (v_org, v_org2);
  delete from teachers where organization_id = v_org;
  delete from organization_members where organization_id = v_org;
  delete from auth.users where email like 'st-%@example.com';
  delete from organizations where id in (v_org, v_org2);
exception when others then
  perform set_config('role','postgres',true);
  perform set_config('request.jwt.claims','',true);
  delete from students where last_name = 'ST';
  delete from parents where last_name = 'ST';
  delete from classes where organization_id in (select id from organizations where name like 'ST %Org');
  delete from programs where organization_id in (select id from organizations where name like 'ST %Org');
  delete from teachers where last_name = 'ST';
  delete from auth.users where email like 'st-%@example.com';
  delete from organizations where name like 'ST %Org';
  raise;
end $$;

-- Final report: any failure, then the number of passes.
select test, outcome from st_results where outcome <> 'PASS'
union all select 'TOTAL PASS', count(*)::text from st_results where outcome = 'PASS';
