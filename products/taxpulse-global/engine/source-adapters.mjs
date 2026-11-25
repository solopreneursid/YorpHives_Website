// Extract only a narrowly defined official publication format; all observations are candidates.
const normalize=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
export function extractSsaWageBase(html){
 if(typeof html!=='string'||html.length>2*1024*1024)throw Error('Invalid source body');
 const text=normalize(html);
 const base=[...text.matchAll(/For earnings in (\d{4}), this base is\s*\$([\d,]+)\b/g)];
 const rate=[...text.matchAll(/tax rate\s+for wages paid in (\d{4}) is set by statute at ([\d.]+) percent for employees and employers/g)];
 if(base.length!==1||rate.length!==1||base[0][1]!==rate[0][1])throw Error('SSA narrative format changed or conflicting');
 const year=Number(base[0][1]),cap=Number(base[0][2].replaceAll(',','')),basisPoints=Number(rate[0][2])*100;
 if(year<2000||year>2100||!Number.isSafeInteger(cap)||cap<=0||cap>1e7||!Number.isSafeInteger(basisPoints)||basisPoints<0||basisPoints>10000)throw Error('Invalid SSA values');
 const matches=[];
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>normalize(m[1]));
  if(cells[0]===String(year)&&cells.length===2&&/^\$?[\d,]+$/.test(cells[1]))matches.push(Number(cells[1].replace(/[$,]/g,'')));
 }
 if(matches.length!==1||matches[0]!==cap)throw Error('SSA table and narrative disagree');
 return {jurisdiction:'US',component:'employee-oasdi',taxYear:String(year),effectiveFrom:year+'-01-01',effectiveUntil:(year+1)+'-01-01',parameters:{annualWageBase:cap,employeeRateBasisPoints:basisPoints},status:'candidate',legalStatus:'review_required',automaticActivation:false};
}
export function extractCandidate(source,bytes){if(source.id!=='US-1'||source.url!=='https://www.ssa.gov/OACT/COLA/cbb.html')return null;return extractSsaWageBase(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
