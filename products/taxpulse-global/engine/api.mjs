import {TaxEnginePrimitives as P} from './primitives.mjs';
const num=(v,max=1e9)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw Error('Invalid numeric input');return v};
const rate=v=>num(v,1);
const obj=v=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected object');return v};
const rows=(v,fn)=>{if(!Array.isArray(v)||v.length<1||v.length>64)throw Error('Invalid tiers');return v.map(x=>fn(obj(x)))};
export function calculate(b){obj(b);const x=obj(b.parameters);let result;switch(b.primitive){
case 'progressive_brackets':{let prev=0;const brackets=rows(x.brackets,t=>{const min=num(t.min),max=t.max===null?null:num(t.max);if(min!==prev||(max!==null&&max<=min))throw Error('Invalid bracket boundaries');prev=max;return {min,max,rate:rate(t.rate)}});if(brackets.at(-1).max!==null)throw Error('Final bracket must be open');result=P.progressive_brackets(num(x.taxableBase),brackets);break}
case 'capped_percentage':result=P.capped_percentage(num(x.grossWage),rows(x.rules,t=>{const floor=num(t.min_Floor??0),cap=t.annual_cap===null?null:num(t.annual_cap);if(cap!==null&&cap<floor)throw Error('Invalid cap');return {name:'Contribution',min_Floor:floor,annual_cap:cap,rate:rate(t.rate)}}));break;
case 'flat_or_slab_lookup':{const mode=x.mode??'exclusive';if(!['inclusive','exclusive'].includes(mode))throw Error('Invalid mode');if(mode==='inclusive'&&((x.exemption??0)!==0||(x.surtaxOrCessRate??0)!==0))throw Error('Inclusive exemption or surtax unsupported');result=P.flat_or_slab_lookup({amount:num(x.amount),rate:rate(x.rate),exemption:num(x.exemption??0),surtaxOrCessRate:rate(x.surtaxOrCessRate??0),mode});break}
case 'treaty_offset':if(x.applyTreaty!==undefined&&typeof x.applyTreaty!=='boolean')throw Error('Invalid treaty flag');result=P.treaty_offset({grossIncome:num(x.grossIncome),sourceDomesticWhtRate:rate(x.sourceDomesticWhtRate),treatyWhtRate:rate(x.treatyWhtRate),residenceTaxRate:rate(x.residenceTaxRate),applyTreaty:x.applyTreaty??true});break;
default:throw Error('Unsupported primitive')}
return {sampleOnly:true,taxRulesVerified:false,result}}
