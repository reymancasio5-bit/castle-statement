import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeReservation,restoreDraft} from '../public/drafts.js';
import {defaults,buildRows,calculate,format} from '../public/engine.js';
const fresh={id:'r',guest:'Test',checkIn:'2026-09-01',checkOut:'2026-09-04',receipts:1000};
test('absent Hostaway tax defaults to zero and exports can calculate',()=>{
 for(const tax of [undefined,null,'','   ']){
  const r=mergeReservation({...fresh,tax});assert.equal(r.tax,0);assert.equal(r.sourceTax,0);
  const t=calculate(buildRows({config:defaults,reservations:[r],entries:[]}),defaults);assert.equal(format(t.tax),'0.00');
 }
});
test('existing tax and explicit user overrides are preserved',()=>{
 assert.equal(mergeReservation({...fresh,tax:14.98}).tax,14.98);
 assert.equal(mergeReservation({...fresh,tax:null},{tax:'12.34',manualFields:['tax']}).tax,'12.34');
 assert.equal(mergeReservation({...fresh,tax:null},{tax:'',manualFields:['tax']}).tax,'');
 assert.equal(mergeReservation({...fresh,tax:'invalid'}).tax,'invalid');
 assert.equal(mergeReservation({...fresh,receipts:null,tax:null}).receipts,null);
});
test('saved drafts migrate missing source tax without overwriting manual amounts',()=>{
 const d=restoreDraft(JSON.stringify({version:1,config:{...defaults,listingId:'101'},reservations:[{...fresh,tax:null,sourceTax:null},{...fresh,id:'manual',tax:'12.34',sourceTax:null,manualFields:['tax']}],entries:[]}));
 assert.equal(d.reservations[0].tax,0);assert.equal(d.reservations[0].sourceTax,0);
 assert.equal(d.reservations[1].tax,'12.34');assert.equal(d.reservations[1].sourceTax,0);
});
