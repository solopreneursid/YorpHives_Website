import { countryCalculate, catalog } from './engine/country.mjs';
import { compareIncomeScenarios } from './engine/scenarios.mjs';
import { assessTaxableIncome } from './engine/taxable-income.mjs';
import { createReceipt, verifyReceipt } from './engine/proof.mjs';
import engineFingerprint from './engine/fingerprint.mjs';
import manifest from './engine/manifest.mjs';

const $ = id => document.getElementById(id);
const countries = new Map(catalog().countries.map(country => [country.code, country]));
const allCountries = {IN:'India',US:'United States',GB:'United Kingdom',DE:'Germany',AE:'United Arab Emirates',CA:'Canada',AU:'Australia',SG:'Singapore'};
let lastResult = null, lastAssessment = null, proofRequest = 0;

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
  if(country==='IN'&&grossSalary>5075000)throw new RangeError('India salary above INR 50.75 lakh is not supported yet because surcharge rules are under review.');
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
    lastResult={kind:'salary',input};
    $('tax-result').hidden=false;$('tax-result').focus();
  } catch (error) { $('error').textContent=error instanceof RangeError&&$('country').value==='IN'?'India examples above INR 50.75 lakh annual salary are not supported yet; surcharge rules need review.':'Please check the salary and tax status. This example could not be calculated.'; }
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
  } catch (error) { $('compare-error').textContent=error instanceof RangeError&&$('country').value==='IN'?'India examples above INR 50.75 lakh annual salary are not supported yet; surcharge rules need review.':'Enter valid example salaries and tax status in both forms.'; }
});
$('clear-button').addEventListener('click',()=>{$('tax-form').reset();$('compare-form').reset();countryChanged();});
async function downloadReceipt(record,button,error){
 if(!record)return;
 button.disabled=true;
 try{
  const receipt=await createReceipt({...record,engineFingerprint});
  const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='taxpulse-example.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch{error.textContent='Could not create a report. Use a secure browser and try again.';}
 finally{button.disabled=false;}
}
$('download').addEventListener('click',()=>downloadReceipt(lastResult,$('download'),$('error')));
$('assessment-download').addEventListener('click',()=>downloadReceipt(lastAssessment,$('assessment-download'),$('assessment-error')));
function clearAssessment(){lastAssessment=null;$('assessment-result').hidden=true;$('assessment-error').textContent='';}
function assessmentChanged(){
 const canada=$('assessment-country').value==='CA';
 $('assessment-type-field').hidden=canada;$('assessment-type').disabled=canada;
 for(const id of ['net-income','canada-resident']){$(id+'-field').hidden=!canada;$(id).disabled=!canada;$(id).value='';}
 $('taxable-amount').value='';$('assessment-currency').textContent=canada?'(CAD)':'(EUR)';
 $('assessment-help').textContent=canada?'Canadian federal tax after the basic personal credit only. Excludes provincial tax, Quebec abatement, payroll and other credits. Net income must be at least taxable income.':'German ordinary income tax only. Excludes church tax, solidarity surcharge and payroll contributions.';
 clearAssessment();
}
$('assessment-country').addEventListener('change',assessmentChanged);
$('assessment-form').addEventListener('input',clearAssessment);
$('assessment-form').addEventListener('submit',event=>{
 event.preventDefault();clearAssessment();
 try{
  const country=$('assessment-country').value;
  const input={country,taxYear:'2026',taxableIncome:$('taxable-amount').valueAsNumber,...(country==='DE'?{assessment:$('assessment-type').value}:{netIncome:$('net-income').valueAsNumber,fullYearResident:$('canada-resident').value==='yes'})};
  const r=assessTaxableIncome(input),f=v=>money(v,r.currency);
  $('assessment-result-label').textContent=country==='CA'?'Federal income tax after basic personal credit':'Ordinary German income tax';
  $('assessment-tax').textContent=f(r.incomeTax);
  const rows=country==='CA'?[['Tax before credits',f(r.taxBeforeCredits)],['Basic personal amount',f(r.basicPersonalAmount)],['Credit applied',f(r.basicPersonalCredit)]]:[['Taxable income per assessment unit',f(r.unitTaxableIncome)],['Tax zone',r.tariffZone]];
  $('assessment-breakdown').replaceChildren();
  for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('assessment-breakdown').append(dt,dd);}
  $('assessment-scope').textContent=r.warnings.join(' ')+' Unverified example only.';
  lastAssessment={kind:'taxable-income',input};$('assessment-result').hidden=false;$('assessment-result').focus();
 }catch{$('assessment-error').textContent='Check the amounts and tax status. Only full-year Canadian residents and eligible German assessment types are supported.';}
});
$('proof-file').addEventListener('change',async()=>{
 const request=++proofRequest,file=$('proof-file').files[0];
 $('proof-status').textContent='';
 if(!file)return;
 try{
  if(file.size>65536)throw new Error('Report too large');
  const r=await verifyReceipt(JSON.parse(await file.text()),engineFingerprint);
  if(request!==proofRequest)return;
  $('proof-status').textContent=!r.integrity?'The report contents do not match its fingerprint.':!r.sameEngine?'The fingerprint matches, but this is a different engine version. We cannot replay it here.':r.reproduced?'The fingerprint matches and the example calculation was reproduced. This is not legal verification or a digital signature.':'The fingerprint matches, but the calculation could not be reproduced.';
 }catch{if(request===proofRequest)$('proof-status').textContent='This file is not a supported TaxPulse example report.';}
});
assessmentChanged();
for(const [code,name] of Object.entries(allCountries)){
  const item=document.createElement('li');
  const state=manifest.countries[code];
  item.textContent=name+' — '+(countries.has(code)?'Salary example connected':['DE','CA'].includes(code)?'Taxable-income example connected (limited scope)':'Not available in simple calculator')+'; '+(state?.verification==='verified'&&state?.productionEnabled===true?'marked verified in manifest':'tax rules not verified');
  $('country-status').append(item);
}
countryChanged();
