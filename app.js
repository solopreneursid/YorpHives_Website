(() => {
  'use strict';

  const pages = [...document.querySelectorAll('.page')];
  const navigation = document.querySelector('.site-nav');
  const menu = document.querySelector('.menu-toggle');
  const names = { home: 'Home', tools: 'Free tools', explore: 'Explore', builders: 'For builders', connect: 'Connect' };
  let previousPage = null;

  function closeMenu() {
    navigation.classList.remove('open');
    document.body.classList.remove('menu-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
  }

  function route() {
    let hash = window.location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch (_) { hash = ''; }
    const section = hash === 'post' || hash === 'opportunities' ? hash : null;
    const active = section ? 'builders' : Object.hasOwn(names, hash) ? hash : 'home';
    pages.forEach(page => { page.hidden = page.id !== active; });
    document.body.classList.toggle('is-home', active === 'home');
    document.querySelectorAll('[data-nav]').forEach(link => {
      if (link.dataset.nav === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = active === 'home' ? 'YorpHives — Ideas in motion' : `${names[active]} — YorpHives`;
    closeMenu();
    if (section) {
      requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ block: 'start' }));
    } else if (active !== previousPage) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    previousPage = active;
  }
  window.addEventListener('hashchange', route);
  route();

  // The homepage Ko-fi callout is discoverable now. Until the founder provides
  // their actual Ko-fi profile URL, show the existing "coming soon" message
  // instead of sending supporters to an invented or unrelated account.
  document.getElementById('header-kofi')?.addEventListener('click', () => {
    const support = document.querySelector('.footer-support');
    if (!support) return;
    support.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    support.focus({preventScroll:true});
  });

  menu.addEventListener('click', () => {
    const isOpen = !navigation.classList.contains('open');
    navigation.classList.toggle('open', isOpen);
    document.body.classList.toggle('menu-open', isOpen);
    menu.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });
  navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 800 && navigation.classList.contains('open')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('open')) {
      closeMenu();
      menu.focus();
    }
  });
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    document.getElementById('main').focus();
  });
  document.querySelectorAll('[data-project-type]').forEach(link => {
    link.addEventListener('click', () => {
      const select = document.getElementById('project-type');
      if ([...select.options].some(option => option.value === link.dataset.projectType)) select.value = link.dataset.projectType;
    });
  });
  document.querySelectorAll('[data-form]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const subject = form.dataset.form === 'opportunity' ? 'Paid opportunity for YorpHives' : 'Project enquiry for YorpHives';
      const body = [...new FormData(form)].filter(([, value]) => String(value).trim()).map(([key, value]) => `${key}: ${value}`).join('\n\n');
      window.location.href = `mailto:connect@yorphives.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  });
  document.getElementById('current-year').textContent = String(new Date().getFullYear());

  // A single public JSON catalog powers the collections, homepage, and agent discovery.
  const types = ['tool', 'app', 'product'];
  const recent = document.getElementById('recent-items');
  function statusCard(text, label = 'THE COLLECTION') {
    const box = document.createElement('div'); box.className = 'catalog-empty';
    const tag = document.createElement('span'); tag.className = 'status-label'; tag.textContent = label;
    const description = document.createElement('p'); description.textContent = text; box.append(tag, description);
    return box;
  }
  function validItem(item) {
    if (!item || typeof item.name !== 'string' || !item.name.trim() || typeof item.description !== 'string' || !types.includes(item.type) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) return false;
    const date = new Date(`${item.date}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === item.date;
  }
  function card(item) {
    const element = document.createElement('article'); element.className = 'catalog-card';
    const tag = document.createElement('span'); tag.className = 'status-label'; tag.textContent = item.type === 'tool' ? `FREE TOOL${item.category ? ` / ${item.category.toUpperCase()}` : ''}` : item.type.toUpperCase();
    const title = document.createElement('h3'); title.textContent = item.name;
    const description = document.createElement('p'); description.textContent = item.description;
    const date = document.createElement('time'); date.dateTime = item.date; date.textContent = `ADDED ${item.date}`;
    element.append(tag, title, description, date);
    if (typeof item.url === 'string' && item.url.trim()) {
      try {
        const destination = new URL(item.url, window.location.href);
        if (destination.protocol === 'http:' || destination.protocol === 'https:') {
          const link = document.createElement('a'); link.className = 'text-link dark-link'; link.href = destination.href;
          link.textContent = `Open ${item.name}`; element.append(link);
        }
      } catch (_) { /* Leave incomplete URLs unlinked. */ }
    }
    return element;
  }
  async function loadCatalog() {
    recent.replaceChildren(statusCard('Loading the latest tools and products…'));
    try {
      const response = await fetch('catalog.json');
      if (!response.ok) throw new Error('Catalog unavailable');
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('Invalid catalog');
      // For additions on the same day, later catalog entries are newer.
      const catalog = data.items.map((item, index) => ({ item, index })).filter(entry => validItem(entry.item))
        .sort((a, b) => b.item.date.localeCompare(a.item.date) || b.index - a.index).map(entry => entry.item);
      recent.replaceChildren();
      if (catalog.length) catalog.slice(0, 3).forEach(item => recent.append(card(item)));
      else recent.append(statusCard('Our first tools and products are taking shape. New additions will appear here.', 'THE FIRST CHAPTER'));
      const tools = catalog.filter(item => item.type === 'tool');
      const toolsGrid = document.getElementById('tools-items');
      const toolsEmpty = document.getElementById('tools-empty');
      const controls = document.getElementById('tool-controls');
      const search = document.getElementById('tool-search');
      const category = document.getElementById('tool-category');
      const count = document.getElementById('tool-count');
      toolsEmpty.hidden = tools.length > 0; controls.hidden = tools.length === 0;
      for (const name of [...new Set(tools.map(item => item.category).filter(Boolean))].sort()) {
        const option = document.createElement('option'); option.value = name; option.textContent = name; category.append(option);
      }
      function renderTools() {
        const query = search.value.trim().toLocaleLowerCase();
        const matches = tools.filter(item => (!category.value || item.category === category.value) && (!query || `${item.name} ${item.description} ${item.category || ''}`.toLocaleLowerCase().includes(query)));
        toolsGrid.replaceChildren(); matches.forEach(item => toolsGrid.append(card(item)));
        if (tools.length && !matches.length) toolsGrid.append(statusCard('No tools match your search. Try a different term or category.', 'NO MATCHES'));
        count.textContent = tools.length ? `${matches.length} ${matches.length === 1 ? 'tool' : 'tools'}${matches.length !== tools.length ? ` of ${tools.length}` : ''}` : '';
      }
      search.addEventListener('input', renderTools); category.addEventListener('change', renderTools); renderTools();
      const products = catalog.filter(item => item.type !== 'tool');
      const productGrid = document.getElementById('explore-items'); productGrid.replaceChildren();
      document.getElementById('explore-empty').hidden = products.length > 0;
      products.forEach(item => productGrid.append(card(item)));
    } catch (_) {
      recent.replaceChildren(statusCard('The catalog could not be loaded. Please try refreshing the page.'));
      for (const id of ['tools', 'explore']) document.getElementById(`${id}-items`).replaceChildren(statusCard('The catalog could not be loaded. Please try refreshing the page.'));
    }
  }
  loadCatalog();
})();
