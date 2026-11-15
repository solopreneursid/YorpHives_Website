// Preview-only synthetic QA. Never included in production builds.
if(new URLSearchParams(location.search).get('qa')==='wave4'){
 const out=document.createElement('pre');out.id='wave4-qa';out.dataset.status='running';document.body.append(out);
 const checks=[];
 const check=(name,ok,detail='')=>{checks.push({name,pass:!!ok,detail});if(!ok)throw Error(name+': '+detail);};
 try{
  const [engine,mask,compare,{PDFDocument},JSZipModule]=await Promise.all([
   import('/tools/wave4-core.mjs'),import('/tools/image-mask-core.mjs'),
   import('/tools/pdf-compare-core.mjs'),import('/tools/vendor/pdf-lib.mjs'),import('/tools/vendor/jszip.mjs')
  ]);
  const JSZip=JSZipModule.default;
  const srt='1\n00:00:01,000 --> 00:00:02,500\nHello, YorpHives!';
  const subtitle=await engine.processWave4('subtitle-converter',[],{subtitleText:srt,format:'vtt'});
  check('Subtitle conversion produces a downloadable VTT',subtitle.filename.endsWith('.vtt')&&(await subtitle.blob.text()).includes('00:00:01.000'));
  const preview=await engine.processWave4('social-preview-builder',[],{title:'New Product',description:'Privacy first!',url:'https://example.org/page',image:'https://example.org/photo.png'});
  check('Social meta export is valid',preview.text.includes('og:title')&&preview.text.includes('twitter:image'));
  const quote=await engine.processWave4('quotation-generator',[],{business:'YorpHives',client:'Sample Customer',items:'Design | 2 | 200\nWriting | 3 | 50',currency:'INR',tax:'18'});
  const cert=await engine.processWave4('certificate-generator',[],{recipient:'Test Recipient',title:'Excellent Achievement',organization:'YorpHives'});
  check('Quotation is a real PDF',(await PDFDocument.load(await quote.blob.arrayBuffer())).getPageCount()===1);
  check('Certificate is a real PDF',(await PDFDocument.load(await cert.blob.arrayBuffer())).getPageCount()===1);
  const canvas=document.createElement('canvas');canvas.width=120;canvas.height=120;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#12a375';ctx.fillRect(0,0,120,120);
  ctx.fillStyle='#ffdd00';ctx.fillRect(20,20,80,80);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  const file=new File([blob],'test.png',{type:'image/png'});
  const zip=await engine.processWave4('favicon-generator',[file]);
  const files=await JSZip.loadAsync(await zip.blob.arrayBuffer());
  const ico=await files.file('favicon.ico')?.async('uint8array');
  const png=await files.file('apple-touch-icon.png')?.async('uint8array');
  check('Favicon pack includes valid ICO and Apple PNG',ico?.[0]===0&&ico?.[2]===1&&png?.[0]===137);
  const result=await mask.maskImage(file,[{x:.1,y:.1,w:.5,h:.5}],{mode:'blackout',format:'png'});
  const edited=await createImageBitmap(result.blob);
  const c2=document.createElement('canvas');c2.width=edited.width;c2.height=edited.height;
  const cx=c2.getContext('2d');cx.drawImage(edited,0,0);
  const black=cx.getImageData(35,35,1,1).data,untouched=cx.getImageData(110,110,1,1).data;
  check('Image blackout replaces confidential pixels',black[0]===0&&black[1]===0&&black[2]===0,black.toString());
  check('Outside original image remains visible',untouched[1]>80,untouched.toString());
  edited.close();c2.width=c2.height=0;canvas.width=canvas.height=0;
  const a=await PDFDocument.create(),ap=a.addPage([330,330]);
  const b=await PDFDocument.create(),bp=b.addPage([330,330]);
  ap.drawRectangle({x:80,y:80,width:50,height:50,color:{type:'RGB',red:0,green:.7,blue:.5}});
  bp.drawRectangle({x:80,y:80,width:50,height:50,color:{type:'RGB',red:.9,green:0,blue:0}});
  const report=await compare.comparePdfs([
   new File([await a.save()],'before.pdf',{type:'application/pdf'}),
   new File([await b.save()],'after.pdf',{type:'application/pdf'})
  ]);
  const reportZip=await JSZip.loadAsync(await report.blob.arrayBuffer());
  const image=await reportZip.file('page-1-comparison.png')?.async('uint8array');
  const summary=await reportZip.file('README.txt')?.async('string');
  check('PDF difference package contains marked image and summary',image?.[0]===137&&summary?.includes('rendered pixels differ'));
  out.dataset.status='done';out.textContent=JSON.stringify({pass:true,checks},null,2);
 }catch(e){out.dataset.status='failed';out.textContent=JSON.stringify({pass:false,checks,error:e?.stack||String(e)},null,2);}
}
