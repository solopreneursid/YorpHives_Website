import { parentPort } from 'node:worker_threads';
import { execute } from './regex-worker.mjs';
parentPort.on('message', data => { try { parentPort.postMessage({ matches: execute(data) }); } catch (error) { parentPort.postMessage({ error: error.message }); } });
