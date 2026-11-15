// Preview-only synthetic portrait-mode integration diagnostics; never loads a real user's photo.
if(new URLSearchParams(location.search).get('qa')==='portrait-model'){
 const report=document.createElement('pre');report.id='portrait-model-qa';report.dataset.status='running';document.body.append(report);
 const checks=[],progress=[],started=performance.now(),check=(name,condition,detail='')=>{
  checks.push({name,pass:!!condition,detail});if(!condition)throw Error(name+': '+detail);
 };
 try{
  const [portrait,base]=await Promise.all([
   import('/tools/background-portrait-core.mjs'),import('/tools/background-removal-core.mjs')]);
  const {ort,session}=await portrait.loadPortraitModel(t=>progress.push(t));
  const inputMeta=session.inputMetadata?.[session.inputNames[0]];
  const outputMeta=session.outputMetadata?.[session.outputNames[0]];
  check('Portrait model loads locally',!!session.inputNames?.length&&!!session.outputNames?.length);
  const canvas=document.createElement('canvas');canvas.width=400;canvas.height=550;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#d2dce5';ctx.fillRect(0,0,400,550);
  ctx.fillStyle='#4e6070';ctx.beginPath();ctx.ellipse(200,355,131,145,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#c98961';ctx.beginPath();ctx.ellipse(200,204,95,118,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#263a4e';ctx.beginPath();ctx.ellipse(200,126,100,70,0,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.fillRect(165,205,14,10);ctx.fillRect(227,205,14,10);
  const photoBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  const photo=new File([photoBlob],'portrait-test.png',{type:'image/png'});
  const seg=await base.segmentImage(photo,{mode:'portrait',onProgress:t=>progress.push(t)});
  let min=Infinity,max=-Infinity,nonzero=0;
  for(const v of seg.mask){min=Math.min(min,v);max=Math.max(max,v);if(v>.05)nonzero++;}
  check('Portrait inference produces finite alpha mask',min>=0&&max<=1&&max-min>.0001,
   JSON.stringify({min,max,nonzero,size:seg.mask.length,inferenceMs:seg.inferenceMs}));
  const result=await base.renderTransparentPng(seg,{cutoff:.5,softness:.18,maxEdge:800});
  const image=await createImageBitmap(result.blob),c=document.createElement('canvas');
  c.width=image.width;c.height=image.height;const cx=c.getContext('2d',{willReadFrequently:true});
  cx.drawImage(image,0,0);
  const rgba=cx.getImageData(0,0,c.width,c.height).data;
  let clear=0,solid=0;for(let i=3;i<rgba.length;i+=4){if(rgba[i]<25)clear++;if(rgba[i]>230)solid++;}
  check('Portrait generates transparent and opaque PNG regions',clear>100&&solid>100,'clear='+clear+' solid='+solid);
  check('PNG is valid and downloadable',result.blob.type==='image/png'&&result.blob.size>200);
  base.disposeSegmentation(seg);image.close();c.width=c.height=canvas.width=canvas.height=0;
  report.dataset.status='done';report.textContent=JSON.stringify({pass:true,checks,progress,model:{name:portrait.PORTRAIT_INFO.name,bytes:portrait.PORTRAIT_INFO.maxBytes,inputs:session.inputNames,inputMeta,outputs:session.outputNames,outputMeta},durationMs:Math.round(performance.now()-started)},null,2);
 }catch(error){report.dataset.status='failed';report.textContent=JSON.stringify({pass:false,checks,progress,durationMs:Math.round(performance.now()-started),error:error?.stack||String(error)},null,2);}
}
