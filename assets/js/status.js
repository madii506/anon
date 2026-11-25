// Status: every dependency, checked from this browser now.
import { $, boot, api, esc } from './core.js?v=1';
boot();
const SOL = 'So11111111111111111111111111111111111111112', USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const CHECKS = [
  ['api', 'anon API', 'The one function that builds transactions.', async () => { const r = await api('prices'); return r && r.sol && r.sol.usd ? 'SOL $' + (+r.sol.usd).toFixed(2) : 'answering'; }],
  ['rpc', 'Solana', 'A fresh blockhash through the relay.', async () => { const r = await api('bh'); return 'block ' + (r.lastValidBlockHeight - 150).toLocaleString('en-US'); }],
  ['jup', 'Jupiter', 'A real quote: 0.1 SOL to USDC.', async () => { const r = await api('quote', `in=${SOL}&out=${USDC}&amt=100000000&slip=100`); return (+r.outUi).toFixed(2) + ' USDC'; }],
  ['feed', 'pump.fun feed', 'The newest coins, through the API.', async () => { const r = await api('trench'); return (r.fresh || []).length + ' new coins · ' + (r.src || ''); }],
  ['near', 'NEAR Intents', 'A route quote: 1 SOL to USDC.', async () => { const r = await api('rquote', 'from=SOL&to=USDC&amt=1'); return (r.amountOutFormatted || '?') + ' USDC'; }],
  ['ws', 'Live trades', 'PumpPortal\'s websocket, opened from this browser.', () => new Promise((ok, no) => { let w; const t = setTimeout(() => { try { w.close(); } catch { } no(new Error('no answer in 8 s')); }, 8000); try { w = new WebSocket('wss://pumpportal.fun/api/data'); w.onopen = () => { clearTimeout(t); w.close(); ok('connected'); }; w.onerror = () => { clearTimeout(t); no(new Error('refused')); }; } catch (e) { clearTimeout(t); no(e); } })],
  ['crypto', 'Key making', 'Your browser can make ed25519 keys.', async () => { try { await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign']); return 'WebCrypto ed25519'; } catch { return 'falls back to the Solana library'; } }],
  ['store', 'Key storage', 'This browser lets the page keep keys.', async () => { localStorage.setItem('anon:probe', '1'); localStorage.removeItem('anon:probe'); return 'local storage works'; }],
  ['ctx', 'Secure page', 'Keys are only made on HTTPS.', async () => { if (!isSecureContext) throw new Error('not a secure page'); return 'secure'; }],
];
function card(k, name, desc) { return `<div class="ck" id="ck-${k}"><div class="t"><b>${esc(name)}</b><span class="chip"><span class="dot"></span><span>checking</span></span></div><p>${esc(desc)}</p><div class="v">—</div></div>`; }
async function run() {
  $('#grid').innerHTML = CHECKS.map(([k, n, d]) => card(k, n, d)).join(''); $('#sumChip').className = 'chip'; $('#sumTxt').textContent = 'checking';
  let ok = 0;
  await Promise.all(CHECKS.map(async ([k, , , fn]) => {
    const el = $('#ck-' + k), t0 = performance.now();
    try { const v = await fn(); ok++; el.querySelector('.chip').className = 'chip live'; el.querySelector('.chip span:last-child').textContent = Math.round(performance.now() - t0) + ' ms'; el.querySelector('.v').textContent = v; }
    catch (e) { el.querySelector('.chip').className = 'chip off'; el.querySelector('.chip span:last-child').textContent = 'down'; el.querySelector('.v').textContent = String(e.message || e).slice(0, 90); }
  }));
  $('#sumChip').className = 'chip ' + (ok === CHECKS.length ? 'live' : 'off'); $('#sumTxt').textContent = `${ok} of ${CHECKS.length} answering · ${new Date().toISOString().slice(11, 19)} UTC`;
}
$('#again').addEventListener('click', run); run();
