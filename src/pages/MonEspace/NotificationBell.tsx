import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useLocale } from "../../i18n/LocaleContext";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { t } = useLocale();
  const m = t.monEspace.notifications;
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // light polling — no realtime infra needed for this volume
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-700"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 8a5 5 0 0 1 10 0v4l1.5 2.5h-13L5 12V8Z" />
          <path d="M8.5 17.5a1.5 1.5 0 0 0 3 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[0.6rem] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white shadow-lg md:left-0 md:right-auto">
          <div className="border-b border-gray-100 px-3 py-2 text-[0.8rem] font-semibold text-gray-900">{m.title}</div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-[0.82rem] text-gray-400">{m.none}</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markAsRead(n.id)}
                  className={`block w-full border-b border-gray-50 px-3 py-2.5 text-left last:border-b-0 hover:bg-gray-50 ${
                    n.is_read ? "opacity-60" : ""
                  }`}
                >
                  <p className="text-[0.8rem] font-medium text-gray-900">{n.title}</p>
                  <p className="mt-0.5 text-[0.76rem] text-gray-500">{n.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
