// The regular expression runs only in a worker that the caller can terminate.
function execute({ pattern, flags, text }) {
  if (typeof pattern !== 'string' || pattern.length > 500 || typeof text !== 'string' || text.length > 100000) throw new Error('Use a pattern under 500 characters and text under 100,000 characters.');
  if (!/^[gimsu]*$/.test(flags) || new Set(flags).size !== flags.length) throw new Error('Flags can include g, i, m, s, and u once each.');
  const expression = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  const matches = [];
  for (const match of text.matchAll(expression)) {
    matches.push({ index: match.index, value: match[0].slice(0, 300), groups: match.slice(1, 11).map(value => value === undefined ? null : value.slice(0, 300)) });
    if (matches.length >= 100) break;
  }
  return matches;
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = event => { try { self.postMessage({ matches: execute(event.data) }); } catch (error) { self.postMessage({ error: error.message }); } };
}
export { execute };
