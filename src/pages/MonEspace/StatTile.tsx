export default function StatTile({ label, value, hint, tone = "ink" }: { label: string; value: string | number; hint?: string; tone?: "ink" | "gold" | "red" | "green" }) {
  const color = { ink: "text-ink", gold: "text-accent-dark", red: "text-red-600", green: "text-green-700" }[tone];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <p className="text-[0.76rem] font-medium text-gray-500">{label}</p>
      <p className={`mt-1.5 text-[1.9rem] leading-none font-extrabold tracking-tight ${color}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[0.74rem] text-gray-400">{hint}</p>}
    </div>
  );
}
