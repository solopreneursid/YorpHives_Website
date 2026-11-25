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
// CRA publishes contiguous cent-denominated income bands, including the final unlimited band.
const craRegions={'Federal':'CA','Alberta':'CA-AB','British Columbia':'CA-BC','Manitoba':'CA-MB','New Brunswick':'CA-NB','Newfoundland and Labrador':'CA-NL','Northwest Territories':'CA-NT','Nova Scotia':'CA-NS','Nunavut':'CA-NU','Ontario':'CA-ON','Prince Edward Island':'CA-PE','Saskatchewan':'CA-SK','Yukon':'CA-YT'};
export function extractCraBrackets(html){
 if(typeof html!=='string'||html.length>2*1024*1024)throw Error('Invalid CRA source');
 const years=[...normalize(html).matchAll(/Current year tax rates and income brackets \((\d{4})\)/g)].map(m=>Number(m[1]));
 const distinct=[...new Set(years)];if(distinct.length!==1||distinct[0]<2020||distinct[0]>2100)throw Error('Ambiguous CRA tax year');
 const year=distinct[0],candidates=[],seen=new Set();
 for(const match of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
  const caption=match[1].match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i);
  if(!caption)continue;
  const label=normalize(caption[1]).match(/^(.+?) rate:\s*(\d{4})$/);
  if(!label||!Object.hasOwn(craRegions,label[1]))continue;
  if(Number(label[2])!==year||seen.has(label[1]))throw Error('Duplicate or conflicting CRA period');
  const rows=tables(match[0])[0].filter(r=>r.length===3&&r[0].startsWith('$'));
  const minor=v=>{if(!/^\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?$|^\$\d+(?:\.\d{2})?$/.test(v))throw Error('Invalid CRA amount');const n=Number(v.replace(/[$,]/g,''));if(!Number.isFinite(n)||n<0||n>1e9)throw Error('CRA amount out of range');return Math.round(n*100);};
  let lower=0;const bounds=[],rates=[];
  for(let i=0;i<rows.length;i++){const [from,to,rate]=rows[i];if(minor(from)!==lower||!/^\d{1,2}(?:\.\d{1,2})?%$/.test(rate))throw Error('CRA bracket gap or invalid rate');const bp=Math.round(parseFloat(rate)*100);if(bp>10000)throw Error('Invalid CRA rate');rates.push(bp);if(i===rows.length-1){if(to.toLowerCase()!=='unlimited')throw Error('Missing open final CRA band');}else{const upper=minor(to);if(upper<lower||upper%100!==0)throw Error('Invalid CRA threshold');bounds.push(upper/100);lower=upper+1;}}
  if(rows.length<2||rows.length>20||rates.length!==bounds.length+1)throw Error('Incomplete CRA bands');
  seen.add(label[1]);candidates.push({jurisdiction:craRegions[label[1]],component:label[1]==='Federal'?'national-assessment':'regional-income-tax',taxYear:String(year),effectiveFrom:year+'-01-01',effectiveUntil:(year+1)+'-01-01',parameters:{bounds,rates},status:'candidate',legalStatus:'review_required',automaticActivation:false});
 }
 if(seen.size!==Object.keys(craRegions).length)throw Error('Incomplete CRA coverage; Quebec requires separate authority');
 return {jurisdiction:'CA',component:'income-tax-bands',taxYear:String(year),candidates,status:'candidate',legalStatus:'review_required',automaticActivation:false};
}
// Revenu Québec publishes each taxation year under a separate heading.
export function extractQuebecBrackets(html){
 if(typeof html!=='string'||html.length>2*1024*1024)throw Error('Invalid Quebec source');
 const headings=[...html.matchAll(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/gi)];
 const results=[],seen=new Set();
 const amount=s=>{if(!/^\$\d{1,3}(?:,\d{3})*$|^\$\d+$/.test(s))throw Error('Invalid Quebec amount');const n=Number(s.replace(/[$,]/g,''));if(!Number.isSafeInteger(n)||n<=0||n>1e9)throw Error('Invalid threshold');return n;};
 for(let i=0;i<headings.length;i++){
  const h=headings[i],m=normalize(h[1]).match(/^Income tax rates for (\d{4})$/i);if(!m)continue;
  const year=Number(m[1]);if(year<2020||year>2100||seen.has(year))throw Error('Invalid or repeated Quebec period');
  const section=html.slice(h.index+h[0].length,headings[i+1]?.index??html.length),ts=tables(section).filter(t=>t.some(r=>r.length===2&&r[0]==='Taxable income'&&r[1]==='Rate'));
  if(ts.length!==1)throw Error('Missing or ambiguous Quebec table');
  const rows=ts[0].filter(r=>!(r[0]==='Taxable income'&&r[1]==='Rate'));
  if(rows.length<2||rows.length>20||rows.some(r=>r.length!==2))throw Error('Unsupported Quebec table');
  const bounds=[],rates=[];
  for(let j=0;j<rows.length;j++){
   const [label,rate]=rows[j];if(!/^\d{1,2}(?:\.\d{1,2})?%$/.test(rate))throw Error('Invalid Quebec rate');
   rates.push(Math.round(parseFloat(rate)*100));
   if(j===0){const a=label.match(/^(\$[\d,]+) or less$/);if(!a)throw Error('Invalid first band');bounds.push(amount(a[1]));}
   else if(j===rows.length-1){const a=label.match(/^More than (\$[\d,]+)$/);if(!a||amount(a[1])!==bounds.at(-1))throw Error('Invalid final band');}
   else{const a=label.match(/^More than (\$[\d,]+) but not more than (\$[\d,]+)$/);if(!a||amount(a[1])!==bounds.at(-1)||amount(a[2])<=bounds.at(-1))throw Error('Quebec bracket gap or overlap');bounds.push(amount(a[2]));}
  }
  seen.add(year);results.push({jurisdiction:'CA-QC',component:'regional-income-tax',taxYear:String(year),effectiveFrom:year+'-01-01',effectiveUntil:(year+1)+'-01-01',parameters:{bounds,rates},status:'candidate',legalStatus:'review_required',automaticActivation:false});
 }
 if(!results.length)throw Error('No recognized Quebec periods');
 return {jurisdiction:'CA-QC',component:'income-tax-bands',candidates:results.sort((a,b)=>b.taxYear.localeCompare(a.taxYear)),status:'candidate',legalStatus:'review_required',automaticActivation:false};
}
export function extractCandidate(source,bytes){
 if(source.id==='CA-QC-rate'&&source.url==='https://www.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/income-tax-rates/')return extractQuebecBrackets(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(source.id==='US-1'&&source.url==='https://www.ssa.gov/OACT/COLA/cbb.html')return extractSsaWageBase(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 const match=source.url.match(/^https:\/\/www\.gov\.uk\/guidance\/rates-and-thresholds-for-employers-(\d{4})-to-(\d{4})$/);
 if(source.id.startsWith('GB-NI-')&&match&&Number(match[2])===Number(match[1])+1)return extractUkNi(new TextDecoder('utf-8',{fatal:true}).decode(bytes),Number(match[1]));
 if(source.url==='https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html')return extractCraBrackets(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 return null;
}
