// the vote count, shared by /api/votes and /api/plan (files starting with _ are not routes on Vercel)
// a vote is any successful transaction that touches the temple wallet with the memo "myth:<god>".
// the signer (fee payer) is the voter; a wallet's last vote in a round counts; weight = $MYTH held now, $50+ only.
const crypto = require("crypto");
const { UA, getJson } = require("./_lib");
const { pick } = require("./market");

const GODS = ["zeus", "poseidon", "hades", "hermes"];
const ROUND = 6 * 3600 * 1000;
const MEMO = /myth:(zeus|poseidon|hades|hermes)\b/i;
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN22 = "TokenzQdBNbLqP5VEhdkAS6EPFLC8wzXAoBwgwekXg9";

function roundOf(ms) { const id = Math.floor(ms / ROUND); return { id: id, start: id * ROUND, end: (id + 1) * ROUND }; }

function rpcFn(url) {
  url = url || process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
  return async function (method, params) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params }) });
    const j = await r.json().catch(function () { return null; });
    if (!j || j.error) throw new Error(method + " " + (j && j.error ? j.error.message : r.status));
    return j.result;
  };
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  async function worker() { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch (e) { out[k] = null; } } }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

async function price(mint) {
  try { const m = pick(await getJson("https://api.dexscreener.com/tokens/v1/solana/" + mint), mint); return m && m.priceUsd ? m.priceUsd : null; }
  catch (e) { return null; }
}

async function held(rpc, owner, mint) {
  const r = await rpc("getTokenAccountsByOwner", [owner, { mint: mint }, { encoding: "jsonParsed" }]);
  let s = 0;
  for (const a of (r && r.value) || []) { const t = a.account.data.parsed.info.tokenAmount; s += Number(t.uiAmountString || t.uiAmount || 0); }
  return s;
}

// signatures for the temple back to the start of the previous round (at most 3 pages of 1000)
async function templeSigs(rpc, temple, since) {
  let out = [], before = null;
  for (let page = 0; page < 3; page++) {
    const opt = { limit: 1000 }; if (before) opt.before = before;
    const r = await rpc("getSignaturesForAddress", [temple, opt]);
    if (!r || !r.length) break;
    out = out.concat(r);
    const last = r[r.length - 1];
    if (r.length < 1000 || (last.blockTime && last.blockTime * 1000 < since)) break;
    before = last.signature;
  }
  return out;
}

function empty() { const g = {}; GODS.forEach(function (k) { g[k] = { wallets: 0, weight: 0 }; }); return { gods: g, voters: 0, leader: null, ballots: [] }; }

async function tally(o) {
  const rpc = o.rpc || rpcFn(), now = o.now || Date.now(), cur = roundOf(now), prev = roundOf(cur.start - 1);
  const sigs = await templeSigs(rpc, o.temple, prev.start);
  const votes = sigs.filter(function (s) { return !s.err && s.memo && MEMO.test(s.memo) && s.blockTime && s.blockTime * 1000 >= prev.start && s.blockTime * 1000 < cur.end; })
    .slice(0, o.cap || 200);
  const txs = await pool(votes, 8, function (v) { return rpc("getTransaction", [v.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]); });
  const last = { cur: new Map(), prev: new Map() };
  votes.forEach(function (v, i) {
    const tx = txs[i]; if (!tx || !tx.transaction) return;
    const keys = tx.transaction.message.accountKeys || [];
    const signer = keys.find(function (k) { return k.signer; }); if (!signer) return;
    const who = signer.pubkey, god = MEMO.exec(v.memo)[1].toLowerCase(), t = v.blockTime * 1000;
    const bucket = t >= cur.start ? last.cur : last.prev;
    const was = bucket.get(who);
    if (!was || was.t < t) bucket.set(who, { god: god, t: t, sig: v.signature });
  });
  const p = o.priceUsd !== undefined ? o.priceUsd : await price(o.mint);
  const minTokens = p ? 50 / p : null;
  const wallets = Array.from(new Set(Array.from(last.cur.keys()).concat(Array.from(last.prev.keys())))).slice(0, 300);
  const amounts = await pool(wallets, 8, function (w) { return held(rpc, w, o.mint); });
  const hold = new Map(); wallets.forEach(function (w, i) { hold.set(w, amounts[i]); });
  function count(bucket) {
    const out = empty();
    bucket.forEach(function (b, who) {
      const amt = hold.get(who);
      const ok = amt != null && amt > 0 && (minTokens == null || amt >= minTokens);
      out.ballots.push({ wallet: who, god: b.god, tokens: amt, counted: ok, sig: b.sig });
      if (!ok) return;
      out.gods[b.god].wallets++; out.gods[b.god].weight += amt; out.voters++;
    });
    let best = null;
    GODS.forEach(function (k) { if (out.gods[k].weight > 0 && (!best || out.gods[k].weight > out.gods[best].weight)) best = k; });
    out.leader = best;
    out.ballots.sort(function (a, b) { return (b.tokens || 0) - (a.tokens || 0); });
    return out;
  }
  return { round: cur, prevRound: prev, current: count(last.cur), prev: count(last.prev), priceUsd: p, minTokens: minTokens, partial: votes.length >= (o.cap || 200) };
}

// every wallet holding $MYTH (both token programs), owner wallets only (pools and program-owned accounts left out)
async function holders(rpc, mint, exclude) {
  const lists = await Promise.all([TOKEN, TOKEN22].map(function (prog) {
    return rpc("getProgramAccounts", [prog, { encoding: "jsonParsed", filters: [{ memcmp: { offset: 0, bytes: mint } }] }]).catch(function () { return []; });
  }));
  const by = new Map();
  lists.forEach(function (l) { (l || []).forEach(function (a) {
    const info = a.account.data.parsed.info, amt = Number(info.tokenAmount.uiAmountString || 0);
    if (amt > 0) by.set(info.owner, (by.get(info.owner) || 0) + amt);
  }); });
  const owners = Array.from(by.keys()).filter(function (w) { return exclude.indexOf(w) < 0; });
  const real = [];
  for (let i = 0; i < owners.length; i += 100) {
    const r = await rpc("getMultipleAccounts", [owners.slice(i, i + 100), { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
    (r.value || []).forEach(function (acc, j) { if (!acc || acc.owner === "11111111111111111111111111111111") real.push({ wallet: owners[i + j], tokens: by.get(owners[i + j]) }); });
  }
  return real.sort(function (a, b) { return b.tokens - a.tokens; });
}

// hades: one $50+ holder, picked by sha256(round id + the round's vote signatures, sorted) over holders sorted by address
function soul(roundId, sigs, candidates) {
  if (!candidates.length) return null;
  const h = crypto.createHash("sha256").update(String(roundId) + ":" + sigs.slice().sort().join(",")).digest();
  const n = h.readUIntBE(0, 6);
  const sorted = candidates.slice().sort(function (a, b) { return a.wallet < b.wallet ? -1 : a.wallet > b.wallet ? 1 : 0; });
  return { pick: sorted[n % sorted.length], seed: h.toString("hex") };
}

module.exports = { GODS, ROUND, MEMO, roundOf, rpcFn, tally, holders, soul, held, price };
