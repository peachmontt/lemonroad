import {
  buildTopLemonsLeaderboard,
  formatTopLemonsApiPayload,
} from '../api/_lib/top-lemons-board';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const npcOnly = buildTopLemonsLeaderboard([], 'user-1');
assert(npcOnly.length === 20, 'expected 20 NPC rows');
assert(npcOnly[0]!.username === 'LemonKing', 'top slot is LemonKing');
assert(npcOnly[0]!.xpGainedLastThreeMonths === 12400, 'top XP');

const payloadNpc = formatTopLemonsApiPayload(npcOnly);
assert(payloadNpc.length === 10, 'API top 10 from NPCs only');
assert(payloadNpc.every((e) => e.rank <= 10), 'payload ranks 1-10');

const meId = 'real-user';
const ranked = buildTopLemonsLeaderboard(
  [{ playerId: meId, displayName: 'MyNick', xpGained3m: 4000, totalXp: 261 }],
  meId,
);
const me = ranked.find((e) => e.isCurrentUser);
assert(me != null, 'current user in ladder');
assert(me!.rank === 10, `4000 XP should be #10, got #${me!.rank}`);
assert(
  ranked[9]!.username === 'MyNick',
  'real user displaces MemeSqueezer at #10',
);

const payloadWithMe = formatTopLemonsApiPayload(ranked);
assert(
  payloadWithMe.some((e) => e.isCurrentUser && e.rank === 10),
  'user in top 10 payload without footer row',
);

const lowXp = buildTopLemonsLeaderboard(
  [{ playerId: meId, displayName: 'MyNick', xpGained3m: 850, totalXp: 261 }],
  meId,
);
const low = lowXp.find((e) => e.isCurrentUser);
assert(low!.rank === 21, `850 XP should be #21 (after 20 NPCs), got #${low!.rank}`);
const payloadLow = formatTopLemonsApiPayload(lowXp);
assert(payloadLow.length === 11, 'top 10 + current user row');
assert(payloadLow[10]!.isCurrentUser, 'last row is current user');

console.log('top-lemons-board: all checks passed');
