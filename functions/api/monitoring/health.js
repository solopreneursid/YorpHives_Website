// Public, deliberately coarse operational signal for an external monitor.
// It reads only a dedicated heartbeat, never enquiries, identities, counts,
// timestamps, addresses, or errors. It cannot read or change private HQ.
const response=ok=>new Response(JSON.stringify({ok}),{
 status:ok?200:503,
 headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff','x-robots-tag':'noindex'}
});
export async function onRequestGet({env}){
 try{
  const row=await env.HQCONNECT_DB.prepare('SELECT last_checked_at,last_result FROM hqconnect_notification_health WHERE id=1').first();
  const at=Date.parse(row?.last_checked_at||''),age=Date.now()-at;
  return response(row?.last_result==='ok'&&Number.isFinite(at)&&age>= -300000&&age<=2700000);
 }catch{return response(false)}
}
