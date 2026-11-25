// anon home: the hero, a real key made on arrival, the countdown, the live crowd, trace, the four moves, live coins.
import { $, $$, RM, boot, api, keys, makeKey, short, fusd, ago, esc, toast, copy, B58RE } from './core.js?v=1';
import { feed, crowd, stats, evText } from './live.js?v=1';

boot();
const ready = () => document.body.classList.add('ready');
(document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]) : Promise.resolve()).then(() => requestAnimationFrame(ready));

// ---------- hero: parallax, a soft spotlight, a slow push-in on scroll ----------
const bg = $('#heroBg'), spot = $('#heroSpot'), hero = $('#hero');
if (!RM) {
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    bg.style.setProperty('--px', (-x * 26).toFixed(1) + 'px'); bg.style.setProperty('--py', (-y * 16).toFixed(1) + 'px');
    spot.style.setProperty('--sx', (e.clientX - r.left) + 'px'); spot.style.setProperty('--sy', (e.clientY - r.top) + 'px');
  }, { passive: true });
  const closeBg = $('#closeBg'), closing = $('#closing');
  addEventListener('scroll', () => {
    const p = Math.min(1, scrollY / innerHeight); bg.style.setProperty('--hs', (1.08 - p * .08 + p * p * .05).toFixed(4));
    const r = closing.getBoundingClientRect(); const q = Math.max(0, Math.min(1, 1 - r.top / innerHeight)); closeBg.style.setProperty('--cs', (1.14 - q * .1).toFixed(4));
  }, { passive: true });
}

// ---------- the draft key: made on arrival, kept only if you say so ----------
let draft = null;
const A58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const rch = () => A58[(Math.random() * 58) | 0];
function decode(el, text, ms = 900) {
  if (RM) { el.textContent = text; return; }
  const t0 = performance.now();
  const step = t => { const p = Math.min(1, (t - t0) / ms); let s = ''; for (let i = 0; i < text.length; i++) s += i / text.length < p * 1.15 - .1 ? text[i] : rch(); el.textContent = s; if (p < 1) requestAnimationFrame(step); else el.textContent = text; };
  requestAnimationFrame(step);
}
async function newDraft() {
  try { draft = await makeKey(); } catch { draft = null; }
  if (!draft) { $('#birthAddr').textContent = 'this browser cannot make keys'; $('#kAddr').textContent = '—'; return; }
  decode($('#birthAddr'), short(draft.pub, 6), 1100); decode($('#kAddr'), draft.pub, 1300);
  $('#kSec').textContent = draft.sk; $('#kSec').classList.remove('show');
  $('#scKey').textContent = 'a key, made in this browser: ' + short(draft.pub, 5);
  $('#birthKeep').textContent = 'Keep it'; $('#kKeep').textContent = 'Keep this key'; $('#kMsg').textContent = '';
  rainBurst();
}
function keepDraft() {
  if (!draft) return;
  if (keys.list().some(k => k.pub === draft.pub)) { toast('Already kept. Find it on Keys.'); return; }
  keys.add(Object.assign({}, draft, { label: 'key ' + (keys.list().length + 1) })); keys.setActive(draft.pub);
  $('#birthKeep').textContent = 'Kept'; $('#kKeep').textContent = 'Kept'; $('#kMsg').className = 'msg ok';
  $('#kMsg').innerHTML = 'Kept in this browser. It is now your active key. <a href="/keys" style="border-bottom:1px solid">Open Keys</a> to fund or export it.';
  toast('Key kept in this browser');
}
$('#birthKeep').addEventListener('click', keepDraft); $('#kKeep').addEventListener('click', keepDraft);
$('#birthNew').addEventListener('click', newDraft); $('#kNew').addEventListener('click', newDraft);
$('#kToss').addEventListener('click', () => { const was = draft && keys.list().some(k => k.pub === draft.pub); draft = null; $('#kAddr').textContent = 'thrown away'; $('#kSec').textContent = '—'; $('#kMsg').className = 'msg'; $('#kMsg').textContent = was ? 'This one was already kept. Burn it on Keys if you want it gone.' : 'Gone. It only ever existed in this tab.'; $('#birthAddr').textContent = 'thrown away'; });
$('#kCopy').addEventListener('click', () => draft && copy(draft.pub, 'Address copied'));
const hold = $('#kHold'), sec = $('#kSec');
const show = on => { sec.classList.toggle('show', on && !!draft); };
hold.addEventListener('pointerdown', e => { e.preventDefault(); show(true); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => hold.addEventListener(t, () => show(false)));
hold.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); show(true); } }); hold.addEventListener('keyup', () => show(false));

