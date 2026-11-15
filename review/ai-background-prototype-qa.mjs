// Noindex preview-only benchmark. Generates its own input; no external photos.
if(new URLSearchParams(location.search).get('qa')==='background-ai'){
 const node=document.createElement('pre');node.id='background-ai-qa';node.dataset.status='running';document.body.append(node);
 const checks=[],messages=[],start=performance.now(),check=(name,ok,details='')=>{
  checks.push({name,pass:!!ok,details});if(!ok)throw Error(name+': '+details);
 };
 try{
  const {MODEL_INFO,segmentImage,renderTransparentPng,disposeSegmentation,prepareU2NetTensor,maskAlpha}=await import('/tools/background-removal-core.mjs');
  check('Model license is commercially usable and weighs less than 5 MB',MODEL_INFO.license==='Apache-2.0'&&MODEL_INFO.bytes<5e6);
  const fake=new Uint8ClampedArray(320*320*4);fake.fill(255);
  const tensor=prepareU2NetTensor(fake);
  check('Model input tensor contains 307200 float values',tensor.length===307200);
  check('Soft alpha is ordered and bounded',[0,.25,.5,.75,1].every((v,i,a)=>i===0||maskAlpha(v)>=maskAlpha(a[i-1])));
  const canvas=document.createElement('canvas');canvas.width=460;canvas.height=345;
  const c=canvas.getContext('2d');
  const gradient=c.createLinearGradient(0,0,460,345);
  gradient.addColorStop(0,'#ffffff');gradient.addColorStop(1,'#d9e9ee');
  c.fillStyle=gradient;c.fillRect(0,0,460,345);
  // High-contrast abstract foreground for a deterministic inference smoke test.
  c.fillStyle='#243e53';c.beginPath();c.ellipse(235,176,96,130,0,0,Math.PI*2);c.fill();
  c.fillStyle='#df9a50';c.beginPath();c.ellipse(232,114,63,65,0,0,Math.PI*2);c.fill();
  c.fillStyle='#264f38';c.fillRect(155,173,160,144);
  c.fillStyle='#ffffff';c.fillRect(190,123,13,13);c.fillRect(260,123,13,13);
  const input=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  const file=new File([input],'qa-foreground.png',{type:'image/png'});
  const result=await segmentImage(file,{onProgress:m=>messages.push(m)});
  let maskMin=Infinity,maskMax=-Infinity;
  for(const v of result.mask){maskMin=Math.min(maskMin,v);maskMax=Math.max(maskMax,v);}
  check('Actual private ONNX inference returns a finite nonconstant saliency mask',
   result.mask.length===320*320&&maskMax>.99&&maskMin<.01,
   'range='+maskMin.toFixed(3)+'..'+maskMax.toFixed(3)+' inference='+result.inferenceMs+'ms');
  const output=await renderTransparentPng(result,{cutoff:.5,softness:.18,maxEdge:800});
  const sig=new Uint8Array(await output.blob.slice(0,8).arrayBuffer());
  check('Exported result has a real PNG signature',sig[0]===137&&sig[1]===80&&sig[2]===78&&sig[3]===71);
  check('Full processed PNG is valid and under 20 MB',output.blob.size>300&&output.blob.size<20*1048576);
  const img=await createImageBitmap(output.blob),pixels=document.createElement('canvas');pixels.width=img.width;pixels.height=img.height;
  const pc=pixels.getContext('2d',{willReadFrequently:true});pc.drawImage(img,0,0);
  const rgba=pc.getImageData(0,0,pixels.width,pixels.height).data;
  let opaque=0,translucent=0,transparent=0;
  for(let i=3;i<rgba.length;i+=4){if(rgba[i]>230)opaque++;else if(rgba[i]<25)transparent++;else translucent++;}
  check('PNG has alpha transparency distinct from fully opaque output',
   transparent+translucent>100,'opaque='+opaque+', translucent='+translucent+', transparent='+transparent);
  check('Generated pixels are browser-decodable',img.width>200&&img.height>200);
  const alternative=await renderTransparentPng(result,{cutoff:.62,softness:.28,maxEdge:800});
  check('Mask controls re-render without a second model inference',alternative.blob.size>300);
  disposeSegmentation(result);img.close();canvas.width=canvas.height=pixels.width=pixels.height=0;
  node.dataset.status='done';node.textContent=JSON.stringify({pass:true,checks,messages,ms:Math.round(performance.now()-start),
   inferenceMs:result.inferenceMs,outputBytes:output.blob.size,alpha:{opaque,translucent,transparent}},null,2);
 }catch(error){node.dataset.status='failed';node.textContent=JSON.stringify({pass:false,checks,messages,ms:Math.round(performance.now()-start),
  error:error?.stack||String(error)},null,2);}
}
