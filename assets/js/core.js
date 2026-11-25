// anon core: the header, motion helpers, the API, and the key store. Keys are made and kept in this browser only.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- formatting ----------
export const short = (a, n = 4) => (a && a.length > 2 * n + 1 ? a.slice(0, n) + '…' + a.slice(-n) : a || '—');
export const fsol = (n, d = 4) => (n == null || !isFinite(n) ? '—' : (+n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: n > 0 && n < 1 ? Math.min(d, 3) : 0 }) + ' SOL');
export const fusd = n => { if (n == null || !isFinite(n)) return '—'; const a = Math.abs(n); if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'; if (a >= 1e4) return '$' + (n / 1e3).toFixed(1) + 'K'; if (a >= 1) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 }); return '$' + n.toPrecision(3); };
export const ago = t => { if (!t) return '—'; const s = Math.max(0, (Date.now() - t) / 1000); if (s < 60) return Math.floor(s) + 's'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'; return Math.floor(s / 86400) + 'd'; };
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- base58 / base64 ----------
const A58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function b58(bytes) {
  let z = 0; while (z < bytes.length && bytes[z] === 0) z++;
  const d = [];
  for (let i = z; i < bytes.length; i++) { let c = bytes[i]; for (let j = 0; j < d.length; j++) { c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; } while (c) { d.push(c % 58); c = (c / 58) | 0; } }
  return '1'.repeat(z) + d.reverse().map(x => A58[x]).join('');
}
export function unb58(str) {
  let z = 0; while (z < str.length && str[z] === '1') z++;
  const b = [];
  for (let i = z; i < str.length; i++) { let c = A58.indexOf(str[i]); if (c < 0) throw new Error('not base58'); for (let j = 0; j < b.length; j++) { c += b[j] * 58; b[j] = c & 255; c >>= 8; } while (c) { b.push(c & 255); c >>= 8; } }
  return new Uint8Array([...new Array(z).fill(0), ...b.reverse()]);
}
export const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
export const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const B58RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// ---------- API ----------
export async function api(a, bodyOrQuery, ms = 25000) {
  const post = bodyOrQuery && typeof bodyOrQuery === 'object';
  const url = '/api/m?a=' + a + (!post && bodyOrQuery ? '&' + bodyOrQuery : '');
  const r = await fetch(url, post ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bodyOrQuery), signal: AbortSignal.timeout(ms) } : { signal: AbortSignal.timeout(ms) });
  let j = null; try { j = await r.json(); } catch { }
  if (!r.ok || !j) throw new Error((j && j.error) || (r.status === 404 ? 'the anon API is not reachable here' : 'the anon API answered ' + r.status));
  return j;
}

// ---------- web3 (loaded only when something is signed) ----------
let W3 = null;
export function web3() {
  if (window.solanaWeb3) return Promise.resolve(window.solanaWeb3);
  if (W3) return W3;
  W3 = new Promise((ok, no) => { const s = document.createElement('script'); s.src = '/assets/js/web3.min.js'; s.onload = () => ok(window.solanaWeb3); s.onerror = () => { W3 = null; no(new Error('could not load the signer')); }; document.head.appendChild(s); });
  return W3;
}

// ---------- the key store: this browser only ----------
const KS = 'anon:keys', KA = 'anon:active';
const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
export const keys = {
  list() { const l = read(KS); return Array.isArray(l) ? l.filter(k => k && B58RE.test(k.pub) && typeof k.sk === 'string') : []; },
  save(l) { const ok = write(KS, l); emit(); return ok; },
  active() { const l = this.list(), a = read(KA); return l.find(k => k.pub === a) || l[0] || null; },
  setActive(pub) { write(KA, pub); emit(); },
  add(k) { const l = this.list().filter(x => x.pub !== k.pub); l.unshift(k); this.save(l); if (!this.active() || l.length === 1) this.setActive(k.pub); return k; },
  remove(pub) { const l = this.list().filter(k => k.pub !== pub); this.save(l); if (read(KA) === pub) write(KA, l[0] ? l[0].pub : null); emit(); },
  rename(pub, label) { const l = this.list(); const k = l.find(x => x.pub === pub); if (k) { k.label = String(label || '').slice(0, 24); this.save(l); } },
  secret(k) { return unb58(k.sk); },
};
const subs = new Set(); export const onKeys = fn => (subs.add(fn), () => subs.delete(fn));
function emit() { subs.forEach(f => { try { f(); } catch { } }); paintChip(); }
addEventListener('storage', e => { if (e.key === KS || e.key === KA) emit(); });

