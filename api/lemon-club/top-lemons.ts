import { getAuthenticatedPlayer } from '../_lib/auth';
import { prisma } from '../_lib/db';
import { json, unauthorized, withMethods } from '../_lib/http';
import { LEMON_XP_PER_DISTANCE, threeMonthsAgo } from '../_lib/lemon-xp';
import {
  buildTopLemonsLeaderboard,
  formatTopLemonsApiPayload,
} from '../_lib/top-lemons-board';

interface PlayerXpRow {
  player_id: string;
  display_name: string;
  xp_gained_3m: number;
  total_xp: number;
}

export default withMethods({
  GET: async (req, res) => {
    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const since = threeMonthsAgo();
    const divisor = LEMON_XP_PER_DISTANCE;

    const rows = await prisma.$queryRaw<PlayerXpRow[]>`
      SELECT
        p.id AS player_id,
        p.display_name,
        COALESCE(SUM(FLOOR(gr.distance / ${divisor})) FILTER (
          WHERE gr.died_at >= ${since}
        ), 0)::int AS xp_gained_3m,
        p.lemon_xp AS total_xp
      FROM game_runs gr
      INNER JOIN players p ON p.id = gr.player_id
      WHERE gr.is_valid = true
      GROUP BY p.id, p.display_name, p.lemon_xp
      HAVING COALESCE(SUM(FLOOR(gr.distance / ${divisor})) FILTER (
        WHERE gr.died_at >= ${since}
      ), 0) > 0
    `;

    const byId = new Map(
      rows.map((row) => [
        row.player_id,
        {
          playerId: row.player_id,
          displayName: row.display_name,
          xpGained3m: row.xp_gained_3m,
          totalXp: row.total_xp,
        },
      ]),
    );

    if (!byId.has(player.id)) {
      const me = await prisma.player.findUnique({
        where: { id: player.id },
        select: { id: true, displayName: true, lemonXp: true },
      });
      if (me) {
        byId.set(me.id, {
          playerId: me.id,
          displayName: me.displayName,
          xpGained3m: 0,
          totalXp: me.lemonXp,
        });
      }
    }

    const ranked = buildTopLemonsLeaderboard([...byId.values()], player.id);
    const payload = formatTopLemonsApiPayload(ranked);

    json(res, payload);
  },
});
