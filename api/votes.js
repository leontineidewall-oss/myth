// the live tally for this round and the last one. ?w=<wallet> also returns that wallet's ballot this round.
const { ADDR, send } = require("./_lib");
const T = require("./_tally");

function pub(c) { return { gods: c.gods, voters: c.voters, leader: c.leader }; }

module.exports = async function (req, res) {
  const mint = (process.env.MYTH_MINT || "").trim(), temple = (process.env.TEMPLE_WALLET || "").trim();
  const w = String((req.query && req.query.w) || new URL(req.url, "http://x").searchParams.get("w") || "");
  if (w && !ADDR.test(w)) return send(res, 400, { error: "w: one address" });
  if (!ADDR.test(mint) || !ADDR.test(temple)) return send(res, 200, { live: false }, "public, s-maxage=60");
  try {
    const t = await T.tally({ mint: mint, temple: temple });
    const mine = w ? (t.current.ballots.find(function (b) { return b.wallet === w; }) || null) : undefined;
    send(res, 200, {
      live: true, round: t.round, current: pub(t.current), prev: Object.assign(pub(t.prev), { id: t.prevRound.id }),
      priceUsd: t.priceUsd, minTokens: t.minTokens, partial: t.partial, you: mine, fetchedAt: new Date().toISOString()
    }, w ? "no-store" : "public, s-maxage=20, stale-while-revalidate=40");
  } catch (e) {
    send(res, 502, { error: "tally unavailable" });
  }
};
