(() => {
  const cards = [...document.querySelectorAll('[data-tool-id]')];
  const sections = [...document.querySelectorAll('section[data-section]')];
  const search = document.querySelector('#tool-search');
  const status = document.querySelector('#search-status');
  document.querySelector('#search-controls').hidden = false;
  const normalize = text => text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  function filter() {
    const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const section of sections) {
      let position = 0;
      for (const card of cards.filter(card => card.dataset.section === section.dataset.section)) {
        const visible = terms.every(term => normalize(card.dataset.search).includes(term));
        (card.closest('li') || card).hidden = !visible;
        card.dataset.visiblePosition = visible ? String(++position) : '0';
        if (visible) count++;
      }
      section.hidden = position === 0;
    }
    document.querySelector('#empty-state').hidden = count !== 0;
    status.textContent = terms.length ? `${count} ${count === 1 ? 'result' : 'results'} found.` : '';
  }
  search.addEventListener('input', filter);
  document.querySelector('#clear-search').addEventListener('click', () => { search.value = ''; filter(); search.focus(); });
  document.addEventListener('keydown', event => {
    const target = event.target;
    const editing = target instanceof Element && (target.closest('input, textarea, select, [role="textbox"]') || target.isContentEditable);
    if (event.key === '/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing) { event.preventDefault(); search.focus(); }
    if (event.key === 'Escape' && target === search) { search.value = ''; filter(); }
  });
  filter();

  // Aggregate events only. Nothing identifying is generated or persisted.
  // The same /follow function handles the redirect and the bounded event sink.
  function send(event) {
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
    const body = JSON.stringify(event);
    try {
      if (navigator.sendBeacon?.('/follow', body)) return;
    } catch {}
    fetch('/follow', { method: 'POST', body, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
  }
  function cardEvent(name, card) {
    return { event: name, tool_id: card.dataset.toolId, section: card.dataset.section, position: Number(card.dataset.position), visible_position: Number(card.dataset.visiblePosition) };
  }
  function click(event) {
    if (event.type === 'auxclick' && event.button !== 1) return;
    const card = event.target instanceof Element ? event.target.closest('[data-tool-id]') : null;
    if (card) send(cardEvent('tool_click', card));
  }
  document.addEventListener('click', click);
  document.addEventListener('auxclick', click);

  // One impression per card per page load, after at least half enters the viewport.
  // No persisted visitor/session identity, and no search-query collection.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (document.visibilityState !== 'visible') return;
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= .5 && Number(entry.target.dataset.visiblePosition) > 0) {
          send(cardEvent('tool_impression', entry.target));
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
