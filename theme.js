// Shared by the homepage and static error pages.
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const toggle = document.querySelector('#theme-toggle');
  if (!toggle) return;
  const preference = matchMedia('(prefers-color-scheme: dark)');
  let manualTheme = false;
  try { manualTheme = ['light', 'dark'].includes(localStorage.getItem('lowkey-theme')); } catch {}
  function setTheme(dark) {
    root.dataset.theme = dark ? 'dark' : 'light';
    toggle.setAttribute('aria-pressed', String(dark));
    document.querySelector('#theme-color').content = dark ? '#121316' : '#faf9f6';
  }
  setTheme(root.dataset.theme === 'dark');
  toggle.removeAttribute('data-pending');
  toggle.addEventListener('click', () => {
    manualTheme = true;
    setTheme(root.dataset.theme !== 'dark');
    try { localStorage.setItem('lowkey-theme', root.dataset.theme); } catch {}
  });
  preference.addEventListener('change', event => { if (!manualTheme) setTheme(event.matches); });
  window.addEventListener('storage', event => {
    if (event.key !== 'lowkey-theme' && event.key !== null) return;
    manualTheme = ['light', 'dark'].includes(event.newValue);
    setTheme(manualTheme ? event.newValue === 'dark' : preference.matches);
  });

});
