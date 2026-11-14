/** Format valid JSON without changing the text of numbers or strings. */
export function formatJson(jsonText, indent = 2) {
  if (typeof jsonText !== 'string') throw new TypeError('JSON input must be text.');
  if (![0, 2, 4].includes(indent)) throw new RangeError('Indent must be 0, 2, or 4.');
  JSON.parse(jsonText); // Native validation; output uses original tokens, preserving large numbers.
  const tokens = [];
  let i = 0;
  while (i < jsonText.length) {
    const character = jsonText[i];
    if (/\s/.test(character)) { i++; continue; }
    if ('{}[],:'.includes(character)) { tokens.push(character); i++; continue; }
    const start = i;
    if (character === '"') {
      i++;
      while (i < jsonText.length) {
        if (jsonText[i] === '\\') { i += 2; continue; }
        if (jsonText[i++] === '"') break;
      }
    } else {
      while (i < jsonText.length && !/[\s{}\[\],:]/.test(jsonText[i])) i++;
    }
    tokens.push(jsonText.slice(start, i));
  }
  if (indent === 0) return tokens.join('');
  let output = '';
  let level = 0;
  const newline = () => `\n${' '.repeat(level * indent)}`;
  for (let n = 0; n < tokens.length; n++) {
    const token = tokens[n];
    if (token === '{' || token === '[') {
      const closer = token === '{' ? '}' : ']';
      if (tokens[n + 1] === closer) { output += token + closer; n++; }
      else { output += token; level++; output += newline(); }
    } else if (token === '}' || token === ']') {
      level--; output += newline() + token;
    } else if (token === ',') output += ',' + newline();
    else if (token === ':') output += ': ';
    else output += token;
  }
  return output;
}

/** Add UTM fields to an HTTP(S) URL, preserving other query parameters and its fragment. */
export function buildCampaignUrl(baseUrl, parameters = {}) {
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) throw new TypeError('Enter a website URL.');
  let url;
  try { url = new URL(baseUrl.trim()); } catch { throw new TypeError('Enter a complete URL, such as https://example.com/page.'); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new TypeError('Use an http:// or https:// URL.');
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) throw new TypeError('Campaign parameters must be an object.');
  for (const key of ['source', 'medium', 'campaign', 'term', 'content']) {
    const value = parameters[key];
    if (value === undefined || value === null || String(value).trim() === '') continue;
    url.searchParams.set(`utm_${key}`, String(value).trim());
  }
  return url.toString();
}
