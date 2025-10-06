
// app.js - DeFire Calculator static app (single-file)
// Uses TronLink (window.tronWeb) when available. Client-side only.
// CDN-hosted sounds are used.

const OWNER_WALLET = "TY691Xr2EWgKJmHfm7NWKMRJjojLmS2cma";
const FBA_CONTRACT = "TNW5ABkp3v4jfeDo1vRVjxa3gtnoxP3DBN";
const FBA_MIN = 1000;
const TSCAN_TOKENS = addr => `https://apilist.tronscanapi.com/api/account/tokens?address=${addr}&limit=500`;
const TSCAN_ACCOUNTV2 = addr => `https://apilist.tronscanapi.com/api/accountv2?address=${addr}`;
const JUSTLEND_ACCOUNT = addr => `https://api.just.network/api/v1/account?address=${addr}`;
const SUN_USER_INFO = addr => `https://api.sun.io/v3/user/info?address=${addr}`;
const BTT_INFO = addr => `https://apilist.tronscanapi.com/api/account/btt?address=${addr}`;

let tronWeb = window.tronWeb || null;
let connectedAddr = "";
let manualPrices = JSON.parse(localStorage.getItem('defire_manualPrices')||'{}');
let settings = JSON.parse(localStorage.getItem('defire_settings')||'{"sound":true,"autorefresh":true,"theme":"dark","interval":60}');

const soundCrackleCDN = "https://cdn.jsdelivr.net/gh/jsturgis/sounds@main/fire-crackle-short.mp3";
const soundClickCDN = "https://cdn.jsdelivr.net/gh/jsturgis/sounds@main/click.mp3";

const audioCrackle = new Audio(soundCrackleCDN);
audioCrackle.loop = false;
audioCrackle.volume = 0.28;
const audioClick = new Audio(soundClickCDN);
audioClick.volume = 0.6;

function playCrackle(){ if(settings.sound) audioCrackle.play().catch(()=>{}); }
function playClick(){ if(settings.sound) audioClick.play().catch(()=>{}); }

function $(sel){ return document.querySelector(sel); }
function create(tag, attrs={}){ const el = document.createElement(tag); Object.assign(el, attrs); return el; }

function showLoading(show){
  const ld = document.getElementById('loading');
  if(ld) ld.style.display = show ? 'flex' : 'none';
}

