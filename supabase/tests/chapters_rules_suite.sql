-- AxiumZ chapters-rules suite
-- ============================================================================
-- Chapters (the syllabus) belong to a class. Verifies who can do what:
--   - an organization admin can read, edit and delete a class's chapters
--   - the class's own teacher can read them but cannot edit or delete them
--   - an outsider sees nothing
--
-- HOW TO RUN: paste into the Supabase SQL editor and run as one script.
-- Every row of the final report should say PASS. It builds its own throwaway
-- organization ('CH Test Org') and removes everything before finishing.
-- ============================================================================

create temp table if not exists ch_res (n serial, test text, outcome text);
do $$
declare
  v_org uuid; p uuid; l uuid; c uuid; v_teacher_row uuid; v_item uuid;
  v_admin uuid := 'f6000000-0000-0000-0000-000000000001';
  v_teach uuid := 'f6000000-0000-0000-0000-000000000002';
  v_out uuid := 'f6000000-0000-0000-0000-000000000099';
  n_seen int; n_upd text; n_del text;
begin
  insert into organizations (name) values ('CH Test Org') returning id into v_org;
  insert into auth.users (id,email) values (v_admin,'ch-admin@example.com'),(v_teach,'ch-teacher@example.com');
  insert into organization_members (organization_id,user_id,role_id) values (v_org,v_admin,2),(v_org,v_teach,3);
  insert into teachers (organization_id,user_id,first_name,last_name,email,phone) values (v_org,v_teach,'T','CH','ch-teacher@example.com','0600000001') returning id into v_teacher_row;
  insert into programs (organization_id,name,kind) values (v_org,'CH P','scolaire') returning id into p;
  insert into levels (organization_id,program_id,name) values (v_org,p,'CH L') returning id into l;
  insert into classes (organization_id,program_id,level_id,name,teacher_id) values (v_org,p,l,'CH class',v_teacher_row) returning id into c;

  -- admin: add, read, edit
  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_admin)::text, true);
  insert into syllabus_items (class_id,title,position) values (c,'Chapitre 1',1) returning id into v_item;
  select count(*) into n_seen from syllabus_items where class_id = c;
  with u as (update syllabus_items set title = 'Chapitre 1 (edited)' where id = v_item returning 1) select count(*)::text into n_upd from u;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into ch_res(test,outcome) values ('admin can read and edit chapters', case when n_seen=1 and n_upd='1' then 'PASS' else 'FAIL: seen='||n_seen||' edited='||n_upd end);

  -- the class's teacher: can read, cannot edit or delete
  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_teach)::text, true);
  select count(*) into n_seen from syllabus_items where class_id = c;
  with u as (update syllabus_items set title = 'hacked' where id = v_item returning 1) select count(*)::text into n_upd from u;
  with d as (delete from syllabus_items where id = v_item returning 1) select count(*)::text into n_del from d;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into ch_res(test,outcome) values ('the class''s teacher reads chapters but cannot edit or delete them',
    case when n_seen=1 and n_upd='0' and n_del='0' and (select title from syllabus_items where id=v_item)='Chapitre 1 (edited)' then 'PASS' else 'FAIL: seen='||n_seen||' upd='||n_upd||' del='||n_del end);

  -- an outsider sees nothing
  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_out)::text, true);
  select count(*) into n_seen from syllabus_items where class_id = c;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into ch_res(test,outcome) values ('an outsider sees no chapters', case when n_seen=0 then 'PASS' else 'FAIL: '||n_seen end);

  -- admin can delete
  perform set_config('role','authenticated',true); perform set_config('request.jwt.claims', json_build_object('sub',v_admin)::text, true);
  with d as (delete from syllabus_items where id = v_item returning 1) select count(*)::text into n_del from d;
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  insert into ch_res(test,outcome) values ('admin can delete a chapter', case when n_del='1' then 'PASS' else 'FAIL: '||n_del end);

  delete from classes where organization_id = v_org; delete from programs where organization_id = v_org;
  delete from teachers where organization_id = v_org; delete from organization_members where organization_id = v_org;
  delete from auth.users where email like 'ch-%@example.com'; delete from organizations where id = v_org;
exception when others then
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','',true);
  delete from classes where name = 'CH class'; delete from programs where name = 'CH P'; delete from teachers where last_name = 'CH';
  delete from auth.users where email like 'ch-%@example.com'; delete from organizations where name = 'CH Test Org';
  raise;
end $$;

-- Final report: every row should say PASS.
select test, outcome from ch_res order by n;
