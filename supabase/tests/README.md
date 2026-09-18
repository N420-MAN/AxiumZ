# RLS regression suite

`rls_regression_suite.sql` re-runs the highest-value permission checks that
were verified by hand throughout this platform's build — the ones where a
regression would be most damaging (a student seeing a classmate's grade, a
center_admin self-promoting to super_admin, a teacher grading another
teacher's class, and so on).

## When to run this

After **any** future change to:
- Row Level Security policies on any table
- The `is_org_admin`, `is_class_teacher`, `is_class_student`, `is_class_parent`,
  `has_class_access`, or similar helper functions
- Triggers (e.g. the score-vs-max-score check on grades/submissions)
- Anything touching `organization_members`, `classes`, `grades`, `attendance`,
  or `announcements`

If none of the above changed, there's no need to run it — but when in doubt,
running it costs a few seconds and creates no lasting data.

## How to run it

Paste the full contents of `rls_regression_suite.sql` into the Supabase
SQL Editor (or hand it to Claude to run via its Supabase tools) and execute
it as one script.

Read the final table at the bottom: **every row should say PASS**. Any
`FAIL` is a real regression — the detail column explains what was expected
versus what actually happened, and whether it was a data-visibility problem
or a write that should have been blocked but wasn't.

## What it does and doesn't cover

This creates its own throwaway organization, teachers, students, and a
parent (all prefixed `rlstest_` / `RLSTest`), runs 11 checks against them,
and deletes everything it created — including on failure, via the
exception handler at the bottom. It never touches real data.

It is **not** exhaustive — it covers the specific boundaries that were
identified as highest-risk during development, not every policy on every
table. Adding a new high-stakes permission boundary later (a new role, a
new sensitive table) is a good reason to add a new test block here, following
the same pattern as the existing ones.
