// One-page private document scanner: manual 4-corner crop, projective deskew, cleanup.
// Does not perform automatic edge detection or OCR; the PDF is image-only.
import {PDFDocument} from './vendor/pdf-lib.mjs';
import {readCreatorImage} from './wave6-image-core.mjs';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function validateScanCorners(corners){
 if(!Array.isArray(corners)||corners.length!==4)throw Error('Choose four corners in top-left, top-right, bottom-right, bottom-left order.');
 const pts=corners.map(p=>{
  const x=Number(p?.x),y=Number(p?.y);
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1)
   throw Error('A document corner lies outside the image.');
  return {x,y};
 });
 let orientation=0,area=0;
 for(let i=0;i<4;i++){
  const a=pts[i],b=pts[(i+1)%4],c=pts[(i+2)%4];
  const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
  if(Math.abs(cross)<.0001)throw Error('Document corners must form a convex quadrilateral.');
  if(orientation===0)orientation=Math.sign(cross);
  else if(Math.sign(cross)!==orientation)throw Error('Document corner edges cross. Reposition the handles.');
  area+=a.x*b.y-b.x*a.y;
 }
 if(Math.abs(area)/2<.04)throw Error('The selected document area is too small.');
 return pts;
}
export function solveProjective(corners){
 const pts=validateScanCorners(corners);
 const uv=[[0,0],[1,0],[1,1],[0,1]],matrix=[];
 for(let i=0;i<4;i++){
  const [u,v]=uv[i],{x,y}=pts[i];
  matrix.push([u,v,1,0,0,0,-u*x,-v*x,x]);
  matrix.push([0,0,0,u,v,1,-u*y,-v*y,y]);
 }
 for(let col=0;col<8;col++){
  let pivot=col;
  for(let row=col+1;row<8;row++)if(Math.abs(matrix[row][col])>Math.abs(matrix[pivot][col]))pivot=row;
  if(Math.abs(matrix[pivot][col])<1e-10)throw Error('Document corners form an invalid perspective.');
  [matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];
  const divisor=matrix[col][col];
  for(let k=col;k<=8;k++)matrix[col][k]/=divisor;
  for(let row=0;row<8;row++)if(row!==col){
   const m=matrix[row][col];for(let k=col;k<=8;k++)matrix[row][k]-=m*matrix[col][k];
  }
 }
 return matrix.map(row=>row[8]);
}
export function projectPoint(matrix,u,v){
 const d=matrix[6]*u+matrix[7]*v+1;
 if(!Number.isFinite(d)||Math.abs(d)<1e-10)throw Error('Invalid scan perspective.');
 return {x:(matrix[0]*u+matrix[1]*v+matrix[2])/d,y:(matrix[3]*u+matrix[4]*v+matrix[5])/d};
}
const jpgBlob=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not save the scanned page.')),'image/jpeg',.91));
export async function scanDocument(file,options={}){
 if(typeof document==='undefined')throw Error('Document scanning needs a graphical browser.');
 const corners=validateScanCorners(options.corners||[{x:.06,y:.06},{x:.94,y:.06},{x:.94,y:.94},{x:.06,y:.94}]);
 const mode=['color','grayscale','enhanced'].includes(options.mode)?options.mode:'enhanced';
 const format=options.format==='jpg'?'jpg':'pdf';
 const image=await readCreatorImage(file,15*1048576);
 try{
  const maxSource=2500,sourceScale=Math.min(1,maxSource/Math.max(image.width,image.height));
  const src=document.createElement('canvas');src.width=Math.max(1,Math.round(image.width*sourceScale));src.height=Math.max(1,Math.round(image.height*sourceScale));
  const sx=src.getContext('2d',{willReadFrequently:true});sx.drawImage(image,0,0,src.width,src.height);
  const sdata=sx.getImageData(0,0,src.width,src.height).data;
  const widths=(dist(corners[0],corners[1])+dist(corners[2],corners[3]))/2*src.width;
  const heights=(dist(corners[1],corners[2])+dist(corners[3],corners[0]))/2*src.height;
  const ratio=Math.min(3,Math.max(1/3,widths/heights));
  const outW=Math.max(350,Math.round(ratio>=1?1600:1600*ratio));
  const outH=Math.max(350,Math.round(ratio<=1?1600:1600/ratio));
  if(outW*outH>2800000)throw Error('Scanned page exceeds this device’s processing limit.');
  const dest=document.createElement('canvas');dest.width=outW;dest.height=outH;
  const dx=dest.getContext('2d',{willReadFrequently:true}),pixels=dx.createImageData(outW,outH);
  const h=solveProjective(corners),dw=src.width-1,dh=src.height-1;
  for(let y=0;y<outH;y++){
   const v=y/(outH-1);
   for(let x=0;x<outW;x++){
    const u=x/(outW-1),p=projectPoint(h,u,v);
    const fx=Math.min(dw,Math.max(0,p.x*dw)),fy=Math.min(dh,Math.max(0,p.y*dh));
    const ix=Math.floor(fx),iy=Math.floor(fy),x1=Math.min(dw,ix+1),y1=Math.min(dh,iy+1);
    const wx=fx-ix,wy=fy-iy;
    const a=(iy*src.width+ix)*4,b=(iy*src.width+x1)*4,c=(y1*src.width+ix)*4,d=(y1*src.width+x1)*4;
    const destPos=(y*outW+x)*4;
    let channels=[0,0,0];
    for(let k=0;k<3;k++){
     const top=sdata[a+k]*(1-wx)+sdata[b+k]*wx;
     const bottom=sdata[c+k]*(1-wx)+sdata[d+k]*wx;
     channels[k]=top*(1-wy)+bottom*wy;
    }
    if(mode!=='color'){
     const gray=channels[0]*.299+channels[1]*.587+channels[2]*.114;
     const value=mode==='enhanced'?Math.max(0,Math.min(255,(gray-110)*1.5+153)):gray;
     channels=[value,value,value];
    }
    for(let k=0;k<3;k++)pixels.data[destPos+k]=Math.round(channels[k]);
    pixels.data[destPos+3]=255;
   }
  }
  dx.putImageData(pixels,0,0);
  const jpg=await jpgBlob(dest);src.width=src.height=0;dest.width=dest.height=0;
  if(format==='jpg')return {blob:jpg,filename:'yorphives-scanned-document.jpg',image:true,
    summary:'Created a cleaned, manually deskewed image from the selected four corners.'};
  const pdf=await PDFDocument.create(),bytes=new Uint8Array(await jpg.arrayBuffer()),embedded=await pdf.embedJpg(bytes);
  const page=pdf.addPage([595,842]),margin=24,scale=Math.min((595-2*margin)/outW,(842-2*margin)/outH);
  const w=outW*scale,h2=outH*scale;
  page.drawImage(embedded,{x:(595-w)/2,y:(842-h2)/2,width:w,height:h2});
  return {blob:new Blob([await pdf.save()],{type:'application/pdf'}),filename:'yorphives-scanned-document.pdf',
   summary:'Created a one-page image-only PDF. Text is not searchable; use the searchable PDF tool for OCR.'};
 }finally{image.close();}
}