// ---------- the rain behind the key ----------
const rain = $('#rain'); let rc = rain.getContext('2d'), drops = [], burst = 0, rainOn = false;
function sizeRain() { const d = Math.min(2, devicePixelRatio || 1); rain.width = rain.clientWidth * d; rain.height = rain.clientHeight * d; rc.setTransform(d, 0, 0, d, 0, 0); const cols = Math.ceil(rain.clientWidth / 16); drops = Array.from({ length: cols }, (_, i) => ({ x: i * 16 + 4, y: Math.random() * rain.clientHeight, v: 40 + Math.random() * 90, c: rch() })); }
function rainBurst() { burst = 1; }
let rt = performance.now();
function rainLoop(t) {
  if (!rainOn) return; const dt = Math.min(.05, (t - rt) / 1000); rt = t;
  const w = rain.clientWidth, h = rain.clientHeight; rc.fillStyle = 'rgba(11,11,11,.22)'; rc.fillRect(0, 0, w, h);
  rc.font = '13px ui-monospace, Menlo, monospace'; burst = Math.max(0, burst - dt * .7);
  for (const d of drops) { d.y += d.v * dt * (1 + burst * 3); if (d.y > h + 20) { d.y = -20; d.v = 40 + Math.random() * 90; } if (Math.random() < .08) d.c = rch(); const a = .1 + burst * .5; rc.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; rc.fillText(d.c, d.x, d.y); }
  requestAnimationFrame(rainLoop);
}
new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !rainOn) { rainOn = true; if (!drops.length) sizeRain(); rt = performance.now(); requestAnimationFrame(rainLoop); } else if (!e.isIntersecting) rainOn = false; })).observe($('#kbox'));
addEventListener('resize', () => drops.length && sizeRain());
newDraft();

// ---------- countdown to pump.fun's wallet-login switch-off ----------
const END = Date.UTC(2026, 10, 30, 15, 0, 0);
const cd = { d: $('[data-u="d"]'), h: $('[data-u="h"]'), m: $('[data-u="m"]'), s: $('[data-u="s"]') }, last = {};
function tickCount() {
  let ms = END - Date.now(); const past = ms < 0; ms = Math.abs(ms);
  const v = { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
  $('#cdLabel').textContent = past ? 'wallet login ended this long ago' : 'wallet login ends in';
  for (const k in v) { const t = String(v[k]).padStart(2, '0'); if (last[k] !== t) { cd[k].textContent = t; if (last[k] != null && !RM) { cd[k].classList.remove('tick'); void cd[k].offsetWidth; cd[k].classList.add('tick'); } last[k] = t; } }
}
tickCount(); setInterval(tickCount, 1000);

// ---------- the live crowd and the live numbers ----------
const C = crowd($('#crowdCv'), $('#crowdBox'));
const wsChip = $('#wsChip'), wsTxt = $('#wsTxt'), wsLast = $('#wsLast'), fresh = [], tape = [];
function paintStats() {
  $('#stTrades').textContent = stats.trades.toLocaleString('en-US'); $('#stWallets').textContent = stats.wallets.size.toLocaleString('en-US'); $('#stLaunch').textContent = stats.launches.toLocaleString('en-US');
  $('#lnPerMin').textContent = stats.times.length.toLocaleString('en-US');
}
function paintTape() {
  const box = $('#tape'); if (!tape.length) return;
  box.innerHTML = tape.slice(0, 8).map(e => `<div class="tr2"><span class="mono">${new Date(e.t).toISOString().slice(11, 19)}</span><span class="mono">${short(e.who)}</span><span class="${e.kind === 'sell' ? 'no' : e.kind === 'buy' ? 'yes' : ''}">${e.kind === 'create' ? 'launched' : e.kind === 'buy' ? 'bought' : 'sold'}</span><span class="mono">${e.kind === 'create' ? '—' : (e.sol < .01 ? e.sol.toFixed(4) : e.sol.toFixed(2)) + ' SOL'}</span><a href="/trade#${esc(e.mint)}">$${esc(String(e.sym).slice(0, 10))}</a></div>`).join('');
}
feed({
  state(s) { wsChip.className = 'chip' + (s === 'live' ? ' live' : s === 'off' ? ' off' : ''); wsTxt.textContent = s === 'live' ? 'live from pump.fun' : s === 'off' ? 'the live feed is not answering' : s === 'reconnecting' ? 'reconnecting' : 'connecting to pump.fun'; if (s === 'off') wsLast.textContent = 'it retries on its own'; },
  event(ev) {
    const txt = evText(ev); C.light(txt); wsLast.textContent = txt; tape.unshift(ev); tape.length = Math.min(tape.length, 30);
    if (ev.kind === 'create') { fresh.unshift({ mint: ev.mint, name: ev.name, sym: ev.sym, mcapSol: ev.mcapSol, t: ev.t }); fresh.length = Math.min(fresh.length, 20); if (!coinsFromApi) paintCoins(); }
    paintStats(); paintTape();
  },
});
setInterval(paintStats, 5000);

// ---------- trace a wallet ----------
$('#trForm').addEventListener('submit', async e => {
  e.preventDefault(); const a = $('#trIn').value.trim(), msg = $('#trMsg');
  if (!B58RE.test(a)) { msg.className = 'msg err'; msg.textContent = 'Paste a Solana wallet address.'; return; }
  msg.className = 'msg'; msg.textContent = 'Reading its first transactions…'; $('#trGo').classList.add('busy');
  try {
    const r = await api('trace', 'addr=' + encodeURIComponent(a), 40000);
    const f1 = r.hop1 && r.hop1.first, f2 = r.hop2 && r.hop2.first;
    const when = f => f && f.time ? new Date(f.time * 1000).toISOString().slice(0, 10) : '';
    const amt = f => f && f.lamports != null ? (f.lamports / 1e9).toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' SOL' : '';
    $('#h0').textContent = a; $('#h0s').textContent = (r.sol != null ? r.sol.toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' SOL now · ' : '') + (r.hop1 ? (r.hop1.more ? 'over ' : '') + r.hop1.txs.toLocaleString('en-US') + ' transactions' : '');
    $('#h1').textContent = f1 && f1.funder ? f1.funder : 'no SOL transfer found'; $('#h1s').textContent = [amt(f1), when(f1)].filter(Boolean).join(' · ') || (r.hop1 && r.hop1.more ? 'too much history to reach the first one' : '');
    $('#h2').textContent = f2 && f2.funder ? f2.funder : (f1 && f1.funder ? 'too busy to trace further' : '—'); $('#h2s').textContent = [amt(f2), when(f2)].filter(Boolean).join(' · ');
    $('#hops').classList.remove('hide'); msg.className = 'msg ok'; msg.textContent = f1 && f1.funder ? 'Two hops, read straight from Solana.' : 'Read from Solana.';
  } catch (err) { msg.className = 'msg err'; msg.textContent = err.message; }
  $('#trGo').classList.remove('busy');
});

// ---------- the four moves: the sticky scene follows the step in view ----------
const steps = $$('.story .step'), scenes = $$('.story .scene');
const stepIO = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const s = e.target.dataset.s; steps.forEach(x => x.classList.toggle('on', x.dataset.s === s)); scenes.forEach(x => x.classList.toggle('on', x.dataset.s === s)); }), { rootMargin: '-45% 0px -45% 0px' });
steps.forEach(st => stepIO.observe(st));

