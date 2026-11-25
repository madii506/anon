// Trade: any token Jupiter can route, from the active browser key.
import { $, $$, boot, api, keys, onKeys, signB64, sendSigned, waitSig, short, fsol, fusd, ago, esc, toast, solscan, B58RE } from './core.js?v=2';
boot();
const SOL = 'So11111111111111111111111111111111111111112';
let tok = null, side = 'buy', slip = 300, held = null, feed = null, tab = 'fresh', lastQ = null, qTimer = 0;

// ---------- the token ----------
async function open(mint) {
  if (!B58RE.test(mint)) return; $('#tMint').value = mint; if (location.hash.slice(1) !== mint) history.replaceState(null, '', '#' + mint);
  $('#tTok').innerHTML = '<div class="ph">Reading the coin…</div>'; tok = { mint };
  try {
    const t = await api('token', 'mint=' + mint); tok = t;
    $('#tTok').innerHTML = `<div class="tokhead"><span class="av" style="${t.icon ? `background-image:url('${esc(t.icon)}')` : ''}"></span><div style="min-width:0"><b>${esc(t.name || 'Unnamed')} <span class="dim">$${esc(t.sym || '?')}</span></b><small class="copy" data-copy="${esc(mint)}" data-what="Token address copied">${short(mint, 8)}</small></div></div>
      <div class="mini"><div><span>Price</span><b>${t.usd != null ? fusd(t.usd) : '—'}</b></div><div><span>Market cap</span><b>${fusd(t.mcap)}</b></div><div><span>Liquidity</span><b>${fusd(t.liq)}</b></div><div><span>Holders</span><b>${t.holders != null ? t.holders.toLocaleString('en-US') : '—'}</b></div></div>
      <p class="note" style="margin-top:12px">${t.launchpad ? 'Launched on ' + esc(t.launchpad) + '. ' : ''}${t.born ? ago(t.born) + ' old. ' : ''}${t.bc != null && t.bc < 100 ? 'Bonding curve ' + Math.round(t.bc) + '% full. ' : ''}<a class="copy" href="https://solscan.io/token/${esc(mint)}" target="_blank" rel="noopener">Solscan</a> · <a class="copy" href="https://pump.fun/coin/${esc(mint)}" target="_blank" rel="noopener">pump.fun</a></p>`;
  } catch (e) { $('#tTok').innerHTML = `<div class="ph">${esc(e.message)}</div>`; tok = { mint, sym: short(mint, 4) }; }
  paintSide(); $$('#tList .li').forEach(x => x.classList.toggle('on', x.dataset.m === mint));
}
$('#tFind').addEventListener('submit', e => { e.preventDefault(); const v = $('#tMint').value.trim(); if (!B58RE.test(v)) return toast('Paste a token address'); open(v); });
addEventListener('hashchange', () => open(location.hash.slice(1)));

// ---------- side, amount, quick picks ----------
function holding() { return held && tok ? (held.tokens || []).find(t => t.mint === tok.mint) : null; }
function paintSide() {
  $$('#tSide button').forEach(b => b.classList.toggle('on', b.dataset.s === side));
  const h = holding();
  $('#tAmtLbl').textContent = side === 'buy' ? 'Spend' : 'Sell'; $('#tUnit').textContent = side === 'buy' ? 'SOL' : (tok && tok.sym ? '$' + tok.sym : 'tokens');
  $('#tQuick').innerHTML = side === 'buy' ? ['0.05', '0.1', '0.25', '0.5', '1'].map(v => `<button class="btn btn-g btn-xs" type="button" data-v="${v}">${v} SOL</button>`).join('') : [25, 50, 100].map(p => `<button class="btn btn-g btn-xs" type="button" data-p="${p}" ${h ? '' : 'disabled'}>${p}%</button>`).join('');
  const go = $('#tGo'); go.disabled = !tok || !keys.active(); go.textContent = !tok ? 'Pick a coin first' : !keys.active() ? 'Make a key first' : side === 'buy' ? 'Buy' : 'Sell';
  clearQuote(); schedule();
}
$('#tSide').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; side = b.dataset.s; $('#tAmt').value = ''; paintSide(); });
$('#tSlip').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; slip = +b.dataset.b; $$('#tSlip button').forEach(x => x.classList.toggle('on', x === b)); schedule(); });
$('#tQuick').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const h = holding(); if (b.dataset.v) $('#tAmt').value = b.dataset.v; else if (h) $('#tAmt').value = (h.amount * b.dataset.p / 100).toString(); schedule(); });
$('#tAmt').addEventListener('input', schedule);
function clearQuote() { lastQ = null; ['#qOut', '#qMin', '#qImp', '#qRoute'].forEach(s => $(s).textContent = '—'); }
function raw() {
  const v = parseFloat($('#tAmt').value); if (!(v > 0) || !tok) return null;
  if (side === 'buy') return { inM: SOL, outM: tok.mint, amt: Math.round(v * 1e9) };
  const h = holding(); if (!h) return null; const dec = h.decimals != null ? h.decimals : 6;
  let a = BigInt(Math.floor(v * 10 ** Math.min(dec, 9))) * 10n ** BigInt(Math.max(0, dec - 9)); if (a > BigInt(h.raw)) a = BigInt(h.raw);
  return { inM: tok.mint, outM: SOL, amt: a.toString() };
}
function schedule() { clearTimeout(qTimer); qTimer = setTimeout(quote, 450); }
async function quote() {
  const r = raw(); if (!r) { clearQuote(); return null; }
  $('#qOut').textContent = 'quoting…';
  try {
    const q = await api('quote', `in=${r.inM}&out=${r.outM}&amt=${r.amt}&slip=${slip}`); lastQ = q;
    const unit = side === 'buy' ? (tok.sym ? ' $' + tok.sym : '') : ' SOL';
    $('#qOut').textContent = (+q.outUi).toLocaleString('en-US', { maximumFractionDigits: side === 'buy' ? 2 : 6 }) + unit;
    $('#qMin').textContent = (+q.minUi).toLocaleString('en-US', { maximumFractionDigits: side === 'buy' ? 2 : 6 }) + unit;
    $('#qImp').textContent = (q.impact * 100).toFixed(2) + '%'; $('#qRoute').textContent = (q.route || []).slice(0, 3).join(' → ') || 'Jupiter';
    return q;
  } catch (e) { clearQuote(); $('#qOut').textContent = e.message.slice(0, 60); return null; }
}

