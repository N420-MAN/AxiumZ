# Tests

Everything here checks the **database**, because that is where the rules live:
no screen, import or API call can get around a rule the database enforces.

| File | What it checks | Checks |
|---|---|---|
| `rls_regression_suite.sql` | Who can see and change what: a student seeing a classmate's grade, an admin promoting themselves to super admin, a teacher grading another teacher's class, announcements staying in their class… | 11 |
| `structure_rules_suite.sql` | The whole structure: programmes, niveaux, classes; élève vs stagiaire; parent and supervisor rules; the waiting list (including a request for a programme with no niveau yet); programme audience; chapters; all-or-nothing registration | 65 |
| `contact_rules_suite.sql` | Mandatory fields per kind of person, and one email = one person | 23 |
| `chapters_rules_suite.sql` | Who can read, edit and delete a class's chapters | 4 |
| `rooms_rules_suite.sql` | Rooms, the privacy-acceptance record, and who can see which invitations were accepted | 25 |
| `check_queries.py` | Not a database test: checks that every query and function call in `src/` uses tables, columns and parameters that really exist | all calls |

## How to run the SQL suites

Paste the whole file into the Supabase SQL Editor (or hand it to Claude to run
with its Supabase tools) and run it as one script. Each suite builds its own
throwaway records and removes them before finishing, **including on failure**,
so it never touches real data and leaves nothing behind.

Read the final result:
- `rls_regression_suite.sql` ends with a count per status: every row should be `PASS`.
- The others list **any failure first**, then a `TOTAL PASS` row. No failure rows = all good.

A failure is a real regression: the text says what was expected and what
happened instead.

## When to run them

After **any** change to row-level-security policies, the helper functions
(`is_org_admin`, `has_class_access`…), triggers, or the structure and
people tables. When in doubt, run them: it takes seconds.

## The query checker

```
python3 supabase/tests/check_queries.py        # from the project root
```

Expected: `0 problem(s)`. It compares every `supabase.from(...)` and
`supabase.rpc(...)` call in `src/` with the schema snapshot at the top of the
script. **After a database change, refresh that snapshot** (the queries to do
it are in the script's header), otherwise it will check against a stale shape.