function initUI(){
  const app = $('#app');
  app.innerHTML = '';
  const header = create('div',{className:'header'});
  header.innerHTML = `<div><div class="h1">🔥 DeFire Calculator</div><div class="small">Dark molten theme • Wallet connect (TronLink)</div></div><div class="small">Owner / FBA whitelist</div>`;
  app.appendChild(header);

  const calcCard = create('div',{className:'card', id:'calcCard'});
  calcCard.innerHTML = `
    <h2>🔥 FIRE Calculator</h2>
    <div class="row"><label>Yearly expenses (CAD)</label><input id="expenses" type="number" value="24000" /></div>
    <div class="row"><label>Current savings (CAD)</label><input id="current" type="number" value="116247" /></div>
    <div class="row"><label>Yearly savings (CAD)</label><input id="yearly" type="number" value="24000" /></div>
    <div class="row"><label>Expected APY (%)</label><input id="apy" type="number" value="7" /></div>
    <div class="row"><button id="calcBtn">🔥 Calculate FIRE</button><div id="fireResult" class="pill">Idle</div></div>
    <div id="fireOutput" class="small"></div>
  `;
  app.appendChild(calcCard);

  const portCard = create('div',{className:'card', id:'portCard'});
  portCard.innerHTML = `
    <h2>💰 Portfolio Tracker</h2>
    <div class="row"><label>Connected wallet</label><div class="pill" id="connected">Not connected</div></div>
    <div class="row"><label>FBA balance</label><div class="pill" id="fba">—</div></div>
    <div class="row"><label>Whitelist</label><div class="pill" id="whitelist">Unknown</div></div>
    <div class="row"><label>Wallets (one per line)</label><textarea id="walletsText" rows="4" placeholder="Paste TRON addresses (T...)" /></div>
    <div class="row"><label>Optional tokens (comma)</label><input id="manualTokens" /></div>
    <div class="row"><button id="connectBtn">🔗 Connect TronLink</button><button id="calcNetBtn">🧮 Calculate Net Worth</button><div id="progress" class="pill">Idle</div></div>
    <div class="total" id="grand">Grand Total: —</div>
    <div class="small">Per-wallet subtotal:</div><div id="perWallet" class="small"></div>
    <div><strong>Unpriced (click to set manual price)</strong><div id="unpriced" class="small"></div></div>
    <div><pre id="debug" class="debug">No run yet.</pre></div>
  `;
  app.appendChild(portCard);

  const settingsCard = create('div',{className:'card', id:'settingsCard'});
  settingsCard.innerHTML = `
    <h2>⚙️ Settings</h2>
    <div class="row settings-row"><label>Sound</label><select id="soundToggle"><option value="true">On</option><option value="false">Off</option></select></div>
    <div class="row settings-row"><label>Auto-refresh</label><select id="autoToggle"><option value="true">On</option><option value="false">Off</option></select></div>
    <div class="row settings-row"><label>Refresh interval (sec)</label><input id="intervalSec" type="number" value="${settings.interval}" /></div>
    <div class="row settings-row"><label>Theme</label><select id="themeSel"><option value="dark">Dark (🔥)</option><option value="light">Light</option></select></div>
  `;
  app.appendChild(settingsCard);

  const sparks = create('div',{className:'sparks'});
  document.body.appendChild(sparks);

  // bottom nav
  const nav = create('div',{className:'bottom-nav'});
  nav.innerHTML = `<div class="nav-btn active" data-tab="calc">🔥 Calculator</div><div class="nav-btn" data-tab="port">💰 Portfolio</div><div class="nav-btn" data-tab="settings">⚙️ Settings</div>`;
  document.body.appendChild(nav);

  // wire nav
  nav.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const t = btn.getAttribute('data-tab');
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('calcCard').style.display = t==='calc' ? 'block' : 'none';
      document.getElementById('portCard').style.display = t==='port' ? 'block' : 'none';
      document.getElementById('settingsCard').style.display = t==='settings' ? 'block' : 'none';
      playCrackle();
    });
  });

  // initial visibility
  document.getElementById('portCard').style.display = 'none';
  document.getElementById('settingsCard').style.display = 'none';

  // wire buttons
  document.getElementById('calcBtn').addEventListener('click', ()=>{ calcFireUI(); playClick(); });
  document.getElementById('connectBtn').addEventListener('click', ()=>{ connectTronLink(); playClick(); });
  document.getElementById('calcNetBtn').addEventListener('click', ()=>{ computeNetWorth(); playClick(); });

  // settings wiring
  document.getElementById('soundToggle').value = settings.sound ? 'true' : 'false';
  document.getElementById('autoToggle').value = settings.autorefresh ? 'true' : 'false';
  document.getElementById('themeSel').value = settings.theme || 'dark';
  document.getElementById('soundToggle').addEventListener('change', (e)=>{ settings.sound = e.target.value==='true'; localStorage.setItem('defire_settings', JSON.stringify(settings)); });
  document.getElementById('autoToggle').addEventListener('change', (e)=>{ settings.autorefresh = e.target.value==='true'; localStorage.setItem('defire_settings', JSON.stringify(settings)); });
  document.getElementById('intervalSec').addEventListener('change', (e)=>{ settings.interval = Number(e.target.value); localStorage.setItem('defire_settings', JSON.stringify(settings)); });

  // restore last wallets list if any
  const lastWallets = localStorage.getItem('defire_wallets')||'';
  document.getElementById('walletsText').value = lastWallets;

  // auto-refresh on connect
  if(settings.autorefresh && window.tronWeb && window.tronWeb.ready){ connectTronLink(); setInterval(()=>{ if(window.tronWeb && window.tronWeb.ready) computeNetWorth(); }, settings.interval*1000); }
}

