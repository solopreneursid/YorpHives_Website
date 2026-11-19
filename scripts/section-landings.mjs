import {readFile} from 'node:fs/promises';
// Lightweight, independently crawlable front doors for the existing studio sections.
// No frameworks, remote calls, fake launch claims, external subscriptions or HQ access.
export const sectionLandingPaths=Object.freeze(['hqventures/','partnerships/']);
const sections=[
 {slug:'hqventures',label:'HQventures',title:'Explore founder-reviewed ventures',
 description:'Discover YorpHives initiatives and useful products. Publishing decisions remain founder-controlled.',
 headline:'Ideas become useful when they are tested.',
 lead:'HQventures is where YorpHives presents projects and products selected for public release. Research and evaluation inform our decisions, but an idea is not advertised as launched until it is approved.',
 action:'Explore HQventures on the main site',hash:'ventures',
 points:[['Explore projects','View venture information and current release status before trying a product.'],
 ['Try useful tools','Browse the public collection of privacy-conscious, browser-local utilities.'],
 ['Evidence before claims','We distinguish verified releases from ideas and work in progress.']]},
 {slug:'partnerships',label:'Partnerships',title:'Partner with YorpHives',
 description:'Explore collaboration possibilities with YorpHives, an independently operated AI-powered venture studio.',
 headline:'Create something useful together.',
 lead:'We welcome relevant conversations about products, distribution and practical collaboration. Enquiries are reviewed by the founder; submitting an idea is not a partnership commitment.',
 action:'View partnership options on the main site',hash:'partners',
 points:[['Product collaboration','Discuss concrete product ideas and technical or design contributions.'],
 ['Distribution','Explore ways to bring verified, useful tools to more people.'],
 ['Responsible growth','Keep terms, ownership and any revenue arrangements explicit and independently reviewed.']]}
];
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=`*{box-sizing:border-box}html{color-scheme:dark}body{margin:0;background:#0c1714;color:#f0f7f1;font:16px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit}a:focus-visible{outline:3px solid #71f8c5;outline-offset:4px}.wrap{width:min(1100px,calc(100% - 40px));margin:auto}.skip{position:absolute;left:-9999px}.skip:focus{left:20px;top:16px;background:#fff;color:#0c1714;padding:10px;z-index:5}.top{border-bottom:1px solid #345349;background:#101f1b}.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px 0}.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800;font-size:1.2rem}.brand img{width:37px;height:37px}.nav{display:flex;flex-wrap:wrap;gap:14px;font-size:.95rem}.nav a{text-underline-offset:5px}.nav [aria-current=page]{color:#75f3c4}.hero{padding:clamp(65px,11vw,145px) 0 65px;background:radial-gradient(ellipse at 90% 5%,#20493d 0%,transparent 60%)}.eyebrow{color:#8cebbf;font-size:.82rem;text-transform:uppercase;letter-spacing:.16em;font-weight:700}h1{font-size:clamp(2.4rem,6vw,5rem);line-height:1.09;max-width:850px;letter-spacing:-.045em;margin:20px 0}p.lead{max-width:740px;font-size:clamp(1.07rem,2vw,1.32rem);color:#c7d9d0}.actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:30px}.button{background:#82ecc0;color:#092019;text-decoration:none;font-weight:700;border-radius:12px;padding:13px 20px}.button.secondary{background:transparent;border:1px solid #698b7c;color:#e1efe7}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px;padding:30px 0 90px}.card{border:1px solid #2c5043;border-radius:18px;background:#132820;padding:25px}.card h2{font-size:1.2rem;margin:0 0 10px}.card p{color:#c3d5cb;margin:0}footer{border-top:1px solid #345349;padding:26px 0;color:#aec5b7}footer .wrap{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}@media(max-width:720px){.top .wrap{align-items:flex-start;flex-direction:column}.grid{grid-template-columns:1fr}.hero{padding-top:70px}}`;
function page(s){
 const url='https://yorphives.com/'+s.slug+'/';
 const cards=s.points.map(([h,p])=>'<article class="card"><h2>'+escapeHtml(h)+'</h2><p>'+escapeHtml(p)+'</p></article>').join('');
 const meta=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',url,name:s.title,description:s.description,isPartOf:{'@type':'WebSite',name:'YorpHives',url:'https://yorphives.com/'}}).replace(/</g,'\\u003c');
 return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0c1714">
<title>${escapeHtml(s.title)} | YorpHives</title>
<meta name="description" content="${escapeHtml(s.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(s.title)} | YorpHives">
<meta property="og:description" content="${escapeHtml(s.description)}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/tools/brand-icon.webp" type="image/webp">
<link rel="stylesheet" href="/section-landing.css">
<script type="application/ld+json">${meta}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<a class="brand" href="/"><img src="/tools/brand-icon.webp" width="37" height="37" alt="">yorpHives</a>
<nav class="nav" aria-label="Main navigation"><a href="/">Home</a><a href="/hqventures/"${s.slug==='hqventures'?' aria-current="page"':''}>HQventures</a><a href="/tools/">Free tools</a><a href="/partnerships/"${s.slug==='partnerships'?' aria-current="page"':''}>Partnerships</a></nav>
</div></header>
<main id="main" class="wrap">
<section class="hero" aria-labelledby="page-title">
<span class="eyebrow">YORPHIVES / ${escapeHtml(s.label)}</span>
<h1 id="page-title">${escapeHtml(s.headline)}</h1>
<p class="lead">${escapeHtml(s.lead)}</p>
<div class="actions"><a class="button" href="/#${s.hash}">${escapeHtml(s.action)} →</a><a class="button secondary" href="/tools/">Browse free tools</a></div>
</section>
<section class="grid" aria-label="${escapeHtml(s.label)} overview">${cards}</section>
</main>
<footer><div class="wrap"><span>YorpHives · Ideas in motion</span><a href="/#contact">Contact YorpHives</a></div></footer>
</body></html>
`;
}
export async function publishSectionLandings(write){
 const freshCss=await readFile(new URL('./section-landing-fresh.css',import.meta.url),'utf8');
 await write('section-landing.css',freshCss+'\n');
 for(const section of sections)await write(section.slug+'/index.html',page(section));
}
