// Routes: NEAR Intents 1Click, keyless. Fund a key from SOL, USDC or ZEC; cash a key out to any address.
import { $, $$, boot, api, keys, onKeys, sendSol, short, esc, toast, B58RE } from './core.js?v=2';
boot();
let mode = 'in', step = 'quote', dep = null, poll = 0;
const ZEC = /^(t1|t3)[1-9A-HJ-NP-Za-km-z]{33}$|^(zs1|u1)[02-9ac-hj-np-z]{60,240}$/;
const okAddr = (asset, a) => asset === 'ZEC' ? ZEC.test(a) : B58RE.test(a);

function setMode(m) {
  mode = m; step = 'quote'; $$('#rMode button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('#rTitle').textContent = m === 'in' ? 'Fund a key' : 'Cash out';
  const from = $('#rFrom'), to = $('#rTo');
  if (m === 'in') { from.disabled = false; to.innerHTML = '<option>SOL</option><option>USDC</option>'; $('#rRecipL').textContent = 'Arrives at (your key)'; $('#rRefF').classList.remove('hide'); const a = keys.active(); $('#rRecip').value = a ? a.pub : ''; }
  else { from.value = 'SOL'; from.disabled = true; to.innerHTML = '<option>SOL</option><option>USDC</option><option>ZEC</option>'; $('#rRecipL').textContent = 'Pay out to'; $('#rRefF').classList.add('hide'); $('#rRecip').value = ''; }
  unit(); reset();
}
function unit() { $('#rUnit').textContent = $('#rFrom').value; $('#rRecip').placeholder = $('#rTo').value === 'ZEC' ? 'Zcash address (t1…, zs1… or u1…)' : 'Solana address'; $('#rRef').placeholder = $('#rFrom').value === 'ZEC' ? 'your Zcash address' : 'your sending Solana address'; }
function reset() { step = 'quote'; $('#rGo').textContent = 'Get a quote'; ['#rqOut', '#rqUsd', '#rqTime'].forEach(s => $(s).textContent = '—'); $('#rMsg').textContent = ''; }
$('#rMode').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });
['#rFrom', '#rTo'].forEach(s => $(s).addEventListener('change', () => { unit(); reset(); }));
['#rAmt', '#rRecip', '#rRef'].forEach(s => $(s).addEventListener('input', () => { if (step !== 'quote') reset(); }));
onKeys(() => { if (mode === 'in' && !$('#rRecip').value) { const a = keys.active(); if (a) $('#rRecip').value = a.pub; } });
setMode('in');

function track(st) {
  const s = String(st || '').toUpperCase(); $('#rDepSt').textContent = s ? s.replace(/_/g, ' ').toLowerCase() : '—';
  const n = s === 'SUCCESS' ? 3 : ['KNOWN_DEPOSIT_TX', 'PROCESSING'].includes(s) ? 2 : s ? 1 : 0;
  $$('#rTrack > div').forEach((d, i) => { d.classList.toggle('done', i < n); d.classList.toggle('now', i === n && n < 3); });
}
async function watch(addr) {
  clearInterval(poll); track('PENDING_DEPOSIT');
  poll = setInterval(async () => { try { const r = await api('rstatus', 'dep=' + encodeURIComponent(addr)); track(r.status); if (['SUCCESS', 'REFUNDED', 'FAILED'].includes(String(r.status).toUpperCase())) { clearInterval(poll); toast(r.status === 'SUCCESS' ? 'Route complete' : 'Route ' + String(r.status).toLowerCase()); } } catch { } }, 6000);
}

$('#rForm').addEventListener('submit', async e => {
  e.preventDefault(); const m = $('#rMsg'); const err = t => { m.className = 'msg err'; m.textContent = t; };
  const from = $('#rFrom').value, to = $('#rTo').value, amount = $('#rAmt').value.trim(), recip = $('#rRecip').value.trim(), a = keys.active();
  if (!(parseFloat(amount) > 0)) return err('Enter an amount above zero.');
  if (!okAddr(to, recip)) return err(to === 'ZEC' ? 'Enter the Zcash address that receives it.' : 'Enter the Solana address that receives it.');
  const refund = mode === 'out' ? (a && a.pub) : $('#rRef').value.trim();
  if (mode === 'out' && !a) return err('Make and fund a key first.');
  if (mode === 'in' && !okAddr(from, refund)) return err('Enter the address you send from, for refunds.');
  const go = $('#rGo'); go.classList.add('busy');
  try {
    if (step === 'quote') {
      m.className = 'msg'; m.textContent = 'Asking NEAR Intents for a quote…';
      const q = await api('rquote', `from=${from}&to=${to}&amt=${encodeURIComponent(amount)}`);
      $('#rqOut').textContent = (q.amountOutFormatted || '—') + ' ' + to; $('#rqUsd').textContent = q.amountOutUsd ? '$' + (+q.amountOutUsd).toFixed(2) : '—'; $('#rqTime').textContent = q.timeEstimate ? q.timeEstimate + ' s' : '—';
      step = 'go'; go.textContent = mode === 'in' ? 'Get the deposit address' : 'Send from my key'; m.className = 'msg ok'; m.textContent = 'Quoted. Confirm to continue.';
    } else {
      m.className = 'msg'; m.textContent = 'Opening the route…';
      const r = await api('route', { from, to, amount, recipient: recip, refundTo: refund });
      dep = r.depositAddress; $('#rDepAddr').textContent = short(dep, 10); $('#rDepAddr').dataset.copy = dep; $('#rDepAddr').dataset.what = 'Deposit address copied';
      $('#rDepAmt').textContent = (r.amountInFormatted || amount) + ' ' + from;
      if (mode === 'in') { $('#rDepSub').textContent = 'Send exactly this amount from anywhere. The route pays out to your key.'; m.className = 'msg ok'; m.textContent = 'Deposit address ready. Send the exact amount to it.'; watch(dep); }
      else {
        m.textContent = 'Signing the deposit from your key in this page…'; $('#rDepSub').textContent = 'Your key pays this deposit; the route pays out to your address.';
        const sig = await sendSol(a, dep, Math.round(parseFloat(r.amountInFormatted || amount) * 1e9));
        api('rsubmit', { txHash: sig, depositAddress: dep }).catch(() => { }); m.className = 'msg ok'; m.innerHTML = `Deposit sent. <a class="copy" href="https://solscan.io/tx/${esc(sig)}" target="_blank" rel="noopener">Solscan</a>`; watch(dep);
      }
      step = 'quote'; go.textContent = 'Get a quote';
    }
  } catch (er) { err(er.message); }
  go.classList.remove('busy');
});
