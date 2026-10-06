import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { extractFunctionErrorMessage } from "../../lib/invokeEdgeFunction";
import { useLocale } from "../../i18n/LocaleContext";
import { SCHOOL_NONE } from "../../lib/schoolOptions";
import { type InvitableTable, accountState, sendInvitation } from "../../lib/invitations";
import { downloadCsv } from "../../lib/exportCsv";
import { type GuardianChoice, type GuardianOption, EMPTY_DRAFT, NO_GUARDIAN } from "../../lib/guardianChoice";
import { type PersonKind, classLabel, guardianKindFor, isLanguageProgram, matchesWords } from "../../lib/programs";
import { useStructure } from "../../features/structure/useStructure";
import { useAcceptedAccounts } from "../../features/accounts/useAcceptedAccounts";
import ClassPicker, { type ExistingPlacement, type PlacementChoice } from "./ClassPicker";
import GuardianPicker from "./GuardianPicker";
import AccountStatus from "./AccountStatus";
import PersonalDataNotice from "./PersonalDataNotice";
import PlacementTestModal from "./PlacementTestModal";
import { useConfirmDialog } from "./useConfirmDialog";

interface PersonRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  school_name: string | null;
  grade_level: string | null;
  user_id: string | null;
  created_at: string;
  class_students: { id: string; class_id: string }[];
  class_wishes: { id: string; program_id: string; level_id: string; note: string | null; fulfilled_at: string | null }[];
}

interface PersonForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  school_name: string;
  grade_level: string;
}

const EMPTY_FORM: PersonForm = { first_name: "", last_name: "", email: "", phone: "", address: "", school_name: "", grade_level: "" };

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[0.9rem] text-gray-900 outline-none focus:border-gray-400";
const filterClass = "rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[0.82rem] text-gray-700 outline-none focus:border-gray-400";

// Requests for a class that doesn't exist yet (or was full): the person's waiting list.
const waitingOf = (p: PersonRow) => p.class_wishes.filter((w) => !w.fulfilled_at);

async function fetchPeople(organizationId: string, kind: PersonKind) {
  const [people, guardians, links] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, first_name, last_name, email, phone, address, school_name, grade_level, user_id, created_at, class_students(id, class_id), class_wishes(id, program_id, level_id, note, fulfilled_at)",
      )
      .eq("organization_id", organizationId)
      .eq("kind", kind)
      .order("last_name"),
    supabase
      .from("parents")
      .select("id, first_name, last_name, phone, email, address, company, kind")
      .eq("organization_id", organizationId)
      .eq("kind", guardianKindFor(kind))
      .order("last_name"),
    supabase.from("parent_students").select("student_id, parent_id"),
  ]);
  return {
    people: (people.data as unknown as PersonRow[]) ?? [],
    guardians: (guardians.data as GuardianOption[]) ?? [],
    links: (links.data as { student_id: string; parent_id: string }[]) ?? [],
    error: people.error,
  };
}

