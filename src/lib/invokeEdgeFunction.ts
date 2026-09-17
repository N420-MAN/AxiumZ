/**
 * supabase-js's functions.invoke() throws a generic "Edge Function returned
 * a non-2xx status code" error when the function responds with anything but
 * 2xx — it does NOT surface the actual error message the function put in
 * its JSON body. The real message is readable from the underlying Response
 * object at `error.context`. This digs it out, falling back to the generic
 * message only if that fails for some reason.
 */
export async function extractFunctionErrorMessage(error: unknown, fallbackData?: { error?: string }): Promise<string> {
  if (fallbackData?.error) return fallbackData.error;

  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === "function") {
    try {
      const body = await context.json();
      if (body?.error) return body.error as string;
    } catch {
      // context wasn't valid JSON — fall through to the generic message below.
    }
  }

  return (error as { message?: string })?.message ?? "Erreur inconnue";
}
