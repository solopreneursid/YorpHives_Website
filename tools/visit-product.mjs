// Approved standalone products can be apps, downloads or services.
// Store only their stable public identity, never inputs, files or account data.
import {recordRecent} from './personal-space.mjs';
const id=document.querySelector('script[src="/tools/visit-product.mjs"][data-product-id]')?.dataset.productId;
try{if(id)recordRecent(window.localStorage,'products',id)}catch{}
