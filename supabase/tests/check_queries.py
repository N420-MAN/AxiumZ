"""
AxiumZ database-query checker
=============================================================================
Compares every Supabase call in src/ against the real database columns:
  - .select("...") strings, including embedded tables like classes(name, pole)
  - filters / ordering such as .eq("col", ...) and .order("col")
  - the field names written by .insert() / .update() / .upsert()
  - supabase.rpc("fn", { params }) calls: the function must exist and every
    parameter name must be one it declares

It exists because a query that names a column that doesn't exist is rejected
by the API at runtime, silently emptying a screen, and neither the compiler
nor the linter can see it.

HOW TO RUN (from the project root):   python3 supabase/tests/check_queries.py
Expect "0 problem(s)". A "note" means a payload built dynamically (via a
spread) that the tool cannot read.

KEEP THE SCHEMA SNAPSHOT BELOW CURRENT. Refresh it after any migration by
running this in the Supabase SQL editor and rebuilding the dictionary:

  select table_name, string_agg(column_name, ',' order by column_name)
  from information_schema.columns where table_schema = 'public'
  group by table_name order by table_name;

...and the same for functions (RPC_SCHEMA below):

  select p.proname, string_agg(a.name, ',' order by a.ord)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
  left join lateral (select unnest(p.proargnames) as name,
        generate_series(1, coalesce(array_length(p.proargnames,1),0)) as ord) a on true
  where p.prokind = 'f' group by p.proname, p.oid order by p.proname;
=============================================================================
"""
import os, re, sys

SCHEMA = {
"academic_terms":"created_at,end_date,id,is_current,name,organization_id,start_date",
"announcements":"class_id,content,created_at,created_by,created_by_name,created_by_role,id,organization_id,published_at,target_parent_id,target_roles,target_student_id,target_teacher_id,title,updated_at",
"assessment_syllabus_items":"assessment_id,syllabus_item_id",
"assessments":"assessment_date,assessment_type,class_id,created_at,description,id,max_score,title,updated_at,weight",
"assignment_submissions":"assignment_id,content,created_at,feedback,file_url,id,score,status,student_id,submitted_at,updated_at",
"assignments":"class_id,created_at,description,due_at,id,max_score,status,title,updated_at",
"attendance":"id,marked_at,notes,session_id,status,student_id",
"audit_logs":"action,created_at,details,id,organization_id,record_id,table_name,user_id",
"class_sessions":"class_id,created_at,ends_at,id,notes,room,room_id,starts_at,status,syllabus_item_id,updated_at",
"class_students":"class_id,enrolled_at,id,status,student_id",
"class_syllabus_progress":"class_id,completed_at,completed_by,syllabus_item_id",
"class_wishes":"created_at,fulfilled_at,id,level_id,note,organization_id,program_id,student_id",
"classes":"capacity,created_at,description,discount_active,discount_name,discount_price,id,level_id,name,organization_id,price_trimestre,program_id,room,room_id,status,subject,teacher_id,updated_at",
"specialties":"created_at,id,level_id,name,organization_id,program_id",
"class_specialties":"class_id,specialty_id",
"packs":"created_at,discount_active,discount_name,discount_price,id,level_id,name,organization_id,price_trimestre,program_id,show_on_site",
"preinscriptions":"availability,birth_date,created_at,email,formula,guardian_name,handled_by,id,level_id,list_price,needs,note,offer_name,offer_price,organization_id,pack_id,pack_name,payment_pref,phone,preferred_contact,program_id,relation,school,specialty_id,status,student_first_name,student_last_name,subjects",
"pack_specialties":"pack_id,specialty_id",
"pack_subjects":"created_at,id,pack_id,position,subject",
"class_slots":"class_id,created_at,end_time,id,room_id,start_time,weekday",
"grades":"assessment_id,feedback,graded_at,id,score,score_listening,score_reading,score_speaking,score_writing,student_id",
"homework":"class_id,created_at,created_by,created_by_name,due_date,id,session_id,title",
"internal_secrets":"name,value",
"invoices":"amount,created_at,currency,description,due_date,id,invoice_number,organization_id,parent_id,status,student_id,updated_at",
"levels":"created_at,id,name,organization_id,position,program_id",
"materials":"class_id,created_at,created_by,description,external_url,file_url,id,material_type,organization_id,session_id,title,updated_at",
"notifications":"created_at,id,is_read,message,organization_id,title,type,user_id",
"organization_members":"created_at,id,organization_id,role_id,user_id",
"organizations":"created_at,id,name",
"parent_students":"consent_confirmed_at,created_at,id,is_primary,parent_id,relationship,student_id",
"parents":"address,company,created_at,email,first_name,id,kind,last_name,organization_id,phone,updated_at,user_id",
"payment_vouchers":"academic_term_id,cancel_reason,cancelled_at,created_at,created_by,id,method,organization_id,paid_at,period_label,status,student_id,total_amount,voucher_number",
"payment_voucher_items":"amount,class_id,discount_name,id,installment_no,installments_total,label,list_amount,organization_id,pack_id,plan_total,voucher_id",
"payments":"amount,created_at,currency,id,invoice_id,notes,organization_id,paid_at,payment_method,reference",
"placement_tests":"class_id,created_at,id,score_listening,score_reading,score_speaking,score_total,score_writing,student_id,tested_at",
"profiles":"avatar_url,created_at,full_name,id,phone,preferred_locale,preferred_theme,privacy_accepted_at,privacy_version,tutorial_seen_at,updated_at",
"programs":"audience,created_at,id,is_active,kind,name,organization_id,tracks_school_progress",
"rate_limit_events":"created_at,id,rate_key",
"roles":"id,name",
"rooms":"capacity,created_at,id,is_active,name,organization_id",
"school_progress_entries":"content,created_at,id,session_id,student_id,updated_at",
"school_progress_notices":"kind,sent_at,session_id,student_id",
"session_ratings":"created_at,rating,session_id,student_id",
"student_attendance_summary":"absence_rate_pct,absences,class_id,student_id,total_sessions",
"student_class_averages":"average_out_of_20,class_id,grade_count,student_id",
"student_comments":"author_id,author_name,class_id,content,created_at,id,student_id",
"students":"address,created_at,date_of_birth,email,first_name,grade_level,id,kind,last_name,organization_id,pack_id,phone,school_name,specialty_id,status,student_number,updated_at,user_id",
"syllabus_items":"class_id,created_at,end_date,id,objectives,planned_sessions,position,start_date,title",
"teacher_admin_info":"created_at,employment_type,establishment_name,organization_id,teacher_id",
"teachers":"avatar_url,bio,created_at,email,first_name,id,last_name,organization_id,phone,specialization,status,updated_at,user_id",
}
SCHEMA = {t: set(c.split(",")) for t, c in SCHEMA.items()}

