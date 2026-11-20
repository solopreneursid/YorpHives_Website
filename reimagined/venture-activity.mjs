/* Public product-release timeline. Derive from the same founder-approval
 * gate as the HQventures portfolio, never from tool activity or HQ drafts.
 * Only real approved launches become visible. No remote services required. */
import {qualifiedProducts} from '../product-policy.mjs';

const MAX=4;
export function approvedVentureReleases(items,now=Date.now(),max=MAX){
 const limit=Number.isInteger(max)?Math.max(0,Math.min(MAX,max)):MAX;
 return qualifiedProducts(items)
  .filter(item=>Date.parse(item.date+'T00:00:00Z')<=now)
  .sort((a,b)=>b.date.localeCompare(a.date)||a.name.localeCompare(b.name))
  .slice(0,limit)
  .map(item=>({name:item.name,url:item.url,date:item.date,description:item.description}));
}
