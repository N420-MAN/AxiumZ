import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

const EVERY_MS = 4 * 60 * 1000;

/**
 * Tells the server the person is using Mon Espace (while the tab is visible), at most
 * every 4 minutes. The server keeps "last seen" and counts a new connection after
 * 30 minutes without activity. A failure is silent: it never gets in the way.
 */
export function useActivityHeartbeat(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    let last = 0;
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < EVERY_MS) return;
      last = now;
      void Promise.resolve(supabase.rpc("touch_activity")).catch(() => undefined);
    };
    ping();
    const id = window.setInterval(ping, 60 * 1000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [userId]);
}
