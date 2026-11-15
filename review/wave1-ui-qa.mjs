// Run only on a preview direct-entry tool page; validates the real file-picker UI.
const pre=document.createElement('pre');pre.id='yorphives-wave1-ui-qa';
pre.dataset.status='running';pre.textContent='Testing the interactive tool';
document.body.append(pre);
const tool=document.body.dataset.wave1,form=document.getElementById('wave1-form'),picker=document.getElementById('wave1-file');
const submit=document.getElementById('wave1-run'),download=document.getElementById('wave1-download');
const status=document.getElementById('wave1-status');
const info={tool,selected:0,generated:false,bytes:0,mime:'',filename:''};
let restore;
const assert=(value,why)=>{if(!value)throw Error(why);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,timeout=35000)=>{const start=performance.now();while(performance.now()-start<timeout){if(fn())return;await pause(60)}throw Error('Timed out before output was generated: '+status?.textContent);};
async function pdfSample(){
 const {PDFDocument,StandardFonts}=await import('./tools/vendor/pdf-lib.mjs');
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 const page=doc.addPage([360,360]);page.drawText('YORPHIVES DOCUMENT',{x:35,y:240,size:18,font});
 return new File([await doc.save()],'sample.pdf',{type:'application/pdf'});
}
async function imageSample(text=''){
 const c=document.createElement('canvas');c.width=text?750:320;c.height=text?220:200;
 const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#091b12';if(text){ctx.font='bold 62px sans-serif';ctx.fillText(text,35,135);}
 else ctx.fillRect(70,55,170,110);
 const blob=await new Promise(r=>c.toBlob(r,'image/png'));
 return new File([blob],'sample.png',{type:'image/png'});
}
try{
 assert(tool&&form&&submit&&download,'Tool page is missing essential controls.');
 await until(()=>!submit.disabled,10000);
 let chosen;
 if(tool.startsWith('pdf-'))chosen=await pdfSample();
 else if(tool==='svg-to-png')chosen=new File(['<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40"><rect width="64" height="40" fill="blue"/></svg>'],'art.svg',{type:'image/svg+xml'});
 else if(tool==='image-ocr')chosen=await imageSample('HELLO WORLD');
 else if(tool==='qr-code-scanner'){
  const qrFactory=(await import('./tools/vendor/qrcode-generator.mjs')).default;
  const q=qrFactory(0,'M');q.addData('https://yorphives.com/');q.make();
  const n=q.getModuleCount(),size=8,margin=4,c=document.createElement('canvas');c.width=c.height=(n+margin*2)*size;
  const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='black';
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.isDark(y,x))ctx.fillRect((x+margin)*size,(y+margin)*size,size,size);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));
  chosen=new File([blob],'qr.png',{type:'image/png'});
 }else if(picker)chosen=await imageSample();
 if(picker){
  assert(chosen,'Missing synthetic input');
  const transfer=new DataTransfer();transfer.items.add(chosen);picker.files=transfer.files;
  picker.dispatchEvent(new Event('change',{bubbles:true}));info.selected=picker.files.length;
 }
 if(tool==='pdf-rearrange-pages')form.elements.namedItem('order').value='1';
 const original=URL.createObjectURL;
 const captured=[];
 URL.createObjectURL=function(blob){captured.push(blob);return original.call(URL,blob)};
 restore=()=>{URL.createObjectURL=original};
 form.requestSubmit();
 await until(()=>!download.hidden&&download.href.startsWith('blob:'),tool==='image-ocr'?55000:30000);
 const blob=captured.at(-1);
 assert(blob instanceof Blob,'Download was not generated from a Blob.');
 info.bytes=blob.size;info.filename=download.download;info.mime=blob.type;
 assert(info.bytes>80,'The file is empty.');
 if(info.filename.endsWith('.pdf'))assert(String.fromCharCode(...new Uint8Array(await blob.slice(0,4).arrayBuffer()))==='%PDF','PDF signature invalid.');
 if(info.filename.endsWith('.png')){const bytes=new Uint8Array(await blob.slice(0,4).arrayBuffer());assert(bytes[0]===137&&bytes[1]===80,'PNG signature invalid');}
 if(info.filename.endsWith('.svg'))assert((await blob.text()).includes('<svg'),'SVG data missing');
 if(tool==='qr-code-scanner')assert((await blob.text()).includes('yorphives.com'),'QR value missing');
 if(tool==='image-ocr')assert(/HELLO/.test(await blob.text()),'OCR text missing');
 info.generated=true;
 pre.dataset.status='passed';
}catch(e){info.error=String(e?.message||e);pre.dataset.status='failed';}
finally{restore?.()}
pre.textContent=JSON.stringify(info,null,2);
