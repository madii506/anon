// Keys: make, restore, export, send, burn. Everything happens in this page.
import { $, $$, boot, api, keys, onKeys, makeKey, exportKey, restoreKey, short, fsol, fusd, esc, toast, copy, sendSol, waitSig, solscan, B58RE } from './core.js?v=1';
boot();
const bal = new Map(); let confirmBurn = null;

async function readBal(pub, force) {
  const c = bal.get(pub); if (c && !force && Date.now() - c.t < 20000) return c;
  try { const w = await api('wallet', 'addr=' + pub); const v = { t: Date.now(), sol: w.sol, total: w.total, tokens: w.tokens || [], ok: true }; bal.set(pub, v); return v; }
  catch (e) { const v = { t: Date.now(), ok: false, err: e.message }; bal.set(pub, v); return v; }
}
function row(k, act) {
  const b = bal.get(k.pub), s = b && b.ok ? fsol(b.sol) : b ? 'unreadable' : '…';
  const burning = confirmBurn === k.pub;
  return `<div class="keyrow ${act ? 'act' : ''}" data-k="${k.pub}"><span class="face"></span><span class="who"><b>${esc(k.label || 'key')}${act ? ' · active' : ''}</b><span class="mono copy" data-copy="${k.pub}" data-what="Address copied">${short(k.pub, 8)}</span></span><span class="bal">${s}</span>
  <div class="keyacts">${act ? '' : '<button class="btn btn-g btn-xs" data-a="use" type="button">Use</button>'}<button class="btn btn-g btn-xs" data-a="export" type="button">Export</button><button class="btn btn-g btn-xs" data-a="rename" type="button">Rename</button><button class="btn btn-g btn-xs" data-a="burn" type="button">Burn</button></div>
  ${burning ? `<div class="keyacts" style="align-items:center"><span class="note" style="flex:1;min-width:200px">Burning deletes this key from the browser. Funds on it stay on-chain, out of reach without an export. Type <b>burn</b> to confirm.</span><span class="inp" style="height:36px;width:120px"><input data-burn placeholder="burn"></span><button class="btn btn-w btn-xs" data-a="burnyes" type="button">Burn it</button><button class="btn btn-g btn-xs" data-a="burnno" type="button">Keep it</button></div>` : ''}</div>`;
}
function paint() {
  const L = keys.list(), a = keys.active();
  $('#kCount').textContent = L.length ? `${L.length} key${L.length > 1 ? 's' : ''} in this browser. None of them has ever left it.` : 'No keys yet. Make one: it takes a second and never leaves this browser.';
  $('#kList').innerHTML = L.length ? L.map(k => row(k, a && a.pub === k.pub)).join('') : '<div class="ph">Make a key to start. You can make a fresh one for every launch.</div>';
  $('#aAddr').textContent = a ? short(a.pub, 10) : 'no key yet'; $('#aMade').textContent = a && a.t ? new Date(a.t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—';
  const b = a && bal.get(a.pub);
  $('#aSol').textContent = b && b.ok ? fsol(b.sol) : a ? (b ? 'could not read' : 'reading…') : '—';
  $('#aVal').textContent = b && b.ok ? fusd(b.total) : '—';
  const t = $('#aTokens');
  if (!a) t.innerHTML = '<div class="ph">Make a key first.</div>';
  else if (!b) t.innerHTML = '<div class="ph">Reading from Solana…</div>';
  else if (!b.ok) t.innerHTML = `<div class="ph">${esc(b.err)}</div>`;
  else if (!b.tokens.length) t.innerHTML = '<div class="ph">Only SOL so far.</div>';
  else t.innerHTML = b.tokens.map(x => `<a class="li" href="/trade#${esc(x.mint)}"><span class="av" style="${x.icon ? `background-image:url('${esc(x.icon)}')` : ''}"></span><span><b>${esc(x.sym || short(x.mint))}</b><small>${esc(x.name || '')}</small></span><span class="r">${(+x.amount).toLocaleString('en-US', { maximumFractionDigits: 4 })}<br><small>${fusd(x.value)}</small></span></a>`).join('');
}
async function refresh(force) { paint(); await Promise.all(keys.list().map(k => readBal(k.pub, force))); paint(); }
onKeys(() => refresh());
refresh();

$('#kMake').addEventListener('click', async () => { const k = await makeKey(); k.label = 'key ' + (keys.list().length + 1); keys.add(k); keys.setActive(k.pub); toast('New key made in this browser'); refresh(); });
$('#kFile').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const m = $('#kMsg'); try { const k = await restoreKey(await f.text()); keys.add(k); m.className = 'msg ok'; m.textContent = 'Restored ' + short(k.pub, 6) + '. It never left this page.'; refresh(); } catch (err) { m.className = 'msg err'; m.textContent = err.message; } });
$('#kList').addEventListener('click', e => {
  const b = e.target.closest('button[data-a]'); if (!b) return; const pub = b.closest('[data-k]').dataset.k, k = keys.list().find(x => x.pub === pub); if (!k) return;
  const a = b.dataset.a;
  if (a === 'use') { keys.setActive(pub); toast('Active key changed'); }
  if (a === 'export') { exportKey(k); toast('Saved. Anyone with that file controls the funds.', 3200); }
  if (a === 'rename') { const r = b.closest('.keyrow'); const who = $('.who b', r); who.innerHTML = `<span class="inp" style="height:34px"><input value="${esc(k.label || '')}" maxlength="24" data-rn></span>`; const i = $('[data-rn]', r); i.focus(); i.select(); const done = () => { keys.rename(pub, i.value.trim() || 'key'); paint(); }; i.addEventListener('keydown', ev => { if (ev.key === 'Enter') done(); if (ev.key === 'Escape') paint(); }); i.addEventListener('blur', done); }
  if (a === 'burn') { confirmBurn = pub; paint(); const i = $(`[data-k="${pub}"] [data-burn]`); i && i.focus(); }
  if (a === 'burnno') { confirmBurn = null; paint(); }
  if (a === 'burnyes') { const i = $(`[data-k="${pub}"] [data-burn]`); if (!i || i.value.trim().toLowerCase() !== 'burn') { toast('Type burn to confirm'); return; } confirmBurn = null; keys.remove(pub); bal.delete(pub); toast('Burned. It is gone from this browser.'); refresh(); }
});
$('#aCopy').addEventListener('click', () => { const a = keys.active(); a ? copy(a.pub, 'Address copied') : toast('Make a key first'); });
$('#aRefresh').addEventListener('click', () => refresh(true));

