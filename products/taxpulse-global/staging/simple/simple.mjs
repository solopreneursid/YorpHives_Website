import {negotiateSalary} from './engine/negotiation.mjs';
import {compareSalaryOffers} from './engine/salary-offers.mjs';
import {reverseSalary,automaticReverseSalary} from './engine/reverse-salary.mjs';
import { countryCalculate, catalog } from './engine/country.mjs';
import { compareIncomeScenarios } from './engine/scenarios.mjs';
import { assessTaxableIncome, compareIndiaRegimes, calculateCapitalGain, calculateRegionalTax, regionalTaxCatalog, calculateSalaryRemainder, calculateEmployeeContributions } from './engine/taxable-income.mjs';
import { createReceipt, verifyReceipt } from './engine/proof.mjs';
import engineFingerprint from './engine/fingerprint.mjs';
import manifest from './engine/manifest.mjs';

import { historicalRuleCatalog, compareHistoricalTax } from './engine/history.mjs';

const $ = id => document.getElementById(id);
const countries = new Map(catalog().countries.map(country => [country.code, country]));
const allCountries = {IN:'India',US:'United States',GB:'United Kingdom',DE:'Germany',AE:'United Arab Emirates',CA:'Canada',AU:'Australia',SG:'Singapore'};
let lastResult = null, lastAssessment = null, lastIndiaComparison = null, proofRequest = 0;

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
  } catch (error) { $('error').textContent=error instanceof RangeError&&$('country').value==='IN'?'Use the India old-versus-new comparison below for higher salaries, including surcharge.':'Please check the salary and tax status. This example could not be calculated.'; }
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
  } catch (error) { $('compare-error').textContent=error instanceof RangeError&&$('country').value==='IN'?'Use the India old-versus-new comparison below for higher salaries, including surcharge.':'Enter valid example salaries and tax status in both forms.'; }
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
const assessmentOptions={
 DE:{currency:'EUR',year:'Calendar year 2026',help:'German ordinary income tax only. Excludes church tax, solidarity surcharge and payroll contributions.'},
 CA:{currency:'CAD',year:'Calendar year 2026',help:'Federal tax after the basic personal credit only. Excludes provincial tax, Quebec abatement, payroll and other credits. Net income must be at least taxable income.'},
 AU:{currency:'AUD',year:'FY 2026–27 (July 2026 to June 2027)',help:'Resident income tax after the low-income tax offset only. Excludes Medicare levy, student debt, other offsets and payroll.',question:'Full-year Australian tax resident, eligible for the full tax-free threshold?'},
 SG:{currency:'SGD',year:'YA 2026 (income earned in 2025)',help:'Gross tax on chargeable income, before rebates and credits. Excludes CPF and relief eligibility. This is not tax on 2026 earnings.',question:'Singapore tax resident for YA 2026?'},
 AE:{currency:'AED',year:'Calendar year 2026',help:'UAE personal income tax on employee wages only. Business income, foreign taxes and social contributions are separate.',question:'Is this ordinary employee pay, not freelance or business income?'}
};
function assessmentChanged(){
 const country=$('assessment-country').value,config=assessmentOptions[country],canada=country==='CA';
 $('assessment-type-field').hidden=country!=='DE';$('assessment-type').disabled=country!=='DE';
 for(const id of ['net-income','canada-resident']){$(id+'-field').hidden=!canada;$(id).disabled=!canada;$(id).value='';}
 $('eligibility-field').hidden=!config.question;$('eligibility').disabled=!config.question;$('eligibility').value='';
 $('eligibility-label').textContent=config.question||'Eligible?';
 $('taxable-amount').value='';$('assessment-currency').textContent='('+config.currency+')';
 $('assessment-amount-label').textContent=country==='AE'?'Yearly employee wages':country==='SG'?'Yearly chargeable income':'Yearly taxable income';
 $('assessment-year').textContent=config.year;$('assessment-help').textContent=config.help;clearAssessment();
}
$('assessment-country').addEventListener('change',assessmentChanged);
$('assessment-form').addEventListener('input',clearAssessment);
$('assessment-form').addEventListener('submit',event=>{
 event.preventDefault();clearAssessment();
 try{
  const country=$('assessment-country').value;
  const value=$('taxable-amount').valueAsNumber,yes=$('eligibility').value==='yes';
  const input={country,taxYear:'2026',...(country==='AE'?{salaryIncome:value,employeeWagesOnly:yes}:{taxableIncome:value,...(country==='DE'?{assessment:$('assessment-type').value}:country==='CA'?{netIncome:$('net-income').valueAsNumber,fullYearResident:$('canada-resident').value==='yes'}:{residentEligible:yes})})};
  const r=assessTaxableIncome(input),f=v=>money(v,r.currency);
  $('assessment-result-label').textContent=({CA:'Federal income tax after basic personal credit',DE:'Ordinary German income tax',AU:'Income tax after low-income offset',SG:'Gross income tax before rebates',AE:'UAE income tax on employee wages'})[country];
  $('assessment-tax').textContent=f(r.incomeTax);
  const rows=country==='CA'?[['Tax before credits',f(r.taxBeforeCredits)],['Basic personal amount',f(r.basicPersonalAmount)],['Credit applied',f(r.basicPersonalCredit)]]:country==='DE'?[['Taxable income per assessment unit',f(r.unitTaxableIncome)],['Tax zone',r.tariffZone]]:country==='AE'?[['Employee wages',f(r.salaryIncome)],['UAE personal income tax',f(0)]]:[['Tax before offsets',f(r.taxBeforeCredits)],...(country==='AU'?[['Low-income tax offset applied',f(r.lowIncomeOffset)]]:[]),['Tax period',r.taxYearLabel]];
  $('assessment-breakdown').replaceChildren();
  for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('assessment-breakdown').append(dt,dd);}
  $('assessment-scope').textContent=r.warnings.join(' ')+' Unverified example only.';
  lastAssessment={kind:'taxable-income',input};$('assessment-result').hidden=false;$('assessment-result').focus();
 }catch{$('assessment-error').textContent='Check the amounts and confirm the eligibility question. This example does not support other tax statuses or income types.';}
});
function clearIndiaComparison(){
 lastIndiaComparison=null;$('india-regime-result').hidden=true;$('india-regime-error').textContent='';
}
$('india-regime-form').addEventListener('input',clearIndiaComparison);
$('india-regime-form').addEventListener('submit',event=>{
 event.preventDefault();clearIndiaComparison();
 try{
  const residence=$('india-resident').value;
  if(!['yes','no'].includes(residence))throw new Error('Choose tax residence');
  const input={country:'IN',taxYear:'2026',grossSalary:$('india-gross').valueAsNumber,residentIndividual:residence==='yes',ageGroup:$('india-age').value,ordinarySalaryOnly:$('india-salary-only').value==='yes',oldEligibleDeductions:$('india-old-deductions').valueAsNumber,newEligibleDeductions:$('india-new-deductions').valueAsNumber};
  const r=compareIndiaRegimes(input),f=v=>money(v,'INR');
  $('india-old-tax').textContent=f(r.oldRegime.incomeTax);$('india-new-tax').textContent=f(r.newRegime.incomeTax);$('india-tax-difference').textContent=f(r.taxDifference);
  $('india-regime-verdict').textContent=r.lowerTaxRegime==='equal'?'Both regimes have the same example tax.':(r.lowerTaxRegime==='old'?'Old':'New')+' regime has lower tax in this example.';
  for(const [id,regime] of [['india-old-breakdown',r.oldRegime],['india-new-breakdown',r.newRegime]]){
   $(id).replaceChildren();
   for(const [label,value] of [['Standard deduction',regime.standardDeduction],['Other eligible deductions',regime.otherEligibleDeductions],['Rounded taxable income',regime.taxableIncome],['Tax before rebate',regime.taxBeforeRebate],['Tax rebate',regime.rebateApplied],['Rebate marginal relief',regime.rebateMarginalRelief],['Surcharge before relief',regime.surchargeBeforeRelief],['Surcharge relief',regime.surchargeMarginalRelief],['Surcharge charged',regime.surchargeApplied],['Health and education cess',regime.cessAmount],['Final rounded income tax',regime.incomeTax]]){
    const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=f(value);$(id).append(dt,dd);
   }
  }
  lastIndiaComparison={kind:'india-regimes',input};$('india-regime-result').hidden=false;$('india-regime-result').focus();
 }catch{$('india-regime-error').textContent='Enter valid whole rupee amounts, choose a tax status and confirm salary-only income. Other deductions cannot exceed salary after the standard deduction.';}
});
$('india-regime-download').addEventListener('click',()=>downloadReceipt(lastIndiaComparison,$('india-regime-download'),$('india-regime-error')));
$('proof-file').addEventListener('change',async()=>{
 const request=++proofRequest,file=$('proof-file').files[0];
 $('proof-status').textContent='';
 if(!file)return;
 try{
  if(file.size>65536)throw new Error('Report too large');
  const r=await verifyReceipt(JSON.parse(await file.text()),engineFingerprint);
  if(request!==proofRequest)return;
  $('proof-status').textContent=!r.integrity?'The report contents do not match its fingerprint.':!r.sameEngine&&r.reproduced?'The fingerprint matches and the example calculation was reproduced using retained historical rules in a different engine build. This is not legal verification or a digital signature.':!r.sameEngine?'The fingerprint matches, but this engine cannot reproduce the older report.':r.reproduced?'The fingerprint matches and the example calculation was reproduced. This is not legal verification or a digital signature.':'The fingerprint matches, but the calculation could not be reproduced.';
 }catch{if(request===proofRequest)$('proof-status').textContent='This file is not a supported TaxPulse example report.';}
});
assessmentChanged();
for(const [code,name] of Object.entries(allCountries)){
  const item=document.createElement('li');
  const state=manifest.countries[code];
  item.textContent=name+' — '+(countries.has(code)?'Salary example connected':['DE','CA','AU','SG','AE'].includes(code)?'Country example connected (limited scope)':'Not available in simple calculator')+'; '+(state?.verification==='verified'&&state?.productionEnabled===true?'marked verified in manifest':'tax rules not verified');
  if(['DE','CA','AU','SG','AE'].includes(code)){
    const source=({"AU":"https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents","SG":"https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates","AE":"https://www.tax.gov.ae/en/taxes/corporate.tax/corporate.tax.topics/basis.of.taxation.natural.person.aspx"})[code]||(code==='DE'?'https://www.gesetze-im-internet.de/estg/__32a.html':'https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032on-jan/t4032on-january-general-information.html');
    const a=document.createElement('a');a.href=source;a.textContent='Official source for reviewed formula';a.target='_blank';a.rel='noopener noreferrer';item.append(document.createElement('br'),a);
  }
  $('country-status').append(item);
}
countryChanged();

