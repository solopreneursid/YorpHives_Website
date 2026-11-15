// Preview-only UI acceptance. All inputs synthetic and browser-local.
if(new URLSearchParams(location.search).get('qa')==='wave7-ui'){
 const pre=document.createElement('pre');pre.id='wave7-ui-qa';pre.dataset.status='running';document.body.append(pre);
 const id=document.body.dataset.wave7,checks=[];
 const check=(name,condition)=>{checks.push({name,pass:!!condition});if(!condition)throw Error(name);};
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const until=async(fn,limit=15000)=>{for(let i=0;i<limit/125;i++){if(fn())return;await sleep(125);}throw Error('Result did not appear after user action.');};
 const loadFiles=(input,files)=>{const dt=new DataTransfer();files.forEach(f=>dt.items.add(f));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));};
 try{
  if(id==='business-proposal-generator'){
   const f=document.getElementById('wave7-form'),values={company:'YorpHives',client:'Synthetic Client',
    project:'New website',overview:'Better usability.',deliverables:'Design, build and test.',timeline:'Three weeks.',cost:'1200',currency:'USD'};
   for(const [name,value] of Object.entries(values))f.elements.namedItem(name).value=value;
   f.requestSubmit();
   await until(()=>!document.getElementById('wave7-result').hidden);
   const a=document.querySelector('#wave7-result a[download]');
   check('Business proposal page submits and shows downloadable PDF',a?.download.endsWith('.pdf'));
  }else if(id==='password-strength-analyzer'){
   const field=document.getElementById('wave7-password'),label=document.getElementById('wave7-strength');
   field.value='password123';field.dispatchEvent(new Event('input',{bubbles:true}));
   check('Password strength updates on typing',label.textContent.toLowerCase().includes('weak'));
   document.getElementById('wave7-reveal').click();
   check('Visibility toggle functions',field.type==='text');
  }else if(id==='batch-image-converter'||id==='image-publishing-pack'){
   const canvas=document.createElement('canvas');canvas.width=90;canvas.height=90;
   canvas.getContext('2d').fillRect(0,0,90,90);
   const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
   const input=document.getElementById('wave7-file');
   loadFiles(input,[new File([blob],'sample.png',{type:'image/png'})]);
   document.getElementById('wave7-form').requestSubmit();
   await until(()=>!document.getElementById('wave7-result').hidden);
   const a=document.querySelector('#wave7-result a[download]');
   check('Image form processes and provides local ZIP',a?.download.endsWith('.zip'));
  }else if(id==='spreadsheet-merger'){
   const input=document.getElementById('wave7-file');
   loadFiles(input,[new File(['id,name\n1,Alice\n'],'first.csv',{type:'text/csv'}),
     new File(['id,name\n2,Bob\n'],'second.csv',{type:'text/csv'})]);
   document.getElementById('wave7-form').requestSubmit();
   await until(()=>!document.getElementById('wave7-result').hidden);
   check('Spreadsheet page merges and downloads a CSV',document.querySelector('#wave7-result a[download]')?.download.endsWith('.csv'));
  }else if(id==='voice-recorder'){
   const ctx=new AudioContext(),destination=ctx.createMediaStreamDestination(),osc=ctx.createOscillator();
   osc.connect(destination);osc.start();
   if(!navigator.mediaDevices)throw Error('No test microphone interface in this browser.');
   const original=Object.getOwnPropertyDescriptor(navigator.mediaDevices,'getUserMedia');
   try{
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>destination.stream});
    document.getElementById('wave7-start').click();
    await until(()=>!document.getElementById('wave7-stop').disabled);
    await sleep(900);document.getElementById('wave7-stop').click();
    await until(()=>!document.getElementById('wave7-result').hidden);
    check('Voice recorder UI can start, stop and save a recording',!!document.querySelector('#wave7-result a[download]'));
   }finally{
    if(original)Object.defineProperty(navigator.mediaDevices,'getUserMedia',original);
    else delete navigator.mediaDevices.getUserMedia;
    osc.stop();await ctx.close();
   }
  }else throw Error('Unsupported synthetic UI page '+id);
  pre.dataset.status='done';pre.textContent=JSON.stringify({pass:true,id,checks},null,2);
 }catch(error){pre.dataset.status='failed';pre.textContent=JSON.stringify({pass:false,id,checks,error:error?.stack||String(error)},null,2);}
}