export default function PeopleTable({ kind, organizationId }: { kind: PersonKind; organizationId: string }) {
  const isEleve = kind === "eleve";
  const guardianKind = guardianKindFor(kind);
  const { t } = useLocale();
  const pp = t.monEspace.people;
  const m = t.monEspace.gestion.students;
  const c = t.monEspace.gestion.common;
  const inv = t.monEspace.invitations;
  const gd = t.monEspace.guardian;
  const { lang } = useParams();
  const base = `/${lang ?? "fr"}/mon-espace`;
  const { confirm, dialog } = useConfirmDialog();

  const structure = useStructure(organizationId);
  const { programs, levels, classes } = structure;
  const reloadStructure = structure.reload;
  const { accepted, known: acceptanceKnown, reload: reloadAccepted } = useAcceptedAccounts(organizationId);

  const [people, setPeople] = useState<PersonRow[]>([]);
  const [guardians, setGuardians] = useState<GuardianOption[]>([]);
  const [links, setLinks] = useState<{ student_id: string; parent_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [waitingOnly, setWaitingOnly] = useState(false);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [supervisorFilter, setSupervisorFilter] = useState<"" | "with" | "without">("");

  // form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PersonForm>(EMPTY_FORM);
  const [originalEmail, setOriginalEmail] = useState("");
  const [selection, setSelection] = useState<PlacementChoice[]>([]);
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  const [guardianChoice, setGuardianChoice] = useState<GuardianChoice>(NO_GUARDIAN);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<Record<string, string>>({});
  const [placementQueue, setPlacementQueue] = useState<{ studentId: string; studentName: string; classId: string }[]>([]);

  const load = useCallback(async () => {
    const result = await fetchPeople(organizationId, kind);
    setPeople(result.people);
    setGuardians(result.guardians);
    setLinks(result.links);
    setError(result.error ? humanizeError(result.error) : null);
    setLoading(false);
  }, [organizationId, kind]);

  useEffect(() => {
    let cancelled = false;
    fetchPeople(organizationId, kind).then((result) => {
      if (cancelled) return;
      setPeople(result.people);
      setGuardians(result.guardians);
      setLinks(result.links);
      setError(result.error ? humanizeError(result.error) : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, kind]);

  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);
  const levelById = useMemo(() => new Map(levels.map((l) => [l.id, l])), [levels]);
  const classById = useMemo(() => new Map(classes.map((cl) => [cl.id, cl])), [classes]);

  const classLabelById = (classId: string) => {
    const cl = classById.get(classId);
    return cl ? classLabel({ name: cl.name, programs: programById.get(cl.program_id), levels: levelById.get(cl.level_id) }) : "—";
  };
  const wishLabel = (w: { program_id: string; level_id: string; note: string | null }) => {
    const base = classLabel({ name: "", programs: programById.get(w.program_id), levels: levelById.get(w.level_id) });
    return w.note ? `${base} · ${w.note}` : base;
  };

  const guardianIdsOf = (studentId: string) => new Set(links.filter((l) => l.student_id === studentId).map((l) => l.parent_id));

  // ----------------------------------------------------------- filtering
  const schools = useMemo(
    () => Array.from(new Set(people.map((p) => p.school_name?.trim()).filter((v): v is string => Boolean(v)))).sort((a, b) => a.localeCompare(b)),
    [people],
  );
  const grades = useMemo(
    () => Array.from(new Set(people.map((p) => p.grade_level?.trim()).filter((v): v is string => Boolean(v)))).sort((a, b) => a.localeCompare(b)),
    [people],
  );
  const filterLevels = levels.filter((l) => l.program_id === programFilter).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const filterClasses = classes.filter((cl) => (!programFilter || cl.program_id === programFilter) && (!levelFilter || cl.level_id === levelFilter));

  const visible = useMemo(() => {
    return people.filter((p) => {
      if (search && !matchesWords(`${p.first_name} ${p.last_name} ${p.email ?? ""} ${p.phone ?? ""}`, search)) return false;
      const memberClasses = p.class_students.map((cs) => classById.get(cs.class_id)).filter((cl): cl is NonNullable<typeof cl> => Boolean(cl));
      const wishes = waitingOf(p);
      if (waitingOnly && wishes.length === 0) return false;
      // With the waiting-list filter on, programme and niveau look at the requests only.
      const placements = waitingOnly
        ? wishes.map((w) => ({ program_id: w.program_id, level_id: w.level_id }))
        : [...memberClasses.map((cl) => ({ program_id: cl.program_id, level_id: cl.level_id })), ...wishes.map((w) => ({ program_id: w.program_id, level_id: w.level_id }))];
      if (programFilter && !placements.some((x) => x.program_id === programFilter)) return false;
      if (levelFilter && !placements.some((x) => x.level_id === levelFilter)) return false;
      if (classFilter && !p.class_students.some((cs) => cs.class_id === classFilter)) return false;
      if (schoolFilter && p.school_name?.trim() !== schoolFilter) return false;
      if (supervisorFilter === "with" && !links.some((l) => l.student_id === p.id)) return false;
      if (supervisorFilter === "without" && links.some((l) => l.student_id === p.id)) return false;
      return true;
    });
  }, [people, search, programFilter, levelFilter, classFilter, waitingOnly, schoolFilter, supervisorFilter, classById, links]);

  // Demand summary: how many people wait for each programme + niveau.
  const demand = useMemo(() => {
    const counts = new Map<string, { program_id: string; level_id: string; n: number }>();
    for (const p of people) {
      for (const w of p.class_wishes.filter((x) => !x.fulfilled_at)) {
        const key = `${w.program_id}|${w.level_id}`;
        const entry = counts.get(key) ?? { program_id: w.program_id, level_id: w.level_id, n: 0 };
        entry.n += 1;
        counts.set(key, entry);
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.n - a.n);
  }, [people]);

  const hasFilters = Boolean(search || programFilter || levelFilter || classFilter || waitingOnly || schoolFilter || supervisorFilter);
  function clearFilters() {
    setSearch("");
    setProgramFilter("");
    setLevelFilter("");
    setClassFilter("");
    setWaitingOnly(false);
    setSchoolFilter("");
    setSupervisorFilter("");
  }

  function handleExport() {
    const header = isEleve
      ? [pp.lastName, pp.firstName, pp.email, pp.phone, pp.school, pp.gradeLevel, pp.classesColumn, pp.waitingColumn]
      : [pp.lastName, pp.firstName, pp.email, pp.phone, pp.school, pp.address, pp.classesColumn, pp.waitingColumn];
    const rows = visible.map((p) => [
      p.last_name,
      p.first_name,
      p.email,
      p.phone,
      p.school_name,
      isEleve ? p.grade_level : p.address,
      p.class_students.map((cs) => classLabelById(cs.class_id)).join(" | "),
      waitingOf(p).map(wishLabel).join(" | "),
    ]);
    downloadCsv(`${isEleve ? "eleves" : "stagiaires"}.csv`, [header, ...rows]);
  }

  // ----------------------------------------------------------- the form
  const editingPerson = editingId ? people.find((p) => p.id === editingId) : undefined;
  const linkedGuardians = editingPerson ? guardians.filter((g) => guardianIdsOf(editingPerson.id).has(g.id)) : [];
  const guardianRequired = isEleve && linkedGuardians.length === 0;
  const existingPlacements: ExistingPlacement[] = editingPerson
    ? [
        ...editingPerson.class_students.map((cs) => ({ key: `c:${cs.id}`, label: classLabelById(cs.class_id), wish: false, removed: removedKeys.has(`c:${cs.id}`) })),
        ...waitingOf(editingPerson).map((w) => ({ key: `w:${w.id}`, label: pp.wishChip.replace("{label}", wishLabel(w)), wish: true, removed: removedKeys.has(`w:${w.id}`) })),
      ]
    : [];
  const takenClassIds = editingPerson ? editingPerson.class_students.map((cs) => cs.class_id) : [];

  // Someone who already accepted their invitation signs in with this address:
  // changing it here would silently disconnect the login from the record.
  const emailLocked = editingPerson ? accountState(editingPerson, accepted, acceptanceKnown) === "active" : false;
  const emailChanged = editingId ? form.email.trim().toLowerCase() !== originalEmail.trim().toLowerCase() : false;
  const newGuardianEmail = guardianChoice.mode === "new" ? guardianChoice.draft.email.trim() : "";
  const recipients = [...(!editingId || (emailChanged && !emailLocked) ? [form.email.trim()] : []), ...(newGuardianEmail ? [newGuardianEmail] : [])].filter(Boolean);

  // Typing someone who is already registered: offer their record instead of a duplicate.
  const duplicates =
    !editingId && form.first_name.trim().length >= 2 && form.last_name.trim().length >= 2
      ? people.filter((p) => matchesWords(`${p.first_name} ${p.last_name}`, `${form.first_name} ${form.last_name}`)).slice(0, 3)
      : [];

  function resetForm() {
    setForm(EMPTY_FORM);
    setSelection([]);
    setRemovedKeys(new Set());
    setConsent(false);
    // A parent is mandatory for an élève: start with the form already open.
    setGuardianChoice(isEleve ? { mode: "new", draft: EMPTY_DRAFT } : NO_GUARDIAN);
  }

  function openAddForm() {
    setEditingId(null);
    resetForm();
    setOriginalEmail("");
    setNotice(null);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(p: PersonRow) {
    setEditingId(p.id);
    setForm({
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email ?? "",
      phone: p.phone ?? "",
      address: p.address ?? "",
      school_name: p.school_name ?? "",
      grade_level: p.grade_level ?? "",
    });
    setSelection([]);
    setRemovedKeys(new Set());
    setGuardianChoice(NO_GUARDIAN);
    setConsent(false);
    setOriginalEmail(p.email ?? "");
    setNotice(null);
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  function toggleExisting(key: string) {
    setRemovedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const keptExisting = existingPlacements.filter((x) => !removedKeys.has(x.key));
    if (selection.length + keptExisting.length === 0) {
      setError(pp.mustChoose);
      return;
    }
    if (guardianRequired && guardianChoice.mode === "none") {
      setError(gd.requiredError);
      return;
    }
    if (!isEleve && guardianChoice.mode !== "none" && !consent) {
      setError(gd.consentError);
      return;
    }

    setSaving(true);
    const fields = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      school_name: form.school_name.trim(),
      grade_level: form.grade_level.trim(),
    };
    const newClassIds = selection.flatMap((s) => (s.type === "class" ? [s.classId] : []));
    const newWishes = selection.flatMap((s) => (s.type === "wish" ? [{ program_id: s.programId, level_id: s.levelId, note: s.note }] : []));
    const existingGuardianId = guardianChoice.mode === "existing" ? guardianChoice.id : null;
    const newGuardian = guardianChoice.mode === "new" ? guardianChoice.draft : null;
    const toInvite: { table: InvitableTable; id: string; email: string }[] = [];
    let personId = editingId;

    if (!editingId) {
      // One all-or-nothing call: the person, their guardian, the link, their
      // classes and wishes are created together, or nothing is created.
      const { data: created, error: createError } = await supabase.rpc("create_student_with_family", {
        p_organization_id: organizationId,
        p_student: { kind, ...fields },
        p_class_ids: newClassIds,
        p_wishes: newWishes,
        p_guardian_id: existingGuardianId,
        p_new_guardian: newGuardian,
        p_consent: consent,
      });
      if (createError || !created) {
        setSaving(false);
        setError(humanizeError(createError));
        return;
      }
      const result = created as { student_id: string; guardian_id: string | null; guardian_created: boolean };
      personId = result.student_id;
      toInvite.push({ table: "students", id: result.student_id, email: fields.email });
      if (result.guardian_created && result.guardian_id && newGuardian?.email.trim()) {
        toInvite.push({ table: "parents", id: result.guardian_id, email: newGuardian.email.trim() });
      }
    } else {
      // Editing: guardian first (an élève always keeps one), then the person,
      // then removals before additions so a freed seat can be reused.
      if (guardianChoice.mode !== "none") {
        const { data: added, error: guardianError } = await supabase.rpc("add_guardian_to_student", {
          p_student_id: editingId,
          p_guardian_id: existingGuardianId,
          p_new_guardian: newGuardian,
          p_consent: consent,
        });
        if (guardianError) {
          setSaving(false);
          setError(humanizeError(guardianError));
          return;
        }
        const addedResult = added as { guardian_id: string; guardian_created: boolean } | null;
        setGuardianChoice(NO_GUARDIAN);
        if (addedResult?.guardian_created && newGuardian?.email.trim()) toInvite.push({ table: "parents", id: addedResult.guardian_id, email: newGuardian.email.trim() });
      }

      const { error: updateError } = await supabase
        .from("students")
        .update({
          first_name: fields.first_name,
          last_name: fields.last_name,
          email: fields.email,
          phone: fields.phone || null,
          address: fields.address || null,
          school_name: fields.school_name || null,
          grade_level: fields.grade_level || null,
        })
        .eq("id", editingId);
      const removedClassRows = existingPlacements.filter((x) => removedKeys.has(x.key) && !x.wish).map((x) => x.key.slice(2));
      const removedWishRows = existingPlacements.filter((x) => removedKeys.has(x.key) && x.wish).map((x) => x.key.slice(2));
      const steps = [
        updateError,
        removedClassRows.length > 0 ? (await supabase.from("class_students").delete().in("id", removedClassRows)).error : null,
        removedWishRows.length > 0 ? (await supabase.from("class_wishes").delete().in("id", removedWishRows)).error : null,
        newClassIds.length > 0 ? (await supabase.from("class_students").insert(newClassIds.map((class_id) => ({ class_id, student_id: editingId })))).error : null,
        newWishes.length > 0 ? (await supabase.from("class_wishes").insert(newWishes.map((w) => ({ ...w, organization_id: organizationId, student_id: editingId })))).error : null,
      ];
      const failed = steps.find(Boolean);
      if (failed) {
        setSaving(false);
        setError(humanizeError(failed));
        await Promise.all([load(), reloadStructure()]);
        return;
      }
      if (emailChanged && !emailLocked) toInvite.push({ table: "students", id: editingId, email: fields.email });
    }

    // Invitations go out automatically; a failure never undoes the save.
    const sent: string[] = [];
    const failedInvites: { email: string; message: string }[] = [];
    for (const item of toInvite) {
      const result = await sendInvitation(organizationId, item.table, item.id);
      if (result.ok) sent.push(item.email);
      else failedInvites.push({ email: item.email, message: result.message });
    }

    // Tell the person (best effort) and, for language classes, open the placement test.
    const fullName = `${fields.first_name} ${fields.last_name}`;
    const queue: { studentId: string; studentName: string; classId: string }[] = [];
    for (const classId of newClassIds) {
      supabase.functions.invoke("notify-enrollment", { body: { studentId: personId, classId } }).catch(() => undefined);
      const cl = classById.get(classId);
      if (personId && cl && isLanguageProgram(programById.get(cl.program_id)?.kind)) queue.push({ studentId: personId, studentName: fullName, classId });
    }

    setSaving(false);
    closeForm();
    resetForm();
    setPlacementQueue(queue);
    if (failedInvites.length > 0) {
      setNotice({ kind: "warn", text: inv.savedInviteFailed.replace("{email}", failedInvites[0].email).replace("{message}", failedInvites[0].message) });
    } else {
      setNotice({ kind: "ok", text: sent.length > 0 ? inv.savedAndInvited.replace("{emails}", sent.join(", ")) : inv.saved });
    }
    await Promise.all([load(), reloadStructure(), reloadAccepted()]);
  }

  function handleDelete(p: PersonRow) {
    confirm(m.deleteConfirm.replace("{name}", `${p.first_name} ${p.last_name}`), async () => {
      const { data, error: deleteError } = await supabase.functions.invoke("delete-person", {
        body: { organizationId, table: "students", recordId: p.id },
      });
      if (deleteError || data?.error) {
        setError(humanizeError(await extractFunctionErrorMessage(deleteError, data)));
        return;
      }
      await Promise.all([load(), reloadStructure()]);
    });
  }

  async function handleInvite(p: PersonRow) {
    setInviting(p.id);
    setInviteResult((prev) => ({ ...prev, [p.id]: "" }));
    const result = await sendInvitation(organizationId, "students", p.id);
    setInviting(null);
    setInviteResult((prev) => ({ ...prev, [p.id]: result.ok ? inv.sentOk : inv.sentFailed.replace("{message}", result.message) }));
    await Promise.all([load(), reloadAccepted()]);
  }

  // ------------------------------------------------------------- render
  const title = isEleve ? pp.eleves : pp.stagiaires;
  const nothingToPick = !structure.loading && programs.filter((p) => p.is_active).length === 0;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-[1rem] font-semibold text-gray-900">{title}</h2>
          <p className="text-[0.78rem] text-gray-400">
            {visible.length}
            {hasFilters ? ` / ${people.length}` : ""} · {isEleve ? pp.eleve : pp.stagiaire}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleExport} disabled={visible.length === 0} className="rounded-md border border-gray-200 px-3.5 py-1.5 text-[0.82rem] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {pp.exportCsv}
          </button>
          <button
            type="button"
            onClick={() => (showForm ? closeForm() : openAddForm())}
            className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper"
          >
            {showForm ? c.cancel : `+ ${isEleve ? pp.newEleve : pp.newStagiaire}`}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-b border-gray-100 p-5 sm:grid-cols-2">
          <input required autoComplete="off" placeholder={`${pp.lastName} *`} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} />
          <input required autoComplete="off" placeholder={`${pp.firstName} *`} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputClass} />

          {duplicates.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[0.78rem] text-amber-800 sm:col-span-2">
              {duplicates.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-x-3">
                  <span>{pp.duplicateHint.replace("{name}", `${d.first_name} ${d.last_name}`)}</span>
                  <button type="button" onClick={() => openEditForm(d)} className="font-semibold underline">
                    {pp.openRecord}
                  </button>
                </div>
              ))}
            </div>
          )}

          {isEleve ? (
            <>
              <div>
                <input
                  required
                  list="school-suggestions"
                  disabled={form.school_name === SCHOOL_NONE}
                  placeholder={`${pp.school} *`}
                  value={form.school_name}
                  onChange={(e) => setForm({ ...form, school_name: e.target.value })}
                  className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-500`}
                />
                <label className="mt-1 flex items-center gap-1.5 text-[0.74rem] text-gray-500">
                  <input type="checkbox" checked={form.school_name === SCHOOL_NONE} onChange={(e) => setForm({ ...form, school_name: e.target.checked ? SCHOOL_NONE : "" })} />
                  {m.schoolNone}
                </label>
              </div>
              <input required list="grade-suggestions" placeholder={`${pp.gradeLevel} *`} value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className={inputClass} />
            </>
          ) : (
            <>
              <input list="school-suggestions" placeholder={pp.school} value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} className={inputClass} />
              <input placeholder={pp.address} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
            </>
          )}
          <datalist id="school-suggestions">
            {schools.filter((s) => s !== SCHOOL_NONE).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <datalist id="grade-suggestions">
            {grades.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>

          <div>
            <input
              required
              type="email"
              disabled={emailLocked}
              placeholder={`${pp.email} *`}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-500`}
            />
            {emailLocked && <p className="mt-1 text-[0.72rem] text-gray-500">{inv.activeEmailLocked}</p>}
          </div>
          <input
            required={!isEleve}
            type="tel"
            placeholder={isEleve ? pp.phone : `${pp.phone} *`}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
          />

          <ClassPicker
            personKind={kind}
            programs={programs}
            levels={levels}
            classes={classes}
            selection={selection}
            onChange={setSelection}
            takenClassIds={takenClassIds}
            existing={existingPlacements}
            onToggleExisting={toggleExisting}
            required
          />

          <GuardianPicker
            kind={guardianKind}
            required={guardianRequired}
            linked={linkedGuardians}
            guardians={guardians}
            choice={guardianChoice}
            onChange={setGuardianChoice}
            consent={consent}
            onConsentChange={setConsent}
          />

          {!editingId && <PersonalDataNotice className="sm:col-span-2" />}
          {recipients.length > 0 && (
            <div className="space-y-0.5 text-[0.78rem] text-gray-500 sm:col-span-2">
              <p>✉ {inv.willSendTo.replace("{emails}", recipients.join(", "))}</p>
              {editingId && emailChanged && !emailLocked && <p>{inv.emailChangedNote}</p>}
            </div>
          )}
          <button type="submit" disabled={saving} className="rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50 sm:col-span-2">
            {saving ? c.saving : editingId ? c.saveEdits : c.save}
          </button>
        </form>
      )}

      {nothingToPick && !loading && <p className="border-b border-gray-100 px-5 py-3 text-[0.82rem] text-amber-700">{pp.needStructure}</p>}

      <div className="space-y-2 border-b border-gray-100 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <input type="search" placeholder={pp.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} className={`${filterClass} w-56`} />
          <select
            value={programFilter}
            onChange={(e) => {
              setProgramFilter(e.target.value);
              setLevelFilter("");
              setClassFilter("");
            }}
            className={filterClass}
            aria-label={pp.filterProgramme}
          >
            <option value="">{pp.allProgrammes}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={levelFilter}
            disabled={!programFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setClassFilter("");
            }}
            className={`${filterClass} disabled:opacity-50`}
            aria-label={pp.filterNiveau}
          >
            <option value="">{pp.allNiveaux}</option>
            {filterLevels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={`${filterClass} max-w-[14rem]`} aria-label={pp.filterClass}>
            <option value="">{pp.allClasses}</option>
            {filterClasses.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {classLabelById(cl.id)}
              </option>
            ))}
          </select>
          {isEleve ? (
            <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className={`${filterClass} max-w-[12rem]`} aria-label={pp.school}>
              <option value="">{pp.allSchools}</option>
              {schools.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <select value={supervisorFilter} onChange={(e) => setSupervisorFilter(e.target.value as "" | "with" | "without")} className={filterClass} aria-label={gd.supervisorHeading}>
              <option value="">{pp.anySupervisor}</option>
              <option value="with">{pp.withSupervisor}</option>
              <option value="without">{pp.withoutSupervisor}</option>
            </select>
          )}
          <label className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.82rem] ${waitingOnly ? "border-amber-300 bg-amber-50 text-amber-800" : "border-gray-200 bg-white text-gray-700"}`}>
            <input type="checkbox" checked={waitingOnly} onChange={(e) => setWaitingOnly(e.target.checked)} />
            {pp.waitingOnly}
          </label>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-[0.8rem] text-gray-500 hover:text-gray-800 hover:underline">
              {pp.clearFilters}
            </button>
          )}
        </div>

        {demand.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[0.76rem]">
            <span className="text-gray-500">{pp.demandTitle}</span>
            {demand.map((d) => (
              <button
                key={`${d.program_id}|${d.level_id}`}
                type="button"
                onClick={() => {
                  setWaitingOnly(true);
                  setProgramFilter(d.program_id);
                  setLevelFilter(d.level_id);
                  setClassFilter("");
                }}
                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800 hover:bg-amber-100"
              >
                {classLabel({ name: "", programs: programById.get(d.program_id), levels: levelById.get(d.level_id) })}: {d.n}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="px-5 pt-3 text-[0.82rem] text-red-600">{error}</p>}
      {notice && (
        <p className={`mx-5 mt-3 rounded-md px-3 py-2 text-[0.82rem] ${notice.kind === "ok" ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>{notice.text}</p>
      )}

      {loading ? (
        <p className="p-5 text-[0.85rem] text-gray-400">{c.loading}</p>
      ) : visible.length === 0 ? (
        <p className="p-5 text-[0.85rem] text-gray-400">{hasFilters ? c.noResults : pp.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[0.85rem]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[pp.nameColumn, isEleve ? pp.schoolColumn : pp.addressColumn, pp.classesColumn, pp.contactColumn, pp.accountColumn, ""].map((label, i) => (
                  <th key={i} className="px-4 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-gray-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const waiting = waitingOf(p);
                return (
                  <tr key={p.id} className="border-b border-gray-50 align-top last:border-0">
                    <td className="px-4 py-2.5 font-medium">
                      <Link to={`${base}/eleve/${p.id}`} className="text-gray-900 hover:text-ink hover:underline">
                        {p.last_name} {p.first_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {isEleve ? (
                        <>
                          {p.school_name ?? "—"}
                          {p.grade_level && <span className="block text-[0.76rem] text-gray-400">{p.grade_level}</span>}
                        </>
                      ) : (
                        <>
                          {p.school_name && <span className="block text-gray-600">{p.school_name}</span>}
                          <span className="text-[0.78rem]">{p.address ?? (p.school_name ? "" : "—")}</span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {p.class_students.map((cs) => (
                          <span key={cs.id} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[0.72rem] text-gray-700">
                            {classLabelById(cs.class_id)}
                          </span>
                        ))}
                        {waiting.map((w) => (
                          <span key={w.id} className="rounded-full border border-dashed border-amber-300 bg-amber-50 px-2 py-0.5 text-[0.72rem] text-amber-800">
                            {pp.wishChip.replace("{label}", wishLabel(w))}
                          </span>
                        ))}
                        {p.class_students.length === 0 && waiting.length === 0 && <span className="text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {p.email ?? "—"}
                      {p.phone && <span className="block text-[0.76rem] text-gray-400">{p.phone}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <AccountStatus state={accountState(p, accepted, acceptanceKnown)} busy={inviting === p.id} result={inviteResult[p.id]} onSend={() => handleInvite(p)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <button type="button" onClick={() => openEditForm(p)} className="mr-3 text-[0.78rem] text-gray-600 hover:underline">
                        {c.edit}
                      </button>
                      <button type="button" onClick={() => handleDelete(p)} className="text-[0.78rem] text-red-600 hover:underline">
                        {c.delete}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {dialog}
      {placementQueue.length > 0 && (
        <PlacementTestModal
          key={`${placementQueue[0].studentId}-${placementQueue[0].classId}`}
          studentId={placementQueue[0].studentId}
          studentName={placementQueue[0].studentName}
          classId={placementQueue[0].classId}
          onClose={() => setPlacementQueue((queue) => queue.slice(1))}
        />
      )}
    </div>
  );
}
