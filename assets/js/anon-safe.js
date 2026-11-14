/* anon: the safehouse (fresh wallets, private routes) and the identity chip in the terminal's top bar */
(function () {
  const WAL = window.MarketsWallet;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { } } };
  async function api(a, p) { const r = await fetch('/api/m?a=' + a + (p ? '&' + new URLSearchParams(p) : ''), { cache: 'no-store' }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'request failed'); return j; }
  async function post(a, b) { const r = await fetch('/api/m?a=' + a, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'request failed'); return j; }
  const relay = async b64 => (await post('send', { tx: b64 })).sig;
  const toast = m => { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); };
  const copy = async (txt, what) => { try { await navigator.clipboard.writeText(txt); toast((what || 'address') + ' copied'); } catch { toast('could not copy'); } };
  const sol = x => x == null ? '—' : (x >= 100 ? x.toFixed(2) : x >= 1 ? x.toFixed(3) : x.toFixed(4));
  const MASK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M2 9.5C2 7.6 3.6 6.5 5.4 7l3.1.9c1 .3 2.1.4 3.5.4s2.5-.1 3.5-.4l3.1-.9c1.8-.5 3.4.6 3.4 2.5 0 4-2.6 7-5.6 7-1.7 0-2.7-1-3.2-2.2-.2-.5-.7-.8-1.2-.8s-1 .3-1.2.8C10.3 15.5 9.3 16.5 7.6 16.5 4.6 16.5 2 13.5 2 9.5Zm4.2 1.6c.9.7 2.2.8 3.3.1-.5-1-1.6-1.5-2.6-1.2-.4.1-.6.6-.7 1.1Zm11.6 0c-.1-.5-.3-1-.7-1.1-1-.3-2.1.2-2.6 1.2 1.1.7 2.4.6 3.3-.1Z"/></svg>';
  const EYE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

  // ---------------------------------------------------------------- balances (cached a few seconds)
  const BAL = {};
  async function balOf(addr, force) {
    const b = BAL[addr]; if (!force && b && Date.now() - b.t < 15000) return b.v;
    try { const w = await api('wallet', { addr }); BAL[addr] = { t: Date.now(), v: w }; return w; } catch { return b ? b.v : null; }
  }

  // ---------------------------------------------------------------- the identity chip
  function chip() {
    signers();
    const slot = $('#wslot'); if (!slot) return;
    const W = WAL.W, M = WAL.MAIN;
    if (!W.addr) { slot.innerHTML = `<span class="idbtns"><button class="kb" data-connect>Connect</button><button class="kb hot anon-go" id="goAnon">${MASK}Go anon</button></span>`; $('#goAnon').onclick = goAnon; return; }
    const fresh = !!W.fresh;
    slot.innerHTML = `<button class="idc ${fresh ? 'is-anon' : 'is-main'}" id="idc" aria-haspopup="menu" aria-expanded="false" title="${fresh ? 'Trades are signed by this fresh wallet' : 'Trades are signed by your main wallet'}">${fresh ? MASK : EYE}<b>${esc(fresh ? W.name : 'main')}</b><span>${short(W.addr)}</span><i>▾</i></button>`;
    $('#idc').onclick = e => { e.stopPropagation(); menu(); };
    void M;
  }
  // under every trade button: which wallet will sign it
  function signers() {
    const W = WAL.W;
    let cs = document.getElementById('cmdId');
    if (!cs && document.querySelector('.cmd #solp')) { cs = document.createElement('span'); cs.id = 'cmdId'; document.querySelector('.cmd #solp').before(cs); }
    if (cs) { cs.className = 'cid ' + (W.fresh ? 'anon' : W.addr ? 'main' : ''); cs.innerHTML = W.fresh ? `● anon on · ${esc(W.name)}` : W.addr ? '● exposed · main wallet' : '○ no wallet'; cs.onclick = () => { location.hash = '#safe'; }; }
    document.querySelectorAll('[data-signer]').forEach(el => {
      if (!W.addr) { el.className = 'signer'; el.innerHTML = ''; return; }
      if (W.fresh) { el.className = 'signer anon'; el.innerHTML = `${MASK}<span>signs as <b>${esc(W.name)}</b> · not linked to you</span>`; }
      else { el.className = 'signer main'; el.innerHTML = `${EYE}<span>signs as your <b>main wallet</b> · public · <a href="#safe">go anon</a></span>`; }
    });
  }
  function menu() {
    let m = $('#idm'); if (m) { m.remove(); return; }
    const W = WAL.W, M = WAL.MAIN, F = WAL.fresh(), act = WAL.active();
    m = document.createElement('div'); m.id = 'idm'; m.className = 'idm'; m.setAttribute('role', 'menu');
    m.innerHTML = `<div class="idm-h">trade from</div>
      <button role="menuitem" data-use="main" class="${act === 'main' ? 'on' : ''}">${EYE}<b>main</b><span>${M.addr ? esc(M.name) + ' · ' + short(M.addr) : 'not connected'}</span><em class="tag ex">exposed</em></button>
      ${F.map(f => `<button role="menuitem" data-use="${f.id}" class="${act === f.id ? 'on' : ''}">${MASK}<b>${esc(f.label)}</b><span>${short(f.pub)}</span><em class="tag fr">fresh</em></button>`).join('')}
      <div class="idm-f"><button data-act="new">+ new fresh wallet</button><a href="#safe" data-act="safe">safehouse →</a>${M.addr ? '<button data-act="dc">disconnect main</button>' : '<button data-act="connect">connect main</button>'}</div>`;
    $('#wslot').appendChild(m);
    const b = $('#idc'); if (b) b.setAttribute('aria-expanded', 'true');
    m.addEventListener('click', async e => {
      const u = e.target.closest('[data-use]'), a = e.target.closest('[data-act]');
      if (u) { if (u.dataset.use === 'main' && !M.addr) { close(); document.querySelector('[data-connect]') ? document.querySelector('[data-connect]').click() : openConnect(); return; } WAL.use(u.dataset.use); toast(u.dataset.use === 'main' ? 'trading from your main wallet' : 'trading from ' + (WAL.W.name || 'a fresh wallet')); close(); }
      if (a) { const k = a.dataset.act; close(); if (k === 'new') newFresh(true); if (k === 'dc') { WAL.disconnect(); toast('main wallet disconnected'); } if (k === 'connect') openConnect(); }
    });
    setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
    function close() { const x = $('#idm'); if (x) x.remove(); const bb = $('#idc'); if (bb) bb.setAttribute('aria-expanded', 'false'); }
  }
  function openConnect() { const t = document.createElement('button'); t.setAttribute('data-connect', ''); t.hidden = true; document.body.appendChild(t); t.click(); t.remove(); }
  async function goAnon() { const F = WAL.fresh(); if (F.length) { WAL.use(F[F.length - 1].id); toast('trading from ' + WAL.W.name); } else await newFresh(true); location.hash = '#safe'; }
  async function newFresh(use) {
    try { const f = await WAL.freshNew(); if (use) WAL.use(f.id); toast(f.label + ' made in this browser'); render(); return f; }
    catch (e) { toast(e.message || 'could not make a wallet'); }
  }

  // ---------------------------------------------------------------- routes in flight (kept so a reload picks them up)
  let RT = []; try { RT = JSON.parse(store.get('anon.routes') || '[]'); } catch { RT = []; }
  const saveRT = () => store.set('anon.routes', JSON.stringify(RT.slice(-12)));
  const DONE = ['SUCCESS', 'REFUNDED', 'FAILED', 'NOT_SENT'];
  async function pollRoute(r) {
    if (r.polling) return; r.polling = true;
    for (let k = 0; k < 160 && !DONE.includes(r.status); k++) {
      try { const s = await api('rstatus', { dep: r.dep }); if (s.status && s.status !== r.status) { r.status = s.status; r.dest = s.dest; r.origin = s.origin; r.out = s.amountOut || r.out; saveRT(); paintRoutes(); if (r.status === 'SUCCESS') { toast('route arrived: ' + (r.out || '') + ' ' + r.to); Object.keys(BAL).forEach(k => delete BAL[k]); paintWallets(); } } } catch { }
      await sleep(k < 20 ? 4000 : 9000);
    }
    r.polling = false;
  }
  const STEP = s => ({ PENDING_DEPOSIT: 1, KNOWN_DEPOSIT_TX: 2, PROCESSING: 2, SUCCESS: 3, INCOMPLETE_DEPOSIT: 1, REFUNDED: 3, FAILED: 3, NOT_SENT: 0 }[s] || 0);
  function routeRow(r) {
    const st = STEP(r.status), bad = ['REFUNDED', 'FAILED', 'INCOMPLETE_DEPOSIT', 'NOT_SENT'].includes(r.status);
    const lbl = { PENDING_DEPOSIT: 'waiting for the deposit', KNOWN_DEPOSIT_TX: 'deposit seen', PROCESSING: 'routing', SUCCESS: 'arrived', REFUNDED: 'refunded', FAILED: 'failed', INCOMPLETE_DEPOSIT: 'deposit too small', NOT_SENT: 'deposit not sent' }[r.status] || 'starting';
    const live = !DONE.includes(r.status), el = Math.max(0, Math.round((Date.now() - r.t) / 1000)), clk = live ? ` · <span class="clk2">${Math.floor(el / 60)}:${String(el % 60).padStart(2, '0')}</span>` : '';
    return `<div class="rt ${bad ? 'bad' : st === 3 ? 'ok' : ''}"><div class="rt-h"><b>${esc(r.kind)}</b><span>${esc(r.amt)} ${esc(r.from)} → ${esc(r.to)}${r.out ? (st === 3 && !bad ? ' · got ' : ' · ≈ ') + esc(r.out) : ''}</span><em>${lbl}${clk}</em></div>
      <div class="rt-s"><i class="${st >= 1 ? 'y' : ''}"></i><span>deposit sent${r.sig ? ` <a href="https://solscan.io/tx/${esc(r.sig)}" target="_blank" rel="noopener">tx ↗</a>` : ''}</span><i class="${st >= 2 ? 'y' : ''}"></i><span>routing</span><i class="${st >= 3 ? (bad ? 'x' : 'y') : ''}"></i><span>${bad ? lbl : 'arrived'}${r.dest && r.dest[0] && r.to !== 'ZEC' ? ` <a href="https://solscan.io/tx/${esc(r.dest[0])}" target="_blank" rel="noopener">tx ↗</a>` : ''}</span></div></div>`;
  }
  setInterval(() => { if (!document.hidden && RT.some(r => !DONE.includes(r.status)) && $('#sfRoutes')) paintRoutes(); }, 1000);
  function paintRoutes() { const el = $('#sfRoutes'); if (!el) return; el.innerHTML = RT.length ? RT.slice().reverse().map(routeRow).join('') : ghostRoute(); }
  // before the first route: the row it will become, empty, so the steps are known before any money moves
  function ghostRoute() { const f = WAL.W.fresh || WAL.fresh()[0]; return `<div class="rt ghost"><div class="rt-h"><b>fast hop</b><span>main → ${f ? esc(f.label) : 'a fresh wallet'}</span><em>no routes yet</em></div><div class="rt-s"><i></i><span>deposit sent</span><i></i><span>routing</span><i></i><span>arrived</span></div></div><div class="empty">Fund a fresh wallet or cash one out and the route shows up here, step by step.</div>`; }

  // ---------------------------------------------------------------- the safehouse page
  const UI = { tab: 'hop', to: null, from: null, outTo: 'main', amt: '', oamt: '', zaddr: store.get('anon.zaddr') || '', q: null, oq: null, busy: false, obusy: false };
  function render() {
    const el = $('#safe'); if (!el) return;
    if (!el.dataset.built) { build(el); el.dataset.built = 1; }
    paintWallets(); paintFund(); paintOut(); paintRoutes();
    RT.filter(r => !DONE.includes(r.status)).forEach(pollRoute);
  }
  function build(el) {
    el.innerHTML = `
    <div class="sf-h"><div><h1>Safehouse</h1><div class="lead">Fresh wallets made in this browser. Switch one on and every trade is signed by it, so your main wallet never touches the trade.</div></div><div class="sf-state" id="sfState"></div></div>
    <div class="sf-top">
      <div class="pn tz">
        <div class="sf-sec"><span class="eb">01</span><b>your wallet is public</b><span class="mute">read live from Solana</span></div>
        <p class="tz-l">Paste any wallet. This is what a stranger sees in two seconds: who sent it its first SOL, and who funded that wallet.</p>
        <form class="tz-f" id="tzF" autocomplete="off"><input id="tzQ" spellcheck="false" placeholder="paste a Solana wallet address" aria-label="Solana wallet address"><button class="kb hot" id="tzB" type="submit">trace</button></form>
        <div class="tz-ex" id="tzEx"></div>
        <div class="tz-o" id="tzO"><div class="tz-e">The trail shows up here.</div></div>
      </div>
      <div class="pn df">
        <div class="sf-sec"><span class="eb">02</span><b>the difference</b></div>
        <div class="df-c bad"><div class="df-h"><b>straight from your main</b><em class="tag ex">linked</em></div>
          <div class="df-f"><i class="a">MAIN</i><span class="ln r"><em>1 SOL</em></span><i class="c">NEW</i></div>
          <p>One transfer. Anyone who opens the new wallet sees your main as its funder, and everything it trades leads back to you.</p></div>
        <div class="df-c good"><div class="df-h"><b>through anon</b><em class="tag fr">unlinked</em></div>
          <div class="df-f"><i class="a">MAIN</i><span class="ln"><em>1 SOL</em></span><i class="m">DEP</i></div>
          <div class="df-g"><span>two unrelated transfers</span></div>
          <div class="df-f"><i class="s">SOLVER</i><span class="ln"><em>≈1 SOL</em></span><i class="c">ANON</i></div>
          <p>Your main pays a one-time deposit address. A NEAR Intents solver that pays thousands of wallets pays the fresh one. Nothing on-chain runs between your two wallets.</p></div>
      </div>
    </div>
    <div class="sf-grid">
      <div class="sf-col">
        <div class="sf-sec"><span class="eb">03</span><b>your wallets</b><button class="kb hot" id="sfNew">+ new fresh wallet</button></div>
        <div id="sfMain"></div>
        <div class="sf-list" id="sfList"></div>
        <div class="sf-sec"><span class="eb">04</span><b>routes</b><span class="mute">live from NEAR Intents</span></div>
        <div class="sf-routes" id="sfRoutes"></div>
      </div>
      <div class="sf-col">
        <div class="sf-sec"><span class="eb">05</span><b>fund privately</b><span class="seg" id="sfTab"><button data-t="hop" class="on">fast hop</button><button data-t="zec">shielded</button></span></div>
        <div class="pn sf-fund" id="sfFund"></div>
        <div class="sf-sec"><span class="eb">06</span><b>cash out</b></div>
        <div class="pn sf-out" id="sfOut"></div>
      </div>
    </div>
    <div class="sf-sec sf-wide"><span class="eb">07</span><b>the rules</b></div>
    <div class="rl">
      <div class="pn rl-c"><div class="rl-h"><i></i>anon never</div><ul>
        <li><b>Holds your funds.</b> Routes pay your wallets directly; nothing sits with anon.</li>
        <li><b>Sees your keys.</b> Fresh keys are made and kept in this browser only.</li>
        <li><b>Asks for a seed phrase.</b> Your main wallet only signs what it shows you.</li>
        <li><b>Tracks you.</b> No accounts, no cookies, no analytics.</li>
        <li><b>Adds a fee to trades.</b> You pay the network and the route, both shown first.</li></ul></div>
      <div class="pn rl-c lim"><div class="rl-h"><i></i>honest limits</div><ul>
        <li><b>Amounts and timing can match.</b> 1.234 SOL in and 1.233 out a minute later is easy to pair. Use round amounts and wait.</li>
        <li><b>The route provider sees its own swap.</b> NEAR Intents knows both ends of a route it fills.</li>
        <li><b>Your IP reaches the APIs.</b> Use a VPN if that matters to you.</li>
        <li><b>You can undo it.</b> Sending between your main and a fresh wallet links them again.</li></ul></div>
    </div>
    <div class="sf-sec sf-wide"><span class="eb">08</span><b>faq</b></div>
    <div class="fq">
      <details><summary>Is anon a mixer?<i>+</i></summary><p>No. anon never pools or holds anyone's funds. A fresh wallet is a new keypair in your browser, and a route is a swap filled by NEAR Intents solvers, who pay the destination from their own funds. The privacy comes from a new wallet plus a swap, not from mixing.</p></details>
      <details><summary>Where does a fresh wallet's key live?<i>+</i></summary><p>Only in this browser's storage. anon's servers never see it. Use export key to copy it into Phantom, Solflare or Backpack, and do that before you clear your browser data, which deletes it.</p></details>
      <details><summary>Do I still need Phantom?<i>+</i></summary><p>Only to fund a fresh wallet from your main one. Once a fresh wallet holds SOL, it trades by itself. While it is on, trades go through without a popup, because the key is in this browser.</p></details>
      <details><summary>What does it cost?<i>+</i></summary><p>anon adds no fee. A fast hop costs a fraction of a percent through NEAR Intents (the live quote shows it), and the shielded route a little more across its two legs. Trades pay the Solana network fee and the route's price impact, both shown before you confirm.</p></details>
      <details><summary>What if a route fails?<i>+</i></summary><p>NEAR Intents refunds the deposit to its refund address: your main wallet when you fund, the fresh wallet when you cash out. Every route shows its live status above, with links to the transactions.</p></details>
      <details><summary>How much should a fresh wallet hold?<i>+</i></summary><p>Whatever you plan to trade, plus about 0.01 SOL for network fees. Perps need at least $10 of collateral. Round amounts and some time between funding and trading make the break stronger.</p></details>
      <details><summary>Does it work on my phone?<i>+</i></summary><p>Yes. Fresh wallets live in whatever browser you use. To fund one from your main wallet on a phone, open anon inside Phantom's or Solflare's own browser so the main wallet can sign.</p></details>
      <details><summary>Is anon affiliated with NEAR, Zcash, Jupiter, pump.fun or any game?<i>+</i></summary><p>No. anon is independent and uses their public APIs. Nothing here is financial or legal advice. xStocks are not offered to US persons.</p></details>
    </div>`;
    $('#sfNew').onclick = () => newFresh(!WAL.W.fresh);
    $('#sfTab').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; UI.tab = b.dataset.t; UI.q = null; [...$('#sfTab').children].forEach(x => x.classList.toggle('on', x === b)); paintFund(); quoteSoon(); };
    el.addEventListener('click', onClick);
    el.addEventListener('input', onInput);
    const EX = ['5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', 'GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ'];
    const exs = () => { $('#tzEx').innerHTML = 'try: ' + EX.map(a => `<button type="button" data-tz="${a}">${short(a)}</button>`).join(' · ') + (WAL.MAIN.addr ? ` · <button type="button" data-tz="${WAL.MAIN.addr}">your main wallet</button>` : '') + (WAL.W.fresh ? ` · <button type="button" data-tz="${WAL.W.addr}">${esc(WAL.W.name)}</button>` : ''); };
    exs(); WAL.on(exs);
    $('#tzEx').addEventListener('click', e => { const b = e.target.closest('[data-tz]'); if (!b) return; $('#tzQ').value = b.dataset.tz; trace(); });
    $('#tzF').addEventListener('submit', e => { e.preventDefault(); trace(); });
  }
  const when = t => t ? new Date(t * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'unknown date';
  async function trace() {
    const a = $('#tzQ').value.trim(), out = $('#tzO');
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) { out.innerHTML = '<div class="tz-e">That doesn\'t look like a Solana address.</div>'; return; }
    $('#tzB').disabled = true; out.innerHTML = '<div class="tz-e">reading Solana…</div>';
    try {
      const r = await api('trace', { addr: a }), h1 = r.hop1, f1 = h1 && h1.first, f2 = r.hop2 && r.hop2.first;
      const node = (k, cls, ad, sub) => `<div class="tz-n ${cls}"><i>${k}</i><div><button class="ad" data-copy="${esc(ad)}">${esc(ad)}</button><span>${sub}</span></div><a href="https://solscan.io/account/${esc(ad)}" target="_blank" rel="noopener">↗</a></div>`;
      let h = node('YOU', '', a, (r.sol != null ? r.sol.toFixed(3) + ' SOL now · ' : '') + (h1.txs ? (h1.more ? h1.txs.toLocaleString() + '+' : h1.txs.toLocaleString()) + ' transactions' : 'no history'));
      if (f1 && f1.funder && !h1.more) {
        h += `<div class="tz-l2">funded by · ${f1.sol ? f1.sol.toFixed(3) + ' SOL · ' : ''}${esc(when(f1.time))}</div>` + node('1', 'f', f1.funder, 'its first SOL came from here');
        if (f2 && f2.funder) h += `<div class="tz-l2">funded by · ${f2.sol ? f2.sol.toFixed(3) + ' SOL · ' : ''}${esc(when(f2.time))}</div>` + node('2', 'f2', f2.funder, 'two hops back');
        h += `<div class="tz-v">Linked to <b>${esc(short(f1.funder))}</b>${f2 && f2.funder ? ' and through it to <b>' + esc(short(f2.funder)) + '</b>' : ''}. Anyone can follow that line. A fresh wallet funded through a route starts its trail at a solver instead.</div>`;
      } else if (h1.more) h += `<div class="tz-v">${h1.txs.toLocaleString()}+ transactions: its first funding is older than this quick trace pages back. Explorers and analytics tools still reach it, and everything it has done since is public too.</div>`;
      else h += '<div class="tz-v ok">No funding trail found: this wallet has no history yet, or its first SOL came in a way this trace does not read.</div>';
      out.innerHTML = h;
    } catch (e) { out.innerHTML = `<div class="tz-e">Could not read Solana right now (${esc(e.message)}). Try again in a moment.</div>`; }
    $('#tzB').disabled = false;
  }
  function walletsHTML() {
    const M = WAL.MAIN, F = WAL.fresh(), act = WAL.active();
    $('#sfState').innerHTML = WAL.W.fresh ? `<span class="pill anon">${MASK} trading from <b>${esc(WAL.W.name)}</b></span>` : WAL.W.addr ? `<span class="pill main">${EYE} trading from your <b>main wallet</b></span>` : `<span class="pill">no wallet on</span>`;
    $('#sfMain').innerHTML = `<div class="wc main ${act === 'main' ? 'on' : ''}"><div class="wc-t">${EYE}<b>main wallet</b><em class="tag ex">exposed</em>${act === 'main' && M.addr ? '<em class="tag onl">on</em>' : ''}</div>
      ${M.addr ? `<div class="wc-a"><button class="ad" data-copy="${esc(M.addr)}">${esc(M.name)} · ${short(M.addr)}</button><span class="bal" data-bal="${esc(M.addr)}">… SOL</span></div>
      <div class="wc-b">${act === 'main' ? '' : '<button class="kb" data-use="main">trade from main</button>'}<span class="mute">pays route deposits · everything it does is public and tied to you</span></div>`
      : `<div class="wc-b"><button class="kb" data-connect>connect Phantom, Solflare or Backpack</button><span class="mute">only needed to fund a fresh wallet</span></div>`}</div>`;
    $('#sfList').innerHTML = F.length ? F.map(f => `<div class="wc fresh ${act === f.id ? 'on' : ''}" data-id="${f.id}">
      <div class="wc-t">${MASK}<b>${esc(f.label)}</b><em class="tag fr">fresh</em>${act === f.id ? '<em class="tag onl">on</em>' : ''}<span class="born">made ${new Date(f.born).toLocaleDateString()}</span></div>
      <div class="wc-a"><button class="ad" data-copy="${esc(f.pub)}">${short(f.pub)}</button><span class="bal" data-bal="${esc(f.pub)}">… SOL</span></div>
      <div class="wc-p" data-priv="${esc(f.pub)}"><i></i><span>checking its trail on Solana…</span></div>
      <div class="wc-b">${act === f.id ? '<button class="kb dim" data-use="main">switch off</button>' : `<button class="kb hot" data-use="${f.id}">switch on</button>`}<button class="kb" data-fund="${f.id}">fund</button><button class="kb" data-out="${f.id}">cash out</button><button class="kb" data-acts="${esc(f.pub)}">activity</button><button class="kb" data-exp="${f.id}">export key</button><button class="kb warn" data-burn="${f.id}">burn</button></div>
      <div class="wc-acts" data-actsbox="${esc(f.pub)}" hidden></div></div>`).join('')
      : `<div class="wc empty-w"><b>No fresh wallets yet.</b><p>Make one: a new Solana keypair, generated right here in your browser. Its key never leaves this browser.</p><button class="kb hot" data-new>${MASK} make a fresh wallet</button></div>`;
  }
  async function paintWallets() {
    if (!$('#sfMain')) return; walletsHTML();
    const addrs = [WAL.MAIN.addr, ...WAL.fresh().map(f => f.pub)].filter(Boolean);
    await Promise.all(addrs.map(async a => { const b = await balOf(a); document.querySelectorAll(`[data-bal="${a}"]`).forEach(n => { const tk = b && b.tokens ? b.tokens.length : 0; n.innerHTML = b && b.sol != null ? `${sol(b.sol)} SOL${tk ? `<small>+${tk} token${tk > 1 ? 's' : ''}${b.total ? ' · $' + b.total.toFixed(2) : ''}</small>` : ''}` : '— SOL'; }); }));
    WAL.fresh().forEach(f => privacy(f.pub));
  }
  // is this fresh wallet linked to your main? read its first funder from Solana
  const PRIV = {};
  async function privacy(pub, force) {
    const el = () => document.querySelector(`[data-priv="${pub}"]`);
    let r = PRIV[pub];
    if (force || !r || Date.now() - r.t > 60000) { try { r = PRIV[pub] = { t: Date.now(), v: await api('trace', { addr: pub }) }; } catch { r = null; } }
    const box = el(); if (!box) return;
    if (!r) { box.className = 'wc-p'; box.innerHTML = '<i></i><span>could not read its trail right now</span>'; return; }
    const h = r.v.hop1, f = h && h.first, M = WAL.MAIN.addr;
    if (!h || !h.txs) { box.className = 'wc-p idle'; box.innerHTML = '<i></i><span>never used: no transactions on-chain yet</span>'; return; }
    if (f && f.funder && M && f.funder === M) { box.className = 'wc-p bad'; box.innerHTML = `<i></i><span><b>linked</b> · its first SOL came straight from your main wallet</span>`; return; }
    if (f && f.funder) { box.className = 'wc-p good'; box.innerHTML = `<i></i><span><b>${M ? 'unlinked' : 'trail'}</b> · first SOL from <button class="ad" data-copy="${esc(f.funder)}">${short(f.funder)}</button>${M ? ', not your main' : ''} · ${h.txs} tx${h.txs > 1 ? 's' : ''}</span>`; return; }
    box.className = 'wc-p'; box.innerHTML = `<i></i><span>${h.txs} transactions · first funder not readable</span>`;
  }
  async function activity(pub) {
    const box = document.querySelector(`[data-actsbox="${pub}"]`); if (!box) return;
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false; box.innerHTML = '<span class="mute">reading Solana…</span>';
    try {
      const r = await api('acts', { addr: pub });
      box.innerHTML = r.acts.length ? r.acts.map(a => `<a href="https://solscan.io/tx/${esc(a.sig)}" target="_blank" rel="noopener"><span class="${a.err ? 'dn' : 'up'}">${a.err ? 'failed' : 'ok'}</span><code>${esc(a.sig.slice(0, 10))}…</code><em>${a.time ? ago(a.time) : ''}</em></a>`).join('') : '<span class="mute">no transactions yet</span>';
    } catch (e) { box.innerHTML = `<span class="mute">could not read it (${esc(e.message)})</span>`; }
  }
  const ago = t => { const d = Math.max(0, Date.now() / 1000 - t); return d < 60 ? Math.round(d) + 's ago' : d < 3600 ? Math.round(d / 60) + 'm ago' : d < 86400 ? Math.round(d / 3600) + 'h ago' : Math.round(d / 86400) + 'd ago'; };
  function freshOpts(sel) { return WAL.fresh().map(f => `<option value="${f.id}" ${sel === f.id ? 'selected' : ''}>${esc(f.label)} · ${short(f.pub)}</option>`).join(''); }
  function paintFund() {
    const el = $('#sfFund'); if (!el) return;
    const F = WAL.fresh(), M = WAL.MAIN;
    if (!UI.to || !F.find(f => f.id === UI.to)) UI.to = (WAL.W.fresh && WAL.W.fresh.id) || (F[0] && F[0].id) || null;
    if (!F.length) { el.innerHTML = `<div class="empty">Make a fresh wallet first, then fund it here.</div>`; return; }
    const q = UI.q;
    el.innerHTML = UI.tab === 'hop' ? `
      <div class="lead2">Your main wallet pays a one-time deposit address. A NEAR Intents solver pays your fresh wallet from its own funds, so on-chain there is no transfer between the two.</div>
      <div class="fr2"><label>from</label><div class="fv">${M.addr ? `${EYE} main · ${short(M.addr)}` : '<button class="kb" data-connect>connect main wallet</button>'}</div></div>
      <div class="fr2"><label for="sfTo">to</label><select id="sfTo">${freshOpts(UI.to)}</select></div>
      <div class="fr2"><label for="sfAmt">amount</label><div class="amt"><input id="sfAmt" inputmode="decimal" placeholder="0.00" value="${esc(UI.amt)}"><span>SOL</span></div><span class="qk"><button data-qa="0.1">0.1</button><button data-qa="0.5">0.5</button><button data-qa="1">1</button></span></div>
      <div class="qt" id="sfQ">${q ? q.error ? `<span class="dn">${esc(q.error)}</span>` : `<span>they receive <b>≈ ${esc(q.amountOutFormatted)} SOL</b></span><span>fee ≈ ${fee(q)}</span><span>~${q.timeEstimate || 20}s</span>` : UI.amt ? '<span class="mute">getting a live quote…</span>' : '<span class="mute">enter an amount for a live quote</span>'}</div>
      <button class="sgo" id="sfGo" ${UI.busy ? 'disabled' : ''}>${UI.busy ? 'routing…' : M.addr ? 'fund privately' : 'connect main wallet to fund'}</button>
      <div class="tip">Round amounts help: 1 SOL in, 0.999 out is easy to match. Waiting a while before you trade helps more.</div>`
    : `
      <div class="lead2">Two legs through your own Zcash wallet. SOL goes to your shielded ZEC address, then ZEC comes back out as SOL to the fresh wallet. Slower, and the strongest break.</div>
      <div class="fr2"><label for="sfZ">your ZEC address</label><input id="sfZ" class="txt" placeholder="u1… or zs… (shielded) or t1…" value="${esc(UI.zaddr)}" spellcheck="false"></div>
      <div class="fr2"><label for="sfTo">to</label><select id="sfTo">${freshOpts(UI.to)}</select></div>
      <div class="fr2"><label for="sfAmt">leg 1 amount</label><div class="amt"><input id="sfAmt" inputmode="decimal" placeholder="0.00" value="${esc(UI.amt)}"><span>SOL</span></div><span class="qk"><button data-qa="0.5">0.5</button><button data-qa="1">1</button><button data-qa="2">2</button></span></div>
      <div class="qt" id="sfQ">${q ? q.error ? `<span class="dn">${esc(q.error)}</span>` : `<span>your Zcash wallet receives <b>≈ ${esc(q.amountOutFormatted)} ZEC</b></span><span>~${q.timeEstimate || 60}s</span>` : '<span class="mute">enter your ZEC address and an amount</span>'}</div>
      <div class="legs"><button class="sgo" id="sfL1" ${UI.busy ? 'disabled' : ''}>leg 1 · send SOL to my Zcash wallet</button><button class="sgo alt" id="sfL2">leg 2 · get a ZEC deposit address for the fresh wallet</button></div>
      <div id="sfL2o"></div>`;
  }
  const fee = q => { const i = parseFloat(q.amountInFormatted), o = parseFloat(q.amountOutFormatted); return i > 0 && o >= 0 ? ((i - o) / i * 100).toFixed(2) + '%' : '—'; };
  function paintOut() {
    const el = $('#sfOut'); if (!el) return;
    const F = WAL.fresh(), M = WAL.MAIN;
    if (!UI.from || !F.find(f => f.id === UI.from)) UI.from = (WAL.W.fresh && WAL.W.fresh.id) || (F[0] && F[0].id) || null;
    if (!F.length) { el.innerHTML = `<div class="empty">Nothing to cash out yet.</div>`; return; }
    const q = UI.oq;
    el.innerHTML = `
      <div class="fr2"><label for="sfFrom">from</label><select id="sfFrom">${freshOpts(UI.from)}</select></div>
      <div class="fr2"><label for="sfOT">to</label><div class="fv col"><select id="sfOT"><option value="main" ${UI.outTo === 'main' ? 'selected' : ''}>my main wallet${M.addr ? ' · ' + short(M.addr) : ' (connect it first)'}</option><option value="other" ${UI.outTo !== 'main' ? 'selected' : ''}>another address</option></select>${UI.outTo !== 'main' ? `<input id="sfOA" class="txt" placeholder="Solana address" value="${esc(UI.outTo === 'other' ? '' : UI.outTo)}" spellcheck="false">` : ''}</div></div>
      <div class="fr2"><label for="sfOAmt">amount</label><div class="amt"><input id="sfOAmt" inputmode="decimal" placeholder="0.00" value="${esc(UI.oamt)}"><span>SOL</span></div><span class="qk"><button data-oq="max">max</button></span></div>
      <div class="qt" id="sfOQ">${q ? q.error ? `<span class="dn">${esc(q.error)}</span>` : `<span>arrives <b>≈ ${esc(q.amountOutFormatted)} SOL</b></span><span>fee ≈ ${fee(q)}</span><span>~${q.timeEstimate || 20}s</span>` : '<span class="mute">routed through NEAR Intents, so the receiving wallet is not linked to this one</span>'}</div>
      <button class="sgo" id="sfOGo" ${UI.obusy ? 'disabled' : ''}>${UI.obusy ? 'routing…' : 'cash out privately'}</button>`;
  }
  let qT = 0, oqT = 0, qid = 0, oqid = 0;
  function quoteSoon() { clearTimeout(qT); UI.q = null; const a = parseFloat(UI.amt); if (!(a > 0)) { paintQ(); return; } if (UI.tab === 'zec' && UI.zaddr.length < 30) { paintQ(); return; } paintQ(); qT = setTimeout(doQuote, 500); }
  function paintQ() { const el = $('#sfQ'); if (!el) return; const tmp = document.createElement('div'); paintFundQOnly(tmp); el.innerHTML = tmp.innerHTML; }
  function paintFundQOnly(box) { const q = UI.q; box.innerHTML = q ? q.error ? `<span class="dn">${esc(q.error)}</span>` : UI.tab === 'hop' ? `<span>they receive <b>≈ ${esc(q.amountOutFormatted)} SOL</b></span><span>fee ≈ ${fee(q)}</span><span>~${q.timeEstimate || 20}s</span>` : `<span>your Zcash wallet receives <b>≈ ${esc(q.amountOutFormatted)} ZEC</b></span><span>~${q.timeEstimate || 60}s</span>` : UI.amt ? '<span class="mute">getting a live quote…</span>' : '<span class="mute">enter an amount for a live quote</span>'; }
  async function doQuote() {
    const id = ++qid, to = WAL.fresh().find(f => f.id === UI.to);
    try { const q = await post('route', UI.tab === 'hop' ? { from: 'SOL', to: 'SOL', amount: UI.amt, dry: true, recipient: to ? to.pub : undefined, refundTo: WAL.MAIN.addr || undefined } : { from: 'SOL', to: 'ZEC', amount: UI.amt, dry: true, recipient: UI.zaddr, refundTo: WAL.MAIN.addr || undefined }); if (id === qid) { UI.q = q; paintQ(); } }
    catch (e) { if (id === qid) { UI.q = { error: e.message }; paintQ(); } }
  }
  function oquoteSoon() { clearTimeout(oqT); UI.oq = null; const a = parseFloat(UI.oamt); const el = $('#sfOQ'); if (el) el.innerHTML = a > 0 ? '<span class="mute">getting a live quote…</span>' : '<span class="mute">routed through NEAR Intents, so the receiving wallet is not linked to this one</span>'; if (a > 0) oqT = setTimeout(doOQuote, 500); }
  async function doOQuote() {
    const id = ++oqid, f = WAL.fresh().find(x => x.id === UI.from), dest = outDest();
    try { const q = await post('route', { from: 'SOL', to: 'SOL', amount: UI.oamt, dry: true, recipient: dest || undefined, refundTo: f ? f.pub : undefined }); if (id === oqid) { UI.oq = q; paintOut(); } }
    catch (e) { if (id === oqid) { UI.oq = { error: e.message }; paintOut(); } }
  }
  const outDest = () => UI.outTo === 'main' ? WAL.MAIN.addr : (UI.outTo === 'other' ? '' : UI.outTo);

  async function runRoute(kind, from, to, amount, payer, recipient, refundTo) {
    const q = await post('route', { from, to, amount, recipient, refundTo });
    if (!q.depositAddress) throw new Error('no deposit address came back');
    const r = { kind, dep: q.depositAddress, from, to, amt: amount, out: q.amountOutFormatted, status: 'PENDING_DEPOSIT', t: Date.now() };
    RT.push(r); saveRT(); paintRoutes();
    if (from === 'SOL') {
      const bh = await api('bh');
      const lam = Math.round(parseFloat(amount) * 1e9);
      try { r.sig = await WAL.transfer({ from: payer, to: q.depositAddress, lamports: lam, blockhash: bh.blockhash }, relay); }
      catch (e) { r.status = 'NOT_SENT'; saveRT(); paintRoutes(); throw e; }
      saveRT(); paintRoutes();
      post('rsubmit', { txHash: r.sig, depositAddress: q.depositAddress }).catch(() => { });
    }
    pollRoute(r); return r;
  }
  async function onClick(e) {
    const t = e.target;
    const cp = t.closest('[data-copy]'); if (cp) return copy(cp.dataset.copy);
    const ac = t.closest('[data-acts]'); if (ac) return activity(ac.dataset.acts);
    const u = t.closest('[data-use]'); if (u) { if (u.dataset.use === 'main' && !WAL.MAIN.addr) return openConnect(); WAL.use(u.dataset.use); toast(u.dataset.use === 'main' ? 'trading from your main wallet' : 'trading from ' + WAL.W.name); return; }
    if (t.closest('[data-new]')) return newFresh(!WAL.W.fresh);
    const fd = t.closest('[data-fund]'); if (fd) { UI.to = fd.dataset.fund; paintFund(); $('#sfAmt') && $('#sfAmt').focus(); return; }
    const ou = t.closest('[data-out]'); if (ou) { UI.from = ou.dataset.out; paintOut(); $('#sfOAmt') && $('#sfOAmt').focus(); return; }
    const ex = t.closest('[data-exp]'); if (ex) return exportKey(ex.dataset.exp);
    const bu = t.closest('[data-burn]'); if (bu) return burn(bu);
    const qa = t.closest('[data-qa]'); if (qa) { UI.amt = qa.dataset.qa; $('#sfAmt').value = UI.amt; return quoteSoon(); }
    const oq = t.closest('[data-oq]'); if (oq) { const f = WAL.fresh().find(x => x.id === UI.from); const b = f && await balOf(f.pub, true); const v = b && b.sol != null ? Math.max(0, b.sol - 0.003) : 0; UI.oamt = v > 0 ? v.toFixed(4) : ''; paintOut(); return oquoteSoon(); }
    if (t.closest('#sfGo')) {
      if (!WAL.MAIN.addr) return openConnect();
      const to = WAL.fresh().find(f => f.id === UI.to); if (!to) return toast('pick a fresh wallet');
      if (!(parseFloat(UI.amt) > 0)) return toast('enter an amount');
      UI.busy = true; paintFund();
      try { await runRoute('fast hop', 'SOL', 'SOL', UI.amt, 'main', to.pub, WAL.MAIN.addr); toast('deposit sent, routing to ' + to.label); }
      catch (err) { toast(err.message || 'the route failed'); }
      UI.busy = false; paintFund(); return;
    }
    if (t.closest('#sfL1')) {
      if (!WAL.MAIN.addr) return openConnect();
      if (UI.zaddr.length < 30) return toast('enter your Zcash address');
      if (!(parseFloat(UI.amt) > 0)) return toast('enter an amount');
      UI.busy = true; paintFund();
      try { await runRoute('shielded · leg 1', 'SOL', 'ZEC', UI.amt, 'main', UI.zaddr, WAL.MAIN.addr); toast('leg 1 sent: SOL is on its way to your Zcash wallet'); }
      catch (err) { toast(err.message || 'the route failed'); }
      UI.busy = false; paintFund(); return;
    }
    if (t.closest('#sfL2') || t.closest('[data-l2go]')) {
      const to = WAL.fresh().find(f => f.id === UI.to); if (!to) return toast('pick a fresh wallet');
      if (UI.zaddr.length < 30) return toast('enter your Zcash address (for refunds)');
      const zamt = prompt2(); if (!zamt) return;
      try {
        const q = await post('route', { from: 'ZEC', to: 'SOL', amount: zamt, recipient: to.pub, refundTo: UI.zaddr });
        const r = { kind: 'shielded · leg 2', dep: q.depositAddress, from: 'ZEC', to: 'SOL', amt: zamt, out: q.amountOutFormatted, status: 'PENDING_DEPOSIT', t: Date.now() };
        RT.push(r); saveRT(); paintRoutes(); pollRoute(r);
        $('#sfL2o').innerHTML = `<div class="dep"><span>From your Zcash wallet, send exactly</span><b>${esc(zamt)} ZEC</b><span>to this one-time address</span><button class="ad big" data-copy="${esc(q.depositAddress)}">${esc(q.depositAddress)}</button><span class="mute">${esc(to.label)} receives ≈ ${esc(q.amountOutFormatted)} SOL once it lands. Status shows below.</span></div>`;
      } catch (err) { toast(err.message || 'could not get a ZEC deposit address'); }
      return;
    }
    if (t.closest('#sfOGo')) {
      const f = WAL.fresh().find(x => x.id === UI.from); if (!f) return toast('pick a fresh wallet');
      const dest = UI.outTo === 'main' ? WAL.MAIN.addr : ($('#sfOA') && $('#sfOA').value.trim());
      if (!dest) return UI.outTo === 'main' ? openConnect() : toast('enter the address that receives it');
      if (!(parseFloat(UI.oamt) > 0)) return toast('enter an amount');
      UI.obusy = true; paintOut();
      try { await runRoute('cash out', 'SOL', 'SOL', UI.oamt, f.id, dest, f.pub); toast('deposit sent from ' + f.label); }
      catch (err) { toast(err.message || 'the route failed'); }
      UI.obusy = false; paintOut(); return;
    }
  }
  function prompt2() { const v = ($('#sfZamt') && $('#sfZamt').value) || ''; if (v) return v; const box = $('#sfL2o'); box.innerHTML = `<div class="dep"><span>How much ZEC will you send from your Zcash wallet?</span><div class="amt"><input id="sfZamt" inputmode="decimal" placeholder="0.00"><span>ZEC</span></div><button class="sgo alt" data-l2go>get the deposit address</button></div>`; $('#sfZamt').focus(); return null; }
  function onInput(e) {
    const t = e.target;
    if (t.id === 'sfAmt') { UI.amt = t.value.replace(/[^\d.]/g, ''); quoteSoon(); }
    if (t.id === 'sfZ') { UI.zaddr = t.value.trim(); store.set('anon.zaddr', UI.zaddr || null); quoteSoon(); }
    if (t.id === 'sfTo') { UI.to = t.value; quoteSoon(); }
    if (t.id === 'sfFrom') { UI.from = t.value; oquoteSoon(); }
    if (t.id === 'sfOT') { UI.outTo = t.value; UI.oq = null; paintOut(); }
    if (t.id === 'sfOA') { UI.outTo = t.value.trim() || 'other'; oquoteSoon(); }
    if (t.id === 'sfOAmt') { UI.oamt = t.value.replace(/[^\d.]/g, ''); oquoteSoon(); }
  }
  function exportKey(id) {
    const f = WAL.fresh().find(x => x.id === id); if (!f) return;
    const sh = document.createElement('div'); sh.className = 'sheet on'; sh.innerHTML = `<div class="sheet-in"><div class="sh-h"><b>export ${esc(f.label)}</b><button class="kb" data-close>×</button></div>
      <p class="sub" style="margin:8px 0 12px">This is the wallet's secret key. Anyone who has it controls the wallet. Import it into Phantom, Solflare or Backpack (add wallet → import private key).</p>
      <div class="keybox" id="kbx"><span>tap to reveal</span></div><div class="wc-b" style="margin-top:12px"><button class="kb hot" id="kcp">copy key</button><button class="kb" data-close>done</button></div></div>`;
    document.body.appendChild(sh);
    const k = WAL.freshExport(id);
    sh.addEventListener('click', e => { if (e.target === sh || e.target.closest('[data-close]')) sh.remove(); if (e.target.closest('#kbx')) $('#kbx', sh).textContent = k; if (e.target.closest('#kcp')) copy(k, 'secret key'); });
  }
  async function burn(btn) {
    const id = btn.dataset.burn, f = WAL.fresh().find(x => x.id === id); if (!f) return;
    if (!btn.classList.contains('sure')) {
      const b = await balOf(f.pub, true);
      btn.classList.add('sure'); btn.textContent = b && b.sol > 0.001 ? `it holds ${sol(b.sol)} SOL · burn anyway?` : 'sure? burn it'; setTimeout(() => { btn.classList.remove('sure'); btn.textContent = 'burn'; }, 4000); return;
    }
    WAL.freshBurn(id); toast(f.label + ' burned from this browser'); render();
  }

  WAL.on(() => { chip(); if ($('#safe') && $('#safe').dataset.built) { paintWallets(); paintFund(); paintOut(); } });
  function traceFor(a) { render(); const q = $('#tzQ'); if (!q) return; q.value = a; trace(); }
  function prefill(kind, a) {
    render();
    if (kind === 'fund') { if (a && a !== 'max') { UI.amt = a; const i = $('#sfAmt'); if (i) i.value = a; quoteSoon(); } const i = $('#sfAmt'); if (i) { i.scrollIntoView({ block: 'center', behavior: 'smooth' }); i.focus(); } }
    else { const i = $('#sfOAmt'); if (a === 'max') { const b = document.querySelector('[data-oq="max"]'); if (b) b.click(); } else if (a) { UI.oamt = a; if (i) i.value = a; oquoteSoon(); } const j = $('#sfOAmt'); if (j) { j.scrollIntoView({ block: 'center', behavior: 'smooth' }); j.focus(); } }
  }
  window.ANONSAFE = { render, chip, newFresh, goAnon, trace: traceFor, prefill };
  chip();
})();
