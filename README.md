# anon

Launch and trade in private by using our protocol. No wallet, no account, no key imports.

- `/` home: a key made in your browser on arrival, the Nov 30 countdown, the live pump.fun crowd, trace, live numbers, markets, browser checks.
- `/launch` launch a pump.fun coin from a browser key (pump.fun IPFS + PumpPortal create, signed in the page).
- `/trade` trade any token Jupiter routes, from the active key.
- `/markets` tokenized stocks and ETFs, priced live.
- `/watch` the live pump.fun tape, busiest wallets, new launches.
- `/keys` make, restore, export, send and burn keys. Keys live in localStorage only.
- `/routes` fund or cash out through NEAR Intents 1Click (SOL, USDC, ZEC).
- `/trace` first funder, second hop, latest activity of any wallet.
- `/privacy`, `/docs`, `/status`.

`api/m.js` is one Vercel function. It never receives a private key. Optional env: `RPC_URL`.
