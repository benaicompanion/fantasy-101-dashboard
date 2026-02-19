import type { Manager, ManagerStats } from "@/lib/types";

interface Props {
  managers: Record<string, Manager>;
  stats: Record<string, ManagerStats>;
}

export default function BottomFinishes({ managers, stats }: Props) {
  const managerList = Object.values(stats)
    .filter((s) => s.lastPlace > 0 || s.secondToLast > 0 || s.thirdToLast > 0)
    .sort((a, b) => {
      // Sort by most last places, then 2nd-to-last, then 3rd-to-last
      if (b.lastPlace !== a.lastPlace) return b.lastPlace - a.lastPlace;
      if (b.secondToLast !== a.secondToLast)
        return b.secondToLast - a.secondToLast;
      return b.thirdToLast - a.thirdToLast;
    });

  if (managerList.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-4">
        Bottom 3 Finishes{" "}
        <span className="text-sm font-normal text-gray-500">
          (Regular Season)
        </span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {managerList.map((s) => {
          const mgr = managers[s.userId];
          return (
            <div
              key={s.userId}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center gap-3 mb-4">
                {mgr?.avatar && (
                  <img
                    src={`https://sleepercdn.com/avatars/thumbs/${mgr.avatar}`}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <h3 className="text-lg font-semibold text-white">
                  {mgr?.displayName || s.userId}
                </h3>
              </div>
              <div className="flex gap-6">
                {s.lastPlace > 0 && (
                  <div className="text-center">
                    <span className="text-3xl">💩</span>
                    <p className="text-xl font-bold text-red-400">
                      {s.lastPlace}
                    </p>
                    <p className="text-xs text-gray-500">Last</p>
                  </div>
                )}
                {s.secondToLast > 0 && (
                  <div className="text-center">
                    <span className="text-3xl">📉</span>
                    <p className="text-xl font-bold text-red-300">
                      {s.secondToLast}
                    </p>
                    <p className="text-xs text-gray-500">2nd-Last</p>
                  </div>
                )}
                {s.thirdToLast > 0 && (
                  <div className="text-center">
                    <span className="text-3xl">😬</span>
                    <p className="text-xl font-bold text-orange-300">
                      {s.thirdToLast}
                    </p>
                    <p className="text-xs text-gray-500">3rd-Last</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
