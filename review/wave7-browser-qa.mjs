// Preview-only, noindex synthetic acceptance. Never captures a real user microphone.
if(new URLSearchParams(location.search).get('qa')==='wave7'){
 const report=document.createElement('pre');report.id='wave7-browser-qa';report.dataset.status='running';document.body.append(report);
 const checks=[];
 const check=(name,ok,detail='')=>{checks.push({name,pass:!!ok,detail});if(!ok)throw Error(name+': '+detail);};
 try{
  const [core,audio,business,{PDFDocument},{csvToXlsx},JSZipModule,wav]=await Promise.all([
   import('/tools/wave7-file-core.mjs'),import('/tools/wave7-audio-core.mjs'),
   import('/tools/wave7-business-core.mjs'),import('/tools/vendor/pdf-lib.mjs'),
   import('/tools/office-files.mjs'),import('/tools/vendor/jszip.mjs'),import('/tools/wave3-core.mjs')
  ]);
  const JSZip=JSZipModule.default;
  const canvas=document.createElement('canvas');canvas.width=180;canvas.height=120;
  const c=canvas.getContext('2d');c.fillStyle='#19916d';c.fillRect(0,0,180,120);
  c.fillStyle='#ffd447';c.fillRect(25,20,95,70);
  const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  const photo=new File([png],'sample.png',{type:'image/png'});
  const batch=await core.convertImageBatch([photo,photo],{format:'jpeg',quality:.8,max:640});
  const bz=await JSZip.loadAsync(await batch.blob.arrayBuffer());
  const outputs=Object.keys(bz.files).filter(x=>x.endsWith('.jpg'));
  check('Batch image conversion creates two independent JPEGs',outputs.length===2);
  const one=await bz.file(outputs[0]).async('uint8array');
  check('Converted JPEG header is valid',one[0]===0xff&&one[1]===0xd8);
  const pack=await core.makeImagePublishingPack(photo);
  const pz=await JSZip.loadAsync(await pack.blob.arrayBuffer());
  check('Publishing workflow produces all three real image assets',
   ['website-image.webp','square-thumbnail.webp','social-share-image.jpg'].every(x=>!!pz.file(x)));
  const original=await PDFDocument.create();original.addPage([210,210]);original.setAuthor('Synthetic QA Author');original.setTitle('Synthetic Confidential Title');
  const pdfFile=new File([await original.save()],'metadata.pdf',{type:'application/pdf'});
  const inspected=await core.inspectPdfMetadata(pdfFile);
  check('Metadata inspector reads standard Info fields',inspected.text.includes('Synthetic QA Author'));
  const clean=await core.cleanPdfMetadata(pdfFile);
  const parsed=await PDFDocument.load(await clean.blob.arrayBuffer(),{updateMetadata:false});
  check('Metadata cleaner clears standard Info fields',parsed.getAuthor()===''&&parsed.getTitle()==='');
  const xlsxBytes=await csvToXlsx('id,category\\n1,Events\\n2,Design');
  const csv=new File(['id,category\\n3,Marketing\\n1,Events'],'new.csv',{type:'text/csv'});
  const xlsx=new File([xlsxBytes],'old.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const merged=await core.mergeSpreadsheetFiles([csv,xlsx],{dedupe:'on',format:'csv'});
  const text=await merged.blob.text();
  check('CSV/XLSX merger reads both files',text.includes('Marketing')&&text.includes('Design'));
  check('CSV/XLSX merger removes exact duplicate rows',text.trim().split(/\\r?\\n/).length===4);
  const wave=new File([wav.wavFromAudioChannels([Float32Array.from({length:22050},(_,i)=>.11*Math.sin(i/50))],44100)],
   'synthetic.wav',{type:'audio/wav'});
  const mixed=await audio.mergeAudioFiles([wave,wave]);
  const waveHeader=new Uint8Array(await mixed.blob.slice(0,4).arrayBuffer());
  check('Audio merger saves valid WAV',String.fromCharCode(...waveHeader)==='RIFF'&&mixed.blob.size>2000);
  const analysis=business.assessPassword('password123');
  check('Password analyzer flags obvious weak patterns',analysis.score<=1&&analysis.hasPatterns);
  const proposal=await business.createBusinessProposal({company:'YorpHives',client:'Synthetic Client',
   project:'Improve an existing website',overview:'Create a usable product and verify all controls.',
   deliverables:'Plan\\nImplement\\nTest',timeline:'Three working weeks.',cost:25000,currency:'INR'});
  const proposalDoc=await PDFDocument.load(await proposal.blob.arrayBuffer());
  check('Business proposal exports readable PDF',proposalDoc.getPageCount()>=1);
  // Synthetic stream: replaces getUserMedia temporarily, never activates real microphone.
  if(typeof MediaRecorder!=='undefined'&&navigator.mediaDevices){
   const ctx=new AudioContext(),dest=ctx.createMediaStreamDestination(),osc=ctx.createOscillator();
   osc.frequency.value=250;osc.connect(dest);osc.start();
   const originalDescriptor=Object.getOwnPropertyDescriptor(navigator.mediaDevices,'getUserMedia');
   try{
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,writable:true,value:async()=>dest.stream});
    const recording=await audio.beginVoiceRecording();
    await new Promise(resolve=>setTimeout(resolve,1100));recording.stop();
    const saved=await recording.complete;
    check('Synthetic microphone recorder captures and saves local audio',saved.blob.size>50&&saved.blob.type.startsWith('audio/'));
   }finally{
    if(originalDescriptor)Object.defineProperty(navigator.mediaDevices,'getUserMedia',originalDescriptor);
    else delete navigator.mediaDevices.getUserMedia;
    osc.stop();osc.disconnect();await ctx.close();
   }
  }else check('Synthetic recorder format is selected without permission',audio.recorderMime(()=>false)===null);
  canvas.width=canvas.height=0;
  report.dataset.status='done';report.textContent=JSON.stringify({pass:true,checks},null,2);
 }catch(error){report.dataset.status='failed';report.textContent=JSON.stringify({pass:false,checks,error:error?.stack||String(error)},null,2);}
}
