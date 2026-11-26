import test from 'node:test';import assert from 'node:assert/strict';import {assertProductionReady} from '../engine/release-gate.mjs';
test('current prototype cannot enter production',()=>assert.throws(()=>assertProductionReady()));
test('missing country evidence fails closed',()=>assert.throws(()=>assertProductionReady({schemaVersion:1,releaseMode:'production',countries:{}})));

test('fabricated all-verified manifest cannot enable unimplemented backend countries', () => {
  const codes = ['IN', 'US', 'GB', 'DE', 'AE', 'CA', 'AU', 'SG'];
  const countries = Object.fromEntries(codes.map(code => [code, {
    taxYear: '2026', verification: 'verified', productionEnabled: true,
    evidence: ['unreviewed string evidence']
  }]));
  assert.throws(
    () => assertProductionReady({ schemaVersion: 1, releaseMode: 'production', countries }),
    /Backend country not implemented: DE/
  );
});
