import { getAllSeasonsData } from "@/lib/sleeper";
import { getYahooSeasonsData } from "@/lib/yahoo";
import { aggregateAllSeasons } from "@/lib/aggregate";
import Dashboard from "@/components/Dashboard";

const LEAGUE_ID = "1257436698095136768";

export const revalidate = 604800; // Revalidate weekly

export default async function Home() {
  const sleeperSeasons = await getAllSeasonsData(LEAGUE_ID);
  const yahooSeasons = getYahooSeasonsData();

  // Combine Yahoo (2006-2019) + Sleeper (2020-2025), sorted by season
  const allSeasons = [...yahooSeasons, ...sleeperSeasons].sort(
    (a, b) => parseInt(a.league.season) - parseInt(b.league.season)
  );

  const allData = aggregateAllSeasons(allSeasons);
  const sleeperOnlyData = aggregateAllSeasons(sleeperSeasons);

  return (
    <main className="min-h-screen bg-gray-950">
      <Dashboard allData={allData} sleeperOnlyData={sleeperOnlyData} />
    </main>
  );
}
