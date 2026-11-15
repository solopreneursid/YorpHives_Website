if(new URLSearchParams(location.search).get('qa')==='wave3'){
// Preview-only browser integration QA for new audio and PDF engines. Synthetic data only.
// This file is not copied into production builds.
const pre=document.createElement('pre');pre.id='wave3-qa';pre.dataset.status='running';document.body.append(pre);
const checks=[];
function check(name,condition,details=''){checks.push({name,pass:!!condition,details});if(!condition)throw Error('FAIL '+name+' '+details);}
try{
 const [{PDFDocument,StandardFonts},pdfModule,wave3]=await Promise.all([
  import('/tools/vendor/pdf-lib.mjs'),import('/tools/pdf-redaction-core.mjs'),import('/tools/wave3-core.mjs')
 ]);
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 const page=doc.addPage([300,300]);
 page.drawText('CONFIDENTIAL PRIVATE',{x:30,y:150,size:15,font});
 const input=new File([await doc.save()],'synthetic.pdf',{type:'application/pdf'});
 const preview=await pdfModule.previewRedactionPage(input,1);
 check('PDF preview renders locally',preview.blob.size>200&&preview.pageCount===1);
 const redacted=await pdfModule.redactPdf(input,[{page:1,x:.05,y:.33,w:.7,h:.28}]);
 const dest=await PDFDocument.load(await redacted.blob.arrayBuffer());
 check('Redaction exports valid PDF',dest.getPageCount()===1&&redacted.blob.size>400);
 const pdfjs=await import('/tools/vendor/pdfjs/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='/tools/vendor/pdfjs/pdf.worker.mjs';
 const task=pdfjs.getDocument({data:new Uint8Array(await redacted.blob.arrayBuffer()),isEvalSupported:false});
 const rendered=await task.promise,first=await rendered.getPage(1);
 const content=await first.getTextContent();
 check('Original text is removed from PDF content streams',content.items.length===0);
 const vp=first.getViewport({scale:1});
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
 const ctx=canvas.getContext('2d');
 await first.render({canvas,canvasContext:ctx,viewport:vp}).promise;
 const pixels=ctx.getImageData(80,150,1,1).data;
 check('Redaction pixels are black',pixels[0]<20&&pixels[1]<20&&pixels[2]<20,pixels.toString());
 canvas.width=canvas.height=0;await task.destroy();
 const wav=wave3.wavFromAudioChannels([Float32Array.from({length:22050},(_,i)=>Math.sin(i*.02)*.3)],44100);
 const sound=new File([wav],'synthetic.wav',{type:'audio/wav'});
 const result=await wave3.processWave3('audio-trimmer',[sound],{start:'0.1',end:'0.3'});
 const bytes=new Uint8Array(await result.blob.slice(0,12).arrayBuffer());
 check('Audio trimmer produces WAV',String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&result.blob.size>1000);
 const invalid=await wave3.processWave3('heic-to-jpg',[new File(['bad'],'fake.heic')]).then(()=>false,e=>/HEIC|HEIF/.test(e.message));
 check('HEIC converter rejects unsupported files locally',invalid);
 pre.dataset.status='done';pre.textContent=JSON.stringify({pass:true,checks},null,2);
}catch(e){pre.dataset.status='failed';pre.textContent=JSON.stringify({pass:false,checks,error:e?.stack||String(e)},null,2);}

}
