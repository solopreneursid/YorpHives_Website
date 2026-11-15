import { runUtility } from './utility-core.mjs';
const form = document.getElementById('utility-form');
const output = document.getElementById('utility-output');
const result = document.getElementById('utility-result');
const preview = document.getElementById('utility-preview');
const status = document.getElementById('utility-status');
const button = document.getElementById('utility-run');
let revision = 0;
let submittedInputs = null;
function setStatus(text, isError = false) { status.textContent = text; status.classList.toggle('error', isError); }
function clearResult() { revision++; submittedInputs = null; output.value = ''; result.hidden = true; preview.hidden = true; preview.replaceChildren(); setStatus(''); }
form.addEventListener('input', event => {
  if (event.target === output) return;
  // A late input event for the values already submitted must not cancel the result.
  if (submittedInputs !== null && JSON.stringify([...new FormData(form)]) === submittedInputs) return;
  clearResult();
});
form.addEventListener('reset', clearResult);
form.addEventListener('submit', async event => {
  event.preventDefault();
  const token = ++revision; const entries = [...new FormData(form)]; const data = Object.fromEntries(entries);
  submittedInputs = JSON.stringify(entries);
  button.disabled = true; setStatus('Working…');
  try {
    const value = await runUtility(document.body.dataset.utility, data);
    if (token !== revision) return;
    output.value = value.text; result.hidden = false; preview.replaceChildren();
    if (value.preview?.colors) {
      for (const color of value.preview.colors) {
        const item = document.createElement('div'); item.className = 'utility-swatch';
        const swatch = document.createElement('span'); swatch.className = 'utility-swatch-color'; swatch.style.backgroundColor = color;
        const label = document.createElement('span'); label.textContent = color;
        item.append(swatch, label); preview.append(item);
      }
      preview.hidden = false;
    } else if (value.preview?.qrSvg) {
      const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(value.preview.qrSvg);
      const image = document.createElement('img'); image.className = 'utility-qr'; image.alt = 'Generated QR code'; image.src = uri;
      const download = document.createElement('a'); download.className = 'tool-btn'; download.href = uri;
      download.download = 'yorphives-qr-code.svg'; download.textContent = 'Download QR code';
      preview.append(image, download); preview.hidden = false;
    } else if (value.preview?.boxShadow) {
      const sample = document.createElement('div'); sample.className = 'utility-shadow'; sample.style.boxShadow = value.preview.boxShadow;
      sample.setAttribute('aria-label', 'Box shadow preview'); preview.append(sample); preview.hidden = false;
    } else if (value.preview?.gradient) {
      const swatch = document.createElement('div'); swatch.className = 'utility-gradient'; swatch.style.background = value.preview.gradient;
      preview.append(swatch); preview.hidden = false;
    } else preview.hidden = true;
    setStatus('Your result is ready.');
  } catch (error) {
    if (token !== revision) return;
    output.value = ''; result.hidden = true; setStatus(error.message || 'Could not process this input.', true);
  } finally { button.disabled = false; }
});
document.getElementById('utility-copy').addEventListener('click', async () => {
  try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(output.value); setStatus('Copied to clipboard.'); }
  catch (_) { output.focus(); output.select(); setStatus('Select and copy the result using your keyboard.'); }
});
// Keep native form submission disabled until all local handlers are attached.
button.textContent = button.dataset.readyLabel || 'Run tool';
button.disabled = false;
