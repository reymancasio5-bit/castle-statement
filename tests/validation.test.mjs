import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,buildRows,defaults} from '../public/engine.js';
const row={id:'reservation:123',reservationId:'123',guest:'Test Guest',kind:'reservation',receipts:100,tax:0,cleaning:0,cleaningPayer:'castle'};
test('invalid reservation money identifies field, guest and reservation',()=>{
 for(const [field,label] of [['receipts','Amount received'],['tax','Pass-through tax'],['cleaning','Cleaning amount']]) {
  assert.throws(()=>calculate([{...row,[field]:'12.345'}],defaults),error=>error.message.includes(label)&&error.message.includes('123')&&error.message.includes('Test Guest')&&error.message.includes('12.345'));
 }
 assert.throws(()=>calculate([{...row,tax:null}],defaults),/Pass-through tax.*missing/);
});
test('base and dated cleaning validation identify the setting',()=>{
 const s={config:{...defaults,cleaningBase:''},reservations:[{...row,id:'123',recognition:'checkout',checkOut:'2026-09-20'}],entries:[]};
 assert.throws(()=>buildRows(s),/Base cleaning cost.*missing/);
 s.config.cleaningBase=110;s.config.cleaningChanges=[{date:'2026-09-10',amount:'12.345',payer:'castle'}];
 assert.throws(()=>buildRows(s),/Cleaning change 2026-09-10.*12.345/);
});
