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
await copy('heic2any/dist/heic2any.min.js','heic/heic2any.min.js');
await copy('fix-webm-duration/fix-webm-duration.js','webm/fix-webm-duration.js');
await copy('svgo/dist/svgo.browser.js','svgo/svgo.browser.js');
// Pinned MIT ONNX Runtime Web with no CDN usage at runtime.
for(const file of ['ort.wasm.bundle.min.mjs','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])
 await copy('onnxruntime-web/dist/'+file,'onnxruntime/'+file);
const ortLicense=resolve(root,'node_modules/onnxruntime-web/LICENSE');
if(await stat(ortLicense).then(x=>x.isFile()).catch(()=>false))
 await copy('onnxruntime-web/LICENSE','wave1-licenses/onnxruntime-web-LICENSE.txt');
for(const file of ['index.js','color.js','constants.js','lzwEncode.js','palettize.js','pnnquant2.js','rgb-packing.js','stream.js'])
 await copy('gifenc/src/'+file,'gifenc/'+file);

const core='tesseract.js-core',files=await readdir(resolve(root,'node_modules',core));
const runtime=files.filter(name=>/^tesseract-core.*\.(?:js|wasm)$/.test(name));
if(runtime.length<4)throw Error('Tesseract WebAssembly components not found.');
for(const file of runtime)await copy(core+'/'+file,'ocr/core/'+file);
for(const [pkg,license] of [['pdfjs-dist','LICENSE'],['tesseract.js','LICENSE'],['tesseract.js-core','LICENSE'],['jsqr','LICENSE'],['jsbarcode','LICENSE']]){
 const path=resolve(root,'node_modules',pkg,license);
 if(await stat(path).then(x=>x.isFile()).catch(()=>false))await copy(pkg+'/'+license,'wave1-licenses/'+pkg.replace('/','-')+'-LICENSE.txt');
}
const heicLicense=resolve(root,'node_modules/heic2any/LICENSE.md');
if(await stat(heicLicense).then(x=>x.isFile()).catch(()=>false))await copy('heic2any/LICENSE.md','wave1-licenses/heic2any-LICENSE.md');
for(const [pkg,file] of [['svgo','LICENSE'],['gifenc','LICENSE.md']])
 await copy(pkg+'/'+file,'wave1-licenses/'+pkg+'-LICENSE.txt');
const webmLicense=resolve(root,'node_modules/fix-webm-duration/LICENSE');
if(await stat(webmLicense).then(x=>x.isFile()).catch(()=>false))await copy('fix-webm-duration/LICENSE','wave1-licenses/fix-webm-duration-LICENSE.txt');
console.log('WAVE1 VENDOR ASSETS COPIED: '+runtime.length+' OCR core files, local PDF rendering, QR and barcodes.');
