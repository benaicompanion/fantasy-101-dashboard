import type { SeasonTeam } from "@/lib/types";

interface Props {
  bestTeams: SeasonTeam[];
  worstTeams: SeasonTeam[];
}

export default function BestWorstTeams({ bestTeams, worstTeams }: Props) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-4">
        Best & Worst Teams Ever
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Best Teams */}
        <div>
          <h3 className="text-sm uppercase tracking-wider text-green-400 mb-3">
            Top 3 Best Seasons
          </h3>
          <div className="space-y-3">
            {bestTeams.map((team, i) => (
              <div
                key={`${team.userId}-${team.season}`}
                className="flex items-center gap-4 rounded-xl border border-green-500/20 bg-green-500/5 p-4"
              >
                <span className="text-2xl font-bold text-green-400 w-8">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-white font-medium">{team.displayName}</p>
                  <p className="text-sm text-gray-400">
                    {team.teamName} · {team.season}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white font-mono">
                    {team.pointsFor.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">{team.record}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst Teams */}
        <div>
          <h3 className="text-sm uppercase tracking-wider text-red-400 mb-3">
            Bottom 3 Worst Seasons
          </h3>
          <div className="space-y-3">
            {worstTeams.map((team, i) => (
              <div
                key={`${team.userId}-${team.season}`}
                className="flex items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
              >
                <span className="text-2xl font-bold text-red-400 w-8">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-white font-medium">{team.displayName}</p>
                  <p className="text-sm text-gray-400">
                    {team.teamName} · {team.season}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white font-mono">
                    {team.pointsFor.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">{team.record}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
