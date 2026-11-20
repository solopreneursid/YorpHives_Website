// Pages preview parity with the Workers static-asset agent registry.
// Read-only public schema, no credentials, write operations or inference.
import {agentGet} from '../../../../agentic/discovery.mjs';
export const onRequestGet=({request,env})=>agentGet(request,env,new URL(request.url).pathname);
export const onRequestHead=onRequestGet;
