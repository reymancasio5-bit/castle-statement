import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults,money,format} from '../public/engine.js';
const row={id:'r',kind:'reservation',receipts:1000,tax:0,cleaning:100,cleaningPayer:'castle',castlePercent:33.333};
test('three-decimal rates retain precision for fees, taxes, expenses and payout splits',()=>{
 const t=calculate([row,{id:'e',kind:'expense',receipts:100,tax:0,expenseTax:14.975}],{...defaults,mode:'gross',managementRate:14.975,taxRate:14.975,cleaningTaxRate:14.975});
 assert.equal(t.managementFee,money('149.75'));
 assert.equal(t.managementTax,money('22.4250625',true));
 assert.equal(t.cleaningTax,money('14.975',true));
 assert.equal(t.otherExpenses,money('114.975',true));
 assert.equal(format(t.castle),'333.33');
});
test('rate precision does not relax currency validation or percentage bounds',()=>{
 assert.throws(()=>money('14.975'));
 for(const rate of [-0.001,100.001,'bad','14.9751']) assert.throws(()=>calculate([row],{...defaults,taxRate:rate}));
});
