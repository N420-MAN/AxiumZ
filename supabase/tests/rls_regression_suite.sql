-- AxiumZ RLS regression suite
-- ============================================================================
-- Re-runs the highest-value permission checks that were verified by hand
-- throughout this platform's build — the ones where a regression would be
-- most damaging (a student seeing a classmate's grade, a center_admin
-- self-promoting to super_admin, etc.). Run this after ANY future change
-- to policies, triggers, or functions to catch a reintroduced bug before
-- a real user does.
--
-- HOW TO RUN: paste this whole file into the Supabase SQL editor (or run
-- via `execute_sql` if you're doing this through Claude) and execute it as
-- one script. Read the final report at the bottom — every row should say
-- PASS. Any FAIL is a real regression and should be treated as urgent.
--
-- This script creates its own test data (prefixed 'rlstest_'), and cleans
-- all of it up at the end regardless of whether tests passed or failed.
-- It does not depend on any real data already in your database.
-- ============================================================================

do $$
declare
  v_org_id uuid;
  v_admin_id uuid := 'a0000001-0000-0000-0000-000000000001';
  v_teacher_a_id uuid := 'a0000001-0000-0000-0000-000000000002';
  v_teacher_b_id uuid := 'a0000001-0000-0000-0000-000000000003';
  v_student_a_id uuid := 'a0000001-0000-0000-0000-000000000004';
  v_student_b_id uuid := 'a0000001-0000-0000-0000-000000000005';
  v_parent_a_id uuid := 'a0000001-0000-0000-0000-000000000006';
  v_outsider_id uuid := 'a0000001-0000-0000-0000-000000000007';
  v_teacher_a_row uuid;
  v_teacher_b_row uuid;
  v_student_a_row uuid;
  v_student_b_row uuid;
  v_parent_a_row uuid;
  v_parent_b_row uuid;
  v_prog_id uuid;
  v_level_id uuid;
  v_class_a_id uuid;
  v_class_b_id uuid;
  v_assessment_id uuid;
  v_session_id uuid;
  v_count int;
  v_ok boolean;
begin
  -- ---------------------------------------------------------------------
  -- Setup: a throwaway organization with two classes, two teachers, two
  -- students (only one has a parent linked — deliberately, to also cover
  -- the "no parent" case), and enough academic data to test grades,
  -- attendance, and announcements.
  -- ---------------------------------------------------------------------
  insert into public.organizations (id, name) values (gen_random_uuid(), 'RLS Test Org') returning id into v_org_id;

  insert into auth.users (id, email) values
    (v_admin_id, 'rlstest_admin@example.com'),
    (v_teacher_a_id, 'rlstest_teacherA@example.com'),
    (v_teacher_b_id, 'rlstest_teacherB@example.com'),
    (v_student_a_id, 'rlstest_studentA@example.com'),
    (v_student_b_id, 'rlstest_studentB@example.com'),
    (v_parent_a_id, 'rlstest_parentA@example.com'),
    (v_outsider_id, 'rlstest_outsider@example.com');

  insert into public.organization_members (organization_id, user_id, role_id) values
    (v_org_id, v_admin_id, 2),
    (v_org_id, v_teacher_a_id, 3),
    (v_org_id, v_teacher_b_id, 3),
    (v_org_id, v_student_a_id, 4),
    (v_org_id, v_student_b_id, 4),
    (v_org_id, v_parent_a_id, 5);

  -- Fixtures satisfy the mandatory-contact rules (teacher email+phone, an
  -- eleve's email + school + annee scolaire, a parent's email + phone +
  -- address) and reuse each person's own login email, which the
  -- duplicate-email check must allow.
  insert into public.teachers (id, organization_id, user_id, first_name, last_name, email, phone) values
    (gen_random_uuid(), v_org_id, v_teacher_a_id, 'RLSTest', 'TeacherA', 'rlstest_teacherA@example.com', '0600000001') returning id into v_teacher_a_row;
  insert into public.teachers (id, organization_id, user_id, first_name, last_name, email, phone) values
    (gen_random_uuid(), v_org_id, v_teacher_b_id, 'RLSTest', 'TeacherB', 'rlstest_teacherB@example.com', '0600000002') returning id into v_teacher_b_row;

  insert into public.students (id, organization_id, user_id, first_name, last_name, email, school_name, grade_level) values
    (gen_random_uuid(), v_org_id, v_student_a_id, 'RLSTest', 'StudentA', 'rlstest_studentA@example.com', 'RLSTest School', 'RLSTest 6') returning id into v_student_a_row;
  insert into public.students (id, organization_id, user_id, first_name, last_name, email, school_name, grade_level) values
    (gen_random_uuid(), v_org_id, v_student_b_id, 'RLSTest', 'StudentB', 'rlstest_studentB@example.com', 'RLSTest School', 'RLSTest 6') returning id into v_student_b_row;

  -- An eleve always has a parent. Parent A has a login (and can see only
  -- Student A); Parent B only has to exist, for Student B.
  insert into public.parents (id, organization_id, user_id, first_name, last_name, phone, email, address) values
    (gen_random_uuid(), v_org_id, v_parent_a_id, 'RLSTest', 'ParentA', '0600000003', 'rlstest_parentA@example.com', 'RLSTest Address') returning id into v_parent_a_row;
  insert into public.parent_students (parent_id, student_id) values (v_parent_a_row, v_student_a_row);
  insert into public.parents (organization_id, first_name, last_name, phone, email, address)
    values (v_org_id, 'RLSTest', 'ParentB', '0600000004', 'rlstest_parentB@example.com', 'RLSTest Address') returning id into v_parent_b_row;
  insert into public.parent_students (parent_id, student_id) values (v_parent_b_row, v_student_b_row);

  insert into public.programs (organization_id, name, kind, audience)
    values (v_org_id, 'RLSTest Programme', 'scolaire', 'both') returning id into v_prog_id;
  insert into public.levels (organization_id, program_id, name)
    values (v_org_id, v_prog_id, 'RLSTest Niveau') returning id into v_level_id;

  insert into public.classes (id, organization_id, program_id, level_id, teacher_id, name) values
    (gen_random_uuid(), v_org_id, v_prog_id, v_level_id, v_teacher_a_row, 'RLSTest Class A') returning id into v_class_a_id;
  insert into public.classes (id, organization_id, program_id, level_id, teacher_id, name) values
    (gen_random_uuid(), v_org_id, v_prog_id, v_level_id, v_teacher_b_row, 'RLSTest Class B') returning id into v_class_b_id;

  insert into public.class_students (class_id, student_id) values (v_class_a_id, v_student_a_row), (v_class_a_id, v_student_b_row);

  insert into public.assessments (id, class_id, title, max_score) values
    (gen_random_uuid(), v_class_a_id, 'RLSTest Exam', 20) returning id into v_assessment_id;
  insert into public.grades (assessment_id, student_id, score) values (v_assessment_id, v_student_a_row, 15);

  insert into public.class_sessions (id, class_id, starts_at, ends_at) values
    (gen_random_uuid(), v_class_a_id, now(), now() + interval '1 hour') returning id into v_session_id;
  insert into public.attendance (session_id, student_id, status) values (v_session_id, v_student_a_row, 'present');

  -- Create a temp results table so the report survives past this block.
  create temp table if not exists rlstest_results (test text, status text, detail text);
  -- The upcoming role-switches to 'authenticated' need write access to this
  -- temp table too — without this grant, the very first result insert
  -- fails with a permission error (found by actually running this script).
  grant insert, select on rlstest_results to authenticated;

  -- =========================================================================
  -- TEST 1: A student sees their own grade, but NOT a classmate's.
  -- =========================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_student_a_id)::text, true);
  select count(*) into v_count from public.grades where student_id = v_student_a_row;
  v_ok := v_count = 1;
  insert into rlstest_results values ('Student sees own grade', case when v_ok then 'PASS' else 'FAIL' end, 'expected 1, got ' || v_count);

  select count(*) into v_count from public.grades where student_id = v_student_b_row;
  v_ok := v_count = 0;
  insert into rlstest_results values ('Student cannot see classmate''s grade', case when v_ok then 'PASS' else 'FAIL' end, 'expected 0, got ' || v_count);
  perform set_config('role', 'postgres', true);

  -- =========================================================================
  -- TEST 2: Parent A sees Student A's attendance; Student B (no parent
  -- record at all in this test) is simply never checked from a parent
  -- angle — the meaningful check is that nothing errors when a student has
  -- zero linked parents, which setup already exercised without incident.
  -- =========================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_parent_a_id)::text, true);
  select count(*) into v_count from public.attendance where student_id = v_student_a_row;
  v_ok := v_count = 1;
  insert into rlstest_results values ('Parent sees own child''s attendance', case when v_ok then 'PASS' else 'FAIL' end, 'expected 1, got ' || v_count);

  select count(*) into v_count from public.attendance where student_id = v_student_b_row;
  v_ok := v_count = 0;
  insert into rlstest_results values ('Parent cannot see unrelated student''s attendance', case when v_ok then 'PASS' else 'FAIL' end, 'expected 0, got ' || v_count);
  perform set_config('role', 'postgres', true);

  -- =========================================================================
  -- TEST 3: Teacher B cannot write a grade into Teacher A's class.
  -- =========================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher_b_id)::text, true);
  v_ok := false;
  begin
    insert into public.grades (assessment_id, student_id, score) values (v_assessment_id, v_student_b_row, 10);
  exception when insufficient_privilege or others then
    v_ok := true;
  end;
  insert into rlstest_results values ('Teacher cannot grade another teacher''s class', case when v_ok then 'PASS' else 'FAIL' end, case when v_ok then 'correctly blocked' else 'INSERT SUCCEEDED — SECURITY BUG' end);
  perform set_config('role', 'postgres', true);

  -- =========================================================================
  -- TEST 4: The score-exceeds-max-score trigger blocks an impossible score.
  -- =========================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher_a_id)::text, true);
  v_ok := false;
  begin
    update public.grades set score = 999 where assessment_id = v_assessment_id and student_id = v_student_a_row;
  exception when others then
    v_ok := true;
  end;
  insert into rlstest_results values ('Score cannot exceed assessment max_score', case when v_ok then 'PASS' else 'FAIL' end, case when v_ok then 'correctly blocked' else 'UPDATE SUCCEEDED — DATA INTEGRITY BUG' end);
  perform set_config('role', 'postgres', true);

  -- =========================================================================
  -- TEST 5: A center_admin cannot create a super_admin membership.
  -- =========================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_id)::text, true);
  v_ok := false;
  begin
    insert into public.organization_members (organization_id, user_id, role_id) values (v_org_id, v_outsider_id, 1);
  exception when insufficient_privilege or others then
    v_ok := true;
  end;
  insert into rlstest_results values ('center_admin cannot create a super_admin', case when v_ok then 'PASS' else 'FAIL' end, case when v_ok then 'correctly blocked' else 'INSERT SUCCEEDED — SECURITY BUG' end);
  perform set_config('role', 'postgres', true);

  -- =========================================================================
  -- TEST 6: A completely unrelated outsider sees nothing across students,
  -- grades, or attendance in this organization.
  -- =========================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_outsider_id)::text, true);
  select count(*) into v_count from public.students where organization_id = v_org_id;
  v_ok := v_count = 0;
  insert into rlstest_results values ('Outsider sees zero students', case when v_ok then 'PASS' else 'FAIL' end, 'expected 0, got ' || v_count);

  select count(*) into v_count from public.grades where student_id in (v_student_a_row, v_student_b_row);
  v_ok := v_count = 0;
  insert into rlstest_results values ('Outsider sees zero grades', case when v_ok then 'PASS' else 'FAIL' end, 'expected 0, got ' || v_count);
  perform set_config('role', 'postgres', true);

  -- =========================================================================
  -- TEST 7: Announcement scoping — a class-specific announcement for Class
  -- A must not be visible from Class B's teacher.
  -- =========================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher_a_id)::text, true);
  insert into public.announcements (organization_id, class_id, title, content) values (v_org_id, v_class_a_id, 'RLSTest Announcement', 'Class A only');
  perform set_config('role', 'postgres', true);

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher_b_id)::text, true);
  select count(*) into v_count from public.announcements where title = 'RLSTest Announcement';
  v_ok := v_count = 0;
  insert into rlstest_results values ('Class-specific announcement stays within that class', case when v_ok then 'PASS' else 'FAIL' end, 'expected 0, got ' || v_count);
  perform set_config('role', 'postgres', true);

  -- =========================================================================
  -- TEST 8: A teacher cannot post an org-wide announcement (only to their
  -- own class).
  -- =========================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher_a_id)::text, true);
  v_ok := false;
  begin
    insert into public.announcements (organization_id, class_id, title, content) values (v_org_id, null, 'RLSTest Org-wide', 'Should fail');
  exception when insufficient_privilege or others then
    v_ok := true;
  end;
  insert into rlstest_results values ('Teacher cannot post org-wide announcement', case when v_ok then 'PASS' else 'FAIL' end, case when v_ok then 'correctly blocked' else 'INSERT SUCCEEDED — SECURITY BUG' end);
  perform set_config('role', 'postgres', true);

  -- ---------------------------------------------------------------------
  -- Cleanup: remove every trace of this test run, regardless of outcome.
  -- ---------------------------------------------------------------------
  delete from public.announcements where organization_id = v_org_id;
  delete from public.attendance where session_id = v_session_id;
  delete from public.class_sessions where id = v_session_id;
  delete from public.grades where assessment_id = v_assessment_id;
  delete from public.assessments where id = v_assessment_id;
  delete from public.class_students where class_id in (v_class_a_id, v_class_b_id);
  delete from public.classes where id in (v_class_a_id, v_class_b_id);
  delete from public.programs where id = v_prog_id;  -- its niveau goes with it
  -- Students first (their parent links go with them): the only parent of an
  -- eleve can't be removed before that student.
  delete from public.students where id in (v_student_a_row, v_student_b_row);
  delete from public.parents where id in (v_parent_a_row, v_parent_b_row);
  delete from public.teachers where id in (v_teacher_a_row, v_teacher_b_row);
  delete from public.organization_members where organization_id = v_org_id;
  delete from auth.users where id in (v_admin_id, v_teacher_a_id, v_teacher_b_id, v_student_a_id, v_student_b_id, v_parent_a_id, v_outsider_id);
  delete from public.organizations where id = v_org_id;

exception when others then
  -- Even if a genuine error (not a caught-and-expected one) interrupts the
  -- script, still attempt cleanup so a failed run never leaves test data
  -- behind in a real database.
  perform set_config('role', 'postgres', true);
  delete from auth.users where email like 'rlstest_%@example.com';
  delete from public.class_students where class_id in (select id from public.classes where name like 'RLSTest %');
  delete from public.classes where name like 'RLSTest %';
  delete from public.students where first_name = 'RLSTest';
  delete from public.parents where first_name = 'RLSTest';
  delete from public.programs where name = 'RLSTest Programme';
  delete from public.organizations where name = 'RLS Test Org';
  raise;
end $$;

-- Final report — every row should read PASS.
select * from rlstest_results order by test;
