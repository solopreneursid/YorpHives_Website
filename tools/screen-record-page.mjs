import{beginScreenRecording}from'./screen-record-core.mjs';
const $=id=>document.getElementById(id),start=$('record-start'),stop=$('record-stop'),status=$('record-status'),
 timer=$('record-timer'),result=$('record-result'),download=$('record-download'),video=$('record-preview');
let session=null,url='';
const message=(s,error=false)=>{status.textContent=s;status.classList.toggle('error',error);};
const clear=()=>{
 if(url)URL.revokeObjectURL(url);url='';
 result.hidden=true;video.pause();video.removeAttribute('src');download.removeAttribute('href');
};
start.addEventListener('click',async()=>{
 clear();start.disabled=true;stop.disabled=true;message('Choose a screen, window, or tab in your browser’s sharing dialog…');
 try{
  session=await beginScreenRecording({onElapsed:s=>{timer.textContent='● Recording · '+Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');}});
  stop.disabled=false;message('Recording on this device. Press Stop and Save, or stop sharing in your browser.');
  const resultData=await session.complete;
  clear();url=URL.createObjectURL(resultData.blob);download.href=url;download.download=resultData.filename;
  download.textContent='↓ Download '+resultData.filename;
  video.src=url;result.hidden=false;message(resultData.summary);
 }catch(error){message(error.message||'Screen recording is not available.',true);}
 finally{session=null;start.disabled=false;stop.disabled=true;timer.textContent='00:00';}
});
stop.addEventListener('click',()=>{if(session){stop.disabled=true;message('Finishing your local recording…');session.stop();}});
window.addEventListener('pagehide',()=>{session?.stop();clear();});
