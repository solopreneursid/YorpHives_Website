import {publicReport} from '../../_lib/insights.mjs';
export const onRequestGet=publicReport;
export const onRequestPost=()=>new Response(null,{status:405,headers:{Allow:'GET'}});
