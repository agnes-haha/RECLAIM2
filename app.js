/* ============================================================
   RECLAIM app logic
   Needs, in this order: config.js, accounts.js, theme.js
   ============================================================ */

/* ============================================================
   Small helpers
   ============================================================ */
function iconFor(item){
  const hit = KEYWORD_ICON.find(([re]) => re.test(item.name || ''));
  if(hit) return hit[1];
  const cat = CATEGORIES.find(c=>c.id===item.category);
  return cat ? cat.icon : 'help-circle';
}
function ic(name, cls){ return `<i data-lucide="${name}" class="ic ${cls||''}"></i>`; }

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function fmtDate(iso){
  if(!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  if(isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
}
function fmtShort(iso){
  if(!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  if(isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit', year:'numeric'}).replaceAll('/','.');
}
function fmtTime(iso){
  const d = new Date(iso);
  if(isNaN(d)) return '';
  return d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function normalize(s){ return (s||'').toString().trim().toLowerCase().replace(/\s+/g,' '); }

/* ============================================================
   Supabase data layer
   ============================================================ */
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function supabaseConfigured(){ return !SUPABASE_URL.includes("YOUR-PROJECT"); }

const fromRow = r => ({
  id:r.id, kind:r.kind, category:r.category, name:r.name, location:r.location,
  date:r.date, details:r.details, image:r.image,
  reporterName:r.reporter_name, reporterId:r.reporter_id,
  status:r.status, createdAt:r.created_at
});
const toRow = i => ({
  id:i.id, kind:i.kind, category:i.category, name:i.name, location:i.location,
  date:i.date, details:i.details, image:i.image,
  reporter_name:i.reporterName, reporter_id:i.reporterId,
  status:i.status, created_at:i.createdAt
});
const fromNote = r => ({
  id:r.id, toId:r.to_id, kind:r.kind, itemId:r.item_id, lostId:r.lost_id,
  itemName:r.item_name, fromName:r.from_name, fromId:r.from_id,
  message:r.message, status:r.status, read:!!r.is_read, createdAt:r.created_at
});
const toNote = n => ({
  id:n.id, to_id:n.toId, kind:n.kind, item_id:n.itemId, lost_id:n.lostId || null,
  item_name:n.itemName, from_name:n.fromName, from_id:n.fromId,
  message:n.message || '', status:n.status || '', is_read:!!n.read, created_at:n.createdAt
});

async function loadItems(){
  const {data, error} = await sb.from('items').select('*');
  if(error) throw error;
  S.items = data.map(fromRow);
}
async function loadHistory(){
  const {data, error} = await sb.from('history').select('id,date,name,item,action');
  if(error) throw error;
  S.history = data;
}
/* a person only ever loads their own notifications */
async function loadNotifications(){
  if(!S.user){ S.notifications = []; return; }
  const {data, error} = await sb.from('notifications').select('*').eq('to_id', S.user.studentId);
  if(error) throw error;
  S.notifications = data.map(fromNote);
}

async function watchCollections(){
  await Promise.all([loadItems(), loadHistory()]);
  await loadHidden();
  S.loaded = true;
  render();
  sb.channel('reclaim')
    .on('postgres_changes', {event:'*', schema:'public', table:'items'}, async () => { await loadItems(); softRender(); })
    .on('postgres_changes', {event:'*', schema:'public', table:'history'}, async () => { await loadHistory(); softRender(); })
    .on('postgres_changes', {event:'*', schema:'public', table:'notifications'}, async () => {
      try{ await loadNotifications(); }catch(e){ console.error(e); }
      softRender();
    })
    .on('postgres_changes', {event:'*', schema:'public', table:'leaderboard_hidden'}, async () => { await loadHidden(); softRender(); })
    .subscribe();
}

async function addItemDoc(item){
  const {error} = await sb.from('items').insert(toRow(item));
  if(error) throw error;
}
async function updateItemDoc(id, patch){
  const {error} = await sb.from('items').update(patch).eq('id', id);
  if(error) throw error;
}
async function addHistoryDoc(entry){
  const {error} = await sb.from('history').insert(entry);
  if(error) throw error;
}
async function addNote(note){
  const {error} = await sb.from('notifications').insert(toNote(note));
  if(error) throw error;
}
async function updateNote(id, patch){
  const {error} = await sb.from('notifications').update(patch).eq('id', id);
  if(error) throw error;
}

/* ============================================================
   App state
   ============================================================ */
const S = {
  user: null,
  view: 'login',
  items: [],
  history: [],
  notifications: [],
  hiddenIds: [],
  loaded: false,
  syncError: false,
  browseTab: 'lost',
  browseCat: 'all',
  browseQuery: '',
  selectedId: null,
  matchId: null,
  lostContextId: null,
  pendingImage: null,
  claimError: '',
  seenLostId: null,
  reviewNoteId: null,
};

async function init(){
  if(!supabaseConfigured()){ render(); return; }
  try{
    await watchCollections();
  }catch(e){
    console.error('[RECLAIM] init failed:', e);
    S.syncError = true;
    render();
  }
}
window.RECLAIM_STATE = S; // for manual inspection: type RECLAIM_STATE in console

/* toast lives outside the page markup, so showing one never wipes a form */
function showToast(msg, iconName){
  const old = document.getElementById('toast');
  if(old) old.remove();
  const t = document.createElement('div');
  t.id = 'toast';
  t.className = 'toast';
  t.innerHTML = `${ic(iconName || 'sparkles')} ${escapeHtml(msg)}`;
  document.body.appendChild(t);
  refreshIcons();
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.remove(), 2800);
}

function go(view, extra){
  S.view = view;
  S.claimError = '';
  S.seenLostId = (extra && extra.seenLostId) || null;
  if(extra) Object.assign(S, extra);
  window.scrollTo({top:0, behavior:'smooth'});
  render();
  if(view === 'notifications') markNotificationsRead();
}

/* live updates must not wipe a form the person is typing in */
function softRender(){
  if(S.user && ['reportLost','reportFound','verifyClaim'].includes(S.view)){ updateBadge(); return; }
  render();
}
function unreadCount(){ return S.notifications.filter(n => !n.read).length; }
function updateBadge(){
  const btn = document.querySelector('.navlink[data-nav="notifications"]');
  if(!btn) return;
  const n = unreadCount();
  let b = btn.querySelector('.badge');
  if(n === 0){ if(b) b.remove(); return; }
  if(!b){ b = document.createElement('span'); b.className = 'badge'; btn.appendChild(b); }
  b.textContent = n > 9 ? '9+' : String(n);
}

async function markNotificationsRead(){
  const unread = S.notifications.filter(n => !n.read);
  if(unread.length === 0) return;
  unread.forEach(n => { n.read = true; });
  updateBadge();
  try{
    const {error} = await sb.from('notifications').update({is_read:true}).in('id', unread.map(n => n.id));
    if(error) throw error;
  }catch(e){ console.error(e); }
}

/* ============================================================
   Matching logic
   ============================================================ */
function findMatch(report){
  const opposite = report.kind === 'lost' ? 'found' : 'lost';
  const pool = S.items.filter(i => i.kind === opposite && i.status === 'open' && i.category === report.category);
  if(pool.length === 0) return null;
  const target = normalize(report.name);
  let best = null, bestScore = 0;
  for(const cand of pool){
    const cname = normalize(cand.name);
    let score = 0;
    if(cname === target) score = 3;
    else if(cname.includes(target) || target.includes(cname)) score = 2;
    else {
      const tWords = target.split(' ');
      const cWords = cname.split(' ');
      if(tWords.some(w => w.length>2 && cWords.includes(w))) score = 1;
    }
    if(score > bestScore){ bestScore = score; best = cand; }
  }
  return bestScore > 0 ? best : (pool[0] || null);
}

/* ============================================================
   Image handling
   ============================================================ */
function handleImageInput(inputEl, cb){
  const file = inputEl.files && inputEl.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const max = 420;
      let w = img.width, h = img.height;
      if(w > h && w > max){ h = h*max/w; w = max; }
      else if(h > max){ w = w*max/h; h = max; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ============================================================
   Rendering
   ============================================================ */
function render(){
  const app_el = document.getElementById('app');

  if(!supabaseConfigured()){
    app_el.innerHTML = setupView();
    refreshIcons();
    return;
  }
  if(S.syncError){
    app_el.innerHTML = `<div class="shell centered"><div class="setup-card"><h1>${ic('triangle-alert')} Couldn't connect</h1><p class="lede">Double-check your Supabase URL and key in js/config.js, that the tables exist, and that the access policies allow read and write, then reload this page.</p></div></div>`;
    refreshIcons();
    return;
  }
  if(!S.loaded){
    app_el.innerHTML = `<div class="shell centered"><div style="font-family:var(--font-display);font-weight:700;color:var(--on-backdrop);font-size:16px;">Connecting to RECLAIM…</div></div>`;
    return;
  }
  if(!S.user){
    app_el.innerHTML = loginView();
    refreshIcons();
    attachLoginHandlers();
    return;
  }
  app_el.innerHTML = `
    <div class="shell">
      ${railView()}
      <div class="main">
        ${topbarView()}
        <div class="panel">${viewBody()}</div>
      </div>
    </div>
  `;
  refreshIcons();
  attachHandlers();
}

function refreshIcons(){
  if(window.lucide) window.lucide.createIcons();
}

function setupView(){
  return `
  <div class="shell centered">
    <div class="setup-card">
      <span class="eyebrow">One-time setup</span>
      <h1>${ic('plug')} Connect RECLAIM to a database</h1>
      <p class="lede" style="margin-bottom:14px;">This page is ready to host on GitHub Pages, but it needs a free Supabase project so every student's reports sync together.</p>
      <ol>
        <li>Go to <code>supabase.com</code> and create a new project</li>
        <li>Open the SQL Editor and run the table setup</li>
        <li>Project Settings, then API, and copy the Project URL and the anon key</li>
        <li>Paste them into <code>js/config.js</code></li>
        <li>Save, commit to your GitHub repo, and reload this page</li>
      </ol>
    </div>
  </div>`;
}

function viewBody(){
  switch(S.view){
    case 'home': return homeView();
    case 'reportLost': return reportForm('lost');
    case 'reportFound': return reportForm('found');
    case 'lostResultMatch': return lostMatchView();
    case 'lostResultNone': return lostNoneView();
    case 'foundResult': return foundResultView();
    case 'browse': return browseView();
    case 'itemDetail': return itemDetailView();
    case 'verifyClaim': return verifyClaimView();
    case 'claimSuccess': return claimSuccessView();
    case 'notifications': return notificationsView();
    case 'foundMatch': return foundMatchView();
    case 'matchSuccess': return matchSuccessView();
    case 'history': return historyView();
    case 'leaderboard': return leaderboardView();
    default: return homeView();
  }
}

/* ---------- login ---------- */
function loginView(){
  return `
  <div class="shell centered">
    <div class="login-card">
      <div class="badge-lg">${ic('package-search')}</div>
      <h1>RECLAIM</h1>
      <div class="tag-line">A digital lost &amp; found platform</div>
      <div class="field" id="nameField">
        <label>Full name</label>
        <input class="input" id="loginName" placeholder="e.g. Olivia Rodrigo" autocomplete="off">
        <div class="hint">Type your full name. Capital or small letters both work.</div>
        <div class="err">Please enter your full name.</div>
      </div>
      <div class="field" id="idField">
        <label>Student ID</label>
        <input class="input" id="loginId" placeholder="e.g. ${SCHOOL_ID_PREFIX}xxxx" autocomplete="off">
        <div class="hint">Format: ${SCHOOL_ID_PREFIX}xxxx</div>
        <div class="err">That doesn't look like a valid student ID (should start with ${SCHOOL_ID_PREFIX}).</div>
      </div>
      <button class="btn btn-primary btn-block" id="loginBtn">Proceed ${ic('arrow-right')}</button>
    </div>
  </div>`;
}
function attachLoginHandlers(){
  const btn = document.getElementById('loginBtn');
  if(!btn) return;
  const submit = async () => {
    const name = document.getElementById('loginName').value.trim();
    const sid = document.getElementById('loginId').value.trim();
    const nameField = document.getElementById('nameField');
    const idField = document.getElementById('idField');
    const nameErr = nameField.querySelector('.err');
    nameField.classList.remove('invalid');
    idField.classList.remove('invalid');
    let ok = true;

    if(!name){
      nameErr.textContent = 'Please enter your full name.';
      nameField.classList.add('invalid');
      ok = false;
    }
    const isAdminId = isAdminAccountId(sid);
    if(!isAdminId && !SCHOOL_ID_RE.test(sid)){
      idField.classList.add('invalid');
      ok = false;
    }
    if(!ok) return;

    const acc = findAccount(name, sid);
    if(!acc){
      nameErr.textContent = "Name and student ID don't match. Enter your full name";
      nameField.classList.add('invalid');
      return;
    }
    S.user = {name: acc.name, studentId: acc.id, isAdmin: !!acc.admin};
    try{
      await loadNotifications();
    }catch(e){
      console.error(e);
      showToast("Notifications aren't set up yet. Run the new SQL in Supabase.", 'triangle-alert');
    }
    go('home');
  };
  btn.onclick = submit;
  document.getElementById('loginId').addEventListener('keydown', e => { if(e.key==='Enter') submit(); });
  document.getElementById('loginName').addEventListener('keydown', e => { if(e.key==='Enter') submit(); });
}

/* ---------- left icon rail + top bar ---------- */
function railView(){
  const items = [
    ['home','home','Home'],
    ['reportLost','search-x','Report Lost'],
    ['reportFound','package-check','Report Found'],
    ['browse','search','Browse Items'],
    ['leaderboard','trophy','Leaderboard'],
    ['notifications','bell','Notifications'],
    ['history','archive','History'],
  ];
  const unread = unreadCount();
  return `
  <nav class="rail">
    <div class="rail-logo" title="RECLAIM">${ic('package-search')}</div>
    <div class="navlist">
      ${items.map(([v,iconName,lb])=>`
        <button class="navlink ${S.view===v?'active':''}" data-nav="${v}" title="${lb}" aria-label="${lb}">
          ${ic(iconName)}<span class="sr">${lb}</span>
          ${v==='notifications' && unread>0 ? `<span class="badge">${unread>9?'9+':unread}</span>` : ''}
        </button>`).join('')}
    </div>
  </nav>`;
}
function topbarView(){
  const initials = S.user.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return `
  <header class="topbar">
    <div class="tb-brand">
      <p class="brand-sub">A digital lost &amp; found platform</p>
    </div>
    <div class="tb-right">
      <div class="sync-badge"><span class="dot"></span>Synced live across school</div>
      <div class="profile-card">
        <div class="avatar">${escapeHtml(initials)}</div>
        <div class="who">Welcome back<b>${escapeHtml(S.user.name)}</b></div>
      </div>
      <button class="logout-btn" id="logoutBtn">Log out</button>
    </div>
  </header>`;
}

function statStrip(){
  const openLost = S.items.filter(i=>i.kind==='lost' && i.status==='open').length;
  const openFound = S.items.filter(i=>i.kind==='found' && i.status==='open').length;
    const claimed = S.history.length;
  return `
  <div class="stat-strip">
    <div class="stat-chip"><div class="n">${openLost}</div><div class="l">Lost</div></div>
    <div class="stat-chip"><div class="n">${openFound}</div><div class="l">Found</div></div>
    <div class="stat-chip"><div class="n">${claimed}</div><div class="l">Reclaimed</div></div>
  </div>`;
}

/* ---------- home ---------- */
function homeView(){
  return `
    <div class="home-head">
      <div>
        <span class="eyebrow">Home</span>
        <h1>Lost or found something, ${firstName()}?</h1>
        <p class="lede">Choose an option below to get started.</p>
      </div>
      ${statStrip()}
    </div>
    <div class="action-grid">
      <button class="action-card lost" data-nav="reportLost">
        <div class="aic">${ic('search-x')}</div>
        <div class="att">I lost something!!</div>
        <div class="ads">OMG NOOO, tell us what's missing, then we'll check it against everything that's been turned in >:D</div>
      </button>
      <button class="action-card found" data-nav="reportFound">
        <div class="aic">${ic('package-check')}</div>
        <div class="att">I found something!!</div>
        <div class="ads">WOW COOL!! pls make a report so its owner can find their way back to it! thankies!</div>
      </button>
      <button class="action-card browse" data-nav="browse">
        <div class="aic">${ic('search')}</div>
        <div class="att">check what's lost</div>
        <div class="ads">browse open reports and recently found items in Pradita.</div>
      </button>
      <button class="action-card history" data-nav="history">
        <div class="aic">${ic('archive')}</div>
        <div class="att">History</div>
        <div class="ads">see everything that's been successfully reclaimed.</div>
      </button>
    </div>
    ${recentStrip()}
  `;
}
function recentStrip(){
  const recent = [...S.items].filter(i=>i.status==='open').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4);
  if(recent.length===0) return '';
  return `
    <div class="section-title">${ic('pin')} Recently reported</div>
    <div class="tag-row">${recent.map(tagCard).join('')}</div>
  `;
}

/* ---------- report form (lost / found) ---------- */
function reportForm(kind){
  const isLost = kind === 'lost';
  return `
    <span class="eyebrow">${isLost?'Report Lost':'Report Found'}</span>
    <h1>${isLost?'Oh no, you lost something':'Nice, you found something'}</h1>
    <p class="lede">${isLost?'Fill in the details and we\'ll match it against found items right away.':'Fill in what you found so we can reunite it with its owner.'}</p>

    <div class="field">
      <label>Item category</label>
      <div class="cat-grid" id="catGrid">
        ${CATEGORIES.map(c=>`
          <button type="button" class="cat-opt" data-cat="${c.id}">
            ${ic(c.icon, 'em')}
            <span class="lb">${c.label}</span>
            <span class="ex">${c.examples}</span>
          </button>`).join('')}
      </div>
    </div>

    <div class="grid-2">
      <div class="field">
        <label>Item name</label>
        <input class="input" id="f_name" placeholder="e.g. MacBook Charger">
      </div>
      <div class="field">
        <label>${isLost?'Last seen where':'Where you found it'}</label>
        <input class="input" id="f_where" placeholder="e.g. Library, 1.2A">
      </div>
    </div>
    <div class="grid-2">
      <div class="field">
        <label>${isLost?'Last seen when':'When you found it'}</label>
        <input class="input" type="date" id="f_when" value="${todayISO()}">
      </div>
      <div class="field">
        <label>Detail info</label>
        <input class="input" id="f_detail" placeholder="Color, marks, condition…">
      </div>
    </div>
    <div class="field">
      <label>Picture of the item (optional)</label>
      <div class="upload-box" id="uploadBox">
        <div class="up-txt" id="uploadTxt">${ic('camera')} Tap to upload a photo</div>
        <input type="file" accept="image/*" id="f_image">
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-ghost" data-nav="home">Cancel</button>
      <button class="btn ${isLost?'btn-primary':'btn-mint'}" id="submitReport" data-kind="${kind}">Submit ${isLost?'':ic('arrow-right')}</button>
    </div>
  `;
}

/* ---------- lost result: match found ---------- */
function lostMatchView(){
  const match = S.items.find(i=>i.id===S.matchId);
  if(!match) return lostNoneView();
  return `
    <div class="result-wrap">
      <span class="eyebrow">Submission received</span>
      <h1 style="font-size:21px;">${escapeHtml(match.reporterName)} found a similar item</h1>
      ${detailCard(match)}
      <div class="quest">Is it yours?</div>
      <div class="btn-row">
        <button class="btn btn-mint" id="matchYes">${ic('check')} Yes, it's mine</button>
        <button class="btn btn-ghost" id="matchNo">Not mine</button>
      </div>
    </div>
  `;
}
function lostNoneView(){
  return `
    <div class="result-wrap">
      <div class="result-icon wait">${ic('search')}</div>
      <span class="eyebrow">Submission received</span>
      <h1 style="font-size:21px;">Thanks for your submission!</h1>
      <p class="lede" style="margin-bottom:22px;">Sadly, we don't have any data on an item matching what you're looking for yet. We'll let you know the moment someone turns it in.</p>
      <button class="btn btn-primary btn-block" data-nav="home">Back to home page</button>
    </div>
  `;
}

/* ---------- found result ---------- */
function foundResultView(){
  const item = S.items.find(i=>i.id===S.selectedId);
  if(!item) return homeView();
  const waitingCount = S.items.filter(i=>i.kind==='lost' && i.status==='open' && i.category===item.category).length;
  return `
    <div class="result-wrap">
      <div class="result-icon ok">${ic('package-check')}</div>
      <span class="eyebrow">Submission received</span>
      <h1 style="font-size:21px;">Thanks for your submission!</h1>
      ${detailCard(item)}
      ${waitingCount>0 ? `<p class="lede">${waitingCount} report${waitingCount>1?'s':''} for similar items are on file. We'll try to connect them.</p>` : ''}
      <button class="btn btn-primary btn-block" data-nav="home">Back to home page</button>
    </div>
  `;
}

/* ---------- browse ---------- */
function browseView(){
  const list = S.items.filter(i=>{
    if(i.kind !== S.browseTab) return false;
    if(i.status!=='open') return false;
    if(S.browseCat!=='all' && i.category!==S.browseCat) return false;
    if(S.browseQuery && !i.name.toLowerCase().includes(S.browseQuery.toLowerCase())) return false;
    return true;
  }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));

  return `
    <span class="eyebrow">Browse</span>
    <h1>Have you seen these items?</h1>
    <p class="lede">Tap a card to see the full report.</p>
    <div class="tabs">
      <button class="tab ${S.browseTab==='lost'?'active':''}" data-tab="lost">${ic('search')} People looking (${S.items.filter(i=>i.kind==='lost'&&i.status==='open').length})</button>
      <button class="tab ${S.browseTab==='found'?'active':''}" data-tab="found">${ic('package')} Recently found (${S.items.filter(i=>i.kind==='found'&&i.status==='open').length})</button>
    </div>
    <div class="filter-row">
      <input class="input search-input" id="searchInput" placeholder="Search item name…" value="${escapeAttr(S.browseQuery)}">
    </div>
    <div class="filter-row">
      <button class="chip ${S.browseCat==='all'?'sel':''}" data-catf="all">All</button>
      ${CATEGORIES.map(c=>`<button class="chip ${S.browseCat===c.id?'sel':''}" data-catf="${c.id}">${ic(c.icon)} ${c.label}</button>`).join('')}
    </div>
    ${list.length ? `<div class="tag-row">${list.map(tagCard).join('')}</div>` : emptyState(S.browseTab)}
  `;
}
function emptyState(kind){
  return `<div class="empty-state">
    <div class="em">${ic(kind==='lost'?'search-x':'inbox')}</div>
    <b>Nothing here yet</b>
    Nothing matches your filters right now. Check back soon.
  </div>`;
}

/* ---------- item detail ---------- */
function itemDetailView(){
  const item = S.items.find(i=>i.id===S.selectedId);
  if(!item) return browseView();
  const isLost = item.kind === 'lost';
  return `
    <span class="eyebrow">${isLost?'Lost report':'Found report'}</span>
    <h1 style="font-size:22px;">${escapeHtml(item.name)}</h1>
    ${detailCard(item)}
    <div class="quest">${isLost?'Have you seen it?':'Is this yours?'}</div>
    <div class="btn-row">
      <button class="btn btn-mint" id="detailYes">${ic('check')} Yes</button>
      <button class="btn btn-ghost" data-nav="browse">No, back to browse</button>
    </div>
    ${S.user.isAdmin ? `<div class="btn-row"><button class="btn btn-coral" data-del="${item.id}">${ic('trash-2')} Remove this item</button></div>` : ''}
  `;
}

/* ---------- claim request (the finder decides) ---------- */
function verifyClaimView(){
  const item = S.items.find(i=>i.id===S.selectedId);
  if(!item) return browseView();
  return `
    <div class="result-wrap">
      <span class="eyebrow">Confirm it's yours</span>
      <h1 style="font-size:21px;">One quick check before we hand it over</h1>
      ${detailCard(item)}
      <div class="field" style="text-align:left;">
        <label>Describe a detail only the real owner would know</label>
        <input class="input" id="claimDesc" placeholder="e.g. a mark, a sticker, what's saved inside…">
        <div class="hint">${escapeHtml(item.reporterName)} will see this and decide whether to accept your claim.</div>
        ${S.claimError ? `<div class="err" style="display:block;">${escapeHtml(S.claimError)}</div>` : ''}
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" data-nav="browse">Cancel</button>
        <button class="btn btn-mint" id="confirmClaim">Confirm claim</button>
      </div>
    </div>
  `;
}

function claimSuccessView(){
  const item = S.items.find(i=>i.id===S.selectedId);
  if(!item) return homeView();
  return `
    <div class="result-wrap">
      <div class="result-icon ok">${ic('party-popper')}</div>
      <span class="eyebrow">Request sent</span>
      <h1 style="font-size:21px;">You're all set, ${firstName()}!</h1>
      <div class="pickup-card">
        <div class="pk-title">${ic('bell')} Waiting for a reply</div>
        ${escapeHtml(item.reporterName)} will review your request for <b>${escapeHtml(item.name)}</b>. You will get a notification when they accept or decline it.
      </div>
      <button class="btn btn-primary btn-block" data-nav="home">Back to home page</button>
    </div>
  `;
}

/* ---------- owner reviews a possible match ("Is this yours?") ---------- */
function foundMatchView(){
  const note = S.notifications.find(n => n.id === S.reviewNoteId);
  const item = note && S.items.find(i => i.id === note.itemId);
  const lost = note && S.items.find(i => i.id === note.lostId);
  if(!note || note.status !== 'pending' || !item || item.status !== 'open' || !lost || lost.status !== 'open'){
    return `
      <div class="result-wrap">
        <div class="result-icon wait">${ic('search')}</div>
        <h1 style="font-size:21px;">This item is no longer available</h1>
        <button class="btn btn-primary btn-block" data-nav="notifications">Back to notifications</button>
      </div>`;
  }
  return `
    <div class="result-wrap">
      <span class="eyebrow">Possible match</span>
      <h1 style="font-size:21px;">${escapeHtml(item.reporterName)} found a similar item</h1>
      ${detailCard(item)}
      <div class="quest">Is it yours?</div>
      <div class="btn-row">
        <button class="btn btn-mint" id="fmYes">${ic('check')} Yes, it's mine</button>
        <button class="btn btn-ghost" id="fmNo">Not mine</button>
      </div>
    </div>`;
}
function matchSuccessView(){
  const item = S.items.find(i => i.id === S.selectedId);
  if(!item) return homeView();
  return `
    <div class="result-wrap">
      <div class="result-icon ok">${ic('party-popper')}</div>
      <span class="eyebrow">Reclaimed</span>
      <h1 style="font-size:21px;">You're all set, ${firstName()}!</h1>
      <div class="pickup-card">
        <div class="pk-title">${ic('map-pin')} Pickup instructions</div>
        Go to the Lost &amp; Found desk to collect <b>${escapeHtml(item.name)}</b>.
        <div class="pk-id">${escapeHtml(S.user.studentId)}</div>
      </div>
      <button class="btn btn-primary btn-block" data-nav="home">Back to home page</button>
    </div>`;
}

/* ---------- notifications ---------- */
function notificationsView(){
  const list = [...S.notifications].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  return `
    <span class="eyebrow">Notifications</span>
    <h1>Your notifications</h1>
    <p class="lede">These are private to your account and stay here when you log out.</p>
    ${list.length ? list.map(notifRow).join('') : `
      <div class="empty-state"><div class="em">${ic('bell')}</div><b>No notifications yet</b>Claim requests and replies will show up here.</div>`}
  `;
}
function notifRow(n){
  const when = fmtShort((n.createdAt||'').slice(0,10)) + ' ' + fmtTime(n.createdAt);
  let icon = 'bell', body = '', extra = '';
  if(n.kind === 'claim_request'){
    icon = 'hand';
    body = `<b>${escapeHtml(n.fromName)}</b> wants to claim <b>${escapeHtml(n.itemName)}</b>`;
    if(n.message) body += `<div class="n-quote">"${escapeHtml(n.message)}"</div>`;
    if(n.status === 'pending'){
      extra = `<div class="n-actions">
        <button class="btn btn-mint" data-accept="${n.id}">${ic('check')} Accept</button>
        <button class="btn btn-ghost" data-decline="${n.id}">No</button>
      </div>`;
    } else {
      const label = {accepted:'Accepted', declined:'Declined', closed:'No longer available'}[n.status] || n.status;
      extra = `<span class="n-status ${escapeAttr(n.status)}">${label}</span>`;
    }
  } else if(n.kind === 'claim_accepted'){
    icon = 'package-check';
    body = `Your request for <b>${escapeHtml(n.itemName)}</b> was accepted. Search for your thing in the Lost Lost &amp; Found desk to collect it.`;
  } else if(n.kind === 'claim_declined'){
    icon = 'circle-x';
    body = `Your request for <b>${escapeHtml(n.itemName)}</b> was declined. Submit a lost item if you think this was a mistake.`;
  } else if(n.kind === 'found_match'){
    icon = 'package-check';
    body = `<b>${escapeHtml(n.fromName)}</b> found an item that might be yours: <b>${escapeHtml(n.itemName)}</b>`;
    if(n.status === 'pending'){
      extra = `<div class="n-actions"><button class="btn btn-mint" data-review="${n.id}">${ic('eye')} Is this yours?</button></div>`;
    } else {
      const label = {accepted:'Reclaimed', declined:'Not mine', closed:'No longer available'}[n.status] || n.status;
      extra = `<span class="n-status ${escapeAttr(n.status)}">${label}</span>`;
    }
  } else if(n.kind === 'match_confirmed'){
    icon = 'party-popper';
    body = `The owner of <b>${escapeHtml(n.itemName)}</b> confirmed it is theirs. Thank you for handing it in!`;
  } else {
    body = escapeHtml(n.message || '');
  }
  return `
    <div class="notif ${n.read ? '' : 'unread'}">
      <div class="n-ic">${ic(icon)}</div>
      <div class="n-body">
        <div class="n-text">${body}</div>
        <div class="n-time">${when}</div>
        ${extra}
      </div>
    </div>`;
}

/* ---------- history ---------- */
function historyView(){
  const rows = [...S.history].sort((a,b)=>b.date.localeCompare(a.date));
  return `
    <span class="eyebrow">History</span>
    <h1>Reclaimed items</h1>
    <p class="lede">historyy of everything successfully returned to its owner.</p>
    ${rows.length ? rows.map(h=>`
      <div class="hist-row">
        <div class="hem">${ic('check')}</div>
        <div class="hd">${fmtShort(h.date)}</div>
        <div class="ht"><b>${escapeHtml(h.name)}</b> ${escapeHtml(h.action)} <b>${escapeHtml(h.item)}</b></div>
        ${S.user.isAdmin ? `<button class="icon-del" data-delhist="${h.id}" title="Remove" aria-label="Remove">${ic('trash-2')}</button>` : ''}
      </div>
    `).join('') : `<div class="empty-state"><div class="em">${ic('archive')}</div><b>No history yet</b>Reclaimed items will show up here.</div>`}
  `;
}
/* ============================================================
   Leaderboard
   Public: top finders only. Admin: top finders + top losers, and can
   hide / show people. The admin account is never counted.
   ============================================================ */
const LB_LIMIT = 10;

async function loadHidden(){
  try{
    const {data, error} = await sb.from('leaderboard_hidden').select('person_id');
    if(error) throw error;
    S.hiddenIds = data.map(r => r.person_id);
  }catch(e){
    console.error('[RECLAIM] leaderboard_hidden is not available yet:', e);
    S.hiddenIds = [];
  }
}

/* kind is 'found' or 'lost'; counts every report a person submitted */
function leaderboardData(kind){
  const map = new Map();
  for(const it of S.items){
    if(it.kind !== kind) continue;
    if(isAdminAccountId(it.reporterId)) continue;
    const row = map.get(it.reporterId) || {id: it.reporterId, name: it.reporterName, count: 0};
    row.count++;
    map.set(it.reporterId, row);
  }
  const all = [...map.values()].sort((a,b) => b.count - a.count || a.name.localeCompare(b.name));
  const hidden = new Set(S.hiddenIds);
  return {
    visible: all.filter(r => !hidden.has(r.id)),
    hidden: all.filter(r => hidden.has(r.id)),
  };
}

function leaderboardView(){
  const admin = !!(S.user && S.user.isAdmin);
  return `
    <span class="eyebrow">Leaderboard</span>
    <h1>Top finders</h1>
    <p class="lede">congrats cuz you're officially a researcher.</p>
    ${boardHtml('found', admin)}
    ${admin ? `
      <h1 style="margin-top:34px;">Top losers</h1>
      <p class="lede">this is admin special power bahaha</p>
      ${boardHtml('lost', true)}` : ''}
  `;
}
function boardHtml(kind, admin){
  const {visible, hidden} = leaderboardData(kind);
  const shown = admin ? visible : visible.slice(0, LB_LIMIT);
  const rows = shown.map((r, i) => lbRow(r, i + 1, admin, false)).join('');
  const hiddenRows = admin ? hidden.map(r => lbRow(r, null, true, true)).join('') : '';
  if(!rows && !hiddenRows){
    return `<div class="empty-state"><div class="em">${ic('trophy')}</div><b>No one here yet</b>${kind === 'found' ? 'Submit a Found report to get on the board.' : 'Lost reports will show up here.'}</div>`;
  }
  return rows + (hiddenRows ? `<div class="lb-sub">Hidden</div>${hiddenRows}` : '');
}
function lbRow(r, rank, admin, isHidden){
  const top = rank && rank <= 3;
  return `
    <div class="lb-row ${isHidden ? 'is-hidden' : ''}">
      <div class="lb-rank ${top ? 'top' : ''}">${rank ? rank : ic('eye-off')}</div>
      <div class="lb-name ${top ? 'bold' : ''}">${escapeHtml(r.name)}</div>
      <div class="lb-count">${r.count} ${r.count === 1 ? 'item' : 'items'}</div>
      ${admin ? `<button class="lb-toggle" data-lbtoggle="${escapeAttr(r.id)}" data-name="${escapeAttr(r.name)}">${isHidden ? 'Show' : 'Hide'}</button>` : ''}
    </div>`;
}

/* admin only: hide or show one person on both boards (not permanent) */
async function toggleHidden(personId, personName){
  if(!S.user || !S.user.isAdmin) return;
  const isHidden = S.hiddenIds.includes(personId);
  try{
    if(isHidden){
      const {error} = await sb.from('leaderboard_hidden').delete().eq('person_id', personId);
      if(error) throw error;
      S.hiddenIds = S.hiddenIds.filter(x => x !== personId);
    } else {
      const {error} = await sb.from('leaderboard_hidden').insert({
        person_id: personId, person_name: personName, created_at: new Date().toISOString(),
      });
      if(error) throw error;
      S.hiddenIds = [...S.hiddenIds, personId];
    }
  }catch(e){
    console.error(e);
    showToast("Couldn't update. Check your connection", 'triangle-alert');
    return;
  }
  render();
}

/* ---------- shared bits ---------- */
function tagCard(item){
  const stampClass = item.status==='claimed' ? 'claimed' : 'open';
  const stampText = item.status==='claimed' ? 'Completed' : (item.kind==='lost'?'Wanted':'Waiting');
  const thumb = item.image ? `<img src="${escapeAttr(item.image)}">` : ic(iconFor(item));
  const del = S.user && S.user.isAdmin ? `<button class="tag-del" data-del="${escapeAttr(item.id)}" title="Remove" aria-label="Remove">${ic('trash-2')}</button>` : '';
  return `
    <div class="tag k-${item.kind}" data-open="${escapeAttr(item.id)}">
      ${del}
      <div class="stamp ${stampClass}">${stampText}</div>
      <div class="thumb">${thumb}</div>
      <div class="t-name">${escapeHtml(item.name)}</div>
      <div class="t-meta">${item.kind==='lost'?'Last seen':'Found'} ${escapeHtml(item.location)}<br>${fmtShort(item.date)}</div>
      <span class="t-cat">${catLabel(item.category)}</span>
    </div>`;
}
function detailCard(item){
  const thumb = item.image ? `<img src="${escapeAttr(item.image)}">` : ic(iconFor(item));
  return `
    <div class="detail-card">
      <div class="d-thumb">${thumb}</div>
      <div class="d-name">${escapeHtml(item.name)}</div>
      <div class="d-meta">
        ${item.kind==='lost' ? 'Reported by' : 'Found by'} <b>${escapeHtml(item.reporterName)}</b><br>
        ${item.kind==='lost'?'Last seen in':'Found in'} <b>${escapeHtml(item.location)}</b> · ${fmtDate(item.date)}
      </div>
      ${item.details ? `<div class="d-quote">"${escapeHtml(item.details)}"</div>` : ''}
    </div>`;
}
function catLabel(id){ const c = CATEGORIES.find(c=>c.id===id); return c ? ic(c.icon)+' '+c.label : id; }
function firstName(){ return escapeHtml((S.user.name||'').split(' ')[0]); }
function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeAttr(s){ return escapeHtml(s); }

/* ============================================================
   Claim flow + admin actions
   ============================================================ */
async function sendClaimRequest(item, lostId, description){
  /* one pending request per person per item */
  const {data: existing, error: e1} = await sb.from('notifications').select('id')
    .eq('item_id', item.id).eq('from_id', S.user.studentId)
    .eq('kind', 'claim_request').eq('status', 'pending');
  if(e1) throw e1;
  if(existing && existing.length) return 'duplicate';

  await addNote({
    id: uid(), toId: item.reporterId, kind: 'claim_request',
    itemId: item.id, lostId: lostId || null, itemName: item.name,
    fromName: S.user.name, fromId: S.user.studentId,
    message: description, status: 'pending', read: false,
    createdAt: new Date().toISOString(),
  });
  return 'sent';
}

function answerNote(request, accepted){
  return {
    id: uid(), toId: request.fromId,
    kind: accepted ? 'claim_accepted' : 'claim_declined',
    itemId: request.itemId, lostId: request.lostId, itemName: request.itemName,
    fromName: S.user.name, fromId: S.user.studentId,
    message: '', status: '', read: false,
    createdAt: new Date().toISOString(),
  };
}

async function respondClaim(noteId, accept){
  const note = S.notifications.find(n => n.id === noteId);
  if(!note || note.status !== 'pending') return;
  const item = S.items.find(i => i.id === note.itemId);
  try{
    if(accept){
      if(!item || item.status !== 'open'){
        await updateNote(note.id, {status:'closed'});
        showToast('This item is no longer available', 'triangle-alert');
      } else {
        await updateItemDoc(item.id, {status:'claimed'});
        if(note.lostId){ await updateItemDoc(note.lostId, {status:'claimed'}); }
        await updateNote(note.id, {status:'accepted'});
        await addNote(answerNote(note, true));
        await addHistoryDoc({date: todayISO(), name: note.fromName, item: note.itemName, action: 'claimed'});
        /* anyone else waiting for the same item gets a polite no */
        const others = S.notifications.filter(n => n.kind==='claim_request' && n.itemId===note.itemId && n.status==='pending' && n.id!==note.id);
        for(const o of others){
          await updateNote(o.id, {status:'declined'});
          await addNote(answerNote(o, false));
        }
        showToast('Request accepted', 'check');
      }
    } else {
      await updateNote(note.id, {status:'declined'});
      await addNote(answerNote(note, false));
      showToast('Request declined', 'check');
    }
  }catch(e){
    console.error(e);
    showToast("Couldn't save. Check your connection", 'triangle-alert');
  }
  try{ await Promise.all([loadItems(), loadHistory(), loadNotifications()]); }catch(e){ console.error(e); }
  render();
}

async function respondFoundMatch(yes){
  const note = S.notifications.find(n => n.id === S.reviewNoteId);
  if(!note || note.status !== 'pending') return;
  const item = S.items.find(i => i.id === note.itemId);   // the found item
  const lost = S.items.find(i => i.id === note.lostId);   // the person's own lost report
  let next = 'notifications', nextExtra;
  try{
    if(!yes){
      await updateNote(note.id, {status:'declined'});
      showToast('Okay, thanks for checking', 'check');
    } else if(!item || item.status !== 'open' || !lost || lost.status !== 'open'){
      await updateNote(note.id, {status:'closed'});
      showToast('This item is no longer available', 'triangle-alert');
    } else {
      /* reclaimed: both reports leave the galleries, history gets a row */
      await updateItemDoc(item.id, {status:'claimed'});
      await updateItemDoc(lost.id, {status:'claimed'});
      await updateNote(note.id, {status:'accepted'});
      await addHistoryDoc({date: todayISO(), name: S.user.name, item: lost.name, action: 'claimed'});
      await addNote({
        id: uid(), toId: note.fromId, kind: 'match_confirmed',
        itemId: item.id, lostId: lost.id, itemName: item.name,
        fromName: S.user.name, fromId: S.user.studentId,
        message: '', status: '', read: false, createdAt: new Date().toISOString(),
      });
      /* close anything else still waiting on these two reports */
      const others = S.notifications.filter(n => n.kind === 'found_match' && n.lostId === lost.id && n.status === 'pending' && n.id !== note.id);
      for(const o of others){ await updateNote(o.id, {status:'closed'}); }
      const {data: pend, error: pe} = await sb.from('notifications').select('*')
        .eq('item_id', item.id).eq('kind', 'claim_request').eq('status', 'pending');
      if(pe) throw pe;
      for(const r of (pend || [])){
        const o = fromNote(r);
        await updateNote(o.id, {status:'closed'});
        await addNote(answerNote(o, false));
      }
      next = 'matchSuccess';
      nextExtra = {selectedId: item.id};
    }
  }catch(e){
    console.error(e);
    showToast("Couldn't save. Check your connection", 'triangle-alert');
  }
  try{ await Promise.all([loadItems(), loadHistory(), loadNotifications()]); }catch(e){ console.error(e); }
  go(next, nextExtra);
}


async function removeItem(id){
  if(!S.user || !S.user.isAdmin) return;
  if(!confirm('Remove this item?')) return;
  const {error} = await sb.from('items').delete().eq('id', id);
  if(error){ console.error(error); showToast("Couldn't remove. Check your connection", 'triangle-alert'); return; }
  S.items = S.items.filter(i => i.id !== id);
  if(S.view === 'itemDetail') S.view = 'browse';
  render();
  showToast('Item removed', 'trash-2');
}
async function removeHistory(id){
  if(!S.user || !S.user.isAdmin) return;
  if(!confirm('Remove this history entry?')) return;
  const {error} = await sb.from('history').delete().eq('id', id);
  if(error){ console.error(error); showToast("Couldn't remove. Check your connection", 'triangle-alert'); return; }
  S.history = S.history.filter(h => h.id !== id);
  render();
  showToast('History entry removed', 'trash-2');
}

/* ============================================================
   Event wiring
   ============================================================ */
function attachHandlers(){
  document.querySelectorAll('[data-nav]').forEach(el=>{
    el.onclick = () => go(el.getAttribute('data-nav'));
  });
  const logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn) logoutBtn.onclick = () => { S.user = null; S.notifications = []; S.view = 'login'; render(); };

  /* admin: remove items / history */
  document.querySelectorAll('[data-del]').forEach(el=>{
    el.onclick = (e) => { e.stopPropagation(); removeItem(el.getAttribute('data-del')); };
  });
  document.querySelectorAll('[data-delhist]').forEach(el=>{
    el.onclick = () => removeHistory(el.getAttribute('data-delhist'));
  });

  /* notifications: accept / no */
  document.querySelectorAll('[data-accept]').forEach(el=>{
    el.onclick = () => { el.disabled = true; respondClaim(el.getAttribute('data-accept'), true); };
  });
  document.querySelectorAll('[data-decline]').forEach(el=>{
    el.onclick = () => { el.disabled = true; respondClaim(el.getAttribute('data-decline'), false); };
  });

    /* notifications: open the "Is this yours?" page for a possible match */
  document.querySelectorAll('[data-review]').forEach(el=>{
    el.onclick = () => go('foundMatch', {reviewNoteId: el.getAttribute('data-review')});
  });
  const fmYes = document.getElementById('fmYes');
  if(fmYes) fmYes.onclick = () => { fmYes.disabled = true; respondFoundMatch(true); };
  const fmNo = document.getElementById('fmNo');
  if(fmNo) fmNo.onclick = () => { fmNo.disabled = true; respondFoundMatch(false); };

  /* admin: hide / show someone on the leaderboard */
  document.querySelectorAll('[data-lbtoggle]').forEach(el=>{
    el.onclick = () => toggleHidden(el.getAttribute('data-lbtoggle'), el.getAttribute('data-name'));
  });

  /* category picker */
  const catGrid = document.getElementById('catGrid');
  if(catGrid){
    catGrid.querySelectorAll('.cat-opt').forEach(btn=>{
      btn.onclick = () => {
        catGrid.querySelectorAll('.cat-opt').forEach(b=>b.classList.remove('sel'));
        btn.classList.add('sel');
        catGrid.dataset.selected = btn.getAttribute('data-cat');
      };
    });
  }

  /* image upload preview */
  const fImage = document.getElementById('f_image');
  if(fImage){
    fImage.onchange = () => {
      handleImageInput(fImage, (dataUrl) => {
        S.pendingImage = dataUrl;
        document.getElementById('uploadTxt').outerHTML = `<img src="${dataUrl}"><div class="up-txt" id="uploadTxt">${ic('circle-check')} Photo attached, tap to change</div>`;
        refreshIcons();
      });
    };
  }

  /* submit report */
  const submitBtn = document.getElementById('submitReport');
  if(submitBtn){
    submitBtn.onclick = async () => {
      const kind = submitBtn.getAttribute('data-kind');
      const cat = document.getElementById('catGrid').dataset.selected;
      const name = document.getElementById('f_name').value.trim();
      const where = document.getElementById('f_where').value.trim();
      const when = document.getElementById('f_when').value;
      const detail = document.getElementById('f_detail').value.trim();
      if(!cat || !name || !where){
        showToast('Please fill in category, item name, and location', 'triangle-alert');
        return;
      }
      submitBtn.disabled = true;
      const item = {
        id: uid(), kind, category: cat, name, location: where, date: when || todayISO(),
        details: detail, image: S.pendingImage || null,
        reporterName: S.user.name, reporterId: S.user.studentId,
        status: 'open', createdAt: todayISO(),
      };
      const match = kind === 'lost' ? findMatch(item) : null;
      try{
        await addItemDoc(item);
      }catch(e){
        console.error(e);
        showToast("Couldn't save. Check your Supabase rules and connection", 'triangle-alert');
        submitBtn.disabled = false;
        return;
      }
      S.pendingImage = null;
      /* if this found report answers someone's lost report, tell them privately */
      if(kind === 'found' && S.seenLostId){
        const lostReport = S.items.find(i => i.id === S.seenLostId);
        if(lostReport && lostReport.status === 'open'){
          try{
            await addNote({
              id: uid(), toId: lostReport.reporterId, kind: 'found_match',
              itemId: item.id, lostId: lostReport.id, itemName: item.name,
              fromName: S.user.name, fromId: S.user.studentId,
              message: '', status: 'pending', read: false,
              createdAt: new Date().toISOString(),
            });
          }catch(e){
            console.error(e);
            showToast("Saved, but we couldn't notify the owner", 'triangle-alert');
          }
        }
        S.seenLostId = null;
      }
      if(kind === 'lost'){
        if(match){ go('lostResultMatch', {matchId: match.id, selectedId: item.id}); }
        else { go('lostResultNone'); }
      } else {
        go('foundResult', {selectedId: item.id});
      }
    };
  }

  /* match yes -> claim request (found item is S.matchId) */
  const matchYes = document.getElementById('matchYes');
  if(matchYes){
    matchYes.onclick = () => go('verifyClaim', {selectedId: S.matchId, lostContextId: S.selectedId});
  }
  const matchNo = document.getElementById('matchNo');
  if(matchNo) matchNo.onclick = () => go('lostResultNone');

  /* browse tabs / filters */
  document.querySelectorAll('[data-tab]').forEach(el=>{
    el.onclick = () => { S.browseTab = el.getAttribute('data-tab'); S.browseCat='all'; S.browseQuery=''; render(); };
  });
  document.querySelectorAll('[data-catf]').forEach(el=>{
    el.onclick = () => { S.browseCat = el.getAttribute('data-catf'); render(); };
  });
  const searchInput = document.getElementById('searchInput');
  if(searchInput){
    searchInput.oninput = () => { S.browseQuery = searchInput.value; render(); const el=document.getElementById('searchInput'); if(el){el.focus(); el.selectionStart=el.selectionEnd=el.value.length;} };
  }

  /* open item detail */
  document.querySelectorAll('[data-open]').forEach(el=>{
    el.onclick = () => go('itemDetail', {selectedId: el.getAttribute('data-open')});
  });

  /* detail yes -> if found item, send a claim; if lost item, ask the finder to submit a found report */
  const detailYes = document.getElementById('detailYes');
  if(detailYes){
    detailYes.onclick = () => {
      const item = S.items.find(i=>i.id===S.selectedId);
      if(!item) return;
      if(item.kind === 'found'){
        go('verifyClaim', {selectedId: item.id, lostContextId: null});
      } else {
        if(item.reporterId === S.user.studentId){
          showToast("That's your own report", 'triangle-alert');
          return;
        }
        showToast('Thanks! Please submit a Found report so we can connect it!', 'hand-heart');
        go('reportFound', {seenLostId: item.id});
      }
    };
  }

  /* confirm claim: sends a private request to the finder */
  const confirmClaim = document.getElementById('confirmClaim');
  if(confirmClaim){
    confirmClaim.onclick = async () => {
      const item = S.items.find(i=>i.id===S.selectedId);
      if(!item) return;
      const desc = document.getElementById('claimDesc').value.trim();
      if(!desc){
        S.claimError = 'Please describe a detail so the finder can check it.';
        render();
        return;
      }
      if(item.reporterId === S.user.studentId){
        showToast("You can't claim an item you reported yourself", 'triangle-alert');
        return;
      }
      confirmClaim.disabled = true;
      let result;
      try{
        result = await sendClaimRequest(item, S.lostContextId, desc);
      }catch(e){
        console.error(e);
        showToast("Couldn't send the request. Check your connection", 'triangle-alert');
        confirmClaim.disabled = false;
        return;
      }
      if(result === 'duplicate'){
        showToast('You already sent a request for this item', 'triangle-alert');
        confirmClaim.disabled = false;
        return;
      }
      go('claimSuccess', {selectedId: item.id});
    };
  }
}

init();
