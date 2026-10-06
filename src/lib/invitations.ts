import { supabase } from "./supabaseClient";
import { extractFunctionErrorMessage } from "./invokeEdgeFunction";

export type InvitableTable = "students" | "parents" | "teachers";

export type InvitationResult = { ok: true } | { ok: false; message: string };

// Sends (or re-sends) the invitation for one person. The server reads the
// email from the person's record, replaces a still-pending invitation, and
// refuses to touch someone who already has an active account.
export async function sendInvitation(organizationId: string, table: InvitableTable, recordId: string): Promise<InvitationResult> {
  const { data, error } = await supabase.functions.invoke("invite-user", {
    body: { organizationId, table, recordId },
  });
  if (error || data?.error) {
    return { ok: false, message: await extractFunctionErrorMessage(error, data) };
  }
  return { ok: true };
}

// What an admin needs to know about someone's access:
//   no_email    - nothing to invite
//   not_invited - has an email but no invitation went out (or it failed)
//   pending     - invited, hasn't accepted yet
//   active      - accepted and can sign in
export type AccountState = "no_email" | "not_invited" | "pending" | "active";

export function accountState(
  person: { email: string | null; user_id: string | null },
  accepted: Set<string>,
  acceptanceKnown: boolean,
): AccountState {
  if (person.user_id) {
    // If the acceptance list couldn't be loaded, fall back to the old
    // behavior (a linked login reads as active) rather than showing
    // everyone as pending.
    return !acceptanceKnown || accepted.has(person.user_id) ? "active" : "pending";
  }
  return person.email?.trim() ? "not_invited" : "no_email";
}

// People of this organization who have actually accepted their invitation.
// Returns null when the list can't be read.
export async function fetchAcceptedAccounts(organizationId: string): Promise<Set<string> | null> {
  const { data, error } = await supabase.rpc("account_acceptance", { p_organization_id: organizationId });
  if (error || !data) return null;
  return new Set((data as { account_user_id: string; accepted: boolean }[]).filter((r) => r.accepted).map((r) => r.account_user_id));
}
