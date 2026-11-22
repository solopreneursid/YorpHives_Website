// Shared, privacy-preserving matching for the homepage and full directory.
export function normalizeSearch(value){
 return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,' ').trim();
}

// Narrow task vocabulary only: no network requests or stored search history.
const synonyms=[
 ['compress','compression','reduce','shrink','smaller'],
 ['merge','combine','join'],
 ['image','photo','picture','pic'],
 ['remove','removal','delete','erase'],
 ['resize','size','dimension'],
 ['background','bg'],
 ['jpg','jpeg'],
 ['split','extract'],
 ['convert','converter','conversion']
];
const ignored=new Set(['a','an','the','i','my','me','please','to','for','of','in','on','and','how','can','do']);
function words(value){
 return normalizeSearch(value).split(' ').filter(Boolean).map(word=>{
  if(word==='pdfs')return 'pdf';
  return word.length>4&&word.endsWith('s')&&!word.endsWith('ss')?word.slice(0,-1):word;
 }).filter(word=>!ignored.has(word));
}
function oneEditAway(a,b){
 if(a.length<5||b.length<5||Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){
  let first=-1,second=-1;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i]){if(first<0)first=i;else if(second<0)second=i;else return false;}
  return first>=0&&(second<0||(second===first+1&&a[first]===b[second]&&a[second]===b[first]));
 }
 const [shorter,longer]=a.length<b.length?[a,b]:[b,a];
 let i=0,j=0,edits=0;
 while(i<shorter.length&&j<longer.length){if(shorter[i]===longer[j]){i++;j++;}else{if(++edits>1)return false;j++;}}
 return true;
}
function matchesTerm(term,searchable,fields){
 const alternatives=new Set([term]);
 for(const group of synonyms)if(group.includes(term))for(const value of group)alternatives.add(value);
 // "size" is often used to ask for compression; do not make all resizing
 // tools equivalent to compression in unrelated queries.
 if(term==='size')alternatives.add('compress');
 for(const value of alternatives){
  if(value.length>=4&&searchable.includes(value))return true;
  if(fields.some(word=>word===value||oneEditAway(value,word)))return true;
 }
 return false;
}
function score(query,{name='',description='',category=''}={}){
 const terms=words(query);
 const searchable=normalizeSearch([name,description,category].join(' '));
 const fields=words([name,description,category].join(' '));
 const matched=terms.filter(term=>matchesTerm(term,searchable,fields)).length;
 return {matched,total:terms.length};
}
// Explicit directions prevent recommending PDF-to-image when someone asks
// for the opposite conversion. Only list combinations the tools really support.
const conversions={
 'tools/images-to-pdf/':{from:['image','jpg','png','webp'],to:['pdf']},
 'tools/pdf-to-images/':{from:['pdf'],to:['image','jpg','png']},
 'tools/pdf-to-text/':{from:['pdf'],to:['text']},
 'tools/svg-to-png/':{from:['svg'],to:['png']},
 'tools/heic-to-jpg/':{from:['heic','heif'],to:['jpg','png']}
};
function format(value){
 if(['jpg','jpeg'].includes(value))return 'jpg';
 if(['image','images','photo','photos','picture','pictures'].includes(value))return 'image';
 return ['pdf','png','webp','svg','heic','heif','text'].includes(value)?value:'';
}
function conversionIntent(query){
 const parts=normalizeSearch(query).split(' '),divider=parts.findIndex(x=>x==='to'||x==='into');
 if(divider<1)return null;
 const from=parts.slice(0,divider).map(format).filter(Boolean).at(-1);
 const to=parts.slice(divider+1).map(format).find(Boolean);
 return from&&to?{from,to}:null;
}
export function matchesTool(query,tool={}){
 const intent=conversionIntent(query);
 if(intent){
  const supported=conversions[tool.url];
  return Boolean(supported&&supported.from.includes(intent.from)&&supported.to.includes(intent.to));
 }
 const {matched,total}=score(query,tool);
 return !total||matched===total;
}
export function suggestTools(query,items,limit=3){
 // A reversed converter is misleading; show no suggestions for unsupported
 // conversion directions instead of presenting unrelated partial matches.
 if(conversionIntent(query))return [];
 const max=Math.max(0,Math.min(5,Number(limit)||0));
 return items.map(tool=>({tool,...score(query,tool)}))
  .filter(item=>item.total>1&&item.matched>0&&item.matched<item.total)
  .sort((a,b)=>b.matched-a.matched||String(a.tool.name||'').localeCompare(String(b.tool.name||'')))
  .slice(0,max).map(item=>item.tool);
}
