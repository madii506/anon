// Markets: every tokenized stock and ETF the API prices, searchable, each one a link into Trade.
import { $, $$, boot, api, fusd, esc } from './core.js?v=1';
boot();
let all = [], kind = 'all', sort = 'mcap';
function paint() {
  const q = $('#mQ').value.trim().toLowerCase();
  let L = all.filter(s => (kind === 'all' || s.kind === kind) && (!q || s.sym.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)));
  L = L.sort((a, b) => sort === 'sym' ? a.sym.localeCompare(b.sym) : sort === 'ch' ? Math.abs(b.ch24 || 0) - Math.abs(a.ch24 || 0) : (b.mcap || 0) - (a.mcap || 0));
  $('#mGrid').innerHTML = L.length ? L.map(s => `<a class="mk" href="/trade#${esc(s.mint)}"><span class="av" style="background-image:url('${esc(s.icon)}')"></span><span style="min-width:0"><b>${esc(s.sym)}</b><small>${esc(s.name)} · ${s.kind === 'etf' ? 'ETF' : 'stock'}${s.thin ? ' · thin' : ''}</small></span><span class="r">${s.usd != null ? fusd(s.usd) : '<span class="dim">thin</span>'}<br><small class="${(s.ch24 || 0) >= 0 ? 'up' : 'dn'}">${s.ch24 != null ? (s.ch24 >= 0 ? '+' : '') + (+s.ch24).toFixed(2) + '%' : '—'}</small></span></a>`).join('') : '<div class="ph" style="grid-column:1/-1">Nothing matches that.</div>';
}
async function load() {
  try { const p = await api('prices'); all = p.stocks || []; $('#mNote').textContent = `${all.length} markets · ${all.filter(s => s.usd != null).length} with deep enough liquidity to price · SOL $${p.sol && p.sol.usd ? (+p.sol.usd).toFixed(2) : '—'} · refreshed every 30 seconds. "Thin" means too little liquidity on-chain to trust a price.`; paint(); }
  catch (e) { $('#mNote').textContent = 'Live prices are not answering: ' + e.message; if (!all.length) $('#mGrid').innerHTML = '<div class="ph" style="grid-column:1/-1">It retries every 30 seconds.</div>'; }
}
$('#mQ').addEventListener('input', paint);
$('#mKind').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; kind = b.dataset.k; $$('#mKind button').forEach(x => x.classList.toggle('on', x === b)); paint(); });
$('#mSort').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; sort = b.dataset.s; $$('#mSort button').forEach(x => x.classList.toggle('on', x === b)); paint(); });
load(); setInterval(() => { if (!document.hidden) load(); }, 30000);
