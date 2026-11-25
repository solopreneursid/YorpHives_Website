import test from 'node:test';import assert from 'node:assert/strict';import {assertProductionReady} from '../engine/release-gate.mjs';
test('current prototype cannot enter production',()=>assert.throws(()=>assertProductionReady()));
test('missing country evidence fails closed',()=>assert.throws(()=>assertProductionReady({schemaVersion:1,releaseMode:'production',countries:{}})));