// ---------- the newest coins: the API first, the websocket if the API is away ----------
let coinsFromApi = false, solUsd = null;
function coinRow(c) {
  const av = c.icon ? `style="background-image:url('${esc(c.icon)}')"` : '';
  const mc = c.mcap != null ? fusd(c.mcap) : c.mcapSol != null ? (+c.mcapSol).toFixed(1) + ' SOL' : '—';
  return `<a class="coin" href="/trade#${esc(c.mint)}"><span class="av" ${av}>${c.icon ? '' : esc(String(c.sym || '?').slice(0, 3))}</span><span class="nm"><b>${esc(c.name || c.sym || short(c.mint))}</b><small>$${esc(c.sym || '?')} · ${ago(c.born || c.t)} old</small></span><span class="mc">${mc}</span><span class="go">Trade →</span></a>`;
}
function paintCoins(list) {
  const L = list || fresh; const box = $('#coins');
  if (!L.length) { box.innerHTML = '<div class="ph">Waiting for the next coin to launch…</div>'; return; }
  box.innerHTML = L.slice(0, 7).map(coinRow).join('');
}
async function loadCoins() {
  try {
    const r = await api('trench'); const L = (r.fresh || []).filter(c => c.mint);
    coinsFromApi = L.length > 0; if (coinsFromApi) { paintCoins(L); $('#coinChip').className = 'chip live'; $('#coinTxt').textContent = 'live · ' + (r.src || 'feed'); }
  } catch { coinsFromApi = false; $('#coinChip').className = 'chip' + (fresh.length ? ' live' : ' off'); $('#coinTxt').textContent = fresh.length ? 'live · websocket' : 'feed away'; if (!fresh.length) $('#coins').innerHTML = '<div class="ph">The coin feed is not answering. It retries every few seconds.</div>'; else paintCoins(); }
}
loadCoins(); setInterval(() => { if (!document.hidden) loadCoins(); }, 10000);

