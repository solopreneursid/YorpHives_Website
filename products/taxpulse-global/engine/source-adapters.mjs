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
 return {jurisdiction:'US',component:'oasdi',taxYear:String(year),effectiveFrom:year+'-01-01',effectiveUntil:(year+1)+'-01-01',parameters:{annualWageBase:cap,employeeRateBasisPoints:basisPoints},status:'candidate',legalStatus:'review_required',automaticActivation:false};
}
function tables(html){return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(table=>[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row=>[...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>normalize(cell[1]).replace(/&pound;|&#163;/g,'£'))));}
export function extractUkNi(html,year){
 if(typeof html!=='string'||html.length>2*1024*1024||!Number.isInteger(year)||year<2020||year>2100)throw Error('Invalid HMRC source');
 if(!normalize(html).includes('Rates and thresholds for employers '+year+' to '+(year+1)))throw Error('HMRC period mismatch');
 const all=tables(html);
 const threshold=all.filter(t=>t.some(r=>r[0]==='Primary threshold')&&t.some(r=>r[0]==='Upper earnings limit'));
 const employee=all.filter(t=>t.some(r=>r[0]==='National Insurance category letter'&&r.some(x=>x.includes('Earnings above primary threshold'))));
 if(threshold.length!==1||employee.length!==1)throw Error('Ambiguous HMRC tables');
 const monthly=label=>{const rows=threshold[0].filter(r=>r[0]===label);if(rows.length!==1)throw Error('Ambiguous threshold');const m=[...rows[0].slice(1).join(' ').matchAll(/£([\d,]+) per month/g)];if(m.length!==1)throw Error('Missing monthly threshold');return Number(m[0][1].replaceAll(',',''));};
 const row=employee[0].filter(r=>r[0]==='A');if(row.length!==1||row[0].length!==4||row[0][1]!=='0%')throw Error('Unsupported NI category A');
 const rate=v=>{if(!/^\d+(?:\.\d{1,2})?%$/.test(v))throw Error('Invalid percentage');const b=Math.round(parseFloat(v)*100);if(b<0||b>10000)throw Error('Invalid rate');return b;};
 const monthlyLower=monthly('Primary threshold'),monthlyUpper=monthly('Upper earnings limit');if(monthlyLower<=0||monthlyUpper<=monthlyLower||monthlyUpper>1e6)throw Error('Invalid thresholds');
 return {jurisdiction:'GB',component:'ni',taxYear:String(year),effectiveFrom:year+'-04-06',effectiveUntil:(year+1)+'-04-06',parameters:{monthlyLower,monthlyUpper,mainRateBasisPoints:rate(row[0][2]),upperRateBasisPoints:rate(row[0][3])},status:'candidate',legalStatus:'review_required',automaticActivation:false};
}
export function extractCandidate(source,bytes){
 if(source.id==='US-1'&&source.url==='https://www.ssa.gov/OACT/COLA/cbb.html')return extractSsaWageBase(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 const match=source.url.match(/^https:\/\/www\.gov\.uk\/guidance\/rates-and-thresholds-for-employers-(\d{4})-to-(\d{4})$/);
 if(source.id.startsWith('GB-NI-')&&match&&Number(match[2])===Number(match[1])+1)return extractUkNi(new TextDecoder('utf-8',{fatal:true}).decode(bytes),Number(match[1]));
 return null;
}