function calcFireUI(){
  const expenses = Number(document.getElementById('expenses').value || 0);
  const current = Number(document.getElementById('current').value || 0);
  const yearly = Number(document.getElementById('yearly').value || 0);
  const apy = Number(document.getElementById('apy').value || 0);
  if([expenses,current,yearly,apy].some(x=>!isFinite(x) || x<0)){ document.getElementById('fireResult').innerText = 'Fill valid numbers'; return; }
  const r = apy/100;
  const target = expenses*25;
  let bal = current;
  let years = 0;
  while(bal<target && years<100){ bal = bal*(1+r)+yearly; years++; }
  const out = years>=100? '🚫 Not reached in 100 years' : `🎉 You can retire in ${years} years • Projected: $${bal.toFixed(2)}`;
  document.getElementById('fireOutput').innerText = out;
  document.getElementById('fireResult').innerText = 'Done';
}

// TronLink connect + whitelist
async function connectTronLink(){
  if(!window.tronWeb || !window.tronWeb.ready){ alert('Open in TronLink in-app browser or unlock TronLink'); return; }
  tronWeb = window.tronWeb;
  connectedAddr = tronWeb.defaultAddress.base58 || '';
  document.getElementById('connected').innerText = connectedAddr || 'Unknown';
  document.getElementById('progress').innerText = 'Checking whitelist...';
  // owner bypass
  if(connectedAddr === OWNER_WALLET){ document.getElementById('fba').innerText = 'Owner'; document.getElementById('whitelist').innerText = 'Access granted'; return; }
  try{
    const contract = await tronWeb.contract().at(FBA_CONTRACT);
    const raw = await contract.balanceOf(connectedAddr).call();
    let dec = 6;
    try{ dec = Number((await contract.decimals().call())?.toString()||6); }catch(e){}
    const bal = convertBigIntToNumber(raw, dec);
    document.getElementById('fba').innerText = `${bal.toLocaleString()} FBA`;
    if(bal>=FBA_MIN){ document.getElementById('whitelist').innerText = 'Access granted'; } else { document.getElementById('whitelist').innerText = 'Locked (need 1000 FBA)'; }
    if(settings.autorefresh && (bal>=FBA_MIN || connectedAddr===OWNER_WALLET)){ computeNetWorth(); setInterval(()=>{ computeNetWorth(); }, settings.interval*1000); }
  }catch(e){ console.error(e); document.getElementById('fba').innerText = 'Error'; document.getElementById('whitelist').innerText = 'Error'; }
}

function convertBigIntToNumber(raw, decimals){
  try{
    const s = raw && raw._hex ? raw._hex : (raw && raw.toString ? raw.toString() : raw);
    const bi = BigInt(s.toString());
    const scale = 10n ** BigInt(decimals);
    const intPart = bi / scale;
    const frac = bi % scale;
    const fracStr = frac.toString().padStart(decimals,'0').slice(0,8).replace(/0+$/,'');
    return Number(fracStr ? `${intPart.toString()}.${fracStr}` : `${intPart.toString()}`);
  }catch(e){ return 0; }
}

async function fetchTronscanTokens(addr){
  try{
    const res = await fetch(TSCAN_TOKENS(addr));
    if(!res.ok) throw new Error('TronScan tokens HTTP '+res.status);
    const json = await res.json();
    const list = json?.data || json?.tokens || [];
    return list.map(t=>{
      const contract = t.tokenId || t.tokenAddress || t.contract_address || t.contract || '';
      const decimals = Number(t.tokenDecimal ?? t.decimals ?? 6);
      const balanceRaw = t.balance ?? t.amount ?? t.quantity ?? 0;
      let units = 0;
      try{ units = Number(balanceRaw) / Math.pow(10, decimals); }catch(e){ units = 0; }
      const symbol = t.tokenAbbr || t.symbol || t.tokenName || t.name || 'UNKNOWN';
      return { symbol, contract, decimals, units, priceUsd: t.price_usd ?? t.price ?? null };
    });
  }catch(e){ console.warn('tokens fetch fail', e); return []; }
}

async function fetchTRX(addr){
  try{ const sun = await tronWeb.trx.getBalance(addr); return Number(BigInt(typeof sun==='number'?Math.trunc(sun):String(sun))/1000000n); }catch(e){ return 0; }
}