// send SOL from the active key
$('#sMax').addEventListener('click', async () => { const a = keys.active(); if (!a) return toast('Make a key first'); const b = await readBal(a.pub, true); if (b.ok) $('#sAmt').value = Math.max(0, (b.sol * 1e9 - 5000) / 1e9).toFixed(9).replace(/0+$/, '').replace(/\.$/, ''); });
$('#sendForm').addEventListener('submit', async e => {
  e.preventDefault(); const m = $('#sMsg'), a = keys.active(), to = $('#sTo').value.trim(), amt = parseFloat($('#sAmt').value);
  const err = t => { m.className = 'msg err'; m.textContent = t; };
  if (!a) return err('Make a key first.'); if (!B58RE.test(to)) return err('Enter a Solana address to send to.'); if (!(amt > 0)) return err('Enter an amount above zero.');
  const b = await readBal(a.pub, true); const lam = Math.round(amt * 1e9);
  if (b.ok && lam + 5000 > Math.round(b.sol * 1e9)) return err('That is more than the key holds after the network fee.');
  $('#sGo').classList.add('busy'); m.className = 'msg'; m.textContent = 'Signing in this page…';
  try { const sig = await sendSol(a, to, lam); m.innerHTML = `Sent. Waiting for Solana… <a class="copy" href="${solscan(sig)}" target="_blank" rel="noopener">view</a>`; await waitSig(sig); m.className = 'msg ok'; m.innerHTML = `Confirmed. <a class="copy" href="${solscan(sig)}" target="_blank" rel="noopener">See it on Solscan</a>`; refresh(true); }
  catch (er) { err(er.message); }
  $('#sGo').classList.remove('busy');
});
