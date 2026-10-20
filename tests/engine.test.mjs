import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,buildRows,defaults,money,format,cleaningFor} from '../public/engine.js';
const c=()=>({...defaults,month:'2026-09',listingId:'101',managementRate:10,taxRate:14.98,cleaningTaxRate:14.98,cleaningBase:80});
const row=(id,receipts,tax,cleaning)=>({id,kind:'reservation',checkIn:'2026-09-01',checkOut:'2026-09-03',entryDate:'2026-09-03',guest:'Guest',channel:'airbnb',receipts,tax,cleaning,cleaningPayer:'castle',castlePercent:100});
test('workbook full precision and original September total',()=>{
 const rows=[row('1',376.17,53.62,80),row('2',487.43,73.38,80),row('3',687.37,103.48,80),row('4',2475.93,372.73,85)];
 const t=calculate(rows,c());assert.equal(format(t.balance),'3,296.93');assert.equal(format(t.managementFee),'309.87');assert.equal(t.managementFee,money('309.869',true));
});
test('gross and net formulas and split do not reduce commission',()=>{
 let config={...c(),taxRate:13,cleaningTaxRate:13,managementRate:15};let rows=[row('1',1100,100,100)];
 assert.equal(format(calculate(rows,config).managementFee),'135.00');config.mode='gross';assert.equal(format(calculate(rows,config).managementFee),'150.00');
 rows[0].castlePercent=30;const t=calculate(rows,config);assert.equal(format(t.castle),'330.00');assert.equal(format(t.owner),'770.00');assert.equal(format(t.managementFee),'150.00');assert.equal(format(t.balance),'47.50');
});
test('claim cannot accrue cleaning and counts for commission; negative balance supported',()=>{
 const r={...row('claim',150,0,999),kind:'claim'};const t=calculate([r],{...c(),castlePercent:0});assert.equal(t.cleaning,0n);assert.equal(format(t.managementFee),'15.00');
 r.castlePercent=0;assert.ok(calculate([r],c()).balance<0n);
});
test('dated cleaning uses inclusive checkout and payer changes',()=>{
 const config={...c(),cleaningBase:110,cleaningChanges:[{date:'2026-09-26',amount:85,payer:'owner'}]};
 assert.deepEqual(cleaningFor('2026-09-25',config),{amount:110,payer:'castle'});assert.deepEqual(cleaningFor('2026-09-26',config),{amount:85,payer:'owner'});
});
test('monthly long stay uses actual payments only, checkout never duplicates full payout',()=>{
 const state={config:c(),reservations:[{id:'r',checkIn:'2026-08-01',checkOut:'2026-10-03',recognition:'payments',receipts:6000,tax:0,currency:'CAD',guest:'Long stay',channel:'airbnb'}],entries:[{...row('p1',2000,0,0),kind:'payment',reservationId:'r',entryDate:'2026-09-30'},{...row('p2',2000,0,0),kind:'payment',reservationId:'r',entryDate:'2026-10-01'}]};
 const rows=buildRows(state);assert.equal(rows.length,1);assert.equal(rows[0].receipts,2000);state.config.month='2026-10';assert.equal(buildRows(state).length,1);
});
test('merged and separate extras reconcile identically and claims use entry month',()=>{
 const state={config:c(),reservations:[{id:'r',checkIn:'2026-09-01',checkOut:'2026-09-03',recognition:'checkout',receipts:500,tax:0,currency:'CAD',guest:'A',channel:'airbnb'}],entries:[{...row('e',20,0,0),kind:'resolution',attachTo:'reservation:r',entryDate:'2026-09-03'}]};
 const merged=calculate(buildRows(state),c());state.entries[0].attachTo='';const separate=calculate(buildRows(state),c());assert.equal(merged.balance,separate.balance);assert.equal(merged.managementFee,separate.managementFee);
 state.entries=[{...row('claim',150,0,99),kind:'claim',checkIn:'2026-08-01',checkOut:'2026-08-03',entryDate:'2026-09-05'}];assert.equal(buildRows(state).length,2);
});
test('zero payout guard and owner cleaning treatment',()=>{
 const r=row('r',0,0,80);let t=calculate([r],c());assert.equal(t.managementFee,0n);
 r.receipts=500;r.cleaningPayer='owner';t=calculate([r],c());assert.equal(t.cleaning,0n);assert.equal(format(t.feeBase),'420.00');assert.equal(t.castleExpense,0n);
});
test('invalid, duplicate and orphaned inputs fail visibly',()=>{
 assert.throws(()=>money(''),/amount/i);assert.throws(()=>calculate([row('a',100,0,0),row('a',100,0,0)],c()),/duplicate/i);
 assert.throws(()=>cleaningFor('2026-02-30',c()),/date/i);
 assert.throws(()=>buildRows({config:c(),reservations:[],entries:[{...row('x',20,0,0),kind:'resolution',attachTo:'missing'}]}),/target/i);
});