// ---------- the trade ----------
$('#tForm').addEventListener('submit', async e => {
  e.preventDefault(); const m = $('#tMsg'), a = keys.active(); const err = t => { m.className = 'msg err'; m.textContent = t; };
  if (!a) return err('Make a key first.'); if (!tok) return err('Pick a coin first.');
  if (side === 'buy' && held && held.sol != null && parseFloat($('#tAmt').value) > held.sol - 0.003) return err(`This key holds ${fsol(held.sol)}. Leave a little for fees.`);
  const go = $('#tGo'); go.classList.add('busy'); m.className = 'msg'; m.textContent = 'Getting a fresh quote…';
  try {
    const q = await quote(); if (!q) throw new Error('No quote for that amount.');
    m.textContent = 'Jupiter is building it for your key…'; const s = await api('swap', { user: a.pub, quote: q.quote });
    m.textContent = 'Signing in this page…'; const tx = await signB64(s.tx, [keys.secret(a)]);
    const sig = await sendSigned(tx); m.innerHTML = `Sent. Waiting for Solana… <a class="copy" href="${solscan(sig)}" target="_blank" rel="noopener">view</a>`;
    await waitSig(sig); m.className = 'msg ok'; m.innerHTML = `Done. <a class="copy" href="${solscan(sig)}" target="_blank" rel="noopener">See it on Solscan</a>`; toast(side === 'buy' ? 'Bought' : 'Sold');
    $('#tAmt').value = ''; clearQuote(); readKey();
  } catch (er) { err(er.message); }
  go.classList.remove('busy');
});

// ---------- the feed ----------
function paintFeed() {
  const L = feed ? (feed[tab] || []) : null, box = $('#tList');
  if (!L) return;
  box.innerHTML = L.length ? L.slice(0, 40).map(c => `<button class="li ${tok && tok.mint === c.mint ? 'on' : ''}" type="button" data-m="${esc(c.mint)}"><span class="av" style="${c.icon ? `background-image:url('${esc(c.icon)}')` : ''}"></span><span><b>${esc(c.name || c.sym)}</b><small>$${esc(c.sym || '?')} · ${ago(c.born)}</small></span><span class="r">${fusd(c.mcap)}</span></button>`).join('') : '<div class="ph">Nothing here right now.</div>';
}
$('#tList').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) open(b.dataset.m); });
$('#tTab').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; $$('#tTab button').forEach(x => x.classList.toggle('on', x === b)); paintFeed(); });
async function loadFeed() {
  try { feed = await api('trench'); $('#tFeed').textContent = 'Live from ' + (feed.src || 'the feed') + ', refreshed every 10 seconds.'; paintFeed(); }
  catch (e) { $('#tFeed').textContent = 'The coin feed is not answering: ' + e.message; if (!feed) $('#tList').innerHTML = '<div class="ph">It retries on its own. Paste an address to trade meanwhile.</div>'; }
}
loadFeed(); setInterval(() => { if (!document.hidden) loadFeed(); }, 10000);

// ---------- the key ----------
async function readKey() {
  const a = keys.active(); $('#tKey').textContent = a ? short(a.pub, 8) : 'no key yet';
  if (!a) { $('#tSol').textContent = '—'; $('#tHold').innerHTML = '<div class="ph"><a class="copy" href="/keys">Make a key</a> to trade.</div>'; held = null; paintSide(); return; }
  try { held = await api('wallet', 'addr=' + a.pub); $('#tSol').textContent = fsol(held.sol); $('#tHold').innerHTML = (held.tokens || []).length ? held.tokens.map(t => `<button class="li" type="button" data-m="${esc(t.mint)}"><span class="av" style="${t.icon ? `background-image:url('${esc(t.icon)}')` : ''}"></span><span><b>${esc(t.sym)}</b><small>${(+t.amount).toLocaleString('en-US', { maximumFractionDigits: 4 })}</small></span><span class="r">${fusd(t.value)}</span></button>`).join('') : '<div class="ph">Only SOL so far.</div>'; }
  catch (e) { held = null; $('#tSol').textContent = 'could not read'; $('#tHold').innerHTML = `<div class="ph">${esc(e.message)}</div>`; }
  paintSide();
}
$('#tHold').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { open(b.dataset.m); side = 'sell'; paintSide(); } });
onKeys(readKey); readKey();
if (B58RE.test(location.hash.slice(1))) open(location.hash.slice(1)); else paintSide();
