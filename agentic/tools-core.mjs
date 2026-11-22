/**
 * YorpHives public, stateless deterministic tool ABI v1.
 * Provider-neutral ES module: no network, DB, secrets, filesystem or models.
 * Inputs are bounded; callers must not submit private documents or secrets.
 */
export class ToolInputError extends Error {
 constructor(code='invalid-input'){super(code);this.name='ToolInputError';}
}
const str=(max)=>({type:'string',maxLength:max});
const num=(min,max)=>({type:'number',minimum:min,maximum:max});
const obj=(properties,required)=>({type:'object',additionalProperties:false,properties,required});
export const PUBLIC_TOOLS=Object.freeze([
 {id:'word_count',title:'Count words and characters',description:'Count words, characters and lines in short text. No storage or AI inference.',
  inputSchema:obj({text:str(2000)},['text'])},
 {id:'slugify',title:'Create a URL slug',description:'Turn a short title into a lowercase, hyphenated URL slug.',
  inputSchema:obj({text:str(200)},['text'])},
 {id:'case_convert',title:'Change text case',description:'Convert short text to uppercase, lowercase or title case.',
  inputSchema:obj({text:str(1200),mode:{type:'string',enum:['upper','lower','title']}},['text','mode'])},
 {id:'percentage',title:'Calculate a percentage',description:'Calculate a percentage of a number with bounded numeric inputs.',
  inputSchema:obj({value:num(-1000000000,1000000000),percent:num(-10000,10000)},['value','percent'])},
 {id:'discount',title:'Calculate a discount',description:'Calculate savings and final price for a percentage discount.',
  inputSchema:obj({price:num(0,1000000000),percent:num(0,100)},['price','percent'])}
].map(x=>Object.freeze({...x,inputSchema:Object.freeze(x.inputSchema)})));
// The ONLY canonical public-page-to-stateless-operation mapping. Never infer
// executability from a generic catalog entry or a similarly named page.
export const PUBLIC_TOOL_PAGES=Object.freeze({
 'tools/word-counter/':'word_count',
 'tools/slug-generator/':'slugify',
 'tools/case-converter/':'case_convert',
 'tools/percentage-calculator/':'percentage',
 'tools/discount-calculator/':'discount'
});
const known=new Map(PUBLIC_TOOLS.map(x=>[x.id,x]));
if(new Set(Object.values(PUBLIC_TOOL_PAGES)).size!==PUBLIC_TOOLS.length||
 Object.values(PUBLIC_TOOL_PAGES).some(id=>!known.has(id)))
 throw Error('Callable page registry does not match approved tools.');
const round=x=>Math.round((x+Number.EPSILON)*1000000)/1000000;
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function validate(schema,input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
  Object.getPrototypeOf(input)!==Object.prototype)throw new ToolInputError();
 if(Object.keys(input).length>4)throw new ToolInputError('too-many-fields');
 for(const key of Object.keys(input)){
  if(!has(schema.properties,key))throw new ToolInputError('unknown-field');
  const rule=schema.properties[key],value=input[key];
  if(rule.type==='string'&&(typeof value!=='string'||value.length>rule.maxLength||
      (rule.enum&&!rule.enum.includes(value))))throw new ToolInputError('invalid-field');
  if(rule.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)||
      value<rule.minimum||value>rule.maximum))throw new ToolInputError('invalid-field');
 }
 for(const key of schema.required)if(!has(input,key))throw new ToolInputError('missing-field');
 return input;
}
export function publicToolDefinition(id){return known.get(id)||null;}
export function invokePublicTool(id,input){
 const item=known.get(id);
 if(!item)throw new ToolInputError('unknown-tool');
 const x=validate(item.inputSchema,input);
 switch(id){
  case 'word_count':{
   const words=[...new Intl.Segmenter(undefined,{granularity:'word'}).segment(x.text)].filter(x=>x.isWordLike);
   return {words:words.length,characters:[...x.text].length,lines:x.text===''?0:x.text.split(/\r\n|\n|\r/).length};
  }
  case 'slugify':{
   const slug=x.text.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,100).replace(/-+$/,'');
   return {slug};
  }
  case 'case_convert':{
   const result=x.mode==='upper'?x.text.toLocaleUpperCase('en-US'):
    x.mode==='lower'?x.text.toLocaleLowerCase('en-US'):
    Array.from(new Intl.Segmenter(undefined,{granularity:'word'}).segment(x.text.toLocaleLowerCase('en-US')),
     x=>x.isWordLike?x.segment.replace(/\p{L}/u,t=>t.toLocaleUpperCase('en-US')):x.segment).join('');
   return {text:result};
  }
  case 'percentage':return {result:round(x.value*x.percent/100)};
  case 'discount':{
   const savings=round(x.price*x.percent/100);
   return {savings,finalPrice:round(x.price-savings)};
  }
  default:throw new ToolInputError('unknown-tool');
 }
}
