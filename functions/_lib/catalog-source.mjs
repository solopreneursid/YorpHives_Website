/* Shared public catalog loader for Cloudflare Pages Functions and Workers Static Assets.
 * Workers use the exact versioned static asset binding rather than recursively
 * fetching their own workers.dev route. Pages retains the existing public GET.
 */
export async function loadPublishedCatalog(request,env){
 const url=new URL('/catalog.json',request.url);
 const response=env?.ASSETS?.fetch
  ? await env.ASSETS.fetch(url.toString())
  : await fetch(url.toString(),{headers:{Accept:'application/json'},cf:{cacheTtl:60}});
 if(!response.ok)throw Error('Public catalog unavailable');
 const length=Number(response.headers?.get('content-length')||0);
 if(length>700000)throw Error('Catalog exceeds size limit');
 const raw=await response.text();
 if(raw.length>700000)throw Error('Catalog exceeds size limit');
 const result=JSON.parse(raw);
 if(!Array.isArray(result.items))throw Error('Public catalog malformed');
 return result.items;
}
