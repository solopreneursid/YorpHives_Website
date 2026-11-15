// Copies pinned, permissively licensed browser libraries into local static assets.
// No CDN or external runtime processing is required. Run after copying /tools into dist.
import {readdir,mkdir,copyFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'dist/tools/vendor');
async function copy(from,to){
 const source=resolve(root,'node_modules',from),dest=resolve(out,to);
 if(!(await stat(source).then(x=>x.isFile()).catch(()=>false)))throw Error('Missing pinned Wave1 dependency asset: '+from);
 await mkdir(dirname(dest),{recursive:true});
 await copyFile(source,dest);
}
await copy('pdfjs-dist/build/pdf.mjs','pdfjs/pdf.mjs');
await copy('pdfjs-dist/build/pdf.worker.mjs','pdfjs/pdf.worker.mjs');
await copy('tesseract.js/dist/tesseract.esm.min.js','ocr/tesseract.esm.min.js');
await copy('tesseract.js/dist/worker.min.js','ocr/worker.min.js');
await copy('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz','ocr/lang/eng.traineddata.gz');
await copy('jsqr/dist/jsQR.js','qr/jsQR.js');
await copy('jsbarcode/dist/JsBarcode.all.min.js','barcode/JsBarcode.all.min.js');
const core='tesseract.js-core',files=await readdir(resolve(root,'node_modules',core));
const runtime=files.filter(name=>/^tesseract-core.*\.(?:js|wasm)$/.test(name));
if(runtime.length<4)throw Error('Tesseract WebAssembly components not found.');
for(const file of runtime)await copy(core+'/'+file,'ocr/core/'+file);
for(const [pkg,license] of [['pdfjs-dist','LICENSE'],['tesseract.js','LICENSE'],['tesseract.js-core','LICENSE'],['jsqr','LICENSE'],['jsbarcode','LICENSE']]){
 const path=resolve(root,'node_modules',pkg,license);
 if(await stat(path).then(x=>x.isFile()).catch(()=>false))await copy(pkg+'/'+license,'wave1-licenses/'+pkg.replace('/','-')+'-LICENSE.txt');
}
console.log('WAVE1 VENDOR ASSETS COPIED: '+runtime.length+' OCR core files, local PDF rendering, QR and barcodes.');
