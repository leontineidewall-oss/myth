// the payout plan for the round that just closed: which god won and exactly where the temple's sol goes.
// read-only. the keeper runs it from the public temple wallet; anyone can recompute it.
const { ADDR, send } = require("./_lib");
const T = require("./_tally");
const KEEP = 10000000; // lamports (0.01 sol) left in the temple for network fees
const L = function (lam) { return { lamports: lam, sol: lam / 1e9 }; };

module.exports = async function (req, res) {
  const mint = (process.env.MYTH_MINT || "").trim(), temple = (process.env.TEMPLE_WALLET || "").trim();
  if (!ADDR.test(mint) || !ADDR.test(temple)) return send(res, 200, { live: false }, "public, s-maxage=60");
  try {
    const rpc = T.rpcFn();
    const t = await T.tally({ mint: mint, temple: temple, rpc: rpc });
    const bal = await rpc("getBalance", [temple]);
    const pot = Math.max(0, (bal.value || 0) - KEEP);
    const god = t.prev.leader;
    const out = { live: true, round: t.prevRound, god: god, potSol: pot / 1e9, potLamports: pot, keepSol: KEEP / 1e9, priceUsd: t.priceUsd, minTokens: t.minTokens, fetchedAt: new Date().toISOString() };
    if (!god) { out.action = "rollover"; out.note = "no counted votes last round: the temple rolls over"; }
    else if (god === "zeus") { out.action = "buyback-burn"; out.note = "buy $MYTH with the pot and burn it"; }
    else if (god === "hermes") {
      const v = t.prev.ballots.filter(function (b) { return b.counted; });
      out.action = "split-voters"; out.recipients = v.map(function (b) { return Object.assign({ wallet: b.wallet }, L(Math.floor(pot / v.length))); });
    } else {
      const all = await T.holders(rpc, mint, [temple]);
      const ok = all.filter(function (h) { return t.minTokens == null || h.tokens >= t.minTokens; });
      if (god === "poseidon") {
        const sum = ok.reduce(function (s, h) { return s + h.tokens; }, 0);
        out.action = "split-holders";
        out.recipients = ok.map(function (h) { return Object.assign({ wallet: h.wallet, tokens: h.tokens }, L(Math.floor(pot * h.tokens / sum))); }).filter(function (r) { return r.lamports > 0; });
      } else {
        const sigs = t.prev.ballots.map(function (b) { return b.sig; });
        const s = T.soul(t.prevRound.id, sigs, ok);
        out.action = "one-soul"; out.seed = s && s.seed; out.recipients = s ? [Object.assign({ wallet: s.pick.wallet, tokens: s.pick.tokens }, L(pot))] : [];
      }
      out.holders = ok.length;
    }
    send(res, 200, out, "public, s-maxage=30, stale-while-revalidate=60");
  } catch (e) {
    send(res, 502, { error: "plan unavailable" });
  }
};
