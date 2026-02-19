interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  highlight?: boolean;
}

export default function StatCard({
  label,
  value,
  sublabel,
  highlight,
}: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
    </div>
  );
}
