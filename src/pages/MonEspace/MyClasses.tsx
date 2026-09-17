import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../features/auth/AuthContext";
import ClassDetail from "./ClassDetail";

const EASE = [0.16, 1, 0.3, 1] as const;

interface MyClass {
  id: string;
  name: string;
  room: string | null;
  organization_id: string;
  courses: { name: string } | null;
  teachers: { user_id: string | null; first_name: string; last_name: string } | null;
}

export default function MyClasses() {
  const { user, isSuperAdmin } = useAuth();
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [openClass, setOpenClass] = useState<MyClass | null>(null);

  useEffect(() => {
    // No role-branching needed here: RLS on `classes` already returns only
    // the rows this specific user (teacher, enrolled student, or parent of
    // one) is allowed to see — the same query works for every role.
    supabase
      .from("classes")
      .select("id, name, room, organization_id, courses(name), teachers(user_id, first_name, last_name)")
      .then(({ data }) => {
        setClasses((data as unknown as MyClass[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return null;
  if (classes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mt-10"
    >
      <h2 className="font-display text-[1.3rem] font-extrabold text-paper">Mes classes</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {classes.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setOpenClass(c)}
            className="rounded-xl border border-paper/10 bg-paper/[0.04] p-4 text-left transition-colors hover:border-paper/25"
          >
            <h3 className="font-display text-[1rem] font-extrabold text-paper">{c.name}</h3>
            <p className="mt-1 text-[0.82rem] text-mist">{c.courses?.name}</p>
            {c.teachers && (
              <p className="mt-1 text-[0.8rem] text-accent-bright">
                {c.teachers.first_name} {c.teachers.last_name}
              </p>
            )}
            {c.room && <p className="mt-1 text-[0.78rem] text-mist">Salle {c.room}</p>}
          </button>
        ))}
      </div>

      {openClass && (
        <ClassDetail
          classId={openClass.id}
          className={openClass.name}
          organizationId={openClass.organization_id}
          canEdit={isSuperAdmin || openClass.teachers?.user_id === user?.id}
          onClose={() => setOpenClass(null)}
        />
      )}
    </motion.div>
  );
}
