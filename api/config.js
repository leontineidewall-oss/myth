// public settings the page needs: the $MYTH mint and the temple wallet (both set by the team in Vercel)
const { ADDR, send } = require("./_lib");
module.exports = function (req, res) {
  const mint = (process.env.MYTH_MINT || "").trim();
  const temple = (process.env.TEMPLE_WALLET || "").trim();
  send(res, 200, { mint: ADDR.test(mint) ? mint : null, temple: ADDR.test(temple) ? temple : null, customRpc: !!process.env.RPC_URL }, "public, s-maxage=60");
};
