"use client";

import type { Manager, HeadToHeadRecord } from "@/lib/types";

interface Props {
  managers: Record<string, Manager>;
  headToHead: HeadToHeadRecord[];
}

export default function HeadToHeadMatrix({ managers, headToHead }: Props) {
  const managerIds = Object.keys(managers).sort((a, b) =>
    (managers[a]?.displayName || "").localeCompare(
      managers[b]?.displayName || ""
    )
  );

  // Build lookup: h2h[idA][idB] = { wins: A's wins, losses: A's losses }
  const h2hLookup: Record<
    string,
    Record<string, { wins: number; losses: number; ties: number }>
  > = {};

  for (const id of managerIds) {
    h2hLookup[id] = {};
  }

  for (const record of headToHead) {
    const { managerId1, managerId2, wins1, wins2, ties } = record;
    if (!h2hLookup[managerId1]) h2hLookup[managerId1] = {};
    if (!h2hLookup[managerId2]) h2hLookup[managerId2] = {};

    h2hLookup[managerId1][managerId2] = {
      wins: wins1,
      losses: wins2,
      ties,
    };
    h2hLookup[managerId2][managerId1] = {
      wins: wins2,
      losses: wins1,
      ties,
    };
  }

  function getShortName(name: string): string {
    if (name.length <= 8) return name;
    const parts = name.split(" ");
    if (parts.length >= 2) return parts[0][0] + ". " + parts[parts.length - 1];
    return name.slice(0, 8);
  }

  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-4">
        Head-to-Head Records
      </h2>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left bg-white/5 text-gray-400 sticky left-0 z-10 bg-gray-950 min-w-[100px]">
                vs
              </th>
              {managerIds.map((id) => (
                <th
                  key={id}
                  className="px-2 py-2 text-center bg-white/5 text-gray-400 min-w-[70px]"
                >
                  {getShortName(managers[id]?.displayName || "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {managerIds.map((rowId) => (
              <tr key={rowId}>
                <td className="px-2 py-2 text-white font-medium sticky left-0 z-10 bg-gray-950 border-r border-white/10">
                  {getShortName(managers[rowId]?.displayName || "")}
                </td>
                {managerIds.map((colId) => {
                  if (rowId === colId) {
                    return (
                      <td
                        key={colId}
                        className="px-2 py-2 text-center bg-white/3 text-gray-600"
                      >
                        —
                      </td>
                    );
                  }
                  const record = h2hLookup[rowId]?.[colId];
                  if (!record) {
                    return (
                      <td
                        key={colId}
                        className="px-2 py-2 text-center text-gray-600"
                      >
                        —
                      </td>
                    );
                  }
                  const winning = record.wins > record.losses;
                  const losing = record.wins < record.losses;
                  return (
                    <td
                      key={colId}
                      className={`px-2 py-2 text-center font-mono ${
                        winning
                          ? "text-green-400 bg-green-500/5"
                          : losing
                          ? "text-red-400 bg-red-500/5"
                          : "text-gray-400"
                      }`}
                    >
                      {record.wins}-{record.losses}
                      {record.ties > 0 && `-${record.ties}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Record shown as row manager&apos;s wins-losses vs column manager
      </p>
    </section>
  );
}
