import { useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { humanizeError } from "../../lib/humanizeError";
import { useLocale } from "../../i18n/LocaleContext";

interface ParsedRow {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  valid: boolean;
}

function parseCsv(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const cells = line.split(",").map((c) => c.trim());
      const [first_name = "", last_name = "", email = "", phone = ""] = cells;
      return { first_name, last_name, email, phone, valid: Boolean(first_name && last_name) };
    })
    .filter((row) => !/^(pr[ée]nom|first[ _]?name)$/i.test(row.first_name));
}

interface RosterImportModalProps {
  organizationId: string;
  onClose: () => void;
  onImported: () => void;
}

export default function RosterImportModal({ organizationId, onClose, onImported }: RosterImportModalProps) {
  const { t } = useLocale();
  const m = t.monEspace.rosterImport;
  const [rawText, setRawText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = parseCsv(rawText);
  const validRows = rows.filter((r) => r.valid);
  const invalidCount = rows.length - validRows.length;

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setRawText(text);
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    setError(null);
    const { error: insertError } = await supabase.from("students").insert(
      validRows.map((r) => ({
        organization_id: organizationId,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email || null,
        phone: r.phone || null,
      })),
    );
    setImporting(false);
    if (insertError) {
      setError(humanizeError(insertError));
      return;
    }
    setDoneCount(validRows.length);
    onImported();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-[1rem] font-semibold text-gray-900">{m.title}</h2>
          <button type="button" onClick={onClose} className="text-[0.85rem] text-gray-400 hover:text-gray-700">
            {t.monEspace.gestion.classes.close}
          </button>
        </div>

        {doneCount !== null ? (
          <div className="mt-4">
            <p className="text-[0.9rem] text-green-700">{m.successMessage.replace("{count}", String(doneCount))}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper"
            >
              {t.monEspace.gestion.classes.close}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-[0.78rem] text-gray-500">{m.description}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-[0.8rem] text-gray-600 hover:bg-gray-50"
              >
                {m.uploadFile}
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0])} />
              <span className="text-[0.76rem] text-gray-400">{m.orPaste}</span>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              placeholder={m.pastePlaceholder}
              className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 font-mono text-[0.8rem] text-gray-800 outline-none focus:border-gray-400"
            />

            {rows.length > 0 && (
              <div className="mt-2 text-[0.8rem] text-gray-600">
                {m.previewSummary.replace("{valid}", String(validRows.length)).replace("{total}", String(rows.length))}
                {invalidCount > 0 && <span className="ml-1 text-amber-700">{m.someSkipped.replace("{count}", String(invalidCount))}</span>}
              </div>
            )}

            {validRows.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-100 bg-gray-50 p-2">
                {validRows.slice(0, 20).map((r, i) => (
                  <p key={i} className="text-[0.78rem] text-gray-700">
                    {r.first_name} {r.last_name} {r.email && `· ${r.email}`}
                  </p>
                ))}
                {validRows.length > 20 && <p className="mt-1 text-[0.75rem] text-gray-400">{m.andMore.replace("{count}", String(validRows.length - 20))}</p>}
              </div>
            )}

            {error && <p className="mt-2 text-[0.82rem] text-red-600">{error}</p>}

            <button
              type="button"
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="mt-4 w-full rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper disabled:opacity-50"
            >
              {importing ? m.importing : m.importButton.replace("{count}", String(validRows.length))}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
