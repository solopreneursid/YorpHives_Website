/* Preview-only browser interaction test for the actual Word Counter.
   Runs from the same origin and tests the real form and processor, not a mock. */
const status=document.createElement('pre');
status.id='next-word-tool-qa';
status.dataset.status='running';
status.style.cssText='position:fixed;z-index:9999;top:82px;left:12px;max-width:calc(100vw - 24px);max-height:35vh;overflow:auto;padding:13px;background:#061c11;color:#b1ffd3;border:1px solid #7fe4a0;border-radius:10px;font:12px/1.5 monospace;white-space:pre-wrap';
status.textContent='Testing real Word Counter processing…';
document.body.append(status);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,ms=15000)=>{const start=performance.now();while(performance.now()-start<ms){if(fn())return;await sleep(90)}throw Error('Timed out awaiting tool processing')};
const run=async()=>{
 try{
  const form=document.getElementById('utility-form');
  const runButton=document.getElementById('utility-run');
  const input=form?.querySelector('textarea[name="text"]');
  const result=document.getElementById('utility-result');
  const output=document.getElementById('utility-output');
  if(!form||!runButton||!input||!result||!output)throw Error('Word Counter controls missing');
  await wait(()=>!runButton.disabled);
  input.value='One two three.';
  input.dispatchEvent(new Event('input',{bubbles:true}));
  form.requestSubmit();
  await wait(()=>!result.hidden&&output.value.trim().length>0);
  const text=output.value;
  if(!/\b3\b/.test(text))throw Error('Three-word input not counted: '+text.slice(0,150));
  status.dataset.status='passed';
  status.textContent='PASS: actual Word Counter produced the result.\n'+text.slice(0,220);
 }catch(e){
  status.dataset.status='failed';
  status.textContent='FAIL: '+String(e?.message||e);
 }
};
run();
