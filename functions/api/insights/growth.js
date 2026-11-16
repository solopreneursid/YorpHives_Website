import {growthReport} from '../../_lib/growth.mjs';
export const onRequestGet=growthReport;
export const onRequestPost=()=>new Response(null,{status:405,headers:{Allow:'GET'}});
