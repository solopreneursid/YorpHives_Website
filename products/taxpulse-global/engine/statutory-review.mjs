import {snapshotBytes} from './rule-snapshot.mjs';
const hex=/^[a-f0-9]{64}$/;
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const bytes=s=>Uint8Array.from(s.match(/../g),v=>parseInt(v,16));
const iso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
export function statutoryReviewPayload(envelope,reviewerId,reviewedAt){
 if(!hex.test(envelope?.digest||'')||!hex.test(envelope?.payload?.engineFingerprint||'')||!Number.isSafeInteger(envelope?.payload?.sequence)||envelope.payload.sequence<1||envelope.payload.mode!=='preview'||typeof reviewerId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(reviewerId)||!iso(reviewedAt))throw Error('Invalid statutory review subject');
 return {schemaVersion:1,purpose:'taxpulse-statutory-preview-review',decision:'approved',reviewerId,reviewedAt,snapshotDigest:envelope.digest,engineFingerprint:envelope.payload.engineFingerprint,sequence:envelope.payload.sequence};
}
export async function verifyStatutoryReview(envelope,review,{publicKeyHex,reviewerPublicKeyHex,reviewerId,now=new Date()}){
 if(!hex.test(publicKeyHex||'')||!hex.test(reviewerPublicKeyHex||'')||publicKeyHex===reviewerPublicKeyHex)throw Error('Independent reviewer key required');
 if(!exact(review,['payload','signature'])||typeof review.signature!=='string'||! /^[a-f0-9]{128}$/.test(review.signature)||!exact(review.payload,['schemaVersion','purpose','decision','reviewerId','reviewedAt','snapshotDigest','engineFingerprint','sequence']))throw Error('Missing statutory review signature');
 const expected=statutoryReviewPayload(envelope,reviewerId,review.payload.reviewedAt);
 const signed=snapshotBytes(review.payload),required=snapshotBytes(expected);
 if(signed.length!==required.length||signed.some((b,i)=>b!==required[i]))throw Error('Review subject mismatch');
 if(Date.parse(expected.reviewedAt)>now.getTime()||Date.parse(expected.reviewedAt)<Date.parse(envelope.payload.issuedAt)||Date.parse(expected.reviewedAt)>=Date.parse(envelope.payload.expiresAt))throw Error('Review outside package validity');
 const key=await crypto.subtle.importKey('raw',bytes(reviewerPublicKeyHex),'Ed25519',false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',key,bytes(review.signature),signed))throw Error('Invalid statutory review signature');
 return expected;
}
