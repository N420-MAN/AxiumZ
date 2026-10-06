type Cell = string | number | null | undefined;

// Downloads rows as a spreadsheet-friendly CSV. Semicolon-separated with a
// byte-order mark, which is what Excel expects in a French-language setup, so
// accents and columns open correctly with a double click.
export function downloadCsv(filename: string, rows: Cell[][]): void {
  const escape = (value: Cell) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = "\uFEFF" + rows.map((row) => row.map(escape).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
