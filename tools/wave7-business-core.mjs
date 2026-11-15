// YorpHives v1.7 — private heuristic password review and printable proposal PDFs.
import {PDFDocument,StandardFonts,rgb} from './vendor/pdf-lib.mjs';
const words=new Set(['password','admin','welcome','letmein','qwerty','iloveyou','abc123','123456','password123','monkey','dragon','football','sunshine','guest','root']);
export function assessPassword(password){
 const input=String(password??'');
 if(input.length>256)throw Error('Use passwords up to 256 characters.');
 const length=[...input].length;
 if(!length)return {score:0,label:'Enter a password',suggestions:['Use a unique passphrase of at least 15 characters.'],length:0,hasPatterns:false};
 const suggestions=[],lower=input.toLowerCase(),kinds=[
  /[a-z]/.test(input),/[A-Z]/.test(input),/\d/.test(input),/[^a-zA-Z0-9]/.test(input)
 ].filter(Boolean).length;
 const bad=words.has(lower)||[...words].some(w=>lower.includes(w));
 const sequence=/(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|qwerty|asdfgh|zxcvbn)/i.test(input);
 const repeats=/(.)\1{3,}/u.test(input),onlyOne=new Set(input).size<=2;
 const dateLike=/(?:19\d{2}|20\d{2})/.test(input);
 let score=0;
 if(length>=8)score++;
 if(length>=12)score++;
 if(length>=16)score++;
 if(length>=20)score++;
 if(kinds>=3&&length>=12)score=Math.min(4,score+1);
 if(bad)score=Math.min(score,1);
 if(sequence||repeats||onlyOne)score=Math.max(0,score-2);
 if(dateLike&&length<18)score=Math.min(2,score);
 if(length<8)score=0;
 if(length<12)suggestions.push('Use at least 15 characters, ideally a unique multiword passphrase.');
 if(kinds<2&&length<20)suggestions.push('Add length or variety; length matters more than arbitrary complexity.');
 if(bad)suggestions.push('Avoid common words and familiar phrases used as passwords.');
 if(sequence||repeats||onlyOne)suggestions.push('Avoid keyboard sequences, long repeats and simple patterns.');
 if(dateLike)suggestions.push('Avoid personally meaningful dates or years.');
 if(!suggestions.length)suggestions.push('Use this password only once and keep it in a trusted password manager.');
 const labels=['Very weak','Weak','Fair','Strong','Stronger (heuristic)'];
 return {score,label:labels[score],length,hasPatterns:bad||sequence||repeats||onlyOne||dateLike,
  suggestions,warning:'This offline heuristic does not prove security, check breaches, or measure attack resistance.'};
}
const pick=(opts,key,max=1200,required=false)=>{
 const value=String(opts?.[key]??'').trim();
 if(value.length>max)throw Error(key+' must be under '+max+' characters.');
 if(required&&!value)throw Error('Please enter '+key+'.');
 const clean=value.replace(/[\u2010-\u2015]/g,'-').replace(/[•]/g,'*');
 if(/[^\x09\x0a\x0d\x20-\x7e]/.test(clean))
  throw Error('The PDF template currently supports printable standard Latin characters only.');
 return clean;
};
function wrap(text,font,size,maxWidth){
 const lines=[];
 for(const paragraph of text.split(/\r?\n/)){
  if(!paragraph.trim()){lines.push('');continue;}
  let line='';
  for(const word of paragraph.trim().split(/\s+/)){
   if(font.widthOfTextAtSize(word,size)>maxWidth){
    // Soft-wrap long words without throwing or overflowing the page.
    if(line){lines.push(line);line='';}
    let fragment='';
    for(const character of word){
     if(font.widthOfTextAtSize(fragment+character,size)>maxWidth){lines.push(fragment);fragment=character;}
     else fragment+=character;
    }
    line=fragment;continue;
   }
   const next=line?line+' '+word:word;
   if(font.widthOfTextAtSize(next,size)>maxWidth){lines.push(line);line=word;}else line=next;
  }
  lines.push(line);
 }
 return lines;
}
export async function createBusinessProposal(opts={}){
 const company=pick(opts,'company',95,true),client=pick(opts,'client',95,true),
  project=pick(opts,'project',120,true),overview=pick(opts,'overview',1500,true),
  deliverables=pick(opts,'deliverables',1800,true),timeline=pick(opts,'timeline',450,true),
  notes=pick(opts,'notes',800),contact=pick(opts,'contact',160);
 const currency=(pick(opts,'currency',3)||'USD').toUpperCase();
 if(!/^[A-Z]{3}$/.test(currency))throw Error('Use a three-letter currency code.');
 const costStr=pick(opts,'cost',18),cost=costStr===''?null:Number(costStr);
 if(cost!==null&&(!Number.isFinite(cost)||cost<0||cost>100000000))throw Error('Enter a valid nonnegative budget.');
 const doc=await PDFDocument.create(),normal=await doc.embedFont(StandardFonts.Helvetica),
  bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.09,.20,.17),muted=rgb(.34,.45,.4),green=rgb(.08,.43,.29),light=rgb(.85,.93,.88);
 const pages=[];let page,y;
 const newPage=()=>{
  page=doc.addPage([595,842]);pages.push(page);y=745;
  page.drawRectangle({x:0,y:775,width:595,height:67,color:green});
  page.drawText('YORPHIVES  /  BUSINESS PROPOSAL',{x:45,y:800,size:12,font:bold,color:rgb(1,1,1)});
  page.drawText(company,{x:45,y:760,size:13,font:bold,color:ink});
 };
 const ensure=height=>{if(y-height<85)newPage();};
 const body=(text,size=11)=>{
  for(const row of wrap(text,normal,size,500)){
   ensure(18);
   if(row)page.drawText(row,{x:45,y,size,font:normal,color:ink});
   y-=18;
  }
  y-=10;
 };
 const heading=(label)=>{
  ensure(48);y-=9;page.drawRectangle({x:45,y:y-7,width:505,height:1,color:light});
  page.drawText(label.toUpperCase(),{x:45,y:y-32,size:10,font:bold,color:green});y-=55;
 };
 newPage();
 page.drawText('A PROPOSAL FOR',{x:45,y:710,size:12,font:bold,color:muted});
 y=670;
 for(const row of wrap(project,bold,26,500)){ensure(34);page.drawText(row,{x:45,y,size:26,font:bold,color:ink});y-=33;}
 y-=6;
 page.drawText('Prepared for: '+client,{x:45,y,size:12,font:normal,color:muted});y-=39;
 heading('Overview');body(overview);
 heading('Deliverables and scope');
 for(const item of deliverables.split('\n').map(x=>x.trim()).filter(Boolean)){
  for(const [i,row] of wrap(item,normal,11,478).entries()){
   ensure(19);page.drawText(i===0?'- '+row:'  '+row,{x:50,y,size:11,font:normal,color:ink});y-=19;
  }
  y-=5;
 }
 heading('Timeline');body(timeline);
 if(cost!==null){heading('Estimated budget');body(currency+' '+cost.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}));}
 if(notes){heading('Important notes');body(notes);}
 if(contact){heading('Contact and next steps');body(contact);}
 for(let i=0;i<pages.length;i++){
  const p=pages[i],info='Page '+(i+1)+' / '+pages.length+
   '   |   Draft proposal · verify pricing, commitments and applicable terms before sending.';
  p.drawText(info.replace('·','-'),{x:45,y:36,size:8,font:normal,color:muted});
 }
 const bytes=await doc.save();
 return {blob:new Blob([bytes],{type:'application/pdf'}),filename:'yorphives-business-proposal.pdf',
  summary:'Created a '+pages.length+'-page proposal PDF for '+client+'. Review all terms and amounts before sharing.'};
}
