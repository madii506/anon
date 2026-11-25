// The live pump.fun feed (PumpPortal's public websocket, opened from this browser) and the crowd that shows it.
import { $, RM, short } from './core.js?v=1';

// ---------- the feed: one socket, many listeners ----------
const L = new Set(); let ws = null, opened = false, backoff = 2000, state = 'connecting';
const syms = new Map(), subs = [];
export const stats = { trades: 0, launches: 0, wallets: new Map(), t0: Date.now(), times: [] };
function setState(s) { state = s; L.forEach(f => f.state && f.state(s)); }
export function feed(h) { L.add(h); h.state && h.state(state); if (!ws) connect(); return () => L.delete(h); }
export const symOf = m => syms.get(m) || '?';
function connect() {
  try { ws = new WebSocket('wss://pumpportal.fun/api/data'); } catch { return setState('off'); }
  const guard = setTimeout(() => { if (!opened) setState('off'); }, 9000);
  ws.onopen = () => { opened = true; clearTimeout(guard); backoff = 2000; setState('live'); ws.send(JSON.stringify({ method: 'subscribeNewToken' })); };
  ws.onmessage = e => {
    let d; try { d = JSON.parse(e.data); } catch { return; } if (!d || !d.mint || !d.txType) return;
    const who = d.traderPublicKey; if (who) stats.wallets.set(who, (stats.wallets.get(who) || 0) + 1);
    const now = Date.now(); stats.times.push(now); while (stats.times.length && now - stats.times[0] > 60000) stats.times.shift();
    if (d.txType === 'create') {
      stats.launches++; syms.set(d.mint, d.symbol || '?');
      subs.push(d.mint); try { ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: [d.mint] })); } catch { }
      if (subs.length > 40) { const old = subs.shift(); try { ws.send(JSON.stringify({ method: 'unsubscribeTokenTrade', keys: [old] })); } catch { } }
      const ev = { kind: 'create', who, mint: d.mint, sym: d.symbol || '?', name: d.name || '', sol: +d.solAmount || 0, mcapSol: +d.marketCapSol || null, t: now };
      L.forEach(f => f.event && f.event(ev));
    } else if (d.txType === 'buy' || d.txType === 'sell') {
      stats.trades++;
      const ev = { kind: d.txType, who, mint: d.mint, sym: syms.get(d.mint) || '?', sol: +d.solAmount || 0, mcapSol: +d.marketCapSol || null, t: now };
      L.forEach(f => f.event && f.event(ev));
    }
  };
  ws.onclose = () => { if (opened) setState('reconnecting'); opened = false; ws = null; setTimeout(connect, backoff); backoff = Math.min(30000, backoff * 1.7); };
  ws.onerror = () => { };
}
export const evText = ev => ev.kind === 'create' ? `${short(ev.who)} launched $${String(ev.sym).slice(0, 10)}` : `${short(ev.who)} ${ev.kind === 'buy' ? 'bought' : 'sold'} ${ev.sol < .01 ? ev.sol.toFixed(4) : ev.sol.toFixed(2)} SOL of $${String(ev.sym).slice(0, 10)}`;

