(() => {
  const cards = [...document.querySelectorAll('[data-tool-id]')];
  const sections = [...document.querySelectorAll('section[data-section]')];
  const search = document.querySelector('#tool-search');
  const status = document.querySelector('#search-status');
  document.querySelector('#search-controls').removeAttribute('data-pending');
  const normalize = text => text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  // Cache searchable text and section membership once, not on each keystroke.
  const groups = sections.map(section => ({ section, entries: cards.filter(card => card.dataset.section === section.dataset.section).map(card => ({ card, cell: card.closest('li') || card, text: normalize(card.dataset.search) })) }));
  const empty = document.querySelector('#empty-state');
  // OwlEye custom events. The global is read at call time, so a blocked or
  // opted-out SDK simply drops the call. Values are flat strings, numbers or booleans.
  const track = (name, data) => window.OwlEyeAnalytics?.track(name, data);
  let terms = [];
  let results = cards.length;
  let searchTimer;
  function filter() {
    terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const { section, entries } of groups) {
      let position = 0;
      for (const { card, cell, text } of entries) {
        const visible = terms.every(term => text.includes(term));
        cell.hidden = !visible;
        card.dataset.visiblePosition = visible ? String(++position) : '0';
        if (visible) count++;
      }
      section.hidden = position === 0;
    }
    empty.hidden = count !== 0;
    status.textContent = terms.length ? `${count} ${count === 1 ? 'result' : 'results'} found.` : '';
    results = count;
  }
  // One event per settled search: result and term counts only, never the words typed.
  function searchSettled() {
    clearTimeout(searchTimer);
    if (terms.length) searchTimer = setTimeout(() => track('tool_search', { results, terms: terms.length, zero_results: results === 0 }), 1200);
  }
  let viaShortcut = false;
  search.addEventListener('focus', () => { track('search_focused', { via: viaShortcut ? 'shortcut' : 'direct' }); }, { once: true });
  search.addEventListener('input', () => { filter(); searchSettled(); });
  document.querySelector('#clear-search').addEventListener('click', () => { search.value = ''; filter(); searchSettled(); search.focus(); });
  document.addEventListener('keydown', event => {
    const target = event.target;
    const editing = target instanceof Element && (target.closest('input, textarea, select, [role="textbox"]') || target.isContentEditable);
    if (event.key === '/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) { event.preventDefault(); viaShortcut = true; search.focus(); viaShortcut = false; }
    if (event.key === 'Escape' && target === search) { search.value = ''; filter(); searchSettled(); }
  });
  filter();

  // First-party aggregate counts for Workers Logs, alongside the OwlEye events.
  // Nothing identifying is generated or persisted in the browser.
  // The same /follow function handles the redirect and the bounded event sink.
  function send(event) {
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
    const body = JSON.stringify(event);
    try {
      if (navigator.sendBeacon?.('/follow', body)) return;
    } catch {}
    fetch('/follow', { method: 'POST', body, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
  }
  function cardFields(card) {
    return { tool_id: card.dataset.toolId, section: card.dataset.section, position: Number(card.dataset.position), visible_position: Number(card.dataset.visiblePosition) };
  }
  function click(event) {
    if (event.type === 'auxclick' && event.button !== 1) return;
    const card = event.target instanceof Element ? event.target.closest('[data-tool-id]') : null;
    if (!card) return;
    const fields = cardFields(card);
    send({ event: 'tool_click', ...fields });
    track('tool_click', { ...fields, filtered: terms.length > 0, new_tab: event.type === 'auxclick' || event.metaKey || event.ctrlKey });
  }
  document.addEventListener('click', click);
  document.addEventListener('auxclick', click);

  // The SDK drops events beyond eight in-flight requests, and a first screen can
  // show that many cards at once. Space impressions out; flush when the tab hides.
  const impressions = [];
  let impressionTimer;
  function drain() {
    const fields = impressions.shift();
    if (fields) track('tool_impression', fields);
    impressionTimer = impressions.length ? setTimeout(drain, 150) : undefined;
  }
  function impression(card) {
    const fields = cardFields(card);
    send({ event: 'tool_impression', ...fields });
    impressions.push(fields);
    if (!impressionTimer) impressionTimer = setTimeout(drain, 150);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    clearTimeout(impressionTimer);
    impressionTimer = undefined;
    // Leave room for the SDK's own page-exit event; the rest are dropped.
    for (const fields of impressions.splice(0, 4)) track('tool_impression', fields);
    impressions.length = 0;
  });
  window.addEventListener('appinstalled', () => track('hub_installed'));

  // One impression per card per page load, after at least half enters the viewport.
  // No browser-stored visitor/session identity, and no search-query collection.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (document.visibilityState !== 'visible') return;
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= .5 && Number(entry.target.dataset.visiblePosition) > 0) {
          impression(entry.target);
          entry.target.dataset.seen = 'true';
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: .5 });
    cards.forEach(card => observer.observe(card));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Re-observing only unseen cards ensures background-open tabs get impressions.
        cards.filter(card => !card.dataset.seen).forEach(card => { observer.unobserve(card); observer.observe(card); });
      }
    });
  }
})();
