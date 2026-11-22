// Decimal arithmetic for invoices. Values are parsed as integers and scales,
// so binary floating-point cannot change a displayed line or subtotal.
const power=n=>10n**BigInt(n);
function decimal(value,label,max,maxDecimals=6){
 const raw=String(value??'').trim();
 if(raw.length>32||!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw))throw Error('Enter a valid '+label+' as a decimal number.');
 const [wholeRaw,fractionRaw='']=raw.split('.');
 if(fractionRaw.length>maxDecimals)throw Error('Use at most '+maxDecimals+' decimal places for '+label+'.');
 const whole=(wholeRaw||'0').replace(/^0+(?=\d)/,''),number=Number(raw);
 if(!Number.isFinite(number)||number>max)throw Error('Enter a valid '+label+'.');
 return {units:BigInt(whole+fractionRaw),scale:fractionRaw.length,
  text:whole+(fractionRaw?'.'+fractionRaw:'')};
}
function roundTo(units,fromScale,toScale){
 if(fromScale<=toScale)return units*power(toScale-fromScale);
 const divisor=power(fromScale-toScale);
 return (units+divisor/2n)/divisor;
}
function decimalText(value,minPlaces=0){
 const [whole,fraction='']=value.text.split('.');
 const trimmed=fraction.replace(/0+$/,'').padEnd(minPlaces,'0');
 return whole+(trimmed?'.'+trimmed:'');
}
export function formatMinor(value,places){
 const digits=value.toString().padStart(places+1,'0');
 return places?digits.slice(0,-places)+'.'+digits.slice(-places):digits;
}
export function calculateInvoice(lines,taxValue,currency){
 if(!/^[A-Za-z]{2,5}$/.test(currency))throw Error('Use a 2–5-letter currency code.');
 let places=2;
 if(currency.length===3){
  try{places=new Intl.NumberFormat('en',{style:'currency',currency:currency.toUpperCase()}).resolvedOptions().maximumFractionDigits}catch{}
 }
 if(!Number.isInteger(places)||places<0||places>3)throw Error('This currency format is not supported.');
 const tax=decimal(taxValue??0,'tax percentage',100);
 const items=lines.map((line,index)=>{
  const parts=line.split('|').map(x=>x.trim());
  if(parts.length!==3||!parts[0]||parts[0].length>68)throw Error('Item '+(index+1)+' must use: Description | Quantity | Unit price.');
  const quantity=decimal(parts[1],'quantity',100000),price=decimal(parts[2],'unit price',10000000);
  if(quantity.units===0n)throw Error('Quantity must be greater than zero.');
  const minor=roundTo(quantity.units*price.units,quantity.scale+price.scale,places);
  return {label:parts[0],quantity:decimalText(quantity),price:decimalText(price,places),
   minor,total:formatMinor(minor,places)};
 });
 const subtotal=items.reduce((sum,item)=>sum+item.minor,0n);
 const taxMinor=roundTo(subtotal*tax.units,tax.scale+2,0);
 const total=subtotal+taxMinor;
 if(total>1000000000000n*power(places))throw Error('Invoice exceeds the supported amount.');
 return {items,subtotal:formatMinor(subtotal,places),tax:formatMinor(taxMinor,places),
  total:formatMinor(total,places),taxPercent:decimalText(tax),currency:currency.toUpperCase(),places};
}
