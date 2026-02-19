import type { Manager, ManagerStats } from "@/lib/types";

interface Props {
  managers: Record<string, Manager>;
  stats: Record<string, ManagerStats>;
}

export default function TrophyCase({ managers, stats }: Props) {
  const managerList = Object.values(stats)
    .filter((s) => s.championships > 0 || s.secondPlace > 0 || s.thirdPlace > 0)
    .sort((a, b) => {
      // Sort by championships, then 2nd places, then 3rd places
      if (b.championships !== a.championships)
        return b.championships - a.championships;
      if (b.secondPlace !== a.secondPlace) return b.secondPlace - a.secondPlace;
      return b.thirdPlace - a.thirdPlace;
    });

  if (managerList.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-4">Trophy Case</h2>
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
                {s.championships > 0 && (
                  <div className="text-center">
                    <span className="text-3xl">🏆</span>
                    <p className="text-xl font-bold text-amber-400">
                      {s.championships}
                    </p>
                    <p className="text-xs text-gray-500">Champs</p>
                  </div>
                )}
                {s.secondPlace > 0 && (
                  <div className="text-center">
                    <span className="text-3xl">🥈</span>
                    <p className="text-xl font-bold text-gray-300">
                      {s.secondPlace}
                    </p>
                    <p className="text-xs text-gray-500">2nd</p>
                  </div>
                )}
                {s.thirdPlace > 0 && (
                  <div className="text-center">
                    <span className="text-3xl">🥉</span>
                    <p className="text-xl font-bold text-orange-400">
                      {s.thirdPlace}
                    </p>
                    <p className="text-xs text-gray-500">3rd</p>
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
