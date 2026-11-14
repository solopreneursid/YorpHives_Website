const pages=[...document.querySelectorAll('.page')];const nav=document.querySelector('nav');const menu=document.querySelector('.menu');function route(){const id=location.hash.slice(1)||'home';const page=['home','tools','explore','builders','connect'].includes(id)?id:id==='post'?'builders':'home';pages.forEach(x=>x.classList.toggle('active',x.id===page));document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.dataset.page===page));nav.classList.remove('open');menu.setAttribute('aria-expanded','false');if(id==='post')requestAnimationFrame(()=>document.querySelector('#post').scrollIntoView());else window.scrollTo(0,0)}window.addEventListener('hashchange',route);route();menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(form);let body='';for(const [key,value] of data)body+=`${key}: ${value}\n\n`;const subject=form.dataset.type==='opportunity'?'Paid opportunity for YorpHives':'Project enquiry for YorpHives';window.location.href=`mailto:connect@yorphives.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}));

// One catalog powers the homepage and both product collections.
(function(){
 const allowedTypes=['tool','app','product'];
 const entries=(Array.isArray(window.YORPHIVES_CATALOG)?window.YORPHIVES_CATALOG:[]).filter(item=>item&&typeof item.name==='string'&&typeof item.description==='string'&&allowedTypes.includes(item.type)&&/^\d{4}-\d{2}-\d{2}$/.test(item.date||''));
 entries.sort((a,b)=>b.date.localeCompare(a.date));
 function card(item){
  const el=document.createElement('article');el.className='catalog-card';
  const label=document.createElement('span');label.className='catalog-type';label.textContent=item.type==='tool'?'FREE TOOL':item.type.toUpperCase();
  const title=document.createElement('h3');title.textContent=item.name;
  const description=document.createElement('p');description.textContent=item.description;
  const date=document.createElement('time');date.dateTime=item.date;date.textContent='ADDED '+item.date;
  el.append(label,title,description,date);
  try{const url=new URL(item.url,location.href);if(['https:','http:'].includes(url.protocol)&&item.url){const link=document.createElement('a');link.className='inline';link.href=url.href;link.textContent='Explore ↗';el.append(link)}}catch{}
  return el;
 }
 const recent=document.getElementById('recent-items');
 if(entries.length)entries.slice(0,3).forEach(x=>recent.append(card(x)));else{const note=document.createElement('p');note.className='catalog-empty';note.textContent='Our first tools and products are taking shape. New additions will appear here.';recent.append(note)}
 [['tools',entries.filter(x=>x.type==='tool')],['explore',entries.filter(x=>x.type!=='tool')]].forEach(([section,items])=>{if(!items.length)return;const container=document.getElementById(section+'-items');container.hidden=false;const grid=document.createElement('div');grid.className='catalog-grid';items.forEach(item=>grid.append(card(item)));container.append(grid);document.getElementById(section+'-empty').hidden=true});
})();
