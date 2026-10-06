-- AxiumZ rooms and acceptance-record suite
-- ============================================================================
-- Verifies the managed rooms list and the privacy-acceptance record:
--   - admins manage rooms; names are unique per organization (case and
--     spaces ignored); blank names and zero capacity are refused
--   - teachers can see rooms but not change them; outsiders see nothing
--   - a class or session takes its displayed room name from its room, and a
--     rename updates it everywhere; clearing the room clears the text
--   - a room from another organization can't be used
--   - a room still in use can't be deleted (deactivate it instead)
--   - an older app version that writes plain room text still works
--   - a person can record their own privacy acceptance, not anyone else's
--   - only admins can read who has accepted their invitation (account_acceptance)
--
-- HOW TO RUN: paste into the Supabase SQL editor and run as one script.
-- Every row of the final report should say PASS. It builds its own throwaway
-- organizations ('RM Test Org', 'RM Other Org') and removes everything.
-- ============================================================================

create temp table if not exists rm_results (n serial, test text, outcome text);

do $$
declare
  v_org uuid; v_org2 uuid; v_prog uuid; v_level uuid; v_room uuid; v_room2 uuid; v_other_room uuid;
  v_class uuid; v_class2 uuid; v_sess uuid;
  v_admin uuid := 'a4000000-0000-0000-0000-000000000001';
  v_teach uuid := 'a4000000-0000-0000-0000-000000000002';
  v_stranger uuid := 'a4000000-0000-0000-0000-000000000099';
  v_count int; v_ok boolean; v_msg text; v_txt text;
