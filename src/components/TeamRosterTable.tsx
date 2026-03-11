import type { PlayerStat } from "@/lib/data";

export function TeamRosterTable({ players }: { players: PlayerStat[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h4 className="font-semibold text-gray-900 text-sm">
          Player Stats
          <span className="text-xs font-normal text-gray-400 ml-2">
            ({players.length} players)
          </span>
        </h4>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No player stats recorded for this team yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                  #
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[160px]">
                  Player
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                  GP
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                  G
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                  A
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                  PTS
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                  PIM
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                  PPG
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-10">
                  SHG
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, i) => (
                <tr
                  key={player.participantId}
                  className={`border-b border-gray-50 hover:bg-blue-50/50 transition-colors ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                  }`}
                >
                  <td className="px-2 py-2 text-center text-gray-400">
                    {player.number > 0 ? player.number : "-"}
                  </td>
                  <td className="px-2 py-2 text-left whitespace-nowrap">
                    <span className="font-medium text-gray-900">
                      {player.name}
                    </span>
                    {player.position && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({player.position})
                      </span>
                    )}
                    {player.isAffiliate && (
                      <span
                        className="text-xs text-orange-500 ml-1"
                        title="Affiliate Player"
                      >
                        AP
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {player.gamesPlayed}
                  </td>
                  <td className="px-2 py-2 text-center font-medium text-green-700">
                    {player.goals}
                  </td>
                  <td className="px-2 py-2 text-center">{player.assists}</td>
                  <td className="px-2 py-2 text-center font-bold text-blue-900">
                    {player.points}
                  </td>
                  <td className="px-2 py-2 text-center">{player.pim}</td>
                  <td className="px-2 py-2 text-center text-gray-500">
                    {player.ppGoals}
                  </td>
                  <td className="px-2 py-2 text-center text-gray-500">
                    {player.shGoals}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