const gainOptions={
 IN:{currency:'INR',period:'1 April 2026 – 31 March 2027',start:'2026-04-01',end:'2027-03-31',scope:'Resident individual using the new regime. Other taxable ordinary income at least INR 13 lakh; combined net income at most INR 50 lakh. No other gains or special income.'},
 US:{currency:'USD',period:'1 January – 31 December 2026',start:'2026-01-01',end:'2026-12-31',scope:'US resident individual, one directly purchased investment, no qualified dividends, other gains, unused deductions, wash sales or special asset rates. Current-year losses must be legally eligible. Federal regular rate schedule only; no state tax, AMT or net investment income tax.'},
 GB:{currency:'GBP',period:'6 April 2026 – 5 April 2027',start:'2026-04-06',end:'2027-04-05',scope:'UK resident individual, correct tax cost already known, full GBP 3,000 annual allowance, standard basic rate band, no other gains, carryovers, FIG claims or special reliefs. Only eligible current-year losses.'}
};
const gainAssets={
 IN:{'listed-equity':['Listed equity shares','Qualifying shares bought after 31 January 2018; required securities transaction tax paid; full annual equity allowance available.'],'equity-fund':['Equity-oriented fund','Qualifying equity fund bought after 31 January 2018; required securities transaction tax paid; full annual equity allowance available.'],property:['Investment land or building','Bought on or after 23 July 2024. No depreciation, agricultural land, reinvestment relief or deemed stamp-duty valuation. Confirm allowable cost and tax consideration.'],crypto:['Cryptocurrency (VDA)','Purchased tokens sold for cash. Enter gross proceeds before fees or withholding and actual purchase cost only. No loss offsets, mining, staking or other income.']},
 US:{'listed-equity':['Investment shares','Ordinary stock; no special share matching or rates.'],'investment-land':['Vacant investment land','Only non-depreciable vacant land held as an investment. No business use, improvements, home exclusion, installment sale or like-kind exchange.'],crypto:['Cryptocurrency','One ordinary token lot purchased and sold for cash; no NFTs, mining, staking, gifts, derivatives or multiple-lot basis selection.']},
 GB:{'listed-equity':['Investment shares','Correct allowable share cost already known; no special share matching calculation.'],property:['UK investment residential property','Never used as your home; no private residence relief, connected-party sale or special valuation. Most taxable property sales must be reported and paid within 60 days of completion.'],crypto:['Cryptocurrency','Ordinary purchased tokens sold for cash. Supply the correct allowable pooled or matched cost, including same-day and 30-day matching where relevant. No NFTs, lending, staking, mining or liquidity pools.']}
};
let lastGain=null;
function gainAssetChanged(){
 const country=$('gain-country').value,asset=$('gain-asset').value,cryptoIndia=country==='IN'&&asset==='crypto';
 $('gain-scope').textContent=gainOptions[country].scope+' '+gainAssets[country][asset][1];
 $('gain-sale-label').textContent=cryptoIndia?'Gross sale proceeds before fees or withholding':'Sale proceeds after allowable selling costs';
 $('gain-basis-label').textContent=cryptoIndia?'Actual purchase cost only':'Adjusted tax cost of investment';
 $('gain-losses-field').hidden=cryptoIndia;$('gain-losses').disabled=cryptoIndia;$('gain-losses').value='0';
 for(const id of ['gain-acquired','gain-disposed','gain-sale','gain-basis','gain-confirm'])$(id).value='';
 clearGain();
}
function clearGain(){lastGain=null;$('gain-result').hidden=true;$('gain-error').textContent='';}
function gainChanged(){
 const country=$('gain-country').value,c=gainOptions[country];
 $('gain-period').textContent=c.period;
 $('gain-asset').replaceChildren();for(const [value,[label]] of Object.entries(gainAssets[country])){const option=document.createElement('option');option.value=value;option.textContent=label;$('gain-asset').append(option);}
 $('gain-disposed').min=c.start;$('gain-disposed').max=c.end;
 for(const e of document.querySelectorAll('.gain-currency'))e.textContent='('+c.currency+')';
 for(const [field,control,show] of [['gain-filing-field','gain-filing',country==='US']]){$(field).hidden=!show;$(control).disabled=!show;}
 for(const id of ['gain-acquired','gain-disposed','gain-sale','gain-basis','gain-other','gain-confirm'])$(id).value='';
 gainAssetChanged();
}
$('gain-asset').addEventListener('change',gainAssetChanged);
$('gain-country').addEventListener('change',gainChanged);
$('gain-form').addEventListener('input',clearGain);
$('gain-form').addEventListener('submit',event=>{
 event.preventDefault();clearGain();
 try{
  const country=$('gain-country').value;
  const input={country,taxYear:'2026',acquired:$('gain-acquired').value,disposed:$('gain-disposed').value,saleProceeds:$('gain-sale').valueAsNumber,adjustedBasis:$('gain-basis').valueAsNumber,otherTaxableIncome:$('gain-other').valueAsNumber,eligibleLosses:$('gain-losses').valueAsNumber,scopeConfirmed:$('gain-confirm').value==='yes',assetType:$('gain-asset').value,...(country==='US'?{filingStatus:$('gain-filing').value}:{})};
  const r=calculateCapitalGain(input),f=v=>money(v,r.currency);
  $('gain-profit').textContent=f(r.realizedGain);$('gain-taxable').textContent=f(r.taxableGain);$('gain-tax').textContent=f(r.estimatedGainTax);
  $('gain-holding').textContent=r.holding==='not-rate-determining'?'Holding length does not select the tax rate for this example.':r.holding==='long-term'?'Held for more than '+r.holdingYears+' year(s): long-term example.':'Held for '+r.holdingYears+' year(s) or less: short-term example.';
  $('gain-breakdown').replaceChildren();
  for(const [label,value] of [['Profit or loss',r.realizedGain],['Eligible losses used',r.eligibleLossesApplied],['Tax-free gain allowance used',r.allowanceApplied],...r.brackets.map(b=>['Gain taxed at '+percent(b.rate),b.taxableGain]),['Tax before cess',r.taxBeforeCess],['Cess',r.cessAmount],['Estimated tax on gain only',r.estimatedGainTax]]){
   const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=f(value);$('gain-breakdown').append(dt,dd);
  }
  $('gain-warnings').textContent=r.warnings.join(' ')+' Unverified example only.';
  lastGain={kind:'capital-gain',input};$('gain-result').hidden=false;$('gain-result').focus();
 }catch{$('gain-error').textContent='Check dates, amounts, eligible losses and the conditions above. Unsupported examples cannot be calculated.';}
});
$('gain-download').addEventListener('click',()=>downloadReceipt(lastGain,$('gain-download'),$('gain-error')));
gainChanged();