// a new ed25519 key from this browser's own randomness (WebCrypto first, the Solana library as a fallback)
export async function makeKey() {
  try {
    const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const p8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey)), pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    if (p8.length < 32 || pub.length !== 32) throw new Error('shape');
    const sk = new Uint8Array(64); sk.set(p8.slice(-32)); sk.set(pub, 32);
    return { pub: b58(pub), sk: b58(sk), t: Date.now(), label: '' };
  } catch {
    const w = await web3(); const k = w.Keypair.generate();
    return { pub: k.publicKey.toBase58(), sk: b58(k.secretKey), t: Date.now(), label: '' };
  }
}
export function exportKey(k) {
  const blob = new Blob([JSON.stringify({ type: 'anon-key', pub: k.pub, secret: k.sk, secretBytes: Array.from(unb58(k.sk)), made: k.t || null, note: 'This file is the key. Anyone with it controls the funds. anon never had a copy.' }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'anon-key-' + k.pub.slice(0, 6) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// restore one of your own exported keys: an anon key file, a solana-keygen byte array, or a base58 secret
export async function restoreKey(text) {
  let sk = null; text = String(text || '').trim();
  try { const j = JSON.parse(text); if (Array.isArray(j)) sk = Uint8Array.from(j); else if (j && Array.isArray(j.secretBytes)) sk = Uint8Array.from(j.secretBytes); else if (j && j.secret) sk = unb58(j.secret); } catch { }
  if (!sk && /^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(text)) sk = unb58(text);
  if (!sk || sk.length !== 64) throw new Error('that is not a key file this page can read');
  const w = await web3(); const kp = w.Keypair.fromSecretKey(sk);
  return { pub: kp.publicKey.toBase58(), sk: b58(sk), t: Date.now(), label: 'restored' };
}

// ---------- signing and sending ----------
export async function sendSigned(tx) { const raw = toB64(tx.serialize()); const r = await api('send', { tx: raw }); return r.sig; }
export async function signB64(b64, secrets) {
  const w = await web3(); const tx = w.VersionedTransaction.deserialize(fromB64(b64));
  tx.sign(secrets.map(s => w.Keypair.fromSecretKey(s)));
  return tx;
}
export async function waitSig(sig, onTick, ms = 75000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const s = await api('status', 'sig=' + sig); onTick && onTick(s.status); if (s.status === 'failed') throw Object.assign(new Error('the transaction failed on-chain'), { chain: true }); if (s.status === 'confirmed' || s.status === 'finalized') return s; } catch (e) { if (e.chain) throw e; }
    await sleep(1800);
  }
  throw new Error('not confirmed yet, check it on Solscan');
}
export async function sendSol(k, to, lamports) {
  const w = await web3(); const kp = w.Keypair.fromSecretKey(keys.secret(k));
  const { blockhash } = await api('bh');
  const msg = new w.TransactionMessage({ payerKey: kp.publicKey, recentBlockhash: blockhash, instructions: [w.SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: new w.PublicKey(to), lamports: BigInt(lamports) })] }).compileToV0Message();
  const tx = new w.VersionedTransaction(msg); tx.sign([kp]);
  return sendSigned(tx);
}
export const solscan = (sig, kind = 'tx') => `https://solscan.io/${kind}/${sig}`;

// ---------- header, sheet, key chip ----------
function paintChip() {
  const c = $('#keyChip'); if (!c) return; const k = keys.active();
  c.classList.toggle('has', !!k); $('.kt', c).textContent = k ? short(k.pub) : 'No key yet';
}
export function toast(t, ms = 2400) { let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); } el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), ms); }
export async function copy(t, what = 'Copied') { try { await navigator.clipboard.writeText(t); toast(what); } catch { toast('Copy did not work here, select it instead'); } }

