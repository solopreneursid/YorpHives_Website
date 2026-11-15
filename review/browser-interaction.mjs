// Preview-only end-to-end browser interaction check, loaded on an actual tool page.
// It tests file selection, real Process button, browser-generated download link,
// and the output's expected file signature. No files leave this browser.
const status=document.createElement('pre');
status.id='yorphives-interaction-smoke';
status.dataset.status='running';
status.textContent='Checking the tool interface...';
document.body.append(status);
async function until(fn,timeout=15000){
 const start=performance.now();
 while(performance.now()-start<timeout){
  if(fn())return;
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 throw Error('Timed out waiting for the tool interface.');
}
const info={tool:document.body.dataset.filetool,selected:0,processed:false,download:false,validOutput:false};
try{
 const id=info.tool,input=document.getElementById('file-input'),submit=document.getElementById('file-run'),
  form=document.getElementById('file-tool-form'),download=document.getElementById('file-download'),
  message=document.getElementById('file-status');
 if(!id||!input||!submit||!form||!download||!message)throw Error('File tool controls are missing');
 await until(()=>!submit.disabled,8000);
 const text=(content,name,type='text/plain')=>new File([content],name,{type});
 let selected=[];
 if(id==='pdf-merge'){
  const {PDFDocument}=await import('./tools/vendor/pdf-lib.mjs');
  const pdf=await PDFDocument.create();pdf.addPage([90,120]);
  const bytes=await pdf.save();selected=[new File([bytes],'one.pdf'),new File([bytes],'two.pdf')];
 }else if(id==='image-cropper'){
  const c=document.createElement('canvas');c.width=50;c.height=40;c.getContext('2d').fillRect(0,0,40,30);
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
  selected=[new File([blob],'image.png',{type:'image/png'})];
  form.elements.namedItem('width').value='15';
  form.elements.namedItem('height').value='10';
 }else if(id==='csv-file-to-xlsx'){
  selected=[text('name,count\nA,2','sample.csv','text/csv')];
 }else if(id==='batch-find-replace'){
  selected=[text('red red','sample.txt')];
  form.elements.namedItem('find').value='red';
  form.elements.namedItem('replacement').value='green';
 }else if(id==='zip-file-creator'){
  selected=[text('one','a.txt'),text('two','b.txt')];
 }else if(id==='duplicate-file-finder'){
  selected=[text('same','first.txt'),text('same','second.txt')];
 }else throw Error('Unknown synthetic browser test target: '+id);
 const transfer=new DataTransfer();
 selected.forEach(file=>transfer.items.add(file));
 input.files=transfer.files;
 input.dispatchEvent(new Event('change',{bubbles:true}));
 info.selected=selected.length;
 form.requestSubmit();
 await until(()=>!download.hidden&&download.href.startsWith('blob:'),25000);
 info.processed=!!message.textContent&&!message.classList.contains('error');
 info.download=true;
 const response=await fetch(download.href);
 const output=new Uint8Array(await response.arrayBuffer());
 if(id==='pdf-merge')info.validOutput=String.fromCharCode(...output.slice(0,4))==='%PDF';
 else if(id==='image-cropper')info.validOutput=output.length>12&&output[0]===137&&output[1]===80;
 else if(id==='batch-find-replace'||id==='csv-file-to-xlsx'||id==='zip-file-creator')
  info.validOutput=output.length>22&&output[0]===80&&output[1]===75;
 else if(id==='duplicate-file-finder')
  info.validOutput=new TextDecoder().decode(output).includes('Identical content groups: 1');
 if(!info.processed||!info.validOutput)throw Error('Output or status did not match the tool workflow.');
 status.dataset.status='passed';
}catch(e){status.dataset.status='failed';info.error=String(e?.message||e);}
status.textContent=JSON.stringify(info,null,2);
