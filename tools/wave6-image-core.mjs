// Local canvas workflows for memes, pixel art and photo color sampling.
// Original photos and metadata never leave this browser.
const MB=1048576;
export async function readCreatorImage(file,maxBytes=12*MB){
 if(!(file instanceof Blob)||file.size<1||file.size>maxBytes)
  throw Error('Choose one image up to '+Math.floor(maxBytes/MB)+' MB.');
 const head=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const valid=(head[0]===0xff&&head[1]===0xd8)||(head[0]===137&&head[1]===80)||
  (String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP');
 if(!valid)throw Error('Use a genuine JPG, PNG or WebP image.');
 if(typeof createImageBitmap!=='function')throw Error('Your browser cannot decode local images.');
 let image;
 try{image=await createImageBitmap(file);}catch{throw Error('This image could not be decoded.');}
 if(!image.width||!image.height||image.width*image.height>20000000){image.close();throw Error('Choose a photo smaller than 20 megapixels.');}
 return image;
}
export function makeCreatorCanvas(image,edge=1600){
 if(typeof document==='undefined')throw Error('Image editing needs a graphical browser.');
 const scale=Math.min(1,edge/Math.max(image.width,image.height));
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(image.width*scale));c.height=Math.max(1,Math.round(image.height*scale));
 const ctx=c.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Canvas is unavailable.');
 ctx.drawImage(image,0,0,c.width,c.height);
 return {canvas:c,ctx};
}
export function encodeHex(r,g,b){
 if(![r,g,b].every(v=>Number.isInteger(v)&&v>=0&&v<=255))throw Error('Invalid RGB values.');
 return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
}
export function rgbToHsl(r,g,b){
 const x=r/255,y=g/255,z=b/255,mn=Math.min(x,y,z),mx=Math.max(x,y,z),d=mx-mn;
 let hue=0,sat=0,light=(mx+mn)/2;
 if(d){
  sat=d/(1-Math.abs(2*light-1));
  switch(mx){case x:hue=((y-z)/d)%6;break;case y:hue=(z-x)/d+2;break;default:hue=(x-y)/d+4;}
  hue=(hue*60+360)%360;
 }
 return {h:Math.round(hue),s:Math.round(sat*100),l:Math.round(light*100)};
}
const blobFromCanvas=(canvas,mime='image/png',quality=.91)=>new Promise((resolve,reject)=>
 canvas.toBlob(b=>b?resolve(b):reject(Error('Browser image export failed.')),mime,quality));
function result(blob,name,summary,more={}){return {blob,filename:name,summary,image:true,...more};}
export async function pickImageColor(file,{x=.5,y=.5}={}){
 const image=await readCreatorImage(file);
 try{
  const {canvas,ctx}=makeCreatorCanvas(image,900);
  const xx=Number(x),yy=Number(y);
  if(!Number.isFinite(xx)||!Number.isFinite(yy)||xx<0||xx>1||yy<0||yy>1)
   throw Error('Select a point inside the image.');
  const px=ctx.getImageData(Math.min(canvas.width-1,Math.floor(xx*canvas.width)),Math.min(canvas.height-1,Math.floor(yy*canvas.height)),1,1).data;
  const hex=encodeHex(px[0],px[1],px[2]),hsl=rgbToHsl(px[0],px[1],px[2]);
  canvas.width=canvas.height=0;
  const text=hex+'\nRGB: rgb('+px[0]+', '+px[1]+', '+px[2]+')\nHSL: hsl('+hsl.h+', '+hsl.s+'%, '+hsl.l+'%)\n';
  return {blob:new Blob([text],{type:'text/plain;charset=utf-8'}),filename:'yorphives-picked-color.txt',
   summary:'Picked '+hex+' from your image.',text,swatch:hex,values:{r:px[0],g:px[1],b:px[2],...hsl}};
 }finally{image.close();}
}
export async function makePixelArt(file,{block=16,colors=8}={}){
 const size=Number(block),palette=Number(colors);
 if(![6,12,18,26,36].includes(size)||![4,8,16].includes(palette))
  throw Error('Choose a valid pixel size and color depth.');
 const image=await readCreatorImage(file);
 try{
  const {canvas}=makeCreatorCanvas(image,1500),sw=Math.max(1,Math.ceil(canvas.width/size)),sh=Math.max(1,Math.ceil(canvas.height/size));
  const small=document.createElement('canvas');small.width=sw;small.height=sh;
  const sc=small.getContext('2d',{willReadFrequently:true});sc.drawImage(canvas,0,0,sw,sh);
  const data=sc.getImageData(0,0,sw,sh);
  const step=255/(palette-1);
  for(let i=0;i<data.data.length;i+=4)for(let c=0;c<3;c++)
   data.data[i+c]=Math.min(255,Math.round(Math.round(data.data[i+c]/step)*step));
  sc.putImageData(data,0,0);
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(small,0,0,sw,sh,0,0,canvas.width,canvas.height);
  const blob=await blobFromCanvas(canvas);
  canvas.width=canvas.height=0;small.width=small.height=0;
  return result(blob,'yorphives-pixel-art.png','Created '+sw+' × '+sh+' color-limited pixel artwork.');
 }finally{image.close();}
}
export function splitMemeCaption(text,maxLines=3){
 const parts=String(text||'').trim().toUpperCase().split(/\s+/).filter(Boolean);
 if(parts.join(' ').length>140)throw Error('Meme captions must be at most 140 characters.');
 if(!parts.length)return [];
 const rows=[];let row='';
 for(const word of parts){
  if(word.length>24)throw Error('Use shorter words in your caption.');
  const next=row?row+' '+word:word;
  if(next.length>22&&row){rows.push(row);row=word;}else row=next;
 }
 if(row)rows.push(row);
 if(rows.length>maxLines)throw Error('Shorten the caption to '+maxLines+' lines or fewer.');
 return rows;
}
export async function createMeme(file,{top='',bottom='',fontSize=1}={}){
 if(!String(top).trim()&&!String(bottom).trim())throw Error('Enter a top or bottom caption.');
 const factor=Number(fontSize);
 if(![.8,1,1.2].includes(factor))throw Error('Select a supported text size.');
 const image=await readCreatorImage(file);
 try{
  const {canvas,ctx}=makeCreatorCanvas(image,1400),w=canvas.width,h=canvas.height;
  const base=Math.max(18,Math.min(w*.065,h*.085,72))*factor,outline=Math.max(3,base*.115);
  ctx.font='900 '+base+'px Impact, Arial Black, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='top';ctx.lineJoin='round';ctx.lineWidth=outline;
  ctx.strokeStyle='#080808';ctx.fillStyle='#fff';
  const draw=(caption,atBottom)=>{
   const rows=splitMemeCaption(caption);
   if(!rows.length)return;
   const lineHeight=base*1.16;
   const start=atBottom?h-rows.length*lineHeight-base*.20:base*.13;
   rows.forEach((row,i)=>{
    let size=base;ctx.font='900 '+size+'px Impact, Arial Black, sans-serif';
    while(ctx.measureText(row).width>w*.92&&size>13){size-=1;ctx.font='900 '+size+'px Impact, Arial Black, sans-serif';}
    const y=start+i*lineHeight;
    ctx.strokeText(row,w/2,y);ctx.fillText(row,w/2,y);
   });
  };
  draw(top,false);draw(bottom,true);
  const blob=await blobFromCanvas(canvas);
  canvas.width=canvas.height=0;
  return result(blob,'yorphives-meme.png','Created your captioned meme as a shareable PNG.');
 }finally{image.close();}
}