RPC_SCHEMA = {
"get_student_placement_results":"p_student_id",
"link_placement_result":"p_result_id,p_student_id",
"list_unlinked_placement_results":"",
"account_acceptance":"p_organization_id,account_user_id,accepted",
"add_guardian_to_student":"p_student_id,p_guardian_id,p_new_guardian,p_consent",
"add_starter_levels":"p_program_id",
"cleanup_old_rate_limit_events":"",
"copy_levels":"p_from,p_to",
"has_password":"",
"copy_syllabus":"p_from_class,p_to_class",
"create_payment_voucher":"p_organization_id,p_student_id,p_academic_term_id,p_period_label,p_method,p_paid_at,p_items",
"public_pricing":"",
"create_student_with_family":"p_organization_id,p_student,p_class_ids,p_wishes,p_guardian_id,p_new_guardian,p_consent",
"email_in_use":"p_email,p_ignore_table,p_ignore_id,p_ignore_user_id",
"get_class_satisfaction":"p_class_id,average_rating,rating_count",
"get_user_role":"p_organization_id",
"has_class_access":"p_class_id",
"is_center_admin":"p_organization_id",
"is_class_parent":"p_class_id",
"is_class_student":"p_class_id",
"is_class_teacher":"p_class_id",
"is_org_admin":"p_organization_id",
"is_org_member":"p_organization_id",
"is_super_admin":"",
"move_level":"p_level_id,p_direction",
"place_students_in_class":"p_class_id,p_student_ids",
"program_accepts":"p_program_id,p_student_id",
"role_is_super_admin":"p_role_id",
"update_admin_profile":"p_organization_id,p_user_id,p_full_name,p_phone",
"my_profile_gaps":"",
"complete_my_profile":"p_phone,p_employment_type,p_establishment",
}
RPC_SCHEMA = {f: set(x for x in c.split(",") if x) for f, c in RPC_SCHEMA.items()}

def split_top(s):
    out, depth, cur = [], 0, ""
    for ch in s:
        if ch == "(": depth += 1
        elif ch == ")": depth -= 1
        if ch == "," and depth == 0:
            out.append(cur.strip()); cur = ""
        else:
            cur += ch
    if cur.strip(): out.append(cur.strip())
    return out

def check_select(table, sel, where, issues):
    if table not in SCHEMA:
        issues.append(f"{where}: unknown table '{table}'"); return
    for item in split_top(sel):
        if item in ("*", "count"): continue  # `count` = the API's embedded row count
        m = re.match(r"^(?:(\w+):)?([\w!.\-]+)\s*\((.*)\)$", item, re.S)
        if m:
            name = m.group(2).split("!")[0]
            if name not in SCHEMA:
                issues.append(f"{where}: embed '{name}' in select of '{table}' is not a table")
            else:
                check_select(name, m.group(3), where, issues)
            continue
        col = item.split(":")[-1].strip() if ":" in item and "::" not in item else item
        col = col.split("!")[0]
        if col not in SCHEMA[table]:
            issues.append(f"{where}: column '{col}' does not exist on '{table}'")

