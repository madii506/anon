// Watch: the live pump.fun tape, the crowd, the busiest wallets and fresh launches, all counted on this page.
import { $, boot, short, esc, ago } from './core.js?v=1';
import { feed, crowd, stats, evText } from './live.js?v=1';
boot();
const C = crowd($('#crowdCv'), $('#crowdBox'), { rows: 8, max: 12 });
const tape = [], launched = [];
function paint() {
  $('#stTrades').textContent = stats.trades.toLocaleString('en-US'); $('#stWallets').textContent = stats.wallets.size.toLocaleString('en-US'); $('#stLaunch').textContent = stats.launches.toLocaleString('en-US');
  $('#wsRate').textContent = stats.times.length + ' events in the last minute';
  if (tape.length) $('#tape').innerHTML = tape.slice(0, 30).map(e => `<div class="tr2"><span class="mono">${new Date(e.t).toISOString().slice(11, 19)}</span><a class="mono" href="/trace#${esc(e.who)}">${short(e.who)}</a><span class="${e.kind === 'sell' ? 'no' : e.kind === 'buy' ? 'yes' : ''}">${e.kind === 'create' ? 'launched' : e.kind === 'buy' ? 'bought' : 'sold'}</span><span class="mono">${e.kind === 'create' ? '—' : (e.sol < .01 ? e.sol.toFixed(4) : e.sol.toFixed(2)) + ' SOL'}</span><a href="/trade#${esc(e.mint)}">$${esc(String(e.sym).slice(0, 10))}</a></div>`).join('');
  const top = [...stats.wallets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (top.length) $('#top').innerHTML = top.map(([w, n], i) => `<a class="li" href="/trace#${esc(w)}"><span class="av" style="display:grid;place-items:center;font-weight:800;color:#888">${i + 1}</span><span><b class="mono">${short(w, 6)}</b><small>tap to trace it</small></span><span class="r">${n} event${n > 1 ? 's' : ''}</span></a>`).join('');
  if (launched.length) $('#newL').innerHTML = launched.slice(0, 10).map(c => `<a class="li" href="/trade#${esc(c.mint)}"><span class="av"></span><span><b>${esc(c.name || c.sym)}</b><small>$${esc(c.sym)} · by ${short(c.who)} · ${ago(c.t)} ago</small></span><span class="r">${c.mcapSol ? c.mcapSol.toFixed(1) + ' SOL' : '—'}</span></a>`).join('');
}
feed({
  state(s) { const chip = $('#wsChip'); chip.className = 'chip' + (s === 'live' ? ' live' : s === 'off' ? ' off' : ''); $('#wsTxt').textContent = s === 'live' ? 'live from pump.fun' : s === 'off' ? 'the live feed is not answering, it retries' : s === 'reconnecting' ? 'reconnecting' : 'connecting to pump.fun'; },
  event(ev) { C.light(evText(ev)); tape.unshift(ev); tape.length = Math.min(tape.length, 60); if (ev.kind === 'create') { launched.unshift(ev); launched.length = Math.min(launched.length, 20); } paint(); },
});
setInterval(paint, 4000);
