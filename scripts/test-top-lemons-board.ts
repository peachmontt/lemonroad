import {
  buildTopLemonsLeaderboard,
  formatTopLemonsApiPayload,
  TOP_LEMONS_LEADERBOARD_SIZE,
} from '../api/_lib/top-lemons-board';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const npcOnly = buildTopLemonsLeaderboard([], 'user-1');
assert(npcOnly.length === 20, 'expected 20 NPC rows');
assert(npcOnly[0]!.username === 'LemonKing', 'top slot is LemonKing');
assert(npcOnly[0]!.isNpc === true, 'LemonKing is NPC');
assert(npcOnly[0]!.xpGainedLastThreeMonths === 12400, 'top XP');
assert(npcOnly[0]!.equippedKind === 'default', 'NPCs use default lemon visual');

const payloadNpc = formatTopLemonsApiPayload(npcOnly);
assert(payloadNpc.length === 20, 'API returns all 20 NPCs when fewer than 100 rows');
assert(payloadNpc.every((e) => e.isNpc), 'all NPC payload rows');

const meId = 'real-user';
const ranked = buildTopLemonsLeaderboard(
  [{
    playerId: meId,
    displayName: 'MyNick',
    xpGained3m: 4000,
    totalXp: 261,
    selectedBadge: 'daily_squeezer',
    selectedSkin: 'golden',
  }],
  meId,
);
const me = ranked.find((e) => e.isCurrentUser);
assert(me != null, 'current user in ladder');
assert(me!.rank === 10, `4000 XP should be #10, got #${me!.rank}`);
assert(me!.isNpc === false, 'real user is not NPC');
assert(me!.equippedKind === 'badge', 'badge beats skin for display');
assert(me!.equippedEmoji === '🔥', 'equipped badge emoji');
assert(
  ranked[9]!.username === 'MyNick',
  'real user displaces MemeSqueezer at #10',
);

const payloadWithMe = formatTopLemonsApiPayload(ranked);
assert(
  payloadWithMe.some((e) => e.isCurrentUser && e.rank === 10),
  'user in main payload without footer row',
);

const lowXp = buildTopLemonsLeaderboard(
  [{ playerId: meId, displayName: 'MyNick', xpGained3m: 850, totalXp: 261 }],
  meId,
);
const low = lowXp.find((e) => e.isCurrentUser);
assert(low!.rank === 21, `850 XP should be #21 (after 20 NPCs), got #${low!.rank}`);
const payloadLow = formatTopLemonsApiPayload(lowXp);
assert(payloadLow.length === 21, '20 NPCs + 1 real in payload when under 100');
assert(payloadLow[20]!.isCurrentUser, 'real user visible in list');

const manyReal = [
  ...Array.from({ length: 90 }, (_, i) => ({
    playerId: `p-${i}`,
    displayName: `Player${i}`,
    xpGained3m: 5000 - i * 50,
    totalXp: 1000,
  })),
  { playerId: 'p-low', displayName: 'LowUser', xpGained3m: 10, totalXp: 5 },
];
const big = buildTopLemonsLeaderboard(manyReal, 'p-low');
assert(big.length === 111, '90 real + 1 low + 20 NPC');
const lowRank = big.find((e) => e.isCurrentUser)!.rank;
assert(lowRank > TOP_LEMONS_LEADERBOARD_SIZE, `low user rank ${lowRank} should exceed 100`);
const payloadBig = formatTopLemonsApiPayload(big);
assert(payloadBig.length === TOP_LEMONS_LEADERBOARD_SIZE + 1, 'top 100 + current when outside');
assert(payloadBig[TOP_LEMONS_LEADERBOARD_SIZE]!.isCurrentUser, 'pinned user when rank > 100');

const zeroReal = buildTopLemonsLeaderboard(
  [
    { playerId: 'a', displayName: 'ZeroA', xpGained3m: 0, totalXp: 50 },
    { playerId: 'b', displayName: 'ZeroB', xpGained3m: 0, totalXp: 10 },
  ],
  'a',
);
assert(zeroReal.filter((e) => !e.isNpc).length === 2, 'real users with 0 XP still listed');
assert(zeroReal[20]!.username === 'ZeroA', 'zeros rank after NPCs');

console.log('top-lemons-board: all checks passed');
