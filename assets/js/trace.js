// Trace: a wallet's first funder, that wallet's first funder, and its latest activity.
import { $, boot, api, keys, short, esc, toast, B58RE } from './core.js?v=1';
boot();
const when = f => f && f.time ? new Date(f.time * 1000).toISOString().slice(0, 10) : '';
const amt = f => f && f.lamports != null ? (f.lamports / 1e9).toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' SOL' : '';
async function trace(a) {
  const msg = $('#trMsg'); if (!B58RE.test(a)) { msg.className = 'msg err'; msg.textContent = 'Paste a Solana wallet address.'; return; }
  $('#trIn').value = a; if (location.hash.slice(1) !== a) history.replaceState(null, '', '#' + a);
  msg.className = 'msg'; msg.textContent = 'Reading its first transactions…'; $('#trGo').classList.add('busy');
  const [tr, ac] = await Promise.allSettled([api('trace', 'addr=' + encodeURIComponent(a), 45000), api('acts', 'addr=' + encodeURIComponent(a))]);
  if (tr.status === 'fulfilled') {
    const r = tr.value, f1 = r.hop1 && r.hop1.first, f2 = r.hop2 && r.hop2.first;
    $('#h0').textContent = a; $('#h0s').textContent = (r.sol != null ? r.sol.toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' SOL now · ' : '') + (r.hop1 ? (r.hop1.more ? 'over ' : '') + r.hop1.txs.toLocaleString('en-US') + ' transactions' : '');
    $('#h1').innerHTML = f1 && f1.funder ? `<a class="copy" href="#${esc(f1.funder)}">${esc(f1.funder)}</a>` : 'no SOL transfer found'; $('#h1s').textContent = [amt(f1), when(f1)].filter(Boolean).join(' · ') || (r.hop1 && r.hop1.more ? 'too much history to reach the first one' : '');
    $('#h2').innerHTML = f2 && f2.funder ? `<a class="copy" href="#${esc(f2.funder)}">${esc(f2.funder)}</a>` : (f1 && f1.funder ? 'too busy to trace further' : '—'); $('#h2s').textContent = [amt(f2), when(f2)].filter(Boolean).join(' · ');
    $('#hops').classList.remove('hide'); msg.className = 'msg ok'; msg.textContent = 'Read straight from Solana. Tap a funder to trace it next.';
  } else { msg.className = 'msg err'; msg.textContent = tr.reason.message; }
  if (ac.status === 'fulfilled') { const L = ac.value.acts || []; $('#acts').innerHTML = L.length ? L.map(x => `<a class="li" href="https://solscan.io/tx/${esc(x.sig)}" target="_blank" rel="noopener"><span class="av" style="display:grid;place-items:center;color:${x.err ? '#ff8f86' : '#9dffc4'}">${x.err ? '✕' : '✓'}</span><span><b class="mono">${short(x.sig, 10)}</b><small>${x.time ? new Date(x.time * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'time unknown'}</small></span><span class="r">Solscan →</span></a>`).join('') : '<div class="ph">No transactions yet.</div>'; }
  else $('#acts').innerHTML = `<div class="ph">${esc(ac.reason.message)}</div>`;
  $('#trGo').classList.remove('busy');
}
$('#trForm').addEventListener('submit', e => { e.preventDefault(); trace($('#trIn').value.trim()); });
$('#trMine').addEventListener('click', () => { const k = keys.active(); if (!k) return toast('Make a key first'); trace(k.pub); });
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (B58RE.test(h)) trace(h); });
if (B58RE.test(location.hash.slice(1))) trace(location.hash.slice(1));