const regionalOptions=regionalTaxCatalog();
let lastRegional=null;
function clearRegional(){lastRegional=null;$('regional-result').hidden=true;$('regional-error').textContent='';}
function regionalCountryChanged(){
 const country=$('regional-country').value;
 $('regional-region').replaceChildren();
 for(const r of regionalOptions.filter(x=>x.country===country)){
  const option=document.createElement('option');option.value=r.region;option.textContent=r.name;$('regional-region').append(option);
 }
 regionalRegionChanged();
}
function regionalRegionChanged(){
 const config=regionalOptions.find(x=>x.country===$('regional-country').value&&x.region===$('regional-region').value);
 $('regional-income-label').textContent=(config.inputBasis==='ordinary-salary'?'Annual salary before tax':config.inputBasis==='employee-wages'?'Annual employee wages':config.inputBasis==='state-taxable-income'?'Annual state taxable income (not federal taxable income)':'Annual provincial or territorial taxable income')+' ('+config.currency+')';
 $('regional-income').step=config.country==='GB'?'1':'0.01';
 $('regional-period').textContent=config.country==='GB'?'6 April 2026 – 5 April 2027':'Calendar year 2026';
 $('regional-scope').textContent=config.country==='GB'?'Ordinary salary only, eligible for the standard personal allowance, no other income, pension contributions or tax reliefs. Select the correct UK taxpayer region. Excludes National Insurance and other deductions.':config.country==='CA'?'Basic provincial tax before credits, surtaxes, health premiums and tax reductions. Confirm the province or territory of residence on December 31 and taxable income. Quebec not supported. This is not final provincial tax or total income tax.':config.region==='TX'?'Ordinary wages in Texas only. No state personal income tax; federal, payroll and other taxes still apply.':'Enter the correct state taxable income after any eligible state deductions. This is state tax before credits or forgiveness; excludes federal, local and payroll taxes.';
 $('regional-income').value='';$('regional-confirm').value='';clearRegional();
}
$('regional-country').addEventListener('change',regionalCountryChanged);
$('regional-region').addEventListener('change',regionalRegionChanged);
$('regional-form').addEventListener('input',clearRegional);
$('regional-form').addEventListener('submit',event=>{
 event.preventDefault();clearRegional();
 try{
 const input={country:$('regional-country').value,region:$('regional-region').value,taxYear:'2026',income:$('regional-income').valueAsNumber,scopeConfirmed:$('regional-confirm').value==='yes'};
 const r=calculateRegionalTax(input),f=v=>money(v,r.currency);
 $('regional-tax-label').textContent=r.country==='CA'?'Basic provincial/territorial tax before adjustments':r.country==='GB'?'Income tax under selected UK rates':'State personal income tax before credits';
 $('regional-tax-amount').textContent=f(r.regionalTax);$('regional-taxable').textContent=f(r.taxableIncome);
 $('regional-breakdown').replaceChildren();
 const rows=[...(r.personalAllowanceApplied===null?[]:[['Personal allowance applied',r.personalAllowanceApplied]]),...r.brackets.map(b=>['Income taxed at '+percent(b.rate),b.taxableGain]),['Tax component',r.regionalTax]];
 for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=f(value);$('regional-breakdown').append(dt,dd);}
 $('regional-warnings').textContent=r.warnings.join(' ')+' Unverified example only.';
 $('regional-source').replaceChildren();for(const url of r.sourceUrls){const a=document.createElement('a');a.href=url;a.rel='noopener noreferrer';a.target='_blank';a.textContent='Official tax source';$('regional-source').append(a,document.createElement('br'));}
 lastRegional={kind:'regional-tax',input};$('regional-result').hidden=false;$('regional-result').focus();
 }catch{$('regional-error').textContent='Check the amount and confirm the eligibility conditions. Unsupported regions and inputs cannot be calculated.';}
});
$('regional-download').addEventListener('click',()=>downloadReceipt(lastRegional,$('regional-download'),$('regional-error')));
regionalCountryChanged();

