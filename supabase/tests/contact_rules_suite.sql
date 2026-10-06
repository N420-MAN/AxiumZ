-- AxiumZ contact-rules suite
-- ============================================================================
-- Verifies management's mandatory-field rules and the one-email-one-person
-- rule, at the DATABASE level (so no screen, import or API call can bypass
-- them):
--   eleve       : email + school + annee scolaire mandatory, phone optional
--   stagiaire   : email + phone mandatory, school and address optional
--   parent      : email + phone + address mandatory
--   superviseur : email + phone mandatory, address and company optional
--   teacher     : email + phone mandatory
--   email       : unique across students, parents, teachers and login accounts
--
-- HOW TO RUN: paste into the Supabase SQL editor and run as one script.
-- Every row of the final report should say PASS. Creates its own throwaway
-- records (last name 'CR_TEST') and removes them before finishing.
-- (An eleve must have a parent by the time a transaction commits; these test
-- records are all removed inside the same script, so nothing is left to check.)
-- ============================================================================

create temp table if not exists cr_results (n serial, test text, outcome text);

do $$
declare
  v_org uuid := (select id from public.organizations limit 1);
  v_login_email text := (select email from auth.users where email is not null limit 1);
begin
  -- ------------------------------------------------------------------ parent
  begin insert into parents (organization_id, first_name, last_name, email, address) values (v_org,'P','CR_TEST','cr-p0@example.com','Casa');
    insert into cr_results(test,outcome) values ('parent without phone rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('parent without phone rejected','PASS'); end;
  begin insert into parents (organization_id, first_name, last_name, phone, email, address) values (v_org,'P','CR_TEST','   ','cr-p0@example.com','Casa');
    insert into cr_results(test,outcome) values ('parent with blank phone rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('parent with blank phone rejected','PASS'); end;
  begin insert into parents (organization_id, first_name, last_name, phone, address) values (v_org,'P','CR_TEST','0600000001','Casa');
    insert into cr_results(test,outcome) values ('parent without email rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('parent without email rejected','PASS'); end;
  begin insert into parents (organization_id, first_name, last_name, phone, email) values (v_org,'P','CR_TEST','0600000001','cr-p0@example.com');
    insert into cr_results(test,outcome) values ('parent without address rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('parent without address rejected','PASS'); end;
  begin insert into parents (organization_id, first_name, last_name, phone, email, address) values (v_org,'P','CR_TEST','0600000001','cr-p@example.com','Casa');
    insert into cr_results(test,outcome) values ('parent with email, phone and address accepted','PASS');
  exception when others then insert into cr_results(test,outcome) values ('parent with email, phone and address accepted','FAIL: '||sqlerrm); end;

  -- ------------------------------------------------------------- superviseur
  begin insert into parents (organization_id, kind, first_name, last_name, phone) values (v_org,'superviseur','S','CR_TEST','0600000005');
    insert into cr_results(test,outcome) values ('supervisor without email rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('supervisor without email rejected','PASS'); end;
  begin insert into parents (organization_id, kind, first_name, last_name, email) values (v_org,'superviseur','S','CR_TEST','cr-sup0@example.com');
    insert into cr_results(test,outcome) values ('supervisor without phone rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('supervisor without phone rejected','PASS'); end;
  begin insert into parents (organization_id, kind, first_name, last_name, email, phone) values (v_org,'superviseur','S','CR_TEST','cr-sup@example.com','0600000005');
    insert into cr_results(test,outcome) values ('supervisor with email+phone, no address or company accepted','PASS');
  exception when others then insert into cr_results(test,outcome) values ('supervisor with email+phone, no address or company accepted','FAIL: '||sqlerrm); end;

  -- ------------------------------------------------------------------- eleve
  begin insert into students (organization_id, first_name, last_name, school_name, grade_level) values (v_org,'E','CR_TEST','Lycee X','6eme');
    insert into cr_results(test,outcome) values ('eleve without email rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('eleve without email rejected','PASS'); end;
  begin insert into students (organization_id, first_name, last_name, email, grade_level) values (v_org,'E','CR_TEST','cr-a@example.com','6eme');
    insert into cr_results(test,outcome) values ('eleve without school rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('eleve without school rejected','PASS'); end;
  begin insert into students (organization_id, first_name, last_name, email, school_name) values (v_org,'E','CR_TEST','cr-a@example.com','Lycee X');
    insert into cr_results(test,outcome) values ('eleve without annee scolaire rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('eleve without annee scolaire rejected','PASS'); end;
  begin insert into students (organization_id, first_name, last_name, email, school_name, grade_level) values (v_org,'E','CR_TEST','cr-a@example.com','Lycee X','6eme');
    insert into cr_results(test,outcome) values ('eleve with email+school+annee scolaire, no phone accepted','PASS');
  exception when others then insert into cr_results(test,outcome) values ('eleve with email+school+annee scolaire, no phone accepted','FAIL: '||sqlerrm); end;

  -- --------------------------------------------------------------- stagiaire
  begin insert into students (organization_id, kind, first_name, last_name, email) values (v_org,'stagiaire','T','CR_TEST','cr-s0@example.com');
    insert into cr_results(test,outcome) values ('stagiaire without phone rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('stagiaire without phone rejected','PASS'); end;
  begin insert into students (organization_id, kind, first_name, last_name, email, phone) values (v_org,'stagiaire','T','CR_TEST','cr-s@example.com','0600000006');
    insert into cr_results(test,outcome) values ('stagiaire with email+phone, no school or address accepted','PASS');
  exception when others then insert into cr_results(test,outcome) values ('stagiaire with email+phone, no school or address accepted','FAIL: '||sqlerrm); end;

  -- ----------------------------------------------------------------- teacher
  begin insert into teachers (organization_id, first_name, last_name, phone) values (v_org,'T','CR_TEST','0600000002');
    insert into cr_results(test,outcome) values ('teacher without email rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('teacher without email rejected','PASS'); end;
  begin insert into teachers (organization_id, first_name, last_name, email) values (v_org,'T','CR_TEST','cr-t@example.com');
    insert into cr_results(test,outcome) values ('teacher without phone rejected','FAIL (accepted)');
  exception when check_violation then insert into cr_results(test,outcome) values ('teacher without phone rejected','PASS'); end;
  begin insert into teachers (organization_id, first_name, last_name, email, phone) values (v_org,'T','CR_TEST','cr-t@example.com','0600000002');
    insert into cr_results(test,outcome) values ('teacher with email+phone accepted','PASS');
  exception when others then insert into cr_results(test,outcome) values ('teacher with email+phone accepted','FAIL: '||sqlerrm); end;

  -- ------------------------------------------------------- one email = one person
  begin insert into students (organization_id, first_name, last_name, email, school_name, grade_level) values (v_org,'E2','CR_TEST','  CR-A@Example.com ','Lycee X','6eme');
    insert into cr_results(test,outcome) values ('duplicate student email (case/spaces) rejected','FAIL (accepted)');
  exception when unique_violation then insert into cr_results(test,outcome) values ('duplicate student email (case/spaces) rejected','PASS'); end;
  begin insert into parents (organization_id, first_name, last_name, phone, email, address) values (v_org,'P2','CR_TEST','0600000003','cr-t@example.com','Casa');
    insert into cr_results(test,outcome) values ('parent email equal to a teacher email rejected','FAIL (accepted)');
  exception when unique_violation then insert into cr_results(test,outcome) values ('parent email equal to a teacher email rejected','PASS'); end;
  begin insert into parents (organization_id, kind, first_name, last_name, phone, email) values (v_org,'superviseur','S2','CR_TEST','0600000007','cr-s@example.com');
    insert into cr_results(test,outcome) values ('supervisor email equal to a stagiaire email rejected','FAIL (accepted)');
  exception when unique_violation then insert into cr_results(test,outcome) values ('supervisor email equal to a stagiaire email rejected','PASS'); end;
  if v_login_email is not null then
    begin insert into teachers (organization_id, first_name, last_name, email, phone) values (v_org,'T2','CR_TEST',v_login_email,'0600000004');
      insert into cr_results(test,outcome) values ('teacher email equal to an existing login rejected','FAIL (accepted)');
    exception when unique_violation then insert into cr_results(test,outcome) values ('teacher email equal to an existing login rejected','PASS'); end;
  end if;

  begin update students set first_name = 'E-edited' where last_name = 'CR_TEST' and email = 'cr-a@example.com';
    update students set email = 'CR-A@EXAMPLE.COM' where last_name = 'CR_TEST' and first_name = 'E-edited';
    insert into cr_results(test,outcome) values ('editing own record / same email in other case accepted','PASS');
  exception when others then insert into cr_results(test,outcome) values ('editing own record / same email in other case accepted','FAIL: '||sqlerrm); end;
  begin update students set email = 'cr-t@example.com' where last_name = 'CR_TEST' and first_name = 'E-edited';
    insert into cr_results(test,outcome) values ('changing email to one already used rejected','FAIL (accepted)');
  exception when unique_violation then insert into cr_results(test,outcome) values ('changing email to one already used rejected','PASS'); end;

  delete from students where last_name = 'CR_TEST';
  delete from parents  where last_name = 'CR_TEST';
  delete from teachers where last_name = 'CR_TEST';
end $$;

-- Final report: every row should say PASS.
select test, outcome from cr_results order by n;
