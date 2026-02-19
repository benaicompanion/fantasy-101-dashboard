"use client";

import { useState } from "react";
import type { AggregatedData } from "@/lib/types";
import AllTimeLeaderboard from "./AllTimeLeaderboard";
import TrophyCase from "./TrophyCase";
import BestWorstTeams from "./BestWorstTeams";
import HeadToHeadMatrix from "./HeadToHeadMatrix";
import LuckTracker from "./LuckTracker";

interface Props {
  allData: AggregatedData;
  sleeperOnlyData: AggregatedData;
}

export default function Dashboard({ allData, sleeperOnlyData }: Props) {
  const [includeYahoo, setIncludeYahoo] = useState(true);
  const data = includeYahoo ? allData : sleeperOnlyData;

  const totalGames = Object.values(data.stats).reduce(
    (sum, s) => sum + s.totalWins + s.totalLosses,
    0
  );

  return (
    <>
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
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-gray-400">Yahoo Data</span>
              <button
                role="switch"
                aria-checked={includeYahoo}
                onClick={() => setIncludeYahoo(!includeYahoo)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  includeYahoo ? "bg-amber-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    includeYahoo ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>
          </div>
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
        {includeYahoo && (
          <>
            {" & "}
            <a
              href="https://football.fantasysports.yahoo.com"
              className="text-gray-400 hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Yahoo
            </a>
          </>
        )}
      </footer>
    </>
  );
}