// ---------- the crowd: rows of faceless busts; an event lights one and pins its wallet ----------
export function crowd(cv, box, opts = {}) {
  const cx = cv.getContext('2d'), grey = new Image(), white = new Image();
  grey.src = '/assets/img/sprite-grey.webp'; white.src = '/assets/img/sprite-white.webp';
  let busts = [], you = null, labels = [], on = false, CW = 0, CH = 0, shades = null, ct = 0;
  const ROWS = opts.rows || 7;
  function makeShades(n) { shades = []; for (let i = 0; i < n; i++) { const k = .2 + .65 * (i / (n - 1)), c = document.createElement('canvas'); c.width = grey.naturalWidth; c.height = grey.naturalHeight; const g = c.getContext('2d'); g.drawImage(grey, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(0,0,0,${(1 - k).toFixed(3)})`; g.fillRect(0, 0, c.width, c.height); shades.push(c); } }
  function layout() {
    const d = Math.min(2, devicePixelRatio || 1); CW = cv.clientWidth; CH = cv.clientHeight; cv.width = CW * d; cv.height = CH * d; cx.setTransform(d, 0, 0, d, 0, 0);
    busts = []; const rows = CW < 640 ? Math.min(5, ROWS) : ROWS, base = Math.min(CH * .36, CW * .13);
    for (let r = 0; r < rows; r++) {
      const s = .34 + r * (.66 / rows), h = base * s, w = h * .875, y = CH * .3 + r * CH * (.62 / rows), gap = w * 1.02;
      const n = Math.ceil(CW / gap) + 2, off = (r & 1) * gap / 2 - gap;
      for (let i = 0; i < n; i++) { const x = off + i * gap + (Math.random() - .5) * gap * .12; if (opts.you !== false && r === rows - 1 && Math.abs(x - CW / 2) < gap * .7) continue; busts.push({ x, y, w, h, r, rows, lit: 0, t: 0, ph: Math.random() * 6.28 }); }
    }
    const h = base * 1.3, w = h * .875; you = opts.you === false ? null : { x: CW / 2, y: CH * .3 + (rows - 1) * CH * (.62 / rows) + h * .1, w, h };
  }
  function pill(x, y, text, a, strong) {
    cx.font = (strong ? '600 ' : '500 ') + '12px ui-monospace, Menlo, monospace'; const tw = cx.measureText(text).width, pw = tw + 18, ph = 24;
    const px = Math.max(6, Math.min(CW - pw - 6, x - pw / 2)), py = y - ph;
    cx.globalAlpha = a; cx.fillStyle = strong ? '#fff' : 'rgba(18,18,18,.92)'; cx.strokeStyle = 'rgba(255,255,255,.22)';
    cx.beginPath(); cx.roundRect ? cx.roundRect(px, py, pw, ph, 12) : cx.rect(px, py, pw, ph); cx.fill(); if (!strong) cx.stroke();
    cx.fillStyle = strong ? '#000' : '#fff'; cx.fillText(text, px + 9, py + 16); cx.globalAlpha = 1;
  }
  function loop(t) {
    if (!on) return; requestAnimationFrame(loop); if (t - ct < 33) return; ct = t;
    cx.clearRect(0, 0, CW, CH); const ready = grey.complete && white.complete && grey.naturalWidth;
    for (const b of busts) {
      const y = b.y + (RM ? 0 : Math.sin(t / 1400 + b.ph) * 1.5);
      if (b.lit > 0) { const age = (t - b.t) / 1000; b.lit = age < 2.2 ? 1 : Math.max(0, 1 - (age - 2.2) / 1.4); }
      if (ready) { if (!shades || shades.length !== b.rows) makeShades(b.rows); cx.globalAlpha = 1; cx.drawImage(shades[b.r], b.x - b.w / 2, y - b.h, b.w, b.h); if (b.lit > 0) { cx.globalAlpha = b.lit; cx.drawImage(white, b.x - b.w / 2, y - b.h, b.w, b.h); } }
    }
    cx.globalAlpha = 1;
    if (ready && you) cx.drawImage(white, you.x - you.w / 2, you.y - you.h + (RM ? 0 : Math.sin(t / 1600) * 1.2), you.w, you.h);
    const g = cx.createLinearGradient(0, CH * .55, 0, CH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.92)'); cx.fillStyle = g; cx.fillRect(0, CH * .55, CW, CH * .45);
    const g2 = cx.createLinearGradient(0, 0, 0, CH * .3); g2.addColorStop(0, 'rgba(0,0,0,.85)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = g2; cx.fillRect(0, 0, CW, CH * .3);
    labels = labels.filter(l => l.b.lit > 0);
    for (const l of labels) pill(l.b.x, l.b.y - l.b.h - 6, l.text, Math.min(1, l.b.lit * 1.4), false);
    if (you) pill(you.x, you.y - you.h - 8, 'you · no tag', 1, true);
  }
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { if (!busts.length) layout(); if (!on) { on = true; requestAnimationFrame(loop); } } else on = false; })).observe(box);
  addEventListener('resize', () => { if (busts.length) layout(); });
  return {
    light(text) {
      if (!busts.length) return; const pool = busts.filter(b => b.lit < .2 && b.r >= 1 && b.x > 40 && b.x < CW - 40); if (!pool.length) return;
      const b = pool[(Math.random() * pool.length) | 0]; b.lit = 1; b.t = performance.now(); labels.push({ b, text }); if (labels.length > (opts.max || 9)) labels.shift();
    },
  };
}
