// Shared, provider-neutral public product-launch gate.
// HQ only recommends. A founder must separately approve every launch.
// This module runs in both the browser and the static release build.
const localRoute=/^(?:(?:[a-z0-9][a-z0-9-]*\/)+|(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9-]*\.html)$/;
const isoDate=/^\d{4}-\d{2}-\d{2}$/;
const validDay=value=>{
  if(typeof value!=='string'||!isoDate.test(value))return false;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value;
};

export function isQualifiedProduct(item){
  if(!item||!['app','product'].includes(item.type))return false;
  const hq=item.headquartersReview;
  const founder=item.founderApproval;
  return item.published===true &&
    item.visibility!=='private' &&
    item.launchStatus==='launched' &&
    typeof item.name==='string'&&item.name.trim().length>=3 &&
    typeof item.description==='string'&&item.description.trim().length>=8 &&
    validDay(item.date) &&
    typeof item.url==='string'&&localRoute.test(item.url)&&!item.url.includes('..') &&
    hq?.status==='qualified' &&
    hq.marketResearch==='passed' &&
    hq.businessAnalysis==='passed' &&
    /^[a-f0-9]{64}$/.test(hq.evidenceSha256||'') &&
    founder?.status==='approved' &&
    validDay(founder.approvedOn) &&
    founder.approvedOn<=new Date().toISOString().slice(0,10);
}
export function qualifiedProducts(items){
  return Array.isArray(items)?items.filter(isQualifiedProduct):[];
}
