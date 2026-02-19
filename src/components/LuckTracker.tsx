import type { Manager, ManagerStats } from "@/lib/types";

interface Props {
  managers: Record<string, Manager>;
  stats: Record<string, ManagerStats>;
}

export default function LuckTracker({ managers, stats }: Props) {
  const sorted = Object.values(stats).sort((a, b) => {
    // Sort by net luck (lucky wins - unlucky losses)
    const luckA = a.luckyWins - a.unluckyLosses;
    const luckB = b.luckyWins - b.unluckyLosses;
    return luckB - luckA;
  });

  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-2">Luck Tracker</h2>
      <p className="text-sm text-gray-500 mb-4">
        Lucky win = won but scored below league median. Unlucky loss = lost but
        scored above league median.
      </p>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-3 py-3 text-left">#</th>
              <th className="px-3 py-3 text-left">Manager</th>
              <th className="px-3 py-3 text-right">Lucky Wins</th>
              <th className="px-3 py-3 text-right">Unlucky Losses</th>
              <th className="px-3 py-3 text-right">Net Luck</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((s, i) => {
              const mgr = managers[s.userId];
              const netLuck = s.luckyWins - s.unluckyLosses;
              return (
                <tr
                  key={s.userId}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-3 py-3 text-gray-500 font-mono">
                    {i + 1}
                  </td>
                  <td className="px-3 py-3 text-white font-medium flex items-center gap-2">
                    {mgr?.avatar && (
                      <img
                        src={`https://sleepercdn.com/avatars/thumbs/${mgr.avatar}`}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    {mgr?.displayName || s.userId}
                  </td>
                  <td className="px-3 py-3 text-right text-green-400 font-mono">
                    {s.luckyWins}
                  </td>
                  <td className="px-3 py-3 text-right text-red-400 font-mono">
                    {s.unluckyLosses}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-bold font-mono ${
                      netLuck > 0
                        ? "text-green-400"
                        : netLuck < 0
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {netLuck > 0 ? "+" : ""}
                    {netLuck}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