async function getTrxUsd(){
  try{ const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd'); const j = await r.json(); return j?.tron?.usd || null; }catch(e){ return null; }
}

async function computeNetWorth(){
  if(!tronWeb || !connectedAddr){ alert('Connect TronLink first'); return; }
  showLoading(true);
  document.getElementById('progress').innerText = 'Calculating...';
  const walletsText = document.getElementById('walletsText').value || '';
  const wallets = walletsText.split('\n').map(s=>s.trim()).filter(Boolean);
  const targetWallets = wallets.length?wallets:[connectedAddr];
  localStorage.setItem('defire_wallets', (document.getElementById('walletsText').value||''));
  const trxUsd = await getTrxUsd();
  let grand = 0;
  const details = { wallets:{} };
  for(const w of targetWallets){
    details.wallets[w] = { trx:0, trxUsd:0, frozen:0, tokens:[], unpriced:[] };
    try{
      const sun = await tronWeb.trx.getBalance(w);
      const trx = Number(BigInt(typeof sun==='number'?Math.trunc(sun):String(sun))/1000000n);
      details.wallets[w].trx = trx;
      details.wallets[w].trxUsd = trxUsd?trx*trxUsd:0;
      grand += details.wallets[w].trxUsd;
      // frozen
      try{
        const fres = await fetch(TSCAN_ACCOUNTV2(w)); const fj = await fres.json();
        let frozenTotal = 0;
        if(typeof fj?.frozen_total_amount==='number') frozenTotal = fj.frozen_total_amount;
        else if(Array.isArray(fj?.frozen)) frozenTotal = fj.frozen.reduce((s,f)=>s+Number(f.amount||0),0);
        if(frozenTotal>1e9) frozenTotal = frozenTotal/1e6;
        details.wallets[w].frozen = frozenTotal;
        details.wallets[w].frozenUsd = trxUsd?frozenTotal*trxUsd:0;
        grand += details.wallets[w].frozenUsd||0;
      }catch(e){ /* ignore */ }
      // tokens
      const tokens = await fetchTronscanTokens(w);
      for(const t of tokens){
        if(t.units<=0) continue;
        let price = null;
        if(t.priceUsd) price = t.priceUsd;
        if(price==null){
          details.wallets[w].unpriced.push(t);
        } else {
          const usd = t.units * price;
          details.wallets[w].tokens.push({...t, usd});
          grand += usd;
        }
      }
    }catch(e){ console.warn('wallet loop err', e); }
  }
  document.getElementById('grand').innerText = `Grand Total: ${formatUSD(grand)}`;
  document.getElementById('perWallet').innerText = Object.keys(details.wallets).map(w=>`${w}: ${formatUSD(details.wallets[w].trxUsd + (details.wallets[w].tokens.reduce((s,t)=>s+(t.usd||0),0)||0) + (details.wallets[w].frozenUsd||0))}`).join(' • ');
  document.getElementById('debug').innerText = JSON.stringify(details, null, 2);
  const unpriced = [];
  Object.entries(details.wallets).forEach(([w,d])=>{ d.unpriced.forEach(u=>unpriced.push({wallet:w, token:u})); });
  if(unpriced.length){
    document.getElementById('unpriced').innerHTML = unpriced.map((u,i)=>`<div><a class="unpriced-link" data-idx="${i}" href="#">${u.wallet} • ${u.token.symbol} • ${u.token.contract}</a></div>`).join('');
    document.querySelectorAll('.unpriced-link').forEach(a=>a.addEventListener('click',(e)=>{ e.preventDefault(); const idx = a.getAttribute('data-idx'); const tok = unpriced[idx].token; const price = prompt('Enter USD price for '+tok.symbol); if(price){ manualPrices[tok.contract||tok.symbol]=Number(price); localStorage.setItem('defire_manualPrices', JSON.stringify(manualPrices)); alert('Saved — re-run calculation'); } }));
  } else { document.getElementById('unpriced').innerText = 'No unpriced items'; }
  document.getElementById('progress').innerText = 'Done';
  showLoading(false);
}

function formatUSD(n){ return (typeof n==='number'?n:0).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2}); }

// initialize UI
initUI();
