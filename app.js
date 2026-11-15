(() => {
  'use strict';

  const pages = [...document.querySelectorAll('.page')];
  const navigation = document.querySelector('.site-nav');
  const menu = document.querySelector('.menu-toggle');
  const names = { home: 'Home', tools: 'Free tools', explore: 'Explore', builders: 'Builders', connect: 'Connect' };
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
    const section = ['post', 'opportunities', 'membership', 'partners'].includes(hash) ? hash : null;
    const active = section ? 'builders' : Object.hasOwn(names, hash) ? hash : 'home';
    pages.forEach(page => { page.hidden = page.id !== active; });
    document.querySelectorAll('[data-nav]').forEach(link => {
      if (link.dataset.nav === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = active === 'home' ? 'YorpHives — Ideas in motion' : `${names[active]} — YorpHives`;
    closeMenu();
    if (section) {
      requestAnimationFrame(() => document.getElementById(section === 'post' ? 'membership' : section)?.scrollIntoView({ block: 'start' }));
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
      const subject = 'Project enquiry for YorpHives';
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
  // The same qualification gate is enforced by the static build and the public UI.
  // HQ can evaluate and recommend; the final approval is always founder-controlled.
  // Shared logo-card spotlight, mounted once on Home and once on Explore.
  function setupExploreFeatureSpotlight(products, location = 'explore') {
    const prefix = location === 'home' ? 'home-feature-' : 'explore-feature-';
    const root = document.getElementById(prefix + 'window');
    const empty = document.getElementById(prefix + 'empty');
    const productLink = document.getElementById(prefix + 'product');
    const logo = document.getElementById(prefix + 'logo');
    const title = document.getElementById(prefix + 'name');
    const type = document.getElementById(prefix + 'type');
    const counter = document.getElementById(prefix + 'count');
    const prev = document.getElementById(prefix + 'prev');
    const next = document.getElementById(prefix + 'next');
    const pause = document.getElementById(prefix + 'pause');
    if (!root || !empty || !productLink || !logo || !title || !counter ||
        !prev || !next || !pause) return;

    const available = Array.isArray(products) ? products : [];
    const ready = available.length > 0;
    empty.hidden = ready;
    productLink.hidden = !ready;
    if (location === 'home') {
      const note = document.getElementById('explore-qualification-note');
      const footer = document.querySelector('#home .explore-evaluation-foot span:last-child');
      const badge = document.getElementById('explore-showcase-label');
      if (note) note.textContent = ready
        ? 'Every product earns its place through HQ research, business analysis and founder approval.'
        : 'No HQ-qualified products have been released yet. Here is what every product must pass:';
      if (footer) footer.textContent = ready
        ? 'Only products reviewed by Yorphives HQ and approved by the founder go live in Explore.'
        : 'Qualified launches will appear here after founder approval.';
      if (badge) badge.textContent = ready ? 'FOUNDER-APPROVED PRODUCTS' : 'EVIDENCE BEFORE LAUNCH';
    }
    if (!ready) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0;
    let paused = reducedMotion.matches;
    let onscreen = typeof IntersectionObserver === 'undefined';
    const canMove = () => available.length > 1;

    function paint() {
      const item = available[index];
      productLink.href = new URL(item.url, document.baseURI).href;
      productLink.setAttribute('aria-label', 'Explore ' + item.name);
      title.textContent = item.name;
      type.textContent = item.type === 'app' ? 'APP · APPROVED LAUNCH' : 'PRODUCT · APPROVED LAUNCH';
      counter.textContent = 'PRODUCT ' + (index + 1) + ' / ' + available.length;
      logo.replaceChildren();
      // Product logos are first-party files in the released catalog, never remote assets.
      // Graceful monogram fallback keeps old products visually complete.
      const initials = item.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
      if (typeof item.logo === 'string' &&
          /^(?:apps|products|assets)\/[a-z0-9][a-z0-9/_-]*\.(?:svg|png|webp|jpe?g)$/.test(item.logo)) {
        const image = document.createElement('img');
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.src = new URL(item.logo, document.baseURI).href;
        image.onerror = () => logo.replaceChildren(document.createTextNode(initials));
        logo.append(image);
      } else {
        logo.textContent = initials;
      }
      prev.disabled = !canMove();
      next.disabled = !canMove();
      pause.disabled = !canMove() || reducedMotion.matches;
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute('aria-label', paused ? 'Resume automatic product rotation' : 'Pause automatic product rotation');
      pause.textContent = paused ? '▶' : 'Ⅱ';
      productLink.classList.remove('is-entering');
      if (!reducedMotion.matches) {
        void productLink.offsetWidth; // Restart the entrance animation on every change.
        productLink.classList.add('is-entering');
      }
    }
    prev.addEventListener('click', () => {
      if (!canMove()) return;
      index = (index - 1 + available.length) % available.length;
      paint();
    });
    next.addEventListener('click', () => {
      if (!canMove()) return;
      index = (index + 1) % available.length;
      paint();
    });
    pause.addEventListener('click', () => {
      if (pause.disabled) return;
      paused = !paused;
      paint();
    });
    if (typeof reducedMotion.addEventListener === 'function') {
      reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) paused = true;
        paint();
      });
    }
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(entries => {
        onscreen = entries.some(entry => entry.isIntersecting);
      }, {threshold: .15}).observe(root);
    }
    if (canMove()) window.setInterval(() => {
      if (paused || reducedMotion.matches || !onscreen ||
          document.hidden || document.getElementById(location).hidden) return;
      index = (index + 1) % available.length;
      paint();
    }, 4500);
    paint();
  }

  async function loadCatalog() {
    recent.replaceChildren(statusCard('Loading the latest tools and products…'));
    try {
      const response = await fetch('catalog.json');
      if (!response.ok) throw new Error('Catalog unavailable');
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('Invalid catalog');
      const { qualifiedProducts } = await import('./product-policy.mjs');
      // For additions on the same day, later catalog entries are newer.
      const catalog = data.items.map((item, index) => ({ item, index })).filter(entry => validItem(entry.item))
        .sort((a, b) => b.item.date.localeCompare(a.item.date) || b.index - a.index).map(entry => entry.item);
      const products = qualifiedProducts(catalog);
      const visibleCatalog = catalog.filter(item => item.type === 'tool' || products.includes(item));
      recent.replaceChildren();
      if (visibleCatalog.length) visibleCatalog.slice(0, 3).forEach(item => recent.append(card(item)));
      else recent.append(statusCard('Our first tools and products are taking shape. New additions will appear here.', 'THE FIRST CHAPTER'));
      const tools = catalog.filter(item => item.type === 'tool');
      // Eight-row Tool Launcher: new categories are included automatically.
      // Every tool retains its independent direct-entry URL and SEO metadata.
      const toolGrid = document.getElementById('tools-items');
      const toolsEmpty = document.getElementById('tools-empty');
      const controls = document.getElementById('tool-controls');
      const search = document.getElementById('tool-search');
      const clear = document.getElementById('tool-clear');
      const sort = document.getElementById('tool-sort');
      const count = document.getElementById('tool-count');
      const total = document.getElementById('tool-total');
      const sidebar = document.getElementById('tool-categories');
      const mobileCategories = document.getElementById('tool-mobile-categories');
      const mobileBrowse = document.getElementById('tool-mobile-browse');
      const heading = document.getElementById('tool-view-title');
      const caption = document.getElementById('tool-view-caption');
      const eyebrow = document.getElementById('tool-eyebrow');
      const back = document.getElementById('tool-back');
      const noResults = document.getElementById('tool-no-results');
      const reset = document.getElementById('tool-reset');
      const prev = document.getElementById('tool-prev');
      const next = document.getElementById('tool-next');
      const pageNumber = document.getElementById('tool-page-number');
      const pageSize = 8;
      const storageKey = 'yorphives.tool-favorites.v1';
      const validUrls = new Set(tools.map(item => item.url));
      let favorites = new Set();
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(stored)) favorites = new Set(stored.filter(url => typeof url === 'string' && validUrls.has(url)));
      } catch (_) { /* Support browsers that restrict local storage. */ }
      const saveFavorites = () => {
        try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); } catch (_) {}
      };
      const groups = [
        {id:'documents',name:'Documents',icon:'▤',categories:['PDF','Spreadsheets','Presentations']},
        {id:'images',name:'Images & Design',icon:'◈',categories:['Images','Design']},
        {id:'writing',name:'Writing & Text',icon:'✎',categories:['Writing']},
        {id:'files',name:'Files & ZIP',icon:'▣',categories:['Files']},
        {id:'developer',name:'Developer',icon:'⌘',categories:['Developer','Security']},
        {id:'calculators',name:'Calculators',icon:'∑',categories:['Calculators']},
        {id:'creator',name:'Marketing & Creator',icon:'◎',categories:['Marketing','Creator']}
      ];
      const assigned = new Set(groups.flatMap(group => group.categories));
      for (const category of [...new Set(tools.map(item => item.category || 'Other'))].sort((a,b)=>a.localeCompare(b)))
        if (!assigned.has(category)) groups.push({id:'other-'+groups.length,name:category,icon:'◇',categories:[category]});
      const normalize = value => String(value || '').normalize('NFKD').toLocaleLowerCase()
        .replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      const aliases = {
        'pdf-merge':'combine pdf join pdfs documents',
        'pdf-extract-pages':'split pdf select pages cut pdf',
        'images-to-pdf':'convert photo jpg png picture to pdf',
        'image-resizer':'resize photo shrink image jpg jpeg png webp',
        'duplicate-file-finder':'find repeated files identical copies duplicates',
        'batch-find-replace':'bulk text change multiple files replace',
        'csv-file-to-xlsx':'csv to excel spreadsheet workbook',
        'word-counter':'count words characters letters',
        'zip-file-creator':'compress archive multiple files',
        'json-formatter':'pretty print json beautify'
      };
      let active = '';
      let page = 1;
      const groupItems = group => tools.filter(item => group.categories.includes(item.category || 'Other'));
      const makeCategory = (id,name,icon,amount,mobile=false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = mobile ? 'launcher-mobile-tile' : 'launcher-nav-item';
        button.dataset.group = id;
        button.setAttribute('aria-pressed', String(active === id));
        const symbol = document.createElement('span');
        symbol.className = 'launcher-group-symbol';
        symbol.setAttribute('aria-hidden','true');
        symbol.textContent = icon;
        const label = document.createElement('span');
        label.className = 'launcher-group-name';
        label.textContent = name;
        const number = document.createElement('span');
        number.className = 'launcher-group-count';
        number.textContent = String(amount);
        button.append(symbol,label,number);
        button.addEventListener('click', () => {
          active = id;
          page = 1;
          search.value = '';
          renderTools();
        });
        return button;
      };
      toolsEmpty.hidden = tools.length>0;
      controls.hidden = tools.length===0;
      total.textContent = tools.length + ' free tools';
      sidebar.append(makeCategory('','Discover','✧',tools.length));
      for(const group of groups) {
        const amount=groupItems(group).length;
        sidebar.append(makeCategory(group.id,group.name,group.icon,amount));
        mobileCategories.append(makeCategory(group.id,group.name,group.icon,amount,true));
      }
      sidebar.append(makeCategory('__saved__','My tools','☆',favorites.size));
      mobileCategories.append(makeCategory('__saved__','My tools','☆',favorites.size,true));
      const toolUrl = item => /^tools\/[a-z0-9][a-z0-9-]*\/$/.test(String(item.url||'')) ? item.url : 'tools/';
      const makeRow = item => {
        const row = document.createElement('article');
        row.className = 'launcher-tool-row';
        row.setAttribute('role','listitem');
        const symbol = document.createElement('span');
        symbol.className = 'launcher-tool-symbol';
        symbol.textContent = groups.find(group => group.categories.includes(item.category || 'Other'))?.icon || '◇';
        symbol.setAttribute('aria-hidden','true');
        const link = document.createElement('a');
        link.className = 'launcher-tool-link';
        link.href = toolUrl(item);
        const title = document.createElement('strong');
        title.textContent = item.name;
        const description = document.createElement('span');
        description.textContent = item.description;
        link.append(title,description);
        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'launcher-save';
        const saved = favorites.has(item.url);
        save.textContent = saved ? '★' : '☆';
        save.setAttribute('aria-pressed',String(saved));
        save.setAttribute('aria-label',(saved?'Remove ':'Save ')+item.name+(saved?' from saved tools':' to saved tools'));
        save.title = saved ? 'Remove from My tools' : 'Save to My tools';
        save.addEventListener('click', () => {
          if (favorites.has(item.url)) favorites.delete(item.url);
          else favorites.add(item.url);
          saveFavorites();
          renderTools();
        });
        const open = document.createElement('a');
        open.className = 'launcher-tool-open';
        open.href = toolUrl(item);
        open.textContent = '↗';
        open.setAttribute('aria-label','Open '+item.name);
        row.append(symbol,link,save,open);
        return row;
      };
      function matchedTools() {
        const words=normalize(search.value).split(/\s+/).filter(Boolean);
        let matches=tools.filter(item=>{
          if (active==='__saved__' && !favorites.has(item.url)) return false;
          if (active && active!=='__saved__' &&
            !groups.find(group=>group.id===active)?.categories.includes(item.category||'Other')) return false;
          if(!words.length)return true;
          const id=String(item.url||'').split('/')[1];
          const text=normalize([item.name,item.description,item.category,aliases[id]||''].join(' '));
          return words.every(word=>text.includes(word));
        });
        if (sort.value==='az')matches.sort((a,b)=>a.name.localeCompare(b.name));
        else if (sort.value==='za')matches.sort((a,b)=>b.name.localeCompare(a.name));
        else if(words.length){
          const quality=item=>{
            const name=normalize(item.name),phrase=words.join(' ');
            return (name===phrase?1000:name.includes(phrase)?300:0)+
              words.reduce((sum,word)=>sum+(name.includes(word)?30:0),0);
          };
          matches.sort((a,b)=>quality(b)-quality(a));
        }
        return matches;
      }
      function renderTools() {
        const searching=!!search.value.trim();
        const current=groups.find(group=>group.id===active);
        for(const button of [...sidebar.querySelectorAll('[data-group]'),...mobileCategories.querySelectorAll('[data-group]')]){
          button.setAttribute('aria-pressed',String(button.dataset.group===active));
          if(button.dataset.group==='__saved__')button.querySelector('.launcher-group-count').textContent=String(favorites.size);
        }
        const matches=matchedTools(),pages=Math.max(1,Math.ceil(matches.length/pageSize));
        page=Math.min(page,pages);
        toolGrid.replaceChildren(...matches.slice((page-1)*pageSize,page*pageSize).map(makeRow));
        noResults.hidden=matches.length>0;
        const discovering=!searching&&!active;
        mobileBrowse.hidden=!discovering;
        back.hidden=discovering;
        clear.hidden=!searching;
        eyebrow.textContent=searching?'SEARCH RESULTS':active==='__saved__'?'YOUR SHORTCUTS':current?'BROWSE CATEGORY':'DISCOVER';
        heading.textContent=searching?'Matching tools':active==='__saved__'?'My saved tools':current?current.name:'Recently added';
        caption.textContent=searching?'Tools that match what you need.':
          active==='__saved__'?'Your favorites are saved on this device.':
          current?matches.length+' useful '+(matches.length===1?'tool':'tools')+' in this collection.':
          'A small selection from the latest additions.';
        const message=noResults.querySelector('h3');
        const details=noResults.querySelector('p');
        message.textContent=active==='__saved__'&&!searching?'Your saved tools will appear here':'Nothing found for that search';
        details.textContent=active==='__saved__'&&!searching?'Use ☆ beside any tool to save it for later.':'Try different words or browse a category.';
        const from=matches.length?(page-1)*pageSize+1:0;
        const through=Math.min(matches.length,page*pageSize);
        count.textContent=matches.length?from+'–'+through+' of '+matches.length+' tools':'0 tools';
        pageNumber.textContent=page+' / '+pages;
        prev.disabled=page===1;
        next.disabled=page===pages;
      }
      const resetFilters=()=>{
        search.value='';
        active='';
        sort.value='newest';
        page=1;
        renderTools();
      };
      back.addEventListener('click',()=>{resetFilters();search.focus();});
      reset.addEventListener('click',()=>{resetFilters();search.focus();});
      clear.addEventListener('click',()=>{search.value='';page=1;renderTools();search.focus();});
      search.addEventListener('input',()=>{active='';page=1;renderTools();});
      sort.addEventListener('change',()=>{page=1;renderTools();});
      prev.addEventListener('click',()=>{if(page>1){page--;renderTools();}});
      next.addEventListener('click',()=>{if(page<Math.ceil(matchedTools().length/pageSize)){page++;renderTools();}});
      document.addEventListener('keydown',event=>{
        if(event.key!=='/'||document.getElementById('tools').hidden||event.ctrlKey||event.metaKey||event.altKey||
          ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||
          document.activeElement?.isContentEditable)return;
        event.preventDefault();
        search.focus();
      });
      renderTools();
      const productGrid = document.getElementById('explore-items'); productGrid.replaceChildren();
      document.getElementById('explore-empty').hidden = products.length > 0;
      products.forEach(item => productGrid.append(card(item)));
      setupExploreFeatureSpotlight(products, 'home');
      setupExploreFeatureSpotlight(products, 'explore');
    } catch (_) {
      recent.replaceChildren(statusCard('The catalog could not be loaded. Please try refreshing the page.'));
      for (const id of ['tools', 'explore']) document.getElementById(`${id}-items`).replaceChildren(statusCard('The catalog could not be loaded. Please try refreshing the page.'));
    }
  }
  loadCatalog();
})();