let lastPay=null;
const payOptions={TX:{country:'US',label:'Annual wages (USD)',scope:'Texas resident and employee for the full year. Single, under 65, nonblind, not a dependent. One job, wages only, standard deduction, no other deductions or credits. All wages subject to Social Security and Medicare. Up to USD 250,000. No state personal income tax; excludes AMT and other deductions.',max:250000,step:'0.01'},RUK:{country:'GB',label:'Monthly salary (GBP)',scope:'England, Wales or Northern Ireland taxpayer. Twelve equal monthly payments, category A National Insurance, ordinary employee (not director), no other income or reliefs. No pension, student loan or other deductions. Whole pounds only.',max:100000,step:'1'},SCT:{country:'GB',label:'Monthly salary (GBP)',scope:'Scottish taxpayer. Twelve equal monthly payments, category A National Insurance, ordinary employee (not director), no other income or reliefs. No pension, student loan or other deductions. Whole pounds only.',max:100000,step:'1'}};
Object.assign(payOptions,{
 AB:{country:'CA',label:'Annual salary (CAD)',scope:'Full-year Alberta resident aged 18–64, one job, all earnings pensionable and insurable, no other income, deductions, credits or dependents. CAD 60,000–150,000 whole dollars. Includes CPP, CPP2, EI and basic federal/Alberta credits.',min:60000,max:150000,step:'1',period:'Calendar year 2026'},
 AU:{country:'AU',label:'Annual salary excluding employer super (AUD)',scope:'Full-year Australian resident, salary equals taxable income, full 2% Medicare levy, no Medicare levy surcharge, student debt, other income, offsets or deductions. AUD 100,000–1,000,000 whole dollars.',min:100000,max:1000000,step:'1',period:'FY 2026–27'},
 IN:{country:'IN',label:'Annual cash salary before employee deductions (INR)',scope:'Indian resident under 60 using new regime, ordinary salary only, no other income, exemptions or deductions. Enter confirmed monthly EPF contribution wage (12% applies; zero only if not liable) and actual annual professional tax (zero only if none). No ESI or other deductions. Whole rupees.',min:0,max:1000000000,step:'1',period:'FY 2026–27'},
 SG:{country:'SG',label:'Ordinary monthly salary (SGD)',scope:'Full-year resident, Singapore citizen or third-year-or-later PR on full CPF rates, below 55 throughout 2026. Twelve equal ordinary monthly wages, no bonus, other income, reliefs or deductions except employee CPF and ordinary earned income relief. Whole dollars SGD 751–100,000. YA 2027 before rebates.',min:751,max:100000,step:'1',period:'2026 earnings; YA 2027'}
});
Object.assign(payOptions,{
 DE:{country:'DE',label:'Monthly gross wages (EUR)',scope:'Full-year resident, individual assessment, childless age 23–64, outside Saxony, no church tax. One ordinary fully insured job and twelve identical monthly wages, EUR 2,500–6,450. Supply your actual annual taxable income after eligible deductions and insurer supplemental rate (not the employee share). No other income, adjustments or credits. Annual assessment estimate, not wage-tax withholding.',min:2500,max:6450,step:'0.01',period:'Calendar year 2026'},
 AE:{country:'AE',label:'Monthly gross wages (AED)',scope:'Non-GCC expatriate private-sector employee, wages only, no UAE/GCC pension liability. Twelve identical monthly payments and unchanged basic salary, standard ILOE premium with 5% VAT. No foreign taxes, optional deductions, service fees or end-of-service benefits. AED 100–1,000,000.',min:100,max:1000000,step:'0.01',period:'Calendar year 2026'}
});
function clearPay(){lastPay=null;$('pay-result').hidden=true;$('pay-error').textContent='';}
function payChanged(){
 const c=payOptions[$('pay-region').value];
 $('pay-label').textContent=c.label;$('pay-scope').textContent=c.scope;$('pay-amount').max=c.max;$('pay-amount').step=c.step;
 $('pay-period').textContent=c.period||(c.country==='US'?'Calendar year 2026':'6 April 2026 – 5 April 2027');
 $('pay-amount').min=c.min??0;
 for(const id of ['pay-epf','pay-professional-tax']){$(id+'-field').hidden=c.country!=='IN';$(id).disabled=c.country!=='IN';$(id).value='';}
 for(const [id,country] of [['pay-de-taxable','DE'],['pay-de-supplement','DE'],['pay-ae-basic','AE']]){$(id+'-field').hidden=c.country!==country;$(id).disabled=c.country!==country;$(id).value='';}
 $('pay-amount').value='';$('pay-confirm').value='';clearPay();
}
$('pay-region').addEventListener('change',payChanged);
$('pay-form').addEventListener('input',clearPay);
$('pay-form').addEventListener('submit',event=>{
 event.preventDefault();clearPay();
 try{
  const region=$('pay-region').value,input={country:payOptions[region].country,region,taxYear:'2026',pay:$('pay-amount').valueAsNumber,scopeConfirmed:$('pay-confirm').value==='yes',...(region==='IN'?{epfMonthlyWage:$('pay-epf').valueAsNumber,professionalTaxAnnual:$('pay-professional-tax').valueAsNumber}:region==='DE'?{annualTaxableIncome:$('pay-de-taxable').valueAsNumber,healthSupplementRate:$('pay-de-supplement').valueAsNumber}:region==='AE'?{monthlyBasicSalary:$('pay-ae-basic').valueAsNumber}:{})};
  const r=calculateSalaryRemainder(input),f=v=>money(v,r.currency);
  $('pay-annual').textContent=f(r.annualRemainder);$('pay-monthly').textContent=f(r.averageMonthlyRemainder);$('pay-deductions').textContent=f(r.totalModeledDeductions);
  $('pay-breakdown').replaceChildren();
  for(const [label,value] of [['Annual gross wages',r.annualGross],...(r.taxableIncome===undefined?[]:[['Taxable income',r.taxableIncome]]),...(r.taxAdjustments||[]).map(c=>[c.name,c.amount]),...(r.incomeTaxComponents||[{name:'Annual income tax',amount:r.incomeTax}]).map(c=>[c.name,c.amount]),...r.contributions.map(c=>[c.name,c.amount]),['Annual modeled deductions',r.totalModeledDeductions],['Annual money left',r.annualRemainder]]){
   const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=f(value);$('pay-breakdown').append(dt,dd);
  }
  $('pay-warnings').textContent=r.warnings.join(' ')+' Unverified example only.';
  lastPay={kind:'salary-remainder',input};$('pay-result').hidden=false;$('pay-result').focus();
 }catch{$('pay-error').textContent='Check the pay amount and confirm all conditions. This example does not support other employment or tax situations.';}
});
$('pay-download').addEventListener('click',()=>downloadReceipt(lastPay,$('pay-download'),$('pay-error')));
payChanged();

