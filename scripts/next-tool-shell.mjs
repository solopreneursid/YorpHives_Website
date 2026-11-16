/* Build-time presentation adapter for first-party free tools.
   All processors, native forms, labels, IDs and routes remain untouched.
   Only the shared visual shell changes in preview builds. */
export function injectNextToolUI(html,item){
 if(item.type!=='tool')return html;
 if(!/<body\b[^>]*class="tool-page"/i.test(html))throw Error('Unexpected direct tool document: '+item.url);
 if(html.includes('tool-next.css')||html.includes('class="mobile-dock"'))throw Error('Duplicate Next tool shell: '+item.url);
 if(!html.includes('</head>'))throw Error('Tool head is missing: '+item.url);
 html=html.replace('</head>','<link rel="stylesheet" href="../tool-next.css"></head>');
 const header=html.match(/<header\b[^>]*class="site-header"[^>]*>[\s\S]*?<\/header>/i)?.[0];
 if(!header)throw Error('Tool navigation header missing: '+item.url);
 const topNav='<nav class="tool-nav" aria-label="Main navigation">'+
  '<a href="../../#home">Home</a>'+
  '<a href="../../#tools" aria-current="page">Free tools</a>'+
  '<a href="../../#explore">HQventures</a>'+
  '<a href="../../#builders">Builders</a></nav>';
 const updated=header.replace(/<nav\b[^>]*class="tool-nav"[^>]*>[\s\S]*?<\/nav>/i,topNav)
  .replace('</header>','<a class="header-cta" href="../../#connect">Let&#39;s talk <span aria-hidden="true">↗</span></a>'+
   '<a class="tool-header-back" href="../../#tools">← All tools</a></header>');
 if(updated===header||!updated.includes('class="tool-nav"'))throw Error('Tool navigation could not be redesigned: '+item.url);
 html=html.replace(header,updated);
 const dock='<nav class="mobile-dock" aria-label="Mobile navigation">'+
 '<a href="../../#home"><span class="dock-icon" aria-hidden="true">⌂</span><span>Home</span></a>'+
 '<a href="../../#tools" aria-current="page"><span class="dock-icon" aria-hidden="true">▦</span><span>Tools</span></a>'+
 '<a href="../../#explore"><span class="dock-icon" aria-hidden="true">◇</span><span>HQventures</span></a>'+
 '<a href="../../#builders"><span class="dock-icon" aria-hidden="true">♧</span><span>Builders</span></a>'+
 '<a href="../../#connect"><span class="dock-icon" aria-hidden="true">✉</span><span>Contact</span></a>'+
 '</nav>';
 if(!html.includes('</body>'))throw Error('Tool body is missing: '+item.url);
 return html.replace('</body>',dock+'</body>');
}
