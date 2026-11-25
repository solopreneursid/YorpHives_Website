import { countryCalculate, catalog } from './engine/country.mjs';
import { compareIncomeScenarios } from './engine/scenarios.mjs';
import manifest from './engine/manifest.mjs';

const $ = id => document.getElementById(id);
const countries = new Map(catalog().countries.map(country => [country.code, country]));
const allCountries = {IN:'India',US:'United States',GB:'United Kingdom',DE:'Germany',AE:'United Arab Emirates',CA:'Canada',AU:'Australia',SG:'Singapore'};
let lastResult = null;

function money(value, currency) {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en', {style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:2}).format(value);
}
function percent(value) {
  return new Intl.NumberFormat('en',{style:'percent',maximumFractionDigits:2}).format(value);
}
function clearResults() {
  lastResult = null;
  $('tax-result').hidden = true;
  $('compare-result').hidden = true;
  $('error').textContent = '';
  $('compare-error').textContent = '';
}
function countryChanged() {
  const selected = countries.get($('country').value);
  $('year').textContent = selected.taxYearLabel;
  $('currency').textContent = '('+selected.currency+')';
  $('second-currency').textContent = '('+selected.currency+')';
  $('residency-field').hidden = selected.code !== 'IN';
  $('resident').disabled = selected.code !== 'IN';
  $('filing-field').hidden = selected.code !== 'US';
  $('filing').disabled = selected.code !== 'US';
  $('salary').value = '';
  $('second-salary').value = '';
  $('salary').placeholder = selected.code === 'IN' ? 'Example: 1200000' : 'Example: 60000';
  $('second-salary').placeholder = selected.code === 'IN' ? 'Example: 1500000' : 'Example: 75000';
  clearResults();
}
function inputs() {
  const country = $('country').value;
  const selected = countries.get(country);
  const grossSalary = $('salary').valueAsNumber;
  if (!$('tax-form').reportValidity() || !Number.isFinite(grossSalary)) throw new Error('Complete the salary and tax status above.');
  const parameters = {grossSalary};
  if (country === 'IN') {
    if (!['true','false'].includes($('resident').value)) throw new Error('Choose whether the example is an Indian tax resident.');
    parameters.residentIndividual = $('resident').value === 'true';
  }
  if (country === 'US') parameters.filingStatus = $('filing').value;
  return {country,taxYear:selected.year,parameters};
}
function addRow(label,value) {
  const dt=document.createElement('dt'), dd=document.createElement('dd');
  dt.textContent=label;dd.textContent=value;$('breakdown').append(dt,dd);
}
$('country').addEventListener('change',countryChanged);
$('tax-form').addEventListener('input',clearResults);
$('compare-form').addEventListener('input',()=>{$('compare-result').hidden=true;$('compare-error').textContent='';});
$('tax-form').addEventListener('submit',event=>{
  event.preventDefault();clearResults();
  try {
    const input=inputs();
    const response=countryCalculate({...input,module:'pit'});
    const result=response.result, format=value=>money(value,response.currency);
    $('income-tax').textContent=format(result.incomeTax);
    $('after-tax').textContent=format(result.netAfterIncomeTax);
    $('tax-rate').textContent=percent(result.effectiveIncomeTaxRate);
    $('breakdown').replaceChildren();
    for(const [label,value] of [
      ['Salary before tax',result.gross],
      ['Standard allowance or deduction',result.standardDeductionApplied],
      ['Income used to calculate tax',result.taxableIncome],
      ['Tax before relief',result.taxBeforeRebate],
      ['Total rebate and relief',result.rebateApplied],
      ['Additional tax (cess)',result.cessAmount],
      ['Final sample income tax',result.incomeTax]
    ]) addRow(label,format(value));
    $('scope').textContent=response.warnings.join(' ');
    lastResult={type:'TaxPulse example breakdown',input,response,verified:false,warning:'Fictional inputs only. Not a signed proof or filing document.'};
    $('tax-result').hidden=false;$('tax-result').focus();
  } catch { $('error').textContent='Please check the salary and tax status. This example could not be calculated.'; }
});
$('compare-form').addEventListener('submit',event=>{
  event.preventDefault();$('compare-result').hidden=true;$('compare-error').textContent='';
  try {
    const input=inputs();
    const r=compareIncomeScenarios({...input,secondGrossSalary:$('second-salary').valueAsNumber});
    $('gross-change').textContent=money(r.grossChange,r.currency);
    $('tax-change').textContent=money(r.taxChange,r.currency);
    $('net-change').textContent=money(r.afterIncomeTaxChange,r.currency);
    $('change-rate').textContent=r.effectiveTaxOnChange===null?'Both salaries are the same.':'Share of the salary difference due to income tax: '+percent(r.effectiveTaxOnChange)+'.';
    if(r.grossChange>0&&r.afterIncomeTaxChange<0){
      $('change-rate').textContent+=' In this example, the higher salary leaves less money after income tax. This can happen near a tax relief threshold. The rules are not verified.';
    }
    $('compare-result').hidden=false;$('compare-result').focus();
  } catch { $('compare-error').textContent='Enter valid example salaries and tax status in both forms.'; }
});
$('reset').addEventListener('click',()=>{$('tax-form').reset();$('compare-form').reset();countryChanged();});
$('download').addEventListener('click',()=>{
  if(!lastResult)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(lastResult,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='taxpulse-example.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
for(const [code,name] of Object.entries(allCountries)){
  const item=document.createElement('li');
  const state=manifest.countries[code];
  item.textContent=name+' — '+(countries.has(code)?'Example calculator connected':'Not available in simple calculator')+'; '+(state?.verification==='verified'&&state?.productionEnabled===true?'marked verified in manifest':'tax rules not verified');
  $('country-status').append(item);
}
countryChanged();