let lastReverse=null;
function clearReverse(){lastReverse=null; $('reverse-result').hidden=true;$('reverse-error').textContent='';}
function reverseRegionChanged(){
 const c=payOptions[$('pay-region').value];
 $('reverse-scope').textContent='Selected salary type: '+c.label+'. Supported range: '+(c.min??0)+' to '+c.max+'.';
 for(const id of ['reverse-min','reverse-max']){const el=$(id);el.min=c.min??0;el.max=c.max;el.value='';}
 $('reverse-target').value='';clearReverse();
}
$('pay-region').addEventListener('change',reverseRegionChanged);
$('pay-form').addEventListener('input',clearReverse);
$('reverse-form').addEventListener('input',clearReverse);
$('reverse-manual').addEventListener('change',()=>{
 for(const id of ['reverse-min','reverse-max']){const el=$(id);el.disabled=!$('reverse-manual').checked;el.closest('label').hidden=el.disabled;}
});
$('reverse-form').addEventListener('submit',event=>{
 event.preventDefault();clearReverse();
 try{
  const region=$('pay-region').value;
  const profile={country:payOptions[region].country,region,taxYear:'2026',scopeConfirmed:$('pay-confirm').value==='yes',...(region==='IN'?{epfMonthlyWage:$('pay-epf').valueAsNumber,professionalTaxAnnual:$('pay-professional-tax').valueAsNumber}:region==='DE'?{annualTaxableIncome:$('pay-de-taxable').valueAsNumber,healthSupplementRate:$('pay-de-supplement').valueAsNumber}:region==='AE'?{monthlyBasicSalary:$('pay-ae-basic').valueAsNumber}:{})};
  const request={profile,target:$('reverse-target').valueAsNumber,period:$('reverse-period').value};
  const manual=$('reverse-manual').checked;
  const input=manual?{...request,minPay:$('reverse-min').valueAsNumber,maxPay:$('reverse-max').valueAsNumber}:request;
  const r=manual?reverseSalary(input):automaticReverseSalary(input);
  if(!r.found){$('reverse-error').textContent=r.searchComplete===false?'Automatic search reached its limit. Choose a salary range yourself to continue.':'No salary in the supported search range meets your target.';return;}
  const s=r.salary,f=v=>money(v,s.currency);
  $('reverse-gross').textContent=f(s.annualGross);$('reverse-net').textContent=f(s.averageMonthlyRemainder);$('reverse-deductions').textContent=f(s.totalModeledDeductions);
  $('reverse-warning').textContent=($('reverse-manual').checked?'Lowest whole-unit salary within your selected range, not necessarily outside it. ':'Lowest whole-unit salary meeting the target under these fixed assumptions. ')+s.warnings.join(' ')+' Unverified example only.';
  $('reverse-breakdown').replaceChildren();
  for(const [label,value] of [['Yearly income tax',s.incomeTax],...s.contributions.map(c=>[c.name,c.amount]),['Yearly money left',s.annualRemainder]]){
   const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=f(value);$('reverse-breakdown').append(dt,dd);
  }
  lastReverse={kind:manual?'reverse-salary':'automatic-reverse-salary',input};
  $('reverse-result').hidden=false;$('reverse-result').focus();
 }catch{$('reverse-error').textContent='Check the salary range, target and country conditions above. The full range must be supported by the selected example.';}
});
$('reverse-download').addEventListener('click',()=>downloadReceipt(lastReverse,$('reverse-download'),$('reverse-error')));
reverseRegionChanged();

