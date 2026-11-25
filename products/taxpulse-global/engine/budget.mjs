const currencies=Object.freeze(['INR','USD','GBP','CAD','AUD','EUR','SGD','AED']);
export const expenseCategories=Object.freeze(['housing','food','transport','utilities','debt','other']);
function exact(o,keys){
 if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==keys.length||keys.some(k=>!Object.hasOwn(o,k)))throw new TypeError('Invalid budget fields');
}
function minor(v){
 if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e9||Math.abs(v*100-Math.round(v*100))>0.00002)throw new RangeError('Enter a nonnegative amount with up to two decimal places');
 return Math.round(v*100);
}
export function calculateBudget(input){
 exact(input,['currency','monthlyIncome','expenses','monthlyGoal','alternativeIncome','alternativeHousing']);
 if(!currencies.includes(input.currency))throw new RangeError('Unsupported currency');
 exact(input.expenses,expenseCategories);
 const income=minor(input.monthlyIncome),goal=minor(input.monthlyGoal),altIncome=minor(input.alternativeIncome),altHousing=minor(input.alternativeHousing);
 const expenses=Object.fromEntries(expenseCategories.map(k=>[k,minor(input.expenses[k])]));
 const total=Object.values(expenses).reduce((a,b)=>a+b,0),balance=income-total;
 const altTotal=total-expenses.housing+altHousing,altBalance=altIncome-altTotal;
 return {currency:input.currency,monthlyIncome:income/100,monthlyExpenses:total/100,monthlyBalance:balance/100,annualBalance:balance*12/100,monthlyGoal:goal/100,goalGap:Math.max(0,goal-balance)/100,savingsRate:income===0?null:balance/income,alternative:{monthlyIncome:altIncome/100,monthlyExpenses:altTotal/100,monthlyBalance:altBalance/100,annualBalance:altBalance*12/100,monthlyDifference:(altBalance-balance)/100},sampleOnly:true,warnings:['Simple cash-flow illustration using after-tax income and user-entered costs. Does not calculate taxes, investment returns, inflation, unexpected expenses or eligibility. Annual totals assume 12 identical months.']};
}
