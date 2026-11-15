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

  // Ko-fi buttons are intentionally disabled until a founder-approved
  // donation destination or payment integration is provided.
  // There are no support click handlers or payment network requests.

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
      // Search-first library: render 12 results at a time, not the entire catalog.
      // Every tool retains its own static, crawlable URL in /tools/ and the sitemap.
      const toolsGrid = document.getElementById('tools-items');
      const toolsEmpty = document.getElementById('tools-empty');
      const controls = document.getElementById('tool-controls');
      const search = document.getElementById('tool-search');
      const sort = document.getElementById('tool-sort');
      const count = document.getElementById('tool-count');
      const categories = document.getElementById('tool-categories');
      const noResults = document.getElementById('tool-no-results');
      const clear = document.getElementById('tool-clear');
      const reset = document.getElementById('tool-reset');
      const moreWrap = document.getElementById('tool-more-wrap');
      const more = document.getElementById('tool-more');
      const progress = document.getElementById('tool-more-progress');
      const batchSize = 12;
      const storageKey = 'yorphives.tool-favorites.v1';
      const knownUrls = new Set(tools.map(item => item.url));
      let favorites = new Set();
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(stored)) favorites = new Set(stored.filter(url => typeof url === 'string' && knownUrls.has(url)));
      } catch (_) { /* Private browsing or disabled storage: continue in memory. */ }
      const saveFavorites = () => {
        try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); } catch (_) {}
      };
      let selectedCategory = '';
      let visibleLimit = batchSize;
      const searchText = value => String(value || '').normalize('NFKD').toLocaleLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      const aliases = {
        'image-resizer': 'resize photo compress picture shrink jpg jpeg png webp',
        'pdf-merge': 'combine pdf join pdf documents',
        'images-to-pdf': 'photo picture jpg png to pdf',
        'csv-file-to-xlsx': 'csv to excel spreadsheet',
        'duplicate-file-finder': 'find identical duplicate files',
        'zip-file-creator': 'compress archive folder zip',
        'word-counter': 'count words letters characters',
        'base64-tool': 'base64 encode decode'
      };
      const categoriesWithCounts = [...new Set(tools.map(item => item.category).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b)).map(name => ({
          name, total: tools.filter(item => item.category === name).length
        }));
      toolsEmpty.hidden = tools.length > 0;
      controls.hidden = tools.length === 0;
      const makeChip = (name, label, total) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tool-category-chip';
        button.dataset.category = name;
        button.setAttribute('aria-pressed', String(selectedCategory === name));
        const text = document.createElement('span');
        text.textContent = label;
        const badge = document.createElement('span');
        badge.className = 'tool-chip-count';
        badge.textContent = String(total);
        button.append(text, badge);
        button.addEventListener('click', () => {
          selectedCategory = name;
          visibleLimit = batchSize;
          renderTools();
        });
        return button;
      };
      categories.append(
        makeChip('', 'All tools', tools.length),
        makeChip('__saved__', '★ Saved', favorites.size),
        ...categoriesWithCounts.map(({name, total}) => makeChip(name, name, total))
      );
      const toolLink = item => {
        const path = String(item.url || '');
        // Only first-party static routes that exist in the catalog are linked.
        return /^tools\/[a-z0-9][a-z0-9-]*\/$/.test(path) ? path : null;
      };
      const miniCard = item => {
        const article = document.createElement('article');
        article.className = 'tool-mini-card';
        const top = document.createElement('div');
        top.className = 'tool-mini-top';
        const category = document.createElement('span');
        category.className = 'tool-mini-category';
        category.textContent = item.category || 'Tool';
        const favorite = document.createElement('button');
        favorite.type = 'button';
        favorite.className = 'tool-favorite';
        const saved = favorites.has(item.url);
        favorite.textContent = saved ? '★' : '☆';
        favorite.setAttribute('aria-pressed', String(saved));
        favorite.setAttribute('aria-label', (saved ? 'Remove ' : 'Save ') + item.name + (saved ? ' from saved tools' : ' to saved tools'));
        favorite.title = saved ? 'Remove from saved' : 'Save this tool';
        favorite.addEventListener('click', () => {
          if (favorites.has(item.url)) favorites.delete(item.url);
          else favorites.add(item.url);
          saveFavorites();
          renderTools();
        });
        top.append(category, favorite);
        const link = document.createElement('a');
        link.className = 'tool-mini-link';
        link.href = toolLink(item) || 'tools/';
        const title = document.createElement('h3');
        title.textContent = item.name;
        const desc = document.createElement('p');
        desc.textContent = item.description;
        const action = document.createElement('span');
        action.className = 'tool-mini-action';
        action.textContent = 'Open tool  ↗';
        link.append(title, desc, action);
        article.append(top, link);
        return article;
      };
      function renderTools() {
        const terms = searchText(search.value).split(/\s+/).filter(Boolean);
        let matches = tools.filter(item => {
          if (selectedCategory === '__saved__' && !favorites.has(item.url)) return false;
          if (selectedCategory && selectedCategory !== '__saved__' && item.category !== selectedCategory) return false;
          const id = String(item.url || '').split('/')[1];
          const corpus = searchText([item.name, item.description, item.category, aliases[id] || ''].join(' '));
          return terms.every(term => corpus.includes(term));
        });
        if (sort.value === 'az') matches.sort((a,b) => a.name.localeCompare(b.name));
        else if (sort.value === 'za') matches.sort((a,b) => b.name.localeCompare(a.name));
        const shown = matches.slice(0, visibleLimit);
        toolsGrid.replaceChildren(...shown.map(miniCard));
        noResults.hidden = matches.length > 0;
        const filtering = !!search.value.trim() || !!selectedCategory;
        clear.hidden = !filtering;
        count.textContent = matches.length
          ? 'Showing ' + shown.length + ' of ' + matches.length + ' ' + (matches.length === 1 ? 'tool' : 'tools')
          : '0 matching tools';
        if (filtering && matches.length !== tools.length) count.textContent += ' · ' + tools.length + ' in the library';
        moreWrap.hidden = shown.length >= matches.length || !matches.length;
        progress.style.width = (matches.length ? (shown.length / matches.length) * 100 : 0) + '%';
        more.firstChild.textContent = 'Show ' + Math.min(batchSize, matches.length - shown.length) + ' more tools ';
        for (const chip of categories.querySelectorAll('button[data-category]')) {
          chip.setAttribute('aria-pressed', String(chip.dataset.category === selectedCategory));
          if (chip.dataset.category === '__saved__') chip.querySelector('.tool-chip-count').textContent = String(favorites.size);
        }
      }
      const resetFilters = () => {
        search.value = '';
        selectedCategory = '';
        sort.value = 'newest';
        visibleLimit = batchSize;
        renderTools();
        search.focus();
      };
      search.addEventListener('input', () => { visibleLimit = batchSize; renderTools(); });
      sort.addEventListener('change', () => { visibleLimit = batchSize; renderTools(); });
      clear.addEventListener('click', resetFilters);
      reset.addEventListener('click', resetFilters);
      more.addEventListener('click', () => { visibleLimit += batchSize; renderTools(); });
      document.addEventListener('keydown', event => {
        if (event.key !== '/' || document.getElementById('tools').hidden ||
            event.ctrlKey || event.metaKey || event.altKey ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
            document.activeElement?.isContentEditable) return;
        event.preventDefault();
        search.focus();
      });
      renderTools();
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
