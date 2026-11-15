// Browser-only visual PDF comparison. Pixel differences are not semantic differences.
import JSZip from './vendor/jszip.mjs';
const MB=1048576;
async function open(file,pdfjs){
 if(!(file instanceof Blob)||file.size<1||file.size>12*MB)throw Error('Select two PDFs, each no larger than 12 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!new TextDecoder('latin1').decode(bytes.slice(0,8)).startsWith('%PDF-'))throw Error('One selected file is not a valid PDF.');
 const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true,disableAutoFetch:true});
 try{
  const pdf=await task.promise;
  if(pdf.numPages<1||pdf.numPages>4)throw Error('Use PDFs containing 1–4 pages.');
  return {pdf,task};
 }catch(e){await task.destroy().catch(()=>{});throw e;}
}
async function render(page){
 const dimensions=page.getViewport({scale:1});
 const scale=Math.min(2,Math.max(.1,900/Math.max(dimensions.width,dimensions.height)));
 const view=page.getViewport({scale}),canvas=document.createElement('canvas');
 canvas.width=Math.round(view.width);canvas.height=Math.round(view.height);
 if(canvas.width*canvas.height>1500000)throw Error('A PDF page is too large for comparison.');
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 await page.render({canvasContext:ctx,viewport:view,canvas,background:'#fff'}).promise;
 return {canvas,ctx,dimensions};
}
const png=c=>new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Could not save a comparison image.')),'image/png'));
export async function comparePdfs(files,options={}){
 if(!Array.isArray(files)||files.length!==2)throw Error('Choose exactly two PDFs.');
 if(typeof document==='undefined')throw Error('PDF comparison requires a browser.');
 const pdfjs=await import('./vendor/pdfjs/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
 const a=await open(files[0],pdfjs);let b;
 try{
  b=await open(files[1],pdfjs);
  if(a.pdf.numPages!==b.pdf.numPages)throw Error('The PDFs have different page counts. Choose two with matching page counts.');
  const zip=new JSZip(),summary=[];let differing=0,pixels=0;
  for(let i=1;i<=a.pdf.numPages;i++){
   options.onProgress?.({page:i,total:a.pdf.numPages});
   const pages=await Promise.all([a.pdf.getPage(i),b.pdf.getPage(i)]);
   let left,right;
   try{
    [left,right]=await Promise.all(pages.map(render));
    if(Math.abs(left.dimensions.width-right.dimensions.width)>1||Math.abs(left.dimensions.height-right.dimensions.height)>1||
       left.canvas.width!==right.canvas.width||left.canvas.height!==right.canvas.height)
     throw Error('Page '+i+' is not the same size in both PDFs.');
    const w=left.canvas.width,h=left.canvas.height;
    const aData=left.ctx.getImageData(0,0,w,h).data,bData=right.ctx.getImageData(0,0,w,h).data;
    const diff=document.createElement('canvas');diff.width=w;diff.height=h;
    const ctx=diff.getContext('2d'),out=ctx.createImageData(w,h);let count=0;
    for(let j=0;j<aData.length;j+=4){
     const delta=Math.abs(aData[j]-bData[j])+Math.abs(aData[j+1]-bData[j+1])+Math.abs(aData[j+2]-bData[j+2]);
     if(delta>65){count++;out.data[j]=225;out.data[j+1]=36;out.data[j+2]=55;}
     else{const gray=Math.round((bData[j]+bData[j+1]+bData[j+2])/3);out.data[j]=out.data[j+1]=out.data[j+2]=gray;}
     out.data[j+3]=255;
    }
    ctx.putImageData(out,0,0);
    const combined=document.createElement('canvas');combined.width=3*w;combined.height=h+38;
    const c=combined.getContext('2d');c.fillStyle='#eaf3ed';c.fillRect(0,0,combined.width,combined.height);
    c.drawImage(left.canvas,0,38);c.drawImage(right.canvas,w,38);c.drawImage(diff,2*w,38);
    c.fillStyle='#12513b';c.font='bold 16px sans-serif';c.fillText('ORIGINAL',12,26);
    c.fillText('UPDATED',w+12,26);c.fillText('DIFFERENCES (RED)',2*w+12,26);
    const blob=await png(combined);zip.file('page-'+i+'-comparison.png',new Uint8Array(await blob.arrayBuffer()));
    const pct=count/(w*h)*100;summary.push('Page '+i+': '+pct.toFixed(2)+'% rendered pixels differ.');
    differing+=count;pixels+=w*h;
    left.canvas.width=left.canvas.height=0;right.canvas.width=right.canvas.height=0;
    diff.width=diff.height=0;combined.width=combined.height=0;
   }finally{pages.forEach(p=>p.cleanup());}
  }
  const percent=differing/pixels*100;
  zip.file('README.txt','YorpHives visual PDF comparison\n'+summary.join('\n')+
    '\nTotal: '+percent.toFixed(2)+'% rendered pixels differ.\nThis is a visual comparison, not a semantic interpretation.\n');
  const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:4}});
  if(bytes.length>50*MB)throw Error('Comparison archive exceeds the size limit.');
  return {blob:new Blob([bytes],{type:'application/zip'}),filename:'yorphives-pdf-comparison.zip',
   summary:'Compared '+a.pdf.numPages+' pages: '+percent.toFixed(2)+'% of rendered pixels differ. Download the side-by-side image report.'};
 }finally{await a.task.destroy();await b?.task.destroy();}
}
