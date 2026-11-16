/* YORPHIVES KINETIC: original, dependency-free user interface.
 * All public tools and products are discovered from the local catalog.json.
 * Client-side state only. No external API, no tracking or remote assets.
 */
(() => {
  'use strict';
  const pages = [...document.querySelectorAll('.page')];
  const names = {home:'Home',tools:'Free tools',explore:'Explore',builders:'Builders',connect:'Contact'};
  const menuButton = document.getElementById('menu-toggle');
  const menuPanel = document.getElementById('mobile-menu');
  let previousPage = '';

  function closeMenu() {
    menuPanel.hidden = true;
    menuButton.setAttribute('aria-expanded','false');
    menuButton.setAttribute('aria-label','Open menu');
    document.body.classList.remove('menu-open');
  }
  menuButton.addEventListener('click', () => {
    const opening = menuPanel.hidden;
    menuPanel.hidden = !opening;
    menuButton.setAttribute('aria-expanded',String(opening));
    menuButton.setAttribute('aria-label',opening?'Close menu':'Open menu');
    document.body.classList.toggle('menu-open',opening);
  });
  menuPanel.addEventListener('click',event=>{
    if (event.target.closest('a')) closeMenu();
  });
  document.querySelector('.mobile-dock').addEventListener('click',event=>{
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!menuPanel.hidden){closeMenu();menuButton.focus();}
  });
  window.addEventListener('resize',()=>{if(innerWidth>760&&!menuPanel.hidden)closeMenu();});

  const subpages = new Set(['post','opportunities','membership','partners','how-it-works','projects-collection','our-ai-team','home-explore','home-use','home-connect']);
  function route() {
    let hash=location.hash.slice(1);
    try{hash=decodeURIComponent(hash);}catch{hash='home';}
    const subpage=subpages.has(hash);
    const active=['how-it-works','our-ai-team','home-explore','home-use','home-connect'].includes(hash)?'home':hash==='projects-collection'?'explore':subpage?'builders':Object.hasOwn(names,hash)?hash:'home';
    pages.forEach(page=>{page.hidden=page.id!==active;});
    document.querySelectorAll('[data-nav]').forEach(link=>{
      if(link.dataset.nav===active)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    document.title=active==='home'?'YorpHives — Ideas in motion':names[active]+' — YorpHives';
    closeMenu();
    if(subpage){
      const id=hash==='post'?'membership':hash;
      requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start'}));
    } else if(active!==previousPage){
      window.scrollTo({top:0,behavior:'instant'});
    }
    previousPage=active;
  }
  window.addEventListener('hashchange',route);
  route();
  document.querySelector('.skip').addEventListener('click',event=>{
    event.preventDefault();document.getElementById('main').focus();
  });
  document.getElementById('current-year').textContent=String(new Date().getFullYear());
  // Keep the live site's direct invitation to suggest a useful free tool.
  // Only preselects the enquiry topic; the visitor still reviews their email.
  document.querySelectorAll('[data-contact-reason]').forEach(link=>{
    link.addEventListener('click',()=>{
      const selector=document.getElementById('project-type');
      const value=link.getAttribute('data-contact-reason');
      if(selector && [...selector.options].some(option=>option.value===value))selector.value=value;
    });
  });


  // Founder-controlled contact: nothing leaves the browser until the visitor
  // reviews and sends their prepared message from their email app.
  document.getElementById('contact-form').addEventListener('submit',event=>{
    event.preventDefault();
    const form=event.currentTarget;
    if(!form.reportValidity())return;
    const lines=[...new FormData(form)].filter(([,v])=>String(v).trim())
      .map(([k,v])=>k+': '+String(v).trim());
    const query='subject='+encodeURIComponent('Project enquiry for YorpHives')+
      '&body='+encodeURIComponent(lines.join('\n\n'));
    location.href='mailto:connect@yorphives.com?'+query;
  });

  const search=document.getElementById('tool-search');
  // The homepage search goes to the *working* Free Tools library. It does not
  // maintain a second search index or make users enter their query again.
  const homeSearch=document.getElementById('home-tool-search');
  document.getElementById('home-tool-search-form').addEventListener('submit',event=>{
    event.preventDefault();
    const query=homeSearch.value.trim();
    search.value=query;
    search.dispatchEvent(new Event('input',{bubbles:true}));
    location.hash='#tools';
    requestAnimationFrame(()=>search.focus({preventScroll:true}));
  });

  const grid=document.getElementById('tools-items');
  const groupsEl=document.getElementById('tool-categories');
  const count=document.getElementById('tool-count');
  const title=document.getElementById('tool-view-title');
  const caption=document.getElementById('tool-view-caption');
  const clear=document.getElementById('tool-clear');
  const sort=document.getElementById('tool-sort');
  const prev=document.getElementById('tool-prev');
  const next=document.getElementById('tool-next');
  const pager=document.getElementById('tool-page-number');
  const noResults=document.getElementById('tool-no-results');
  const favoritesButton=document.getElementById('tool-favorites');
  const favoriteCount=document.getElementById('favorite-count');
  const ribbon=document.getElementById('category-ribbon-track');
  const storageKey='yorphives.tool-favorites.v1';
  let allTools=[],activeGroup='',savedOnly=false,page=1,groups=[],favorites=new Set();
  const pageSize=10;
  const groupDefinitions=[
    {id:'documents',name:'Documents',icon:'▤',categories:['PDF','Spreadsheets','Presentations']},
    {id:'images',name:'Images & Design',icon:'◈',categories:['Images','Design']},
    {id:'writing',name:'Writing & Text',icon:'✎',categories:['Writing']},
    {id:'files',name:'Files & ZIP',icon:'▣',categories:['Files']},
    {id:'developer',name:'Developer',icon:'⌘',categories:['Developer','Security']},
    {id:'calculators',name:'Calculators',icon:'∑',categories:['Calculators']},
    {id:'creator',name:'Marketing & Creator',icon:'◎',categories:['Marketing','Creator']}
  ];
  const normalize=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const synonyms={
    'pdf-merge':'combine pdf join pdfs documents',
    'pdf-extract-pages':'split pdf select pages cut pdf',
    'images-to-pdf':'convert photo jpg png picture to pdf',
    'image-resizer':'resize photo shrink image jpg jpeg png webp',
    'duplicate-file-finder':'find duplicate identical repeated files',
    'word-counter':'count words characters letters',
    'zip-file-creator':'compress archive multiple files',
    'json-formatter':'pretty print json beautify'
  };
  const safeUrl=item=>{
    const url=String(item.url||'');
    return /^tools\/[a-z0-9][a-z0-9-]*\/$/.test(url)?url:'tools/';
  };
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');
    if(Array.isArray(saved))favorites=new Set(saved.filter(x=>typeof x==='string'));
  }catch{/* browser local storage may be restricted */}
  function saveFavorites(){
    try{localStorage.setItem(storageKey,JSON.stringify([...favorites]));}catch{/* optional */}
  }
  function filteredTools(){
    const words=normalize(search.value).split(/\s+/).filter(Boolean);
    const group=groups.find(g=>g.id===activeGroup);
    let items=allTools.filter(item=>{
      if(savedOnly&&!favorites.has(item.url))return false;
      if(group&&!group.categories.includes(item.category||'Other'))return false;
      if(!words.length)return true;
      const slug=String(item.url).split('/')[1];
      const text=normalize([item.name,item.description,item.category,synonyms[slug]||''].join(' '));
      return words.every(word=>text.includes(word));
    });
    if(sort.value==='az')items.sort((a,b)=>a.name.localeCompare(b.name));
    else if(sort.value==='za')items.sort((a,b)=>b.name.localeCompare(a.name));
    else if(words.length){
      const relevance=item=>{
        const name=normalize(item.name),phrase=words.join(' ');
        return (name===phrase?1000:name.includes(phrase)?300:0)+
          words.reduce((sum,word)=>sum+(name.includes(word)?30:0),0);
      };
      items.sort((a,b)=>relevance(b)-relevance(a));
    }
    return items;
  }
  function iconFor(category){
    const group=groups.find(g=>g.categories.includes(category||'Other'));
    return group?.icon||'◇';
  }
  function renderTool(item){
    const card=document.createElement('article');card.className='tool-card';card.setAttribute('role','listitem');
    const top=document.createElement('div');top.className='tool-card-top';
    const label=document.createElement('span');label.className='tool-card-category';
    const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=iconFor(item.category);
    const category=document.createElement('span');category.textContent=item.category||'Tool';
    label.append(icon,category);
    const save=document.createElement('button');save.type='button';save.className='favorite-button';
    const saved=favorites.has(item.url);
    save.textContent=saved?'★':'☆';
    save.setAttribute('aria-label',(saved?'Remove ':'Save ')+item.name+(saved?' from saved tools':' to saved tools'));
    save.setAttribute('aria-pressed',String(saved));
    save.addEventListener('click',()=>{
      if(favorites.has(item.url))favorites.delete(item.url);else favorites.add(item.url);
      saveFavorites();render();
    });
    top.append(label,save);
    const heading=document.createElement('h3');heading.textContent=item.name;
    const description=document.createElement('p');description.textContent=item.description;
    const foot=document.createElement('div');foot.className='tool-card-bottom';
    const note=document.createElement('small');note.textContent='FREE · IN YOUR BROWSER';
    const open=document.createElement('a');open.className='tool-open';
    open.href=safeUrl(item);open.textContent='Open tool';
    const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
    open.append(arrow);foot.append(note,open);
    card.append(top,heading,description,foot);
    return card;
  }
  function renderCategories(){
    const allButton=(id,name,amount)=>{
      const button=document.createElement('button');button.type='button';button.className='chip';
      button.dataset.group=id;button.setAttribute('aria-pressed',String(id===activeGroup));
      const text=document.createElement('span');text.textContent=name;
      const number=document.createElement('small');number.textContent=String(amount);
      button.append(text,number);
      button.addEventListener('click',()=>{
        activeGroup=id;savedOnly=false;page=1;search.value='';render();
      });
      return button;
    };
    groupsEl.replaceChildren(allButton('','All tools',allTools.length),
      ...groups.map(g=>allButton(g.id,g.name,allTools.filter(x=>g.categories.includes(x.category||'Other')).length)));
  }
  function render(){
    if(!allTools.length)return;
    const existingUrls=new Set(allTools.map(x=>x.url));
    favorites=new Set([...favorites].filter(url=>existingUrls.has(url)));
    favoriteCount.textContent=String(favorites.size);
    favoritesButton.setAttribute('aria-pressed',String(savedOnly));
    renderCategories();
    const matches=filteredTools();
    const pages=Math.max(1,Math.ceil(matches.length/pageSize));
    page=Math.min(page,pages);
    const shown=matches.slice((page-1)*pageSize,page*pageSize);
    grid.replaceChildren(...shown.map(renderTool));
    noResults.hidden=matches.length>0;
    count.textContent=matches.length?((page-1)*pageSize+1)+'–'+Math.min(matches.length,page*pageSize)+' of '+matches.length+' tools':'0 tools';
    pager.textContent=page+' / '+pages;prev.disabled=page===1;next.disabled=page===pages;
    clear.hidden=!search.value.trim();
    if(savedOnly){title.textContent='Saved tools';caption.textContent='Your favorites, stored on this device.';}
    else if(search.value.trim()){title.textContent='Search results';caption.textContent='Showing tools that match your search.';}
    else if(activeGroup){title.textContent=groups.find(x=>x.id===activeGroup)?.name||'Browse';caption.textContent='Useful tools in this category.';}
    else{title.textContent='Explore the collection';caption.textContent='Search, browse, or save your favorites.';}
  }
  function reset(){
    activeGroup='';savedOnly=false;page=1;search.value='';sort.value='newest';render();
  }
  search.addEventListener('input',()=>{activeGroup='';savedOnly=false;page=1;render();});
  clear.addEventListener('click',()=>{search.value='';page=1;render();search.focus();});
  sort.addEventListener('change',()=>{page=1;render();});
  prev.addEventListener('click',()=>{if(page>1){page--;render();document.querySelector('.library-top').scrollIntoView({block:'start'});}});
  next.addEventListener('click',()=>{if(page<Math.ceil(filteredTools().length/pageSize)){page++;render();document.querySelector('.library-top').scrollIntoView({block:'start'});}});
  favoritesButton.addEventListener('click',()=>{savedOnly=!savedOnly;activeGroup='';page=1;search.value='';render();});
  document.getElementById('tool-show-all').addEventListener('click',reset);
  document.getElementById('tool-reset').addEventListener('click',reset);
  document.addEventListener('keydown',event=>{
    if(event.key!=='/'||document.getElementById('tools').hidden||
      event.ctrlKey||event.metaKey||event.altKey||
      ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||
      document.activeElement?.isContentEditable)return;
    event.preventDefault();search.focus();
  });

  // Moving categories use two equal tracks so the animation has a seamless
  // loop. The duplicate is decorative and is removed for reduced motion.
  function renderRibbon(){
    const available=groups.filter(g=>allTools.some(x=>g.categories.includes(x.category||'Other')));
    const buildSet=(isDuplicate)=>{
      const set=document.createElement('div');set.className='rail-set';
      if(isDuplicate)set.setAttribute('aria-hidden','true');
      for(const g of available){
        const link=document.createElement('a');
        link.className='rail-chip';link.href='#tools';
        link.textContent=g.name;
        const arrow=document.createElement('span');
        arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
        link.append(arrow);
        if(isDuplicate)link.tabIndex=-1;
        else link.addEventListener('click',()=>{activeGroup=g.id;savedOnly=false;page=1;search.value='';render();});
        set.append(link);
      }
      return set;
    };
    for(const track of [ribbon,document.getElementById('tool-category-rail')]){
      if(!track)continue;
      track.replaceChildren(buildSet(false),buildSet(true));
    }
  }
  // Verified YHpulse is built into the homepage once, with no client-side duplicate.
  const pausedStates={categories:false,pulse:false};
  const applyMotion=(kind,paused)=>{
    pausedStates[kind]=paused;
    const selector=kind==='categories'?'.category-ribbon':'.home-pulse';
    document.querySelectorAll(selector).forEach(el=>el.classList.toggle('motion-paused',paused));
    document.querySelectorAll('[data-motion-toggle="'+kind+'"]').forEach(button=>{
      button.setAttribute('aria-pressed',String(paused));
      button.setAttribute('aria-label',(paused?'Resume ':'Pause ')+(kind==='pulse'?'YHpulse updates':'moving categories'));
      button.textContent=paused?'▶':'Ⅱ';
    });
  };
  document.querySelectorAll('[data-motion-toggle]').forEach(button=>{
    button.addEventListener('click',()=>{
      const kind=button.dataset.motionToggle;
      applyMotion(kind,!pausedStates[kind]);
    });
  });
  const homeTools=document.getElementById('home-tools-list');
  const homeFeatured=document.getElementById('home-featured');
  const featuredSlugs=['word-counter','pdf-merge','image-resizer','json-formatter','qr-code-generator','password-generator'];
  function renderHomeTools(items){
    // Only genuine published, locally executable catalog tools appear here.
    const safe=items.filter(item=>/^tools\/[a-z0-9][a-z0-9-]*\/$/.test(item.url));
    const curated=featuredSlugs.map(slug=>safe.find(t=>t.url==='tools/'+slug+'/')).filter(Boolean);
    const pool=curated.concat(safe.filter(t=>!curated.includes(t))).slice(0,6);
    const nodes=pool.map(item=>{
      const a=document.createElement('a');a.className='home-tool-card';a.href=safeUrl(item);a.setAttribute('role','listitem');
      const icon=document.createElement('span');icon.className='home-tool-symbol';icon.setAttribute('aria-hidden','true');icon.textContent=iconFor(item.category);
      const detail=document.createElement('span');detail.className='home-tool-details';
      const title=document.createElement('strong');title.textContent=item.name;
      const category=document.createElement('small');category.textContent=item.category||'Free tool';
      detail.append(title,category);
      const arrow=document.createElement('span');arrow.className='home-tool-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';
      a.append(icon,detail,arrow);
      return a;
    });
    if(nodes.length)homeTools.replaceChildren(...nodes);
    else{
      const a=document.createElement('a');a.href='tools/';a.textContent='Open the tool directory ↗';
      homeTools.replaceChildren(a);
    }
    document.getElementById('home-tools-count').textContent=items.length+' free tools · no sign-up';
  }
  function renderFeaturedProject(products){
    const stage=document.getElementById('project-stage-state');
    if(!products.length){stage.textContent='APPROVAL REQUIRED';return;}
    // The same founder-qualified product data powers both home and Explore.
    const item=products[0],container=document.createElement('div');
    container.className='project-stage-copy project-stage-approved';
    const badge=document.createElement('span');badge.textContent='FOUNDER APPROVED';
    const title=document.createElement('strong');title.textContent=item.name;
    const desc=document.createElement('small');desc.textContent=item.description;
    container.append(badge,title,desc);
    if(/^(?:products|apps)\/[a-z0-9][a-z0-9-]*\/$/.test(String(item.url||''))){
      const link=document.createElement('a');link.href=item.url;link.textContent='Open project ↗';container.append(link);
    }
    const icon=document.createElement('div');icon.className='project-abstract';icon.setAttribute('aria-hidden','true');
    const mark=document.createElement('b');mark.textContent='✳';icon.append(mark);
    homeFeatured.replaceChildren(icon,container);
    stage.textContent='APPROVED PROJECT';
  }
  function showProducts(products){
    const el=document.getElementById('explore-items'),empty=document.getElementById('explore-empty');
    el.replaceChildren();
    empty.hidden=products.length>0;
    products.forEach(item=>{
      const card=document.createElement('article');card.className='product-card';
      const badge=document.createElement('span');badge.className='overline';badge.textContent='FOUNDER APPROVED';
      const heading=document.createElement('h3');heading.textContent=item.name;
      const desc=document.createElement('p');desc.textContent=item.description;
      card.append(badge,heading,desc);
      if(/^(?:products|apps)\/[a-z0-9][a-z0-9-]*\/$/.test(String(item.url||''))){
        const link=document.createElement('a');link.href=item.url;link.textContent='Explore product ↗';card.append(link);
      }
      el.append(card);
    });
  }
  async function loadCatalog(){
    try{
      const response=await fetch('catalog.json',{cache:'no-cache'});
      if(!response.ok)throw Error('Catalog unavailable');
      const data=await response.json();
      if(!Array.isArray(data.items))throw Error('Invalid catalog');
      const published=data.items.filter(item=>item&&typeof item.name==='string'&&
        typeof item.description==='string'&&typeof item.url==='string'&&
        item.visibility!=='private'&&item.published!==false);
      allTools=published.filter(item=>item.type==='tool'&&/^tools\/[a-z0-9][a-z0-9-]*\/$/.test(item.url));
      document.getElementById('tool-total').textContent=allTools.length+' free tools';
      const assigned=new Set(groupDefinitions.flatMap(g=>g.categories));
      groups=[...groupDefinitions];
      for(const category of [...new Set(allTools.map(x=>x.category||'Other'))].sort()){
        if(!assigned.has(category))groups.push({id:'other-'+groups.length,name:category,icon:'◇',categories:[category]});
      }
      const {qualifiedProducts}=await import('./product-policy.mjs');
      const approved=qualifiedProducts(published);
      showProducts(approved);
      renderFeaturedProject(approved);
      renderHomeTools(allTools);
      if(allTools.length){render();renderRibbon();}
      else{
        count.textContent='No tools available';
        grid.replaceChildren();
        noResults.hidden=false;
        document.querySelector('#tool-no-results h3').textContent='No free tools are available yet';
      }
    }catch(error){
      document.getElementById('tool-total').textContent='Unavailable';
      count.textContent='Unable to load tools';
      grid.replaceChildren();
      noResults.hidden=false;
      document.querySelector('#tool-no-results h3').textContent='The tool library could not load';
      document.querySelector('#tool-no-results p').textContent='Please refresh the page or try the A–Z directory.';
      groupsEl.replaceChildren();
      document.getElementById('explore-empty').hidden=false;
      const fail=document.createElement('a');fail.href='tools/';fail.textContent='Open the tool directory ↗';
      homeTools.replaceChildren(fail);
      document.getElementById('home-tools-count').textContent='Explore the A–Z directory';
    }
  }
  loadCatalog();
})();
