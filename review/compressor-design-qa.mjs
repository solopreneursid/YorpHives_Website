// Preview only: verifies actual computed CSS and geometry, not merely source markup.
const report=document.createElement('pre');
report.id='compressor-design-qa';report.dataset.status='running';
document.body.append(report);
const results=[];
const inspect=(condition,name,details={})=>{
 if(!condition)throw Error(name+' '+JSON.stringify(details));
 results.push({check:name,passed:true,...details});
};
try{
 const form=document.getElementById('pdf-compressor-form');
 const grid=form?.querySelector('.compression-choices-grid');
 const cards=[...form.querySelectorAll('.compression-option-content')];
 const upload=form.querySelector('.cpx-dropzone');
 const file=form.querySelector('#pdf-compressor-file');
 const style=[...document.querySelectorAll('link[rel="stylesheet"]')].find(x=>x.href.includes('/compressor-ui-v3.css'));
 inspect(!!form&&!!grid&&cards.length===3&&!!upload&&!!style,'complete designed interface');
 const sheetStyle=getComputedStyle(grid);
 const gridStyle=sheetStyle.display;
 const uploadStyle=getComputedStyle(upload);
 const cardStyle=getComputedStyle(cards[1]);
 const inputStyle=getComputedStyle(file);
 const rectangles=cards.map(el=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};});
 const data={grid:gridStyle,columns:sheetStyle.gridTemplateColumns,uploadBackground:uploadStyle.backgroundColor,uploadBorder:uploadStyle.borderStyle,cardDisplay:cardStyle.display,cardBackground:cardStyle.backgroundColor,uploadInputOpacity:inputStyle.opacity,rectangles};
 inspect(gridStyle==='grid','cards are laid out using actual CSS',data);
 inspect(cardStyle.display==='flex'&&cardStyle.borderRadius!=='0px','cards have visible custom styling',data);
 inspect(uploadStyle.borderStyle==='dashed'&&uploadStyle.borderRadius!=='0px','upload zone styled',data);
 inspect(inputStyle.opacity==='0','native file input is visually replaced',data);
 const radios=[...form.querySelectorAll('input[name="compression"]')];
 inspect(radios.length===3&&radios[1].checked,'three readable choices; Best default');
 const checkedStyle=getComputedStyle(cards[1]);
 const uncheckedStyle=getComputedStyle(cards[0]);
 inspect(checkedStyle.backgroundColor!==uncheckedStyle.backgroundColor&&checkedStyle.borderColor!==uncheckedStyle.borderColor,'selected state visually distinct',{checked:checkedStyle.backgroundColor,unchecked:uncheckedStyle.backgroundColor});
 const pseudo=getComputedStyle(cards[0],'::before');
 inspect(pseudo.content==='none'||pseudo.display==='none','no legacy pseudo-radio clutter',{content:pseudo.content,display:pseudo.display});
 const badge=cards[1].querySelector('.compression-option-badge');
 const badgeStyle=getComputedStyle(badge);
 if(innerWidth<=660){
  inspect(badgeStyle.display==='none','mobile badge does not overflow or overlap',{badgeDisplay:badgeStyle.display});
 }else{
  const br=badge.getBoundingClientRect(),cr=cards[1].getBoundingClientRect();
  inspect(br.left>=cr.left&&br.right<=cr.right,'recommended badge fits inside its card',{badgeLeft:Math.round(br.left),badgeRight:Math.round(br.right),cardRight:Math.round(cr.right)});
 }

 if(innerWidth>660){
  inspect(rectangles[0].x<rectangles[1].x&&rectangles[1].x<rectangles[2].x,'desktop cards are three columns',data);
  inspect(rectangles.every(x=>x.width>120&&x.height>=130),'desktop cards have sufficient space',data);
 }else{
  inspect(rectangles[0].y<rectangles[1].y&&rectangles[1].y<rectangles[2].y,'mobile cards stack vertically',data);
  inspect(rectangles.every(x=>x.height>=75),'mobile cards remain tappable',data);
 }
 const overflow=document.documentElement.scrollWidth-innerWidth;
 inspect(overflow<=2,'no horizontal overflow',{width:innerWidth,overflow});
 inspect(!document.querySelector('[name="quality"],[name="scale"]'),'technical inputs removed');
 report.dataset.status='passed';
}catch(e){
 results.push({check:'failure',passed:false,error:String(e?.stack||e)});
 report.dataset.status='failed';
}
report.textContent=JSON.stringify({width:innerWidth,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,tests:results},null,2);
