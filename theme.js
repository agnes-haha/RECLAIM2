/* ============================================================
   RECLAIM theme: colour combination + light / dark mode
   Choice is saved in this browser (localStorage).
   Palettes themselves are defined in css/style.css.
   ============================================================ */
const THEMES = [
  { id: 'lavender', label: 'Lavender', dots: ['#F1DDF3', '#D6F2E6', '#D8E8F7', '#E4E2F8'] },
  { id: 'mint',     label: 'Mint',     dots: ['#E3F4E9', '#D8ECF7', '#FFF1CE', '#EADFF7'] },
  { id: 'rose',     label: 'Rose',     dots: ['#FBDDE8', '#FDE8D6', '#EBDDF7', '#DDEEE6'] },
  { id: 'sunset',   label: 'Sunset',   dots: ['#FFE0CC', '#FFF0C2', '#FADCE5', '#DDEBF7'] },
];

function loadTheme(){
  try{
    const t = JSON.parse(localStorage.getItem('reclaim_theme') || '{}');
    return {
      theme: THEMES.some(x => x.id === t.theme) ? t.theme : 'lavender',
      mode: t.mode === 'dark' ? 'dark' : 'light',
    };
  }catch(e){ return { theme: 'lavender', mode: 'light' }; }
}
function saveTheme(t){
  try{ localStorage.setItem('reclaim_theme', JSON.stringify(t)); }catch(e){}
}
function applyTheme(t){
  document.documentElement.dataset.theme = t.theme;
  document.documentElement.dataset.mode = t.mode;
}

let currentTheme = loadTheme();
applyTheme(currentTheme);

function themeMenuHtml(){
  return `
    <div class="tm-title">Mode</div>
    <div class="tm-modes">
      <button data-mode="light" class="${currentTheme.mode === 'light' ? 'sel' : ''}">Light</button>
      <button data-mode="dark" class="${currentTheme.mode === 'dark' ? 'sel' : ''}">Dark</button>
    </div>
    <div class="tm-title">Colors</div>
    <div class="tm-themes">
      ${THEMES.map(t => `
        <button data-theme-id="${t.id}" class="${currentTheme.theme === t.id ? 'sel' : ''}">
          <span class="tm-dots">${t.dots.map(c => `<i style="background:${c}"></i>`).join('')}</span>
          <span>${t.label}</span>
        </button>`).join('')}
    </div>`;
}

function setupThemeMenu(){
  const btn = document.getElementById('themeBtn');
  const menu = document.getElementById('themeMenu');
  if(!btn || !menu) return;

  const paint = () => { menu.innerHTML = themeMenuHtml(); };
  paint();

  btn.onclick = (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  };
  menu.onclick = (e) => {
    e.stopPropagation();
    const m = e.target.closest('[data-mode]');
    const t = e.target.closest('[data-theme-id]');
    if(m) currentTheme.mode = m.getAttribute('data-mode');
    if(t) currentTheme.theme = t.getAttribute('data-theme-id');
    if(m || t){ applyTheme(currentTheme); saveTheme(currentTheme); paint(); }
  };
  document.addEventListener('click', () => { menu.hidden = true; });
  if(window.lucide) window.lucide.createIcons();
}
setupThemeMenu();
