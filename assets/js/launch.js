// Launch: a pump.fun coin from the active browser key. The mint key is made here; both keys sign here.
import { $, $$, boot, api, keys, onKeys, makeKey, unb58, signB64, sendSigned, waitSig, short, fsol, esc, toast, copy, solscan } from './core.js?v=1';
boot();
let img = null, solNow = null;
const LK = 'anon:launched';
const mine = () => { try { return JSON.parse(localStorage.getItem(LK) || '[]'); } catch { return []; } };

async function keyInfo() {
  const a = keys.active(); $('#lKey').textContent = a ? short(a.pub, 8) : 'no key yet'; solNow = null;
  if (!a) { $('#lSol').textContent = '—'; need(); return; }
  $('#lSol').textContent = 'reading…';
  try { const w = await api('wallet', 'addr=' + a.pub); solNow = w.sol; $('#lSol').textContent = fsol(w.sol); } catch (e) { $('#lSol').textContent = 'could not read'; }
  need();
}
function need() { const buy = Math.max(0, parseFloat($('#lBuy').value) || 0); $('#lNeed').textContent = 'about ' + (0.02 + buy).toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' SOL'; }
$('#lBuy').addEventListener('input', need);
onKeys(keyInfo); keyInfo();
$('#lMake').addEventListener('click', async () => { const k = await makeKey(); k.label = 'launch key ' + (keys.list().length + 1); keys.add(k); keys.setActive(k.pub); toast('A fresh key is now active'); });
$('#lCopy').addEventListener('click', () => { const a = keys.active(); a ? copy(a.pub, 'Address copied') : toast('Make a key first'); });
$('#lRef').addEventListener('click', keyInfo);

// the image: squared and resized here, then sent as a data URL
const drop = $('#lDrop');
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) takeImage(f); });
$('#lImg').addEventListener('change', e => { const f = e.target.files[0]; if (f) takeImage(f); });
function takeImage(f) {
  if (!/^image\//.test(f.type)) return toast('That is not an image');
  const url = URL.createObjectURL(f), im = new Image();
  im.onload = () => {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), s = Math.min(im.width, im.height);
    g.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, S, S); URL.revokeObjectURL(url);
    img = c.toDataURL('image/png'); if (img.length > 1.9e6) img = c.toDataURL('image/jpeg', .9);
    $('#lDropIn').innerHTML = `<img src="${img}" alt=""><small>Tap to change</small>`;
  };
  im.onerror = () => toast('Could not read that image'); im.src = url;
}

function stepTo(n, done) { $$('#lSteps > div').forEach((d, i) => { d.classList.toggle('done', i < n || (done && i <= n)); d.classList.toggle('now', i === n && !done); }); }
function paintMine() {
  const L = mine(); const box = $('#lMine');
  box.innerHTML = L.length ? L.map(c => `<div class="li"><span class="av" style="background:#1a1a1a"></span><span><b>${esc(c.name)} · $${esc(c.sym)}</b><small class="mono">${short(c.mint, 6)} · by ${short(c.by, 4)}</small></span><span class="r"><a class="copy" href="https://pump.fun/coin/${esc(c.mint)}" target="_blank" rel="noopener">pump.fun</a><br><a class="copy" href="/trade#${esc(c.mint)}">trade</a></span></div>`).join('') : '<div class="ph">Nothing launched from here yet.</div>';
}
paintMine();

$('#lForm').addEventListener('submit', async e => {
  e.preventDefault(); const m = $('#lMsg'); const err = t => { m.className = 'msg err'; m.textContent = t; };
  const a = keys.active(); if (!a) return err('Make a key first, then send it a little SOL.');
  const name = $('#lName').value.trim(), sym = $('#lSym').value.trim().replace(/^\$/, ''), buy = Math.max(0, parseFloat($('#lBuy').value) || 0);
  if (!img) return err('Add an image for the coin.'); if (!name) return err('Give the coin a name.'); if (!/^[A-Za-z0-9]{1,10}$/.test(sym)) return err('The ticker is 1 to 10 letters or numbers.');
  for (const [id, lbl] of [['#lX', 'X link'], ['#lTg', 'Telegram link'], ['#lWeb', 'Website']]) { const v = $(id).value.trim(); if (v && !/^https:\/\/\S{3,}$/.test(v)) return err(`The ${lbl} should start with https://`); }
  if (buy > 10) return err('Keep the first buy at 10 SOL or less.');
  if (solNow != null && solNow < 0.02 + buy) return err(`This key holds ${fsol(solNow)}. Send it at least ${(0.02 + buy).toFixed(3)} SOL first.`);
  const go = $('#lGo'); go.classList.add('busy');
  try {
    stepTo(0); m.className = 'msg'; m.textContent = 'Making the coin\'s mint key in this browser…';
    const mint = await makeKey(); stepTo(1); m.textContent = 'Putting the image on pump.fun\'s IPFS…';
    const r = await api('launch', { user: a.pub, mint: mint.pub, name, sym, desc: $('#lDesc').value.trim(), x: $('#lX').value.trim(), tg: $('#lTg').value.trim(), web: $('#lWeb').value.trim(), buy, image: img }, 60000);
    stepTo(2); m.textContent = 'PumpPortal built it. Signing here with your key and the mint key…';
    const tx = await signB64(r.tx, [unb58(mint.sk), keys.secret(a)]);
    stepTo(3); const sig = await sendSigned(tx); m.innerHTML = `Sent to Solana. Waiting for it to land… <a class="copy" href="${solscan(sig)}" target="_blank" rel="noopener">view</a>`;
    await waitSig(sig); stepTo(3, true);
    const L = mine(); L.unshift({ mint: mint.pub, name, sym, sig, by: a.pub, t: Date.now() }); try { localStorage.setItem(LK, JSON.stringify(L.slice(0, 50))); } catch { }
    paintMine(); m.className = 'msg ok';
    m.innerHTML = `Launched. <a class="copy" href="https://pump.fun/coin/${mint.pub}" target="_blank" rel="noopener">Open it on pump.fun</a> · <a class="copy" href="${solscan(sig)}" target="_blank" rel="noopener">Solscan</a> · <a class="copy" href="/trade#${mint.pub}">Trade it</a>`;
    toast('Your coin is live'); keyInfo();
  } catch (er) { err(er.message); $$('#lSteps > div').forEach(d => d.classList.remove('now')); }
  go.classList.remove('busy');
});