let lastOffers=null;
function clearOffers(){lastOffers=null;$('offers-result').hidden=true;$('offers-error').textContent='';}
function offersRegionChanged(){
 const region=$('pay-region').value,c=payOptions[region],pay=$('offers-pay');
 $('offers-label').textContent='Second offer: '+c.label;
 pay.min=c.min??0;pay.max=c.max;pay.step=c.step;pay.value='';
 for(const [id,active] of [['offers-epf',region==='IN'],['offers-pt',region==='IN'],['offers-taxable',region==='DE'],['offers-supplement',region==='DE'],['offers-basic',region==='AE']]){
  $(id+'-field').hidden=!active;$(id).disabled=!active;$(id).value='';
 }
 $('offers-confirm').checked=false;clearOffers();
}
$('pay-region').addEventListener('change',offersRegionChanged);
$('pay-form').addEventListener('input',()=>{$('offers-confirm').checked=false;clearOffers();});
$('offers-form').addEventListener('input',clearOffers);
$('offers-form').addEventListener('submit',event=>{
 event.preventDefault();clearOffers();
 try{
  const region=$('pay-region').value,profile={country:payOptions[region].country,region,taxYear:'2026',scopeConfirmed:$('pay-confirm').value==='yes'&&$('offers-confirm').checked};
  const first={...profile,pay:$('pay-amount').valueAsNumber,...(region==='IN'?{epfMonthlyWage:$('pay-epf').valueAsNumber,professionalTaxAnnual:$('pay-professional-tax').valueAsNumber}:region==='DE'?{annualTaxableIncome:$('pay-de-taxable').valueAsNumber,healthSupplementRate:$('pay-de-supplement').valueAsNumber}:region==='AE'?{monthlyBasicSalary:$('pay-ae-basic').valueAsNumber}:{})};
  const second={...profile,pay:$('offers-pay').valueAsNumber,...(region==='IN'?{epfMonthlyWage:$('offers-epf').valueAsNumber,professionalTaxAnnual:$('offers-pt').valueAsNumber}:region==='DE'?{annualTaxableIncome:$('offers-taxable').valueAsNumber,healthSupplementRate:$('offers-supplement').valueAsNumber}:region==='AE'?{monthlyBasicSalary:$('offers-basic').valueAsNumber}:{})};
  const input={first,second},r=compareSalaryOffers(input),f=v=>money(v,r.currency);
  $('offers-winner').textContent=r.higherRemainder==='equal'?'Both offers leave the same annual amount':(r.higherRemainder==='first'?'Offer 1':'Offer 2')+' leaves more money per year';
  $('offers-first').textContent=f(r.first.averageMonthlyRemainder);$('offers-second').textContent=f(r.second.averageMonthlyRemainder);$('offers-diff').textContent=f(Math.abs(r.annualDifference));
  $('offers-breakdown').replaceChildren();
  for(const [label,value] of [['Offer 1 annual gross',r.first.annualGross],['Offer 2 annual gross',r.second.annualGross],['Offer 1 annual income tax',r.first.incomeTax],['Offer 2 annual income tax',r.second.incomeTax],['Offer 1 annual employee contributions',r.first.employeeContributions],['Offer 2 annual employee contributions',r.second.employeeContributions],['Offer 1 annual money left',r.first.annualRemainder],['Offer 2 annual money left',r.second.annualRemainder]]){
   const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=f(value);$('offers-breakdown').append(dt,dd);
  }
  $('offers-warning').textContent=[...r.warnings,...new Set([...r.first.warnings,...r.second.warnings])].join(' ')+' Unverified example only.';
  lastOffers={kind:'salary-offers',input};$('offers-result').hidden=false;$('offers-result').focus();
 }catch{$('offers-error').textContent='Check both salaries, any required extra amounts and the country conditions above.';}
});
$('offers-download').addEventListener('click',()=>downloadReceipt(lastOffers,$('offers-download'),$('offers-error')));
offersRegionChanged();

