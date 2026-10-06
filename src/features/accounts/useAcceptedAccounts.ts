import { useCallback, useEffect, useState } from "react";
import { fetchAcceptedAccounts } from "../../lib/invitations";

// Which linked logins have actually accepted their invitation. `known` is
// false until (and unless) the list could be read.
export function useAcceptedAccounts(organizationId: string) {
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [known, setKnown] = useState(false);

  const reload = useCallback(async () => {
    const result = await fetchAcceptedAccounts(organizationId);
    setAccepted(result ?? new Set());
    setKnown(result !== null);
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;
    fetchAcceptedAccounts(organizationId).then((result) => {
      if (cancelled) return;
      setAccepted(result ?? new Set());
      setKnown(result !== null);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return { accepted, known, reload };
}