begin
  insert into organizations (name) values ('RM Test Org') returning id into v_org;
  insert into organizations (name) values ('RM Other Org') returning id into v_org2;
  insert into auth.users (id,email) values (v_admin,'rm-admin@example.com'),(v_teach,'rm-teacher@example.com');
  insert into organization_members (organization_id,user_id,role_id) values (v_org,v_admin,2),(v_org,v_teach,3);
  insert into programs (organization_id,name,kind) values (v_org,'RM programme','scolaire') returning id into v_prog;
  insert into levels (organization_id,program_id,name) values (v_org,v_prog,'RM niveau') returning id into v_level;
  insert into rooms (organization_id,name) values (v_org2,'Foreign room') returning id into v_other_room;

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_admin)::text, true);
  v_ok := true;
  begin insert into rooms (organization_id,name,capacity) values (v_org,'Salle A',10) returning id into v_room;
  exception when others then v_ok := false; v_msg := sqlerrm; end;
  perform set_config('role','postgres',true);
  insert into rm_results(test,outcome) values ('admin can create a room', case when v_ok then 'PASS' else 'FAIL: '||v_msg end);

  begin insert into rooms (organization_id,name) values (v_org,'  salle a ');
    insert into rm_results(test,outcome) values ('duplicate room name (case/spaces) rejected','FAIL (accepted)');
  exception when unique_violation then insert into rm_results(test,outcome) values ('duplicate room name (case/spaces) rejected','PASS'); end;
  insert into rooms (organization_id,name) values (v_org2,'Salle A');
  insert into rm_results(test,outcome) values ('the same name in another organization is fine','PASS');

  begin insert into rooms (organization_id,name) values (v_org,'   ');
    insert into rm_results(test,outcome) values ('blank room name rejected','FAIL (accepted)');
  exception when check_violation then insert into rm_results(test,outcome) values ('blank room name rejected','PASS'); end;
  begin insert into rooms (organization_id,name,capacity) values (v_org,'Salle Z',0);
    insert into rm_results(test,outcome) values ('zero capacity rejected','FAIL (accepted)');
  exception when check_violation then insert into rm_results(test,outcome) values ('zero capacity rejected','PASS'); end;

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_teach)::text, true);
  select count(*) into v_count from rooms where organization_id = v_org;
  v_ok := false;
  begin insert into rooms (organization_id,name) values (v_org,'Teacher room'); exception when others then v_ok := true; end;
  with u as (update rooms set name = 'Hacked' where id = v_room returning 1) select count(*) into v_txt from u;
  perform set_config('role','postgres',true);
  insert into rm_results(test,outcome) values ('teacher can see rooms', case when v_count=1 then 'PASS' else 'FAIL: '||v_count end);
  insert into rm_results(test,outcome) values ('teacher cannot create rooms', case when v_ok then 'PASS' else 'FAIL (accepted)' end);
  insert into rm_results(test,outcome) values ('teacher cannot rename rooms', case when v_txt = '0' and (select name from rooms where id=v_room)='Salle A' then 'PASS' else 'FAIL' end);

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_teach)::text, true);
  with d as (delete from rooms where id = v_room returning 1) select count(*) into v_txt from d;
  perform set_config('role','postgres',true);
  insert into rm_results(test,outcome) values ('teacher cannot delete rooms', case when v_txt='0' and exists(select 1 from rooms where id=v_room) then 'PASS' else 'FAIL' end);

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_stranger)::text, true);
  select count(*) into v_count from rooms where organization_id = v_org;
  perform set_config('role','postgres',true);
  perform set_config('request.jwt.claims','',true);
  insert into rm_results(test,outcome) values ('outsider sees no rooms', case when v_count=0 then 'PASS' else 'FAIL: '||v_count end);

  insert into classes (organization_id,program_id,level_id,name,room_id) values (v_org,v_prog,v_level,'RM class',v_room) returning id into v_class;
  select room into v_txt from classes where id = v_class;
  insert into rm_results(test,outcome) values ('class takes its room name from the room', case when v_txt='Salle A' then 'PASS' else 'FAIL: '||coalesce(v_txt,'null') end);
  insert into class_sessions (class_id,starts_at,ends_at,room_id) values (v_class, now(), now()+interval '1 hour', v_room) returning id into v_sess;
  select room into v_txt from class_sessions where id = v_sess;
  insert into rm_results(test,outcome) values ('session takes its room name from the room', case when v_txt='Salle A' then 'PASS' else 'FAIL: '||coalesce(v_txt,'null') end);

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_admin)::text, true);
  update rooms set name = 'Salle Alpha' where id = v_room;
  perform set_config('role','postgres',true);
  insert into rm_results(test,outcome) values ('renaming a room renames it on its classes and sessions',
    case when (select room from classes where id=v_class)='Salle Alpha' and (select room from class_sessions where id=v_sess)='Salle Alpha' then 'PASS' else 'FAIL' end);

  update rooms set is_active = false where id = v_room;
  insert into rm_results(test,outcome) values ('deactivating a room keeps it on existing classes and sessions',
    case when (select room_id from classes where id=v_class)=v_room and (select room from class_sessions where id=v_sess)='Salle Alpha' then 'PASS' else 'FAIL' end);
  update rooms set is_active = true where id = v_room;

  begin insert into classes (organization_id,program_id,level_id,name,room_id) values (v_org,v_prog,v_level,'RM bad',v_other_room);
    insert into rm_results(test,outcome) values ('class cannot use another organization''s room','FAIL (accepted)');
  exception when others then insert into rm_results(test,outcome) values ('class cannot use another organization''s room', case when sqlerrm like '%Room not found%' then 'PASS' else 'FAIL: '||sqlerrm end); end;
  begin insert into class_sessions (class_id,starts_at,ends_at,room_id) values (v_class, now(), now()+interval '1 hour', v_other_room);
    insert into rm_results(test,outcome) values ('session cannot use another organization''s room','FAIL (accepted)');
  exception when others then insert into rm_results(test,outcome) values ('session cannot use another organization''s room', case when sqlerrm like '%Room not found%' then 'PASS' else 'FAIL: '||sqlerrm end); end;

  update classes set room_id = null where id = v_class;
  insert into rm_results(test,outcome) values ('removing a class''s room clears its displayed room', case when (select room from classes where id=v_class) is null then 'PASS' else 'FAIL' end);

  insert into classes (organization_id,program_id,level_id,name,room) values (v_org,v_prog,v_level,'RM legacy','Legacy text') returning id into v_class2;
  insert into rm_results(test,outcome) values ('a class saved with plain room text (older app) keeps it', case when (select room from classes where id=v_class2)='Legacy text' then 'PASS' else 'FAIL' end);

  begin delete from rooms where id = v_room;
    insert into rm_results(test,outcome) values ('a room still used by a session cannot be deleted','FAIL (accepted)');
  exception when foreign_key_violation then insert into rm_results(test,outcome) values ('a room still used by a session cannot be deleted','PASS'); end;
  insert into rooms (organization_id,name) values (v_org,'Spare') returning id into v_room2;
  begin delete from rooms where id = v_room2;
    insert into rm_results(test,outcome) values ('an unused room can be deleted','PASS');
  exception when others then insert into rm_results(test,outcome) values ('an unused room can be deleted','FAIL: '||sqlerrm); end;

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_teach)::text, true);
  v_ok := true;
  begin update profiles set privacy_accepted_at = now(), privacy_version = '2026-10' where id = v_teach;
  exception when others then v_ok := false; v_msg := sqlerrm; end;
  with u as (update profiles set privacy_version = 'forged' where id = v_admin returning 1) select count(*) into v_txt from u;
  perform set_config('role','postgres',true);
  insert into rm_results(test,outcome) values ('a person can record their own privacy acceptance',
    case when v_ok and (select privacy_version from profiles where id=v_teach)='2026-10' then 'PASS' else 'FAIL: '||coalesce(v_msg,'') end);
  insert into rm_results(test,outcome) values ('a person cannot record acceptance for someone else',
    case when v_txt='0' and (select privacy_version from profiles where id=v_admin) is null then 'PASS' else 'FAIL' end);

  update auth.users set email_confirmed_at = now() where id = v_teach;
  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_admin)::text, true);
  select count(*) into v_count from public.account_acceptance(v_org) where (account_user_id = v_teach and accepted) or (account_user_id = v_admin and not accepted);
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into rm_results(test,outcome) values ('admin sees who accepted their invitation and who has not', case when v_count=2 then 'PASS' else 'FAIL: '||v_count end);

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_teach)::text, true);
  v_ok := false;
  begin perform * from public.account_acceptance(v_org); exception when others then v_ok := true; end;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into rm_results(test,outcome) values ('a teacher cannot read acceptance status', case when v_ok then 'PASS' else 'FAIL (accepted)' end);

  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_stranger)::text, true);
  v_ok := false;
  begin perform * from public.account_acceptance(v_org); exception when others then v_ok := true; end;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into rm_results(test,outcome) values ('an outsider cannot read acceptance status', case when v_ok then 'PASS' else 'FAIL (accepted)' end);

  perform set_config('request.jwt.claims','',true);
  delete from class_sessions where class_id in (v_class, v_class2);
  delete from classes where organization_id = v_org;
  delete from rooms where organization_id in (v_org, v_org2);
  delete from programs where organization_id = v_org;
  delete from organization_members where organization_id = v_org;
  delete from auth.users where email like 'rm-%@example.com';
  delete from organizations where id in (v_org, v_org2);
exception when others then
  perform set_config('role','postgres',true);
  perform set_config('request.jwt.claims','',true);
  delete from class_sessions where class_id in (select id from classes where name like 'RM %');
  delete from classes where name like 'RM %';
  delete from rooms where organization_id in (select id from organizations where name like 'RM %Org');
  delete from programs where organization_id in (select id from organizations where name like 'RM %Org');
  delete from auth.users where email like 'rm-%@example.com';
  delete from organizations where name like 'RM %Org';
  raise;
end $$;

-- Final report: every row should say PASS.
select test, outcome from rm_results order by n;
