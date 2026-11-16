import {collect} from '../../_lib/insights.mjs';
export const onRequestPost=collect;
export const onRequestGet=()=>new Response(null,{status:405,headers:{Allow:'POST'}});
