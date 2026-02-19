"use client";

import { useState } from "react";
import type { Manager, ManagerStats } from "@/lib/types";

type SortKey =
  | "totalPointsFor"
  | "totalPointsAgainst"
  | "totalWins"
  | "totalLosses"
  | "winPercentage"
  | "pointDifferential";

interface Props {
  managers: Record<string, Manager>;
  stats: Record<string, ManagerStats>;
}

export default function AllTimeLeaderboard({ managers, stats }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("totalPointsFor");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = Object.values(stats).sort((a, b) => {
    const mult = sortDir === "desc" ? -1 : 1;
    return (a[sortBy] - b[sortBy]) * mult;
  });

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(key);
      setSortDir(key === "totalLosses" ? "asc" : "desc");
    }
  }

  function SortHeader({
    label,
    sortKey,
  }: {
    label: string;
    sortKey: SortKey;
  }) {
    const active = sortBy === sortKey;
    return (
      <th
        className="px-3 py-3 text-right cursor-pointer hover:text-white transition-colors select-none"
        onClick={() => handleSort(sortKey)}
      >
        <span className={active ? "text-amber-400" : ""}>
          {label}
          {active && (sortDir === "desc" ? " ↓" : " ↑")}
        </span>
      </th>
    );
  }

  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-4">
        All-Time Leaderboard
      </h2>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-3 py-3 text-left w-8">#</th>
              <th className="px-3 py-3 text-left">Manager</th>
              <SortHeader label="PF" sortKey="totalPointsFor" />
              <SortHeader label="PA" sortKey="totalPointsAgainst" />
              <SortHeader label="W" sortKey="totalWins" />
              <SortHeader label="L" sortKey="totalLosses" />
              <SortHeader label="Win %" sortKey="winPercentage" />
              <SortHeader label="+/-" sortKey="pointDifferential" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((s, i) => {
              const mgr = managers[s.userId];
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
                  <td className="px-3 py-3 text-right text-white font-mono">
                    {s.totalPointsFor.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-400 font-mono">
                    {s.totalPointsAgainst.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-3 text-right text-green-400 font-mono">
                    {s.totalWins}
                  </td>
                  <td className="px-3 py-3 text-right text-red-400 font-mono">
                    {s.totalLosses}
                  </td>
                  <td className="px-3 py-3 text-right text-white font-mono">
                    {(s.winPercentage * 100).toFixed(1)}%
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-mono ${
                      s.pointDifferential > 0
                        ? "text-green-400"
                        : s.pointDifferential < 0
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {s.pointDifferential > 0 ? "+" : ""}
                    {s.pointDifferential.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
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
