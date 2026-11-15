// Browser-only image masking: rectangular blur for aesthetics or permanent black pixel removal.
// Never retains original image objects, metadata, layers, or EXIF in output.
const MB=1048576;
export function validateMasks(areas){
 if(!Array.isArray(areas)||areas.length<1||areas.length>40)throw Error('Draw between 1 and 40 mask rectangles.');
 return areas.map(a=>{
  const {x,y,w,h}=Object.fromEntries(['x','y','w','h'].map(k=>[k,Number(a[k])]));
  if(![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<.008||h<.008||x+w>1.00001||y+h>1.00001)throw Error('A mask is out of bounds.');
  return {x,y,w,h};
 });
}
function verifyImage(file){
 if(!(file instanceof Blob)||file.size<1||file.size>12*MB)throw Error('Select one image up to 12 MB.');
}
async function bitmap(file){
 verifyImage(file);
 const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const valid=(bytes[0]===255&&bytes[1]===216)||(bytes[0]===137&&bytes[1]===80)||String.fromCharCode(...bytes.slice(0,4))==='RIFF';
 if(!valid)throw Error('Select an actual JPG, PNG or WebP image.');
 if(typeof createImageBitmap!=='function')throw Error('Your browser cannot decode images locally.');
 let img;try{img=await createImageBitmap(file);}catch{throw Error('The image is unsupported or corrupt.');}
 if(img.width*img.height>25000000||img.width<1||img.height<1){img.close();throw Error('Use an image smaller than 25 megapixels.');}
 return img;
}
const blobCanvas=(c,type,quality)=>new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Could not export this image.')),type,quality));
export async function previewImage(file){
 const img=await bitmap(file);
 try{
  const scale=Math.min(1,1100/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
  const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await blobCanvas(canvas,'image/png');
  canvas.width=canvas.height=0;
  return {blob,width:img.width,height:img.height};
 }finally{img.close();}
}
export async function maskImage(file,rawAreas,options={}){
 const areas=validateMasks(rawAreas),img=await bitmap(file);
 const type=options.format==='jpg'?'image/jpeg':'image/png';
 const mode=options.mode==='blur'?'blur':'blackout';
 try{
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:mode==='blackout'});
  ctx.fillStyle='#fff';if(type==='image/jpeg')ctx.fillRect(0,0,img.width,img.height);
  ctx.drawImage(img,0,0);
  for(const a of areas){
   const pad=mode==='blackout'?Math.max(2,Math.ceil(Math.min(img.width,img.height)*.005)):0;
   const x=Math.max(0,Math.floor(a.x*img.width)-pad),y=Math.max(0,Math.floor(a.y*img.height)-pad);
   const right=Math.min(img.width,Math.ceil((a.x+a.w)*img.width)+pad);
   const bottom=Math.min(img.height,Math.ceil((a.y+a.h)*img.height)+pad);
   const w=right-x,h=bottom-y;
   if(mode==='blackout'){
    ctx.fillStyle='#000';ctx.fillRect(x,y,w,h);
   }else{
    // Pixelation gives a stable, deterministic blur-like appearance.
    // It is NOT a safe way to conceal confidential information.
    const sample=document.createElement('canvas');
    sample.width=Math.max(1,Math.floor(w/22));sample.height=Math.max(1,Math.floor(h/22));
    const sc=sample.getContext('2d');sc.drawImage(canvas,x,y,w,h,0,0,sample.width,sample.height);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(sample,0,0,sample.width,sample.height,x,y,w,h);
    ctx.imageSmoothingEnabled=true;sample.width=sample.height=0;
   }
  }
  const blob=await blobCanvas(canvas,type,.92);
  canvas.width=canvas.height=0;
  if(blob.size>40*MB)throw Error('Result exceeds 40 MB.');
  return {blob,filename:'yorphives-masked-image.'+(type==='image/png'?'png':'jpg'),
   image:true,summary:(mode==='blackout'?'Permanently blacked out':'Pixelated')+' '+areas.length+' region(s). This export removes original metadata; use blackout for genuinely sensitive details.'};
 }finally{img.close();}
}
