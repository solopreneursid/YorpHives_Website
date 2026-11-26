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
// IRAS expresses each resident bracket as a cumulative amount followed by the next band.
// The assessment year is distinct from the year income is earned; never infer an end date.
export function extractIrasResidentBrackets(html){
 if(typeof html!=='string'||html.length>2*1024*1024)throw Error('Invalid IRAS source');
 const headings=[...html.matchAll(/<h[2-6]\b[^>]*>([\s\S]*?)<\/h[2-6]>/gi)];
 const hits=headings.filter(h=>/^From YA \d{4} onwards$/.test(normalize(h[1])));
 if(hits.length!==1)throw Error('Ambiguous IRAS assessment period');
 const h=hits[0],year=Number(normalize(h[1]).match(/\d{4}/)[0]);
 if(year<2000||year>2100)throw Error('Invalid assessment year');
 const end=headings.find(x=>x.index>h.index)?.index??html.length;
 const ts=tables(html.slice(h.index+h[0].length,end)).filter(t=>t.some(row=>row.length===3&&row[0]==='Chargeable Income'&&row[1]==='Income Tax Rate (%)'&&row[2]==='Gross Tax Payable ($)'));
 if(ts.length!==1)throw Error('Ambiguous IRAS resident table');
 const rows=ts[0].filter(row=>row[0]!=='Chargeable Income');
 if(rows.length<2||rows.length>30||rows.some(row=>row.length!==3))throw Error('Incomplete IRAS bands');
 const amt=s=>{if(!/^\d{1,3}(?:,\d{3})*$|^\d+$/.test(s))throw Error('Invalid amount');const n=Number(s.replaceAll(',',''));if(!Number.isSafeInteger(n)||n<0||n>1e9)throw Error('Amount out of range');return n;};
 const rate=s=>{if(!/^\d{1,3}(?:\.\d{1,2})?$/.test(s))throw Error('Invalid IRAS rate');const v=Math.round(Number(s)*100);if(v>10000)throw Error('Rate out of range');return v;};
 const bounds=[],rates=[];let cap=0,tax=0n;
 for(let i=0;i<rows.length;i++){
  const [income,rateCell,taxCell]=rows[i],last=i===rows.length-1;
  const m=income.match(last?/^First \$([\d,]+) In excess of \$([\d,]+)$/:/^First \$([\d,]+) Next \$([\d,]+)$/);
  if(!m)throw Error('Unrecognized IRAS band');
  const first=amt(m[1]),next=amt(m[2]),rs=rateCell.split(/\s+/),xs=taxCell.split(/\s+/);
  if(rs.length!==2||xs.length!==(last?1:2))throw Error('Unrecognized IRAS rate or tax cell');
  if(i===0){if(last||!first)throw Error('Invalid first band');const bp=rate(rs[0]);cap=first;tax=BigInt(cap)*BigInt(bp);bounds.push(cap);rates.push(bp);}
  else if(rs[0]!=='-'||first!==cap)throw Error('IRAS bracket gap or overlap');
  if(BigInt(amt(xs[0]))*10000n!==tax)throw Error('IRAS cumulative tax mismatch');
  const bp=rate(rs[1]);rates.push(bp);
  if(last){if(next!==cap)throw Error('Invalid open band');}
  else{if(!next||cap+next>1e9)throw Error('Invalid band width');const increment=BigInt(next)*BigInt(bp);if(BigInt(amt(xs[1]))*10000n!==increment)throw Error('IRAS band tax mismatch');tax+=increment;cap+=next;bounds.push(cap);}
 }
 return {jurisdiction:'SG',component:'national-assessment',assessmentYearFrom:String(year),parameters:{bounds,rates},scope:'resident-gross-tax-before-rebates',status:'candidate',legalStatus:'review_required',automaticActivation:false};
}
// GOV.UK's headline table uses income before the standard allowance, with the top
// threshold shown at the zero-allowance point. Keep the candidate scoped to RUK.
export function extractUkIncomeBands(html){
 if(typeof html!=='string'||html.length>2*1024*1024)throw Error('Invalid UK source');
 const text=normalize(html).replace(/&pound;|&#163;/g,'£');
 const unique=re=>{const rows=[...text.matchAll(re)];if(rows.length!==1)throw Error('Ambiguous UK narrative');return rows[0];};
 const period=unique(/The current tax year is from 6 April (\d{4}) to 5 April (\d{4})\./g);
 const year=Number(period[1]);if(year<2020||year>2100||Number(period[2])!==year+1)throw Error('Invalid UK period');
 const pounds=v=>{if(!/^(?:\d{1,3}(?:,\d{3})*|\d+)$/.test(v))throw Error('Invalid UK amount');const n=Number(v.replaceAll(',',''));if(!Number.isSafeInteger(n)||n<0||n>1e9)throw Error('Invalid UK amount');return n;};
 const a=pounds(unique(/The standard Personal Allowance is £([\d,]+),/g)[1]);
 const taper=unique(/Your personal allowance goes down by £([\d,]+) for every £([\d,]+) that your adjusted net income is above £([\d,]+)\. This means your allowance is zero if your income is £([\d,]+) or above\./g);
 const [reduction,step,start,zero]=taper.slice(1).map(pounds);
 if(!a||reduction!==1||step<1||step>100||start<a||start+a*step!==zero)throw Error('Unsupported UK taper');
 const ts=tables(html).filter(t=>t.some(row=>row.join('|')==='Band|Taxable income|Tax rate'));
 if(ts.length!==1)throw Error('Ambiguous UK income table');
 const row=label=>{const matches=ts[0].filter(r=>r[0]===label);if(matches.length!==1||matches[0].length!==3)throw Error('Missing UK band');return matches[0];};
 const match=(s,re)=>{const m=s.match(re);if(!m)throw Error('Invalid UK income band');return m.slice(1).map(pounds);};
 const allowance=row('Personal Allowance'),basic=row('Basic rate'),higher=row('Higher rate'),additional=row('Additional rate');
 if(ts[0].length!==5||allowance[2]!=='0%'||match(allowance[1],/^Up to £([\d,]+)$/i)[0]!==a)throw Error('Unsupported UK band structure');
 const [low,top]=match(basic[1],/^£([\d,]+) to £([\d,]+)$/);
 const [next,last]=match(higher[1],/^£([\d,]+) to £([\d,]+)$/);
 if(low!==a+1||top<low||next!==top+1||last<next||last!==zero||match(additional[1],/^over £([\d,]+)$/i)[0]!==last)throw Error('Inconsistent UK thresholds');
 const rates=[basic,higher,additional].map(r=>{if(!/^\d{1,2}(?:\.\d{1,2})?%$/.test(r[2]))throw Error('Invalid UK rate');return Math.round(parseFloat(r[2])*100);});
 return {jurisdiction:'GB-RUK',component:'regional-income-tax',taxYear:String(year),effectiveFrom:year+'-04-06',effectiveUntil:(year+1)+'-04-06',parameters:{bounds:[top-a,last],rates,allowance:{base:a,taperStart:start,taperDivisor:step}},scope:'ordinary-income-england-wales-northern-ireland',status:'candidate',legalStatus:'review_required',automaticActivation:false};
}
// Scotland's current-rates publication is separate from the proposed budget tables.
// The displayed thresholds include the standard allowance except at the top band.
export function extractScottishIncomeBands(html){
 if(typeof html!=='string'||html.length>2*1024*1024)throw Error('Invalid Scottish source');
 const text=normalize(html).replace(/&pound;|&#163;/g,'£');
 const m=[...text.matchAll(/The table shows the (\d{4}) to (\d{4}) Scottish Income Tax rates you pay in each band if you have a standard Personal Allowance of £([\d,]+)\./g)];
 if(m.length!==1||Number(m[0][2])!==Number(m[0][1])+1)throw Error('Ambiguous Scottish period');
 const year=Number(m[0][1]);if(year<2020||year>2100)throw Error('Invalid Scottish year');
 const amount=v=>{if(!/^(?:\d{1,3}(?:,\d{3})*|\d+)$/.test(v))throw Error('Invalid Scottish amount');const n=Number(v.replaceAll(',',''));if(!Number.isSafeInteger(n)||n<0||n>1e9)throw Error('Invalid Scottish amount');return n;};
 const allowance=amount(m[0][3]);
 const tops=[...text.matchAll(/if you earn over £([\d,]+)\./g)];if(tops.length!==1)throw Error('Missing Scottish allowance exhaustion point');
 const top=amount(tops[0][1]);
 const ts=tables(html).filter(t=>t.some(r=>r.length===3&&r[1]==='Taxable income'&&r[2]==='Scottish tax rate'));
 if(ts.length!==1||ts[0].length!==8)throw Error('Ambiguous Scottish table');
 const rows=ts[0].slice(1),names=['Personal Allowance','Starter rate','Basic rate','Intermediate rate','Higher rate','Advanced rate','Top rate'];
 if(rows.some((r,i)=>r.length!==3||r[0]!==names[i]))throw Error('Unsupported Scottish band structure');
 const first=rows[0][1].match(/^Up to £([\d,]+)$/i);
 if(!first||amount(first[1])!==allowance||rows[0][2]!=='0%'||allowance<=0)throw Error('Invalid Scottish allowance');
 let previous=allowance;const bounds=[],rates=[];
 for(let i=1;i<rows.length;i++){
  const [,label,rate]=rows[i];if(!/^\d{1,2}(?:\.\d{1,2})?%$/.test(rate))throw Error('Invalid Scottish rate');rates.push(Math.round(parseFloat(rate)*100));
  if(i===rows.length-1){const final=label.match(/^over £([\d,]+)$/i);if(!final||amount(final[1])!==previous||previous!==top)throw Error('Invalid Scottish top band');}
  else{const band=label.match(/^£([\d,]+) to £([\d,]+)$/);if(!band)throw Error('Invalid Scottish band');const from=amount(band[1]),to=amount(band[2]);if(from!==previous+1||to<from)throw Error('Scottish band gap');bounds.push(i===rows.length-2?to:to-allowance);previous=to;}
 }
 return {jurisdiction:'GB-SCT',component:'regional-income-tax',taxYear:String(year),effectiveFrom:year+'-04-06',effectiveUntil:(year+1)+'-04-06',parameters:{bounds,rates,allowanceBase:allowance,zeroAllowanceIncome:top},scope:'Scottish ordinary-income bands; taper requires separate evidence',status:'candidate',legalStatus:'review_required',automaticActivation:false};
}
export function extractCandidate(source,bytes){
 if(source.id==='GB-SCT-bands'&&['https://www.gov.uk/scottish-income-tax/how-it-works','https://www.gov.uk/scottish-rate-income-tax/how-it-works'].includes(source.url))return extractScottishIncomeBands(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(source.id==='GB-2'&&source.url==='https://www.gov.uk/income-tax-rates')return extractUkIncomeBands(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(source.id==='SG-8'&&source.url==='https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates')return extractIrasResidentBrackets(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(source.id==='CA-QC-rate'&&['https://www.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/income-tax-rates/','https://www-prd.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/income-tax-rates/'].includes(source.url))return extractQuebecBrackets(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(source.id==='US-1'&&source.url==='https://www.ssa.gov/OACT/COLA/cbb.html')return extractSsaWageBase(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 const match=source.url.match(/^https:\/\/www\.gov\.uk\/guidance\/rates-and-thresholds-for-employers-(\d{4})-to-(\d{4})$/);
 if(source.id.startsWith('GB-NI-')&&match&&Number(match[2])===Number(match[1])+1)return extractUkNi(new TextDecoder('utf-8',{fatal:true}).decode(bytes),Number(match[1]));
 if(source.url==='https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html')return extractCraBrackets(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 return null;
}