let lastNegotiation=null;
function clearNegotiation(){lastNegotiation=null;$('negotiation-result').hidden=true;$('negotiation-error').textContent='';}
$('pay-form').addEventListener('input',()=>{$('negotiation-confirm').checked=false;clearNegotiation();});
$('pay-region').addEventListener('change',()=>{$('negotiation-increase').value='';$('negotiation-confirm').checked=false;clearNegotiation();});
$('negotiation-form').addEventListener('input',clearNegotiation);
$('negotiation-form').addEventListener('submit',event=>{
 event.preventDefault();clearNegotiation();
 try{
  const region=$('pay-region').value;
  const current={country:payOptions[region].country,region,taxYear:'2026',pay:$('pay-amount').valueAsNumber,scopeConfirmed:$('pay-confirm').value==='yes'&&$('negotiation-confirm').checked,...(region==='IN'?{epfMonthlyWage:$('pay-epf').valueAsNumber,professionalTaxAnnual:$('pay-professional-tax').valueAsNumber}:region==='DE'?{annualTaxableIncome:$('pay-de-taxable').valueAsNumber,healthSupplementRate:$('pay-de-supplement').valueAsNumber}:region==='AE'?{monthlyBasicSalary:$('pay-ae-basic').valueAsNumber}:{})};
  const input={current,monthlyIncrease:$('negotiation-increase').valueAsNumber},r=negotiateSalary(input);
  if(!r.found){$('negotiation-error').textContent=r.search.searchComplete?'No supported salary meets this goal.':'Automatic search reached its limit. Try the manual salary range in the reverse calculator above.';return;}
  const f=v=>money(v,r.baseline.currency);
  $('negotiation-gross').textContent=f(r.proposed.annualGross);$('negotiation-net').textContent=f(r.netIncrease);$('negotiation-raise').textContent=f(r.grossIncrease)+(r.grossIncreasePercent===null?'':' ('+percent(r.grossIncreasePercent)+')');
  $('negotiation-warning').textContent=[...r.warnings,...r.proposed.warnings].join(' ')+' Unverified example only.';
  lastNegotiation={kind:'salary-negotiation',input};$('negotiation-result').hidden=false;$('negotiation-result').focus();
 }catch{$('negotiation-error').textContent='Check your current salary, desired increase and tax conditions.';}
});
$('negotiation-download').addEventListener('click',()=>downloadReceipt(lastNegotiation,$('negotiation-download'),$('negotiation-error')));

