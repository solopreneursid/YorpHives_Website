/* Build-time adapter for the shared YorpHives Fresh tool shell.
   Processor markup, form IDs, routes and local execution remain untouched. */
export function injectNextToolUI(html,item){
 if(item.type!=='tool')return html;
 if(!/<body\b[^>]*class="tool-page"/i.test(html))throw Error('Unexpected direct tool document: '+item.url);
 if(html.includes('tool-next.css')||html.includes('class="mobile-dock"'))throw Error('Duplicate fresh tool shell: '+item.url);
 if(!html.includes('</head>'))throw Error('Tool head is missing: '+item.url);
 html=html.replace('</head>','<link rel="stylesheet" href="../tool-next.css"></head>');
 const header=html.match(/<header\b[^>]*class="site-header"[^>]*>[\s\S]*?<\/header>/i)?.[0];
 if(!header)throw Error('Tool navigation header missing: '+item.url);
 const nav='<nav class="tool-nav" aria-label="Main navigation">'+
  '<a href="../../#home">Home</a>'+
  '<a href="../../#tools" aria-current="page">Free tools</a>'+
  '<a href="../../#ventures">HQventures</a>'+
  '<a href="../../#partners">Partnerships</a>'+
  '</nav>';
 const updated=header.replace(/<nav\b[^>]*class="tool-nav"[^>]*>[\s\S]*?<\/nav>/i,nav)
  .replace('</header>',
   '<a class="header-cta" href="../../#contact">Let&#39;s talk <span aria-hidden="true">↗</span></a>'+
   '<a class="tool-header-back" href="../../#tools">← All tools</a></header>');
 if(updated===header||!updated.includes('class="tool-nav"'))throw Error('Tool navigation could not be redesigned: '+item.url);
 html=html.replace(header,updated);
 const dock='<nav class="mobile-dock" aria-label="Quick navigation">'+
  '<a href="../../#home"><span aria-hidden="true">⌂</span><small>Home</small></a>'+
  '<a href="../../#tools" aria-current="page"><span aria-hidden="true">▦</span><small>Tools</small></a>'+
  '<a href="../../#ventures"><span aria-hidden="true">✳</span><small>Explore</small></a>'+
  '<a href="../../#contact"><span aria-hidden="true">↗</span><small>Contact</small></a>'+
  '</nav>';
 if(!html.includes('</body>'))throw Error('Tool body is missing: '+item.url);
 return html.replace('</body>',dock+'</body>');
}
