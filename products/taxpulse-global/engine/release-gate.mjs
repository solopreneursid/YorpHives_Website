import { readFileSync } from 'node:fs';
import { catalog } from './country.mjs';

const manifest = JSON.parse(readFileSync(new URL('../rules/manifest.json', import.meta.url), 'utf8'));
const REQUIRED_COUNTRIES = Object.freeze(['IN', 'US', 'GB', 'DE', 'AE', 'CA', 'AU', 'SG']);
const REQUIRED_MODULES = Object.freeze(['pit', 'payroll', 'capgains', 'vat', 'corporate', 'property', 'dtaa']);
const OFFICIAL_HOSTS = Object.freeze({
  IN: ['incometax.gov.in', 'gov.in'],
  US: ['irs.gov', 'treasury.gov'],
  GB: ['gov.uk', 'legislation.gov.uk'],
  DE: ['bundesfinanzministerium.de', 'gesetze-im-internet.de'],
  AE: ['tax.gov.ae', 'mof.gov.ae', 'u.ae'],
  CA: ['canada.ca', 'cra-arc.gc.ca'],
  AU: ['ato.gov.au', 'treasury.gov.au'],
  SG: ['iras.gov.sg', 'mof.gov.sg']
});

function officialUrl(value, country) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username && !url.password &&
      OFFICIAL_HOSTS[country].some(host => url.hostname === host || url.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
}

function validEvidence(e, country, module) {
  if (!e || typeof e !== 'object' || Array.isArray(e) ||
      e.module !== module || e.status !== 'approved' ||
      !officialUrl(e.officialSourceUrl, country) ||
      typeof e.reviewer !== 'string' || e.reviewer.trim().length < 3 ||
      typeof e.reviewedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(e.reviewedAt)) return false;
  const reviewedAt = Date.parse(e.reviewedAt + 'T00:00:00Z');
  if (!Number.isFinite(reviewedAt) || reviewedAt > Date.now() ||
      new Date(reviewedAt).toISOString().slice(0, 10) !== e.reviewedAt) return false;

  // These are audit records, not an assertion that two equal values establish legal correctness.
  // The release process must still independently review source documents and test provenance.
  if (!Array.isArray(e.testCases) || e.testCases.length < 2) return false;
  const ids = new Set();
  for (const row of e.testCases) {
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id) ||
        typeof row.expected !== 'number' || !Number.isFinite(row.expected) ||
        typeof row.actual !== 'number' || !Number.isFinite(row.actual) ||
        Math.abs(row.expected - row.actual) > 0.005) return false;
    ids.add(row.id);
  }
  return true;
}

export function assertProductionReady(m = manifest) {
  if (!m || m.schemaVersion !== 1 || m.releaseMode !== 'production') {
    throw Error('Production release not authorized');
  }

  // Manifest flags alone cannot authorize a country that is absent from the API engine.
  const implemented = new Set(catalog().countries.map(({ code }) => code));
  for (const country of REQUIRED_COUNTRIES) {
    if (!implemented.has(country)) throw Error('Backend country not implemented: ' + country);
    const r = m.countries?.[country];
    if (!r || r.taxYear !== '2026' || r.verification !== 'verified' ||
        r.productionEnabled !== true || !Array.isArray(r.evidence)) {
      throw Error('Unverified country: ' + country);
    }
    for (const module of REQUIRED_MODULES) {
      if (!r.evidence.some(e => validEvidence(e, country, module))) {
        throw Error('Missing official-source evidence or independent checks: ' + country + '/' + module);
      }
    }
  }
  return true;
}

if (process.argv.includes('--production')) assertProductionReady();
