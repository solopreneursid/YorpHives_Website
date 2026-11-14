import { formatJson, buildCampaignUrl } from './toolkit.mjs';

const $ = id => document.getElementById(id);
function message(id, text, error = false) {
  const element = $(id); element.textContent = text; element.classList.toggle('error', error);
}
async function copyFrom(element, statusId) {
  if (!element.value) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(element.value);
    message(statusId, 'Copied to clipboard.');
  } catch (_) {
    element.focus(); element.select();
    message(statusId, 'Select and copy the result using your keyboard.');
  }
}

if (document.body.dataset.tool === 'json-formatter') {
  const input = $('json-input'); const output = $('json-output');
  const copy = $('json-copy'); const download = $('json-download');
  function resetResult() { output.value = ''; copy.disabled = true; download.disabled = true; message('json-status', ''); }
  input.addEventListener('input', resetResult);
  function run(indent) {
    try {
      if (!input.value.trim()) throw new Error('Paste some JSON first.');
      output.value = formatJson(input.value, indent);
      copy.disabled = false; download.disabled = false;
      message('json-status', indent === 0 ? 'Valid JSON. Minified successfully.' : 'Valid JSON. Formatted successfully.');
    } catch (error) {
      output.value = ''; copy.disabled = true; download.disabled = true;
      message('json-status', `Unable to format: ${error.message}`, true);
    }
  }
  $('json-format').addEventListener('click', () => run(Number($('json-indent').value)));
  $('json-minify').addEventListener('click', () => run(0));
  copy.addEventListener('click', () => copyFrom(output, 'json-status'));
  download.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([output.value], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'formatted.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('json-clear').addEventListener('click', () => { input.value = ''; resetResult(); input.focus(); });
}

if (document.body.dataset.tool === 'campaign-url-builder') {
  const form = $('utm-form'); const output = $('utm-output'); const copy = $('utm-copy');
  form.addEventListener('input', event => {
    if (event.target !== output) { output.value = ''; copy.disabled = true; message('utm-status', ''); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const values = Object.fromEntries(['source', 'medium', 'campaign', 'term', 'content'].map(key => [key, $(`utm-${key}`).value]));
      if (!Object.values(values).some(value => value.trim())) throw new Error('Add at least one campaign field.');
      output.value = buildCampaignUrl($('utm-url').value, values); copy.disabled = false;
      message('utm-status', 'Your campaign link is ready.');
    } catch (error) { output.value = ''; copy.disabled = true; message('utm-status', error.message, true); }
  });
  copy.addEventListener('click', () => copyFrom(output, 'utm-status'));
  form.addEventListener('reset', () => { copy.disabled = true; message('utm-status', ''); });
}

if (document.body.dataset.tool === 'image-resizer') {
  const fileInput = $('image-file'); const width = $('image-width'); const height = $('image-height');
  const format = $('image-format'); const quality = $('image-quality'); const convert = $('image-convert');
  const download = $('image-download'); const result = $('image-result');
  let source = null; let originalFile = null; let aspect = 1; let generation = 0; let resultUrl = null;
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  const readableSize = bytes => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  function discardResult() {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = null; download.hidden = true; download.removeAttribute('href');
    result.hidden = true; $('image-preview').removeAttribute('src');
  }
  function enableSettings(enabled) {
    width.disabled = height.disabled = format.disabled = convert.disabled = !enabled;
    quality.disabled = !enabled || format.value === 'image/png';
  }
  fileInput.addEventListener('change', () => {
    const token = ++generation; discardResult(); source = null; originalFile = null; enableSettings(false);
    $('image-original').textContent = 'No image selected yet.';
    const file = fileInput.files?.[0];
    if (!file) { $('image-original').textContent = 'No image selected yet.'; message('image-status', ''); return; }
    if (!allowed.includes(file.type)) { message('image-status', 'Choose a JPEG, PNG, or WebP image.', true); return; }
    if (file.size > 25 * 1024 * 1024) { message('image-status', 'Choose an image that is 25 MB or smaller.', true); return; }
    message('image-status', 'Loading image…');
    const url = URL.createObjectURL(file); const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url); if (token !== generation) return;
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) {
        message('image-status', 'This image is too large to process safely here. Choose an image under 40 megapixels.', true); return;
      }
      source = image; originalFile = file; aspect = image.naturalWidth / image.naturalHeight;
      const scale = Math.min(1, 8192 / image.naturalWidth, 8192 / image.naturalHeight, Math.sqrt(24000000 / (image.naturalWidth * image.naturalHeight)));
      width.value = String(Math.max(1, Math.floor(image.naturalWidth * scale)));
      height.value = String(Math.max(1, Math.floor(image.naturalHeight * scale)));
      $('image-original').textContent = `Original: ${image.naturalWidth} × ${image.naturalHeight} px · ${readableSize(file.size)}`;
      enableSettings(true); message('image-status', scale < 1 ? 'Dimensions were reduced to fit browser limits.' : 'Image ready. Choose your settings.');
    };
    image.onerror = () => { URL.revokeObjectURL(url); if (token === generation) message('image-status', 'Could not read this image. Try another file.', true); };
    image.src = url;
  });
  width.addEventListener('input', () => {
    generation++; discardResult(); const value = Number(width.value);
    if (value > 0 && Number.isInteger(value)) height.value = String(Math.max(1, Math.round(value / aspect)));
    message('image-status', '');
  });
  height.addEventListener('input', () => {
    generation++; discardResult(); const value = Number(height.value);
    if (value > 0 && Number.isInteger(value)) width.value = String(Math.max(1, Math.round(value * aspect)));
    message('image-status', '');
  });
  format.addEventListener('change', () => { generation++; discardResult(); quality.disabled = format.value === 'image/png'; message('image-status', ''); });
  quality.addEventListener('input', () => { generation++; discardResult(); $('quality-value').textContent = `${quality.value}%`; message('image-status', ''); });
  convert.addEventListener('click', () => {
    if (!source || !originalFile) return;
    const w = Number(width.value); const h = Number(height.value);
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 8192 || h > 8192 || w * h > 24000000) {
      message('image-status', 'Choose dimensions from 1 to 8,192 pixels, with no more than 24 megapixels total.', true); return;
    }
    const token = ++generation; discardResult(); convert.disabled = true; message('image-status', 'Processing image…');
    try {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image processing is unavailable in this browser.');
      if (format.value === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, w, h); }
      context.drawImage(source, 0, 0, w, h);
      const requestedType = format.value;
      canvas.toBlob(blob => {
        if (token !== generation) { convert.disabled = !source; return; }
        convert.disabled = false;
        if (!blob) { message('image-status', 'Could not create this image. Try smaller dimensions.', true); return; }
        const actualType = allowed.includes(blob.type) ? blob.type : 'image/png';
        resultUrl = URL.createObjectURL(blob);
        const extension = actualType === 'image/jpeg' ? 'jpg' : actualType === 'image/webp' ? 'webp' : 'png';
        const basename = originalFile.name.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
        download.href = resultUrl; download.download = `${basename}-yorphives.${extension}`; download.hidden = false;
        $('image-preview').src = resultUrl; result.hidden = false;
        const change = Math.round((1 - blob.size / originalFile.size) * 100);
        $('image-result-meta').textContent = `${w} × ${h} px · ${readableSize(blob.size)}${change > 0 ? ` · ${change}% smaller than the original` : change < 0 ? ` · ${Math.abs(change)}% larger than the original` : ' · about the same size as the original'}`;
        message('image-status', actualType !== requestedType ? 'Your browser used PNG because the selected format is unavailable. Your image is ready.' : 'Your image is ready to download.');
      }, requestedType, Number(quality.value) / 100);
    } catch (error) { convert.disabled = false; message('image-status', error.message || 'Could not process this image.', true); }
  });
}