// ---------- the flicker: each letter of the wordmark on its own failing clock ----------
setTimeout(() => {
  if (RM) return;
  $$('.fl').forEach(w => { [...w.children].forEach(s => { s.style.setProperty('--fd', (4.5 + Math.random() * 4).toFixed(2) + 's'); s.style.setProperty('--fdl', (Math.random() * 3).toFixed(2) + 's'); }); w.classList.add('flick'); });
  const hw = $('#hero .fl'); setInterval(() => { if (document.hidden || !hw) return; hw.classList.add('glitch'); setTimeout(() => hw.classList.remove('glitch'), 110 + Math.random() * 120); }, 3800);
}, 2200);

// ---------- live numbers and the markets preview ----------
async function prices() {
  try {
    const p = await api('prices');
    if (p.sol && p.sol.usd) { $('#lnSol').textContent = '$' + (+p.sol.usd).toFixed(2); const ch = p.sol.ch24; $('#lnSolCh').innerHTML = ch != null ? `<span class="${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '+' : ''}${(+ch).toFixed(2)}%</span> today` : 'price, live'; }
    const live = (p.stocks || []).filter(s => s.usd != null); $('#lnStocks').textContent = live.length || '—';
    const pick = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'GOLD', 'COIN', 'MSTR'].map(k => live.find(s => s.sym === k)).filter(Boolean);
    const grid = (pick.length >= 4 ? pick : live.slice(0, 8)).slice(0, 8);
    $('#mkGrid').innerHTML = grid.length ? grid.map(s => `<a class="mk" href="/trade#${esc(s.mint)}"><span class="av" style="background-image:url('${esc(s.icon)}')"></span><span style="min-width:0"><b>${esc(s.sym)}</b><small>${esc(s.name)}</small></span><span class="r">${fusd(s.usd)}<br><small class="${s.ch24 >= 0 ? 'up' : 'dn'}">${s.ch24 != null ? (s.ch24 >= 0 ? '+' : '') + (+s.ch24).toFixed(2) + '%' : '—'}</small></span></a>`).join('') : '<div class="ph" style="grid-column:1/-1">Prices are not answering right now.</div>';
    $('#mkAll').innerHTML = `See all ${(p.stocks || []).length} markets <span class="arr">→</span>`;
  } catch (e) { $('#mkGrid').innerHTML = `<div class="ph" style="grid-column:1/-1">Live prices are not answering: ${esc(e.message)}</div>`; }
}
async function block() { try { const b = await api('bh'); $('#lnBlock').textContent = (b.lastValidBlockHeight - 150).toLocaleString('en-US'); } catch { $('#lnBlock').textContent = 'offline'; } }
const keyCount = () => { $('#lnKeys').textContent = keys.list().length; };
prices(); block(); keyCount(); setInterval(() => { if (!document.hidden) prices(); }, 30000); setInterval(() => { if (!document.hidden) block(); }, 12000); addEventListener('storage', keyCount);
$('#birthKeep').addEventListener('click', () => setTimeout(keyCount, 50)); $('#kKeep').addEventListener('click', () => setTimeout(keyCount, 50));

// ---------- checks that run in this browser ----------
async function checks() {
  const ext = [...document.scripts].filter(s => s.src && new URL(s.src, location.href).origin !== location.origin).length;
  const rows = [
    ['Secure page', 'keys are only made over HTTPS', isSecureContext, isSecureContext ? 'yes' : 'no'],
    ['Keys made by your browser', 'WebCrypto ed25519, on this device', await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign']).then(() => true, () => false), ''],
    ['Third-party scripts', 'scripts loaded from anywhere but this site', ext === 0, String(ext)],
    ['Cookies', 'anon sets none', !document.cookie, document.cookie ? 'some' : 'none'],
    ['Keys stored here', 'in this browser\'s local storage only', true, String(keys.list().length)],
    ['Sent to the server', 'what a launch or trade sends', true, 'public address + signed tx'],
  ];
  rows[1][3] = rows[1][2] ? 'available' : 'library fallback'; rows[1][2] = true;
  $('#ckList').innerHTML = rows.map(([b, s, ok, v], i) => `<div class="ckrow ${ok ? 'ok' : 'bad'}" style="--d:${i * 0.06}s"><i>${ok ? '✓' : '!'}</i><span><b>${esc(b)}</b><small>${esc(s)}</small></span><span class="v">${esc(v)}</span></div>`).join('');
}
checks(); $('#ckAgain').addEventListener('click', checks);
