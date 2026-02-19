import { getAllSeasonsData } from "@/lib/sleeper";
import { aggregateAllSeasons } from "@/lib/aggregate";
import AllTimeLeaderboard from "@/components/AllTimeLeaderboard";
import TrophyCase from "@/components/TrophyCase";
import BestWorstTeams from "@/components/BestWorstTeams";
import HeadToHeadMatrix from "@/components/HeadToHeadMatrix";
import LuckTracker from "@/components/LuckTracker";

const LEAGUE_ID = "1257436698095136768";

export const revalidate = 604800; // Revalidate weekly

export default async function Home() {
  const seasons = await getAllSeasonsData(LEAGUE_ID);
  const data = aggregateAllSeasons(seasons);

  const totalGames = Object.values(data.stats).reduce(
    (sum, s) => sum + s.totalWins + s.totalLosses,
    0
  );

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {data.leagueName}
            </h1>
            <p className="text-sm text-gray-500">
              {data.seasons[0]}–{data.seasons[data.seasons.length - 1]} ·{" "}
              {data.seasons.length} seasons ·{" "}
              {Object.keys(data.managers).length} managers ·{" "}
              {totalGames / 2} matchups
            </p>
          </div>
          <div className="text-xs text-gray-600">Powered by Sleeper</div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
        <AllTimeLeaderboard managers={data.managers} stats={data.stats} />
        <TrophyCase managers={data.managers} stats={data.stats} />
        <BestWorstTeams
          bestTeams={data.bestTeams}
          worstTeams={data.worstTeams}
        />
        <HeadToHeadMatrix
          managers={data.managers}
          headToHead={data.headToHead}
        />
        <LuckTracker managers={data.managers} stats={data.stats} />
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-600">
        Data from{" "}
        <a
          href="https://sleeper.com"
          className="text-gray-400 hover:text-white transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sleeper
        </a>
      </footer>
    </main>
  );
}
