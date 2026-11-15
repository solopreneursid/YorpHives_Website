// Preview-only: make a synthetic scanned page and prove the exported PDF has searchable text.
if(new URLSearchParams(location.search).get('qa')==='ocr'){
 const pre=document.createElement('pre');pre.id='ocr-browser-qa';pre.dataset.status='running';document.body.append(pre);
 const checks=[];
 const check=(name,pass,detail='')=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+' failed: '+detail);};
 try{
  const [{PDFDocument},engine]=await Promise.all([import('/tools/vendor/pdf-lib.mjs'),import('/tools/ocr-pdf-core.mjs')]);
  const canvas=document.createElement('canvas');canvas.width=1150;canvas.height=550;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#000';ctx.font='bold 118px sans-serif';ctx.fillText('HELLO WORLD',50,300);
  const img=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Canvas export failed')),'image/png'));
  const original=await PDFDocument.create(),embedded=await original.embedPng(await img.arrayBuffer());
  const page=original.addPage([575,275]);page.drawImage(embedded,{x:0,y:0,width:575,height:275});
  const input=new File([await original.save()],'synthetic-scanned.pdf',{type:'application/pdf'});
  const out=await engine.makeSearchablePdf(input);
  check('OCR outputs a valid PDF',out.blob.type==='application/pdf'&&out.blob.size>500);
  const pdfjs=await import('/tools/vendor/pdfjs/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc='/tools/vendor/pdfjs/pdf.worker.mjs';
  const task=pdfjs.getDocument({data:new Uint8Array(await out.blob.arrayBuffer()),isEvalSupported:false});
  const result=await task.promise;
  check('Searchable PDF preserves original page count',result.numPages===1);
  const textData=await(await result.getPage(1)).getTextContent();
  const text=textData.items.map(item=>item.str).join(' ');
  check('Text layer contains OCR words',/HELLO/i.test(text)&&/WORLD/i.test(text),text.slice(0,250));
  await task.destroy();canvas.width=canvas.height=0;
  pre.dataset.status='done';pre.textContent=JSON.stringify({pass:true,checks},null,2);
 }catch(error){pre.dataset.status='failed';pre.textContent=JSON.stringify({pass:false,checks,error:error?.stack||String(error)},null,2);}
}