const contributionOptions={
 CA:{label:'Annual pensionable and insurable earnings (CAD)',scope:'Full-year employee outside Quebec, aged 18–64 throughout the year, one employer. All earnings subject to CPP and EI; full annual basic exemption.',max:1000000000,step:'.01',period:'Calendar year 2026'},
 AU:{label:'Annual taxable income (AUD)',scope:'Full-year Australian resident who already knows the full 2% Medicare levy applies, no exemption or reduction. Only taxable income of AUD 100,000 or more. This excludes Medicare levy surcharge.',max:1000000000,step:'.01',period:'FY 2026–27'},
 IN:{label:'Confirmed monthly EPF contribution wage (INR)',scope:'Use only if the applicable employee EPF rate is confirmed as 12% and the actual EPF contribution wage is INR 15,000 or less. Do not enter gross salary. No higher-wage or voluntary contributions, ESI or professional tax.',max:15000,step:'1',period:'Illustrative monthly 2026'},
 SG:{label:'Ordinary monthly wages (SGD)',scope:'Singapore citizen or permanent resident from the third year on full rates. One employer, ordinary wages above SGD 750, no additional wages. Select the applicable contribution age band for the month; changes begin the month after the relevant birthday.',max:1000000000,step:'.01',period:'Calendar year 2026'}
};
let lastContribution=null;
function clearContribution(){lastContribution=null;$('contrib-result').hidden=true;$('contrib-error').textContent='';}
function contributionChanged(){
 const country=$('contrib-country').value,c=contributionOptions[country];
 $('contrib-label').textContent=c.label;$('contrib-scope').textContent=c.scope;$('contrib-period').textContent=c.period;$('contrib-income').max=c.max;$('contrib-income').step=c.step;
 $('contrib-age-field').hidden=country!=='SG';$('contrib-age').disabled=country!=='SG';$('contrib-age').value='';
 $('contrib-income').value='';$('contrib-confirm').value='';clearContribution();
}
$('contrib-country').addEventListener('change',contributionChanged);
$('contrib-form').addEventListener('input',clearContribution);
$('contrib-form').addEventListener('submit',event=>{
 event.preventDefault();clearContribution();
 try{
  const country=$('contrib-country').value,input={country,taxYear:'2026',income:$('contrib-income').valueAsNumber,scopeConfirmed:$('contrib-confirm').value==='yes',...(country==='SG'?{ageBand:$('contrib-age').value}:{})};
  const r=calculateEmployeeContributions(input),f=v=>money(v,r.currency);
  $('contrib-total').textContent=f(r.totalEmployeeContribution);$('contrib-frequency').textContent=r.frequency==='annual'?'Per year':'Per month';
  $('contrib-breakdown').replaceChildren();
  const rows=[...r.components.map(c=>[c.name,c.amount]),...(r.contributionWage===null?[]:[['Contribution wage',r.contributionWage]]),...(r.employerContribution===null?[]:[['Employer contribution (not deducted from pay)',r.employerContribution]])];
  for(const [label,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=f(value);$('contrib-breakdown').append(dt,dd);}
  $('contrib-warnings').textContent=r.warnings.join(' ')+' Unverified example only.';
  lastContribution={kind:'employee-contributions',input};$('contrib-result').hidden=false;$('contrib-result').focus();
 }catch{$('contrib-error').textContent='Check the amount and confirm all conditions. This example does not cover other contribution rates or situations.';}
});
$('contrib-download').addEventListener('click',()=>downloadReceipt(lastContribution,$('contrib-download'),$('contrib-error')));
contributionChanged();

const historyRules=historicalRuleCatalog();
let lastHistory=null;
function clearHistory(){lastHistory=null;$('history-result').hidden=true;$('history-error').textContent='';}
function historyChanged(){
 const country=$('history-country').value,items=historyRules.filter(r=>r.country===country);
 for(const id of ['history-first','history-second']){
  const select=$(id);select.replaceChildren();
  for(const r of items){const o=document.createElement('option');o.value=r.id;o.textContent=r.label+(r.start>new Date().toISOString().slice(0,10)?' — enacted future rate':'');select.append(o);}
 }
 $('history-second').selectedIndex=items.length-1;
 $('history-income-label').textContent='Same taxable income in both periods ('+items[0].currency+')';
 $('history-scope').textContent=items[0].scope;$('history-income').value='';$('history-confirm').value='';clearHistory();
}
$('history-country').addEventListener('change',historyChanged);
$('history-form').addEventListener('input',clearHistory);
$('history-form').addEventListener('submit',event=>{
 event.preventDefault();clearHistory();
 try{
 const input={country:$('history-country').value,firstRuleId:$('history-first').value,secondRuleId:$('history-second').value,taxableIncome:$('history-income').valueAsNumber,scopeConfirmed:$('history-confirm').value==='yes'};
 const r=compareHistoricalTax(input),f=v=>money(v,r.currency);
 $('history-first-label').textContent=r.first.rule.label;$('history-second-label').textContent=r.second.rule.label;
 $('history-tax-first').textContent=f(r.first.taxBeforeAdjustments);$('history-tax-second').textContent=f(r.second.taxBeforeAdjustments);$('history-change').textContent=f(r.taxChange);
 $('history-detail').replaceChildren();
 for(const entry of [r.first,r.second]){
  const h=document.createElement('h4');h.textContent=entry.rule.label+' ('+entry.rule.start+' to '+entry.rule.end+')';$('history-detail').append(h);
  const p=document.createElement('p');p.textContent='Rule: '+entry.rule.id+' · Enacted schedule';$('history-detail').append(p);
  const dl=document.createElement('dl');dl.className='breakdown';
  for(const b of entry.brackets.filter(b=>b.taxableIncome>0)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=percent(b.rate)+' on '+f(b.taxableIncome);dd.textContent=f(b.tax);dl.append(dt,dd);}
  $('history-detail').append(dl);
  for(const url of entry.rule.sourceUrls){const a=document.createElement('a');a.href=url;a.rel='noopener noreferrer';a.target='_blank';a.textContent='Official rate source';$('history-detail').append(a,document.createElement('br'));}
 }
 $('history-warning').textContent=r.warnings.join(' ');lastHistory={kind:'historical-tax',input};$('history-result').hidden=false;$('history-result').focus();
 }catch{$('history-error').textContent='Choose an earlier and a later supported period, enter valid taxable income, and confirm the conditions.';}
});
$('history-download').addEventListener('click',()=>downloadReceipt(lastHistory,$('history-download'),$('history-error')));
historyChanged();