export function splitWords(el) {
  if (el.dataset.split) return; el.dataset.split = 1; let i = 0;
  const walk = node => { for (const n of [...node.childNodes]) { if (n.nodeType === 3) { const frag = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; } const w = document.createElement('span'); w.className = 'w'; const s = document.createElement('span'); s.textContent = p; s.style.setProperty('--i', i++); w.appendChild(s); frag.appendChild(w); }); n.replaceWith(frag); } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n); } };
  walk(el);
}

// numbers that count to their new value instead of jumping
export function countTo(el, to, fmt = v => Math.round(v).toLocaleString('en-US'), ms = 900) {
  if (!el) return; const from = +(el.dataset.v || 0); el.dataset.v = to;
  if (RM || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now(); const step = t => { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
}
// the ambient layer every page shares: drifting dust, a scroll bar, a ring that follows the pointer
function ambient() {
  const bar = document.createElement('div'); bar.className = 'prog'; document.body.appendChild(bar);
  const onS = () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.setProperty('--p', h > 0 ? (scrollY / h).toFixed(4) : 0); }; onS(); addEventListener('scroll', onS, { passive: true });
  if (!RM) {
    const c = document.createElement('canvas'); c.className = 'dust'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
    const g = c.getContext('2d'); let W = 0, H = 0, P = [], last = 0;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; c.width = W * d; c.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); P = Array.from({ length: Math.round(W * H / 16000) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .3, vx: (Math.random() - .5) * 6, vy: -3 - Math.random() * 8, a: Math.random() * .5 + .1, tw: Math.random() * 6.28 })); };
    size(); addEventListener('resize', size);
    const loop = t => { requestAnimationFrame(loop); if (document.hidden || t - last < 40) return; const dt = Math.min(.1, (t - last) / 1000); last = t; g.clearRect(0, 0, W, H); for (const p of P) { p.x += p.vx * dt; p.y += p.vy * dt; p.tw += dt * 1.6; if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; } if (p.x < -4) p.x = W + 4; if (p.x > W + 4) p.x = -4; g.globalAlpha = p.a * (.6 + .4 * Math.sin(p.tw)); g.fillStyle = '#fff'; g.fillRect(p.x, p.y, p.r, p.r); } };
    requestAnimationFrame(loop);
    if (matchMedia('(pointer:fine)').matches) {
      const ring = document.createElement('div'); ring.className = 'ring'; ring.setAttribute('aria-hidden', 'true'); document.body.appendChild(ring);
      addEventListener('pointermove', e => { ring.style.setProperty('--rx', e.clientX + 'px'); ring.style.setProperty('--ry', e.clientY + 'px'); ring.classList.toggle('hot', !!(e.target.closest && e.target.closest('a, button, label, input, select, textarea, summary, [data-copy]'))); }, { passive: true });
      document.addEventListener('pointerleave', () => { ring.style.setProperty('--rx', '-100px'); });
    }
  }
}
export function boot() {
  ambient();
  const top = $('#top'), sheet = $('#sheet'), mb = $('#menuBtn');
  const onScroll = () => top && top.classList.toggle('solid', scrollY > 10); onScroll(); addEventListener('scroll', onScroll, { passive: true });
  if (mb) mb.addEventListener('click', () => { const o = !sheet.classList.contains('open'); sheet.classList.toggle('open', o); mb.setAttribute('aria-expanded', o); });
  if (sheet) sheet.addEventListener('click', e => { if (e.target.closest('a')) { sheet.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); } });
  paintChip();
  // reveals
  $$('.split').forEach(splitWords);
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('.rv, .split').forEach(el => io.observe(el));
  setTimeout(() => $$('.rv, .split').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('vis'); }), 2200);
  // pointer light on cards, a little pull on primary buttons
  addEventListener('pointermove', e => { const c = e.target.closest && e.target.closest('.card'); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); } }, { passive: true });
  if (!RM && matchMedia('(pointer:fine)').matches) $$('[data-mag]').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .28}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
  document.addEventListener('click', e => { const c = e.target.closest('[data-copy]'); if (c) { e.preventDefault(); copy(c.dataset.copy, c.dataset.what || 'Copied'); } });
}
