import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeReservation} from '../public/drafts.js';
import {defaults,buildRows,calculate,money} from '../public/engine.js';
const read=n=>fs.readFileSync(new URL('../n8n/'+n,import.meta.url),'utf8');
const flow=JSON.parse(read('statement-studio-data.n8n.json'));
const request={listingId:'101',month:'2026-09',startDate:'2026-09-01',endDate:'2026-09-30'};
const reservation=(status='cancelled')=>({id:123,listingMapId:101,status,arrivalDate:'2026-09-01',departureDate:'2026-09-04',guestName:'Alex Morgan',currency:'CAD',channelName:'airbnb'});
for(const bundled of [false,true]){
 const script=(file,node)=>bundled?flow.nodes.find(n=>n.name===node).parameters.jsCode:read(file);
 test(`cancelled candidates reach finance (${bundled})`,()=>{
  const collect=new Function('$input','$',script('collect-reservations.js','Collect reservations'));
  const candidates=['new','modified','cancelled','inquiry','declined'].map((s,i)=>({...reservation(s),id:i}));
  const result=collect({all:()=>[{json:{status:'success',result:candidates}},{json:{status:'success',result:[]}}]},()=>({first:()=>({json:request})}));
  assert.deepEqual(result[0].json.reservations.map(r=>r.status),['new','modified','cancelled']);
 });
 for(const payout of [100,0,null,-10]){
  test(`cancelled payout ${payout} filtered after finance validation (${bundled})`,()=>{
   const normalize=new Function('$input','$',script('normalize-finance.js','Normalize response'));
   const r=reservation();
   const result=normalize({all:()=>[{json:{status:'success',result:payout===null?[]:[{name:'airbnbPayoutSum',total:payout}]}}]},name=>name==='Collect reservations'?{first:()=>({json:{...request,reservations:[r]}})}:{itemMatching:()=>({json:r})})[0].json;
   assert.equal(result.reservations.length,payout>0?1:0);
   if(payout>0){
    assert.equal(result.reservations[0].status,'cancelled');
    const state={config:{...defaults,listingId:'101'},reservations:[mergeReservation(result.reservations[0])],entries:[]};
    const totals=calculate(buildRows(state),state.config);
    assert.equal(totals.payout,money(100));
    assert.equal(totals.cleaning,0n);
    assert.equal(totals.ownerCleaning,0n);
   }
  });
 }
}
for(const status of ['cancelled','new','modified']){
 for(const payer of ['castle','owner']){
  test(`${status} cleaning with ${payer} override and dated rule`,()=>{
   const config={...defaults,cleaningChanges:[{date:'2026-09-01',amount:200,payer}]};
   const r={id:'123',status,checkIn:'2026-09-01',checkOut:'2026-09-04',receipts:500,tax:0,recognition:'checkout',cleaningOverride:150,cleaningPayer:payer};
   const rows=buildRows({config,reservations:[r],entries:[]});
   assert.equal(rows[0].cleaning,status==='cancelled'?0:150);
   const totals=calculate(rows,config);
   assert.equal(totals.cleaning+totals.ownerCleaning,status==='cancelled'?0n:money(150));
   assert.equal(totals.feeBase,money(status==='cancelled'?500:350));
  });
 }
}
test('cancelled payment cleaning is zero even with a stale entry status or cleaning amount',()=>{
 const config={...defaults};
 const r={id:'123',status:'cancelled',checkIn:'2026-08-01',checkOut:'2026-10-01',recognition:'payments'};
 const entry={id:'payment',reservationId:'123',kind:'payment',status:'new',entryDate:'2026-09-10',receipts:100,tax:0,cleaning:90,cleaningPayer:'owner'};
 const rows=buildRows({config,reservations:[r],entries:[entry]});
 assert.equal(rows[0].status,'cancelled');
 assert.equal(rows[0].cleaning,0);
 assert.equal(calculate(rows,config).ownerCleaning,0n);
});
test('newly imported cancelled long booking defaults to checkout; existing payment recognition is preserved',()=>{
 const fresh={id:'123',status:'cancelled',checkIn:'2026-08-01',checkOut:'2026-10-01',receipts:100};
 assert.equal(mergeReservation(fresh).recognition,'checkout');
 assert.equal(mergeReservation(fresh,{recognition:'payments'}).recognition,'payments');
 assert.equal(mergeReservation({...fresh,status:'new'}).recognition,'payments');
});
