import {agentGet} from '../../../../agentic/discovery.mjs';
export const onRequestGet=({request,env})=>agentGet(request,env,new URL(request.url).pathname);
export const onRequestHead=onRequestGet;