def matching_brace(s, i):
    depth = 0
    for j in range(i, len(s)):
        if s[j] in "{[(": depth += 1
        elif s[j] in "}])":
            depth -= 1
            if depth == 0: return j
    return -1

def object_keys(body):
    """Top-level keys of an object literal body; returns (keys, has_unknown_spread names)."""
    keys, spreads = [], []
    for part in split_top(body):
        part = part.strip()
        if not part: continue
        if part.startswith("..."):
            spreads.append(part[3:].strip()); continue
        m = re.match(r"^([A-Za-z_]\w*)\s*(?::|$)", part)
        if m: keys.append(m.group(1))
    return keys, spreads

def literal_for(name, text):
    m = re.search(r"const\s+" + re.escape(name) + r"\s*(?::[^=]+)?=\s*\{", text)
    if not m: return None
    start = text.index("{", m.start())
    end = matching_brace(text, start)
    return text[start + 1:end] if end > 0 else None

total_calls, issues, notes = 0, [], []
for root, _, files in os.walk("src"):
    for f in files:
        if not f.endswith((".ts", ".tsx")): continue
        path = os.path.join(root, f)
        text = open(path, encoding="utf-8").read()
        for m in re.finditer(r'\.from\(\s*"(\w+)"\s*\)', text):
            table = m.group(1)
            if table in ("rate_limit_events",) : pass
            # A query chain ends where the next query starts (several queries
            # often sit in one Promise.all) or at the end of the statement.
            nxt = re.search(r'\.from\(\s*"\w+"\s*\)', text[m.end():])
            end_semi = text.find(";", m.end())
            cut = m.end() + nxt.start() if nxt else len(text)
            if end_semi > 0: cut = min(cut, end_semi)
            chain = text[m.end(): cut]
            line = text.count("\n", 0, m.start()) + 1
            where = f"{path}:{line}"
            total_calls += 1
            if table not in SCHEMA:
                issues.append(f"{where}: unknown table '{table}'"); continue
            for sm in re.finditer(r'\.select\(\s*(?:"([^"]*)"|`([^`$]*)`)', chain):
                check_select(table, sm.group(1) if sm.group(1) is not None else sm.group(2), where, issues)
            for fm in re.finditer(r'\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|not|order|contains)\(\s*"([^"]+)"', chain):
                col = fm.group(1)
                if "." in col or "(" in col: continue
                if col not in SCHEMA[table]:
                    issues.append(f"{where}: filter/order column '{col}' does not exist on '{table}'")
            for mm in re.finditer(r'\.(insert|update|upsert)\(\s*\{', chain):
                start = chain.index("{", mm.start())
                endb = matching_brace(chain, start)
                if endb < 0: continue
                keys, spreads = object_keys(chain[start + 1:endb])
                for sp in spreads:
                    lit = literal_for(sp, text)
                    if lit is None: notes.append(f"{where}: {mm.group(1)} spreads '{sp}' (dynamic, not checkable)")
                    else: keys += object_keys(lit)[0]
                for k in keys:
                    if k not in SCHEMA[table]:
                        issues.append(f"{where}: {mm.group(1)} writes column '{k}' which does not exist on '{table}'")


for root, _, files in os.walk("src"):
    for f in files:
        if not f.endswith((".ts", ".tsx")): continue
        path = os.path.join(root, f)
        text = open(path, encoding="utf-8").read()
        for m in re.finditer(r'\.rpc\(\s*"(\w+)"\s*(,\s*\{)?', text):
            fn = m.group(1)
            line = text.count("\n", 0, m.start()) + 1
            where = f"{path}:{line}"
            total_calls += 1
            if fn not in RPC_SCHEMA:
                issues.append(f"{where}: rpc '{fn}' is not a function in the database")
                continue
            if m.group(2):
                start = text.index("{", m.start() + len(fn))
                endb = matching_brace(text, start)
                keys, _ = object_keys(text[start + 1:endb])
                for k in keys:
                    if k not in RPC_SCHEMA[fn]:
                        issues.append(f"{where}: rpc '{fn}' called with parameter '{k}' which it does not declare")

print(f"checked {total_calls} database calls")
print(f"{len(issues)} problem(s):")
for i in issues: print("  PROBLEM", i)
print(f"{len(notes)} note(s) (dynamic payloads, not checkable by this tool):")
for n in notes: print("  note", n)
