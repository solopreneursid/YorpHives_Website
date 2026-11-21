// Site ownership and ads.txt only. Does not enable advertising.
const ADS_TXT='google.com, pub-9864775895222572, DIRECT, f08c47fec0942fa0\n';
const VERIFY_TAG='<meta name="google-adsense-account" content="ca-pub-9864775895222572">';
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/ads.txt'){
   if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD'}});
   return new Response(request.method==='HEAD'?null:ADS_TXT,{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=300','x-content-type-options':'nosniff'}});
  }
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
  const response=await env.YORPHIVES_LIVE.fetch(request);
  if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  return new HTMLRewriter().on('head',{element(e){e.append(VERIFY_TAG,{html:true})}}).transform(response);
 }
};
