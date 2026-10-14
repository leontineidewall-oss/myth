# myth

Pick a god. It runs the fees.

85% of $MYTH creator fees fill the public temple wallet. Holders vote on chain for a god; every 6 hours (00:00, 06:00, 12:00, 18:00 UTC) the leading god takes the whole temple:

| god | the temple's sol |
|---|---|
| zeus | buys $MYTH and burns it |
| poseidon | splits across every $50+ holder, by holding |
| hades | goes to one $50+ holder, picked by sha256(round id + the round's vote signatures) |
| hermes | splits equally across the round's counted voters |

No counted votes: the temple rolls over.

## Voting

A vote is a normal Solana transaction the voter signs: 1 lamport to the temple wallet plus the memo myth:<god>. The site builds it by hand (no libraries) and the wallet signs it (wallet standard: Phantom, Solflare, Backpack). Anyone can do the same from any wallet that writes memos.

Counting (api/_tally.js): every successful temple transaction in the round with a myth: memo; the signer is the voter; a wallet's last vote in the round counts; weight = $MYTH the wallet holds; wallets under $50 are listed but not counted.

## Environment variables (Vercel)

| name | effect |
|---|---|
| MYTH_MINT | The $MYTH contract address. |
| TEMPLE_WALLET | The public temple wallet that receives 85% of creator fees. |
| RPC_URL | Your own Solana RPC (e.g. Helius). Needed for /api/plan (holder lists); the public endpoint rate-limits. |

Before these are set every live number shows "—" and voting is closed.

## Routes

- /api/config: public settings. /api/market?mint=: DexScreener price.
- /api/votes: this round's and last round's tally (?w=<wallet> adds that wallet's ballot).
- /api/plan: the payout plan for the round that just closed: the god, the pot (temple balance minus 0.01 sol for fees) and every recipient with its amount. The keeper pays it from the temple wallet; anyone can recompute it.
- /api/rpc: read-only RPC proxy, plus sendTransaction for wallets that only sign.
- /api/og: the share image, drawn by the same pixel engine as the page (eng.js).
