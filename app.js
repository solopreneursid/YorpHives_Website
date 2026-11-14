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

  // The same catalog drives both collection pages and the latest items on Home.
  const types = ['tool', 'app', 'product'];
  const catalog = (Array.isArray(window.YORPHIVES_CATALOG) ? window.YORPHIVES_CATALOG : [])
    .filter(item => item && typeof item.name === 'string' && item.name.trim() && typeof item.description === 'string' && types.includes(item.type) && /^\d{4}-\d{2}-\d{2}$/.test(item.date || '') && (() => { const date = new Date(`${item.date}T00:00:00Z`); return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === item.date; })())
    .sort((a, b) => b.date.localeCompare(a.date));

  function card(item) {
    const element = document.createElement('article');
    element.className = 'catalog-card';
    const tag = document.createElement('span');
    tag.className = 'status-label';
    tag.textContent = item.type === 'tool' ? 'FREE TOOL' : item.type.toUpperCase();
    const title = document.createElement('h3');
    title.textContent = item.name;
    const description = document.createElement('p');
    description.textContent = item.description;
    const date = document.createElement('time');
    date.dateTime = item.date;
    date.textContent = `ADDED ${item.date}`;
    element.append(tag, title, description, date);
    if (typeof item.url === 'string' && item.url.trim()) {
      try {
        const destination = new URL(item.url, window.location.href);
        if (destination.protocol === 'http:' || destination.protocol === 'https:') {
          const link = document.createElement('a');
          link.className = 'text-link dark-link';
          link.href = destination.href;
          link.textContent = `Explore ${item.name}`;
          element.append(link);
        }
      } catch (_) { /* Keep the card readable if the URL is incomplete. */ }
    }
    return element;
  }

  const recent = document.getElementById('recent-items');
  if (catalog.length) catalog.slice(0, 3).forEach(item => recent.append(card(item)));
  else {
    const empty = document.createElement('div');
    empty.className = 'catalog-empty';
    const label = document.createElement('span');
    label.className = 'status-label';
    label.textContent = 'THE FIRST CHAPTER';
    const message = document.createElement('p');
    message.textContent = 'Our first tools and products are taking shape. New additions will appear here.';
    empty.append(label, message);
    recent.append(empty);
  }
  for (const [id, items] of [['tools', catalog.filter(item => item.type === 'tool')], ['explore', catalog.filter(item => item.type !== 'tool')]]) {
    if (!items.length) continue;
    const grid = document.getElementById(`${id}-items`);
    items.forEach(item => grid.append(card(item)));
    document.getElementById(`${id}-empty`).hidden = true;
  }
})();
