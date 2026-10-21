import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,buildRows,calculate,decimal,csv} from '../public/engine.js';
import {restoreDraft} from '../public/drafts.js';
import {renderStatement} from '../public/render.js';
import {makePdf} from '../public/pdf.js';

const manual={id:'manual-1',kind:'manual',guest:'Manual Guest',channel:'Direct',entryDate:'2026-09-10',checkIn:'2026-08-01',checkOut:'2026-08-05',receipts:'1100',tax:'100',castlePercent:'80',cleaning:'100',cleaningPayer:'castle'};
const state=(entry=manual,config={})=>({version:1,config:{...defaults,listingId:'101',month:'2026-09',cleaningChanges:[],...config},reservations:[],entries:[entry]});

for(const mode of ['gross','net'])for(const cleaningPayer of ['castle','owner'])test(`manual reservations use all ordinary reservation calculations: ${mode}, ${cleaningPayer} cleaning`,()=>{
 const s=state({...manual,cleaningPayer},{mode});
 const t=calculate(buildRows(s),s.config);
 const imported={...manual,id:'source-1',checkOut:'2026-09-10',recognition:'checkout',cleaningOverride:'100',cleaningPayer};
 const ordinary=calculate(buildRows({...s,entries:[],reservations:[imported]}),s.config);
 for(const key of Object.keys(t).filter(k=>k!=='rows'))assert.equal(t[key],ordinary[key],key);
 assert.equal(decimal(t.payout),'1000.00');
 assert.equal(decimal(t.tax),'100.00');
 assert.equal(decimal(t.castle),'880.00');
 assert.equal(decimal(t.owner),'220.00');
 assert.equal(decimal(t.managementFee),mode==='gross'?'150.00':'135.00');
 assert.equal(decimal(t.managementTax),mode==='gross'?'19.50':'17.55');
 assert.equal(decimal(t.cleaningTax),cleaningPayer==='castle'?'13.00':'0.00');
 assert.equal(decimal(t.balance),cleaningPayer==='castle'?(mode==='gross'?'597.50':'614.45'):(mode==='gross'?'710.50':'727.45'));
});

test('manual-only drafts retain finances and render in preview, CSV and PDF',()=>{
 const s=restoreDraft(JSON.stringify(state()));
 const t=calculate(buildRows(s),s.config);
 assert.equal(t.rows.length,1);
 assert.equal(t.rows[0].reservationId,undefined);
 assert.match(renderStatement(t,s.config),/Manual Guest/);
 assert.match(csv(t),/"Manual Guest","Direct","manual","","1000.00","100.00","880.00","220.00","100.00","0.00"/);
 const pdf=new TextDecoder().decode(makePdf(t,s.config));
 assert.ok(pdf.includes(Buffer.from('Manual Guest').toString('hex')));
 assert.ok(pdf.includes(Buffer.from('614.45').toString('hex')));
});

test('manual reservation month follows entry date, and editing/removing updates totals',()=>{
 assert.equal(buildRows(state(manual,{month:'2026-08'})).length,0);
 const edited=state({...manual,receipts:'1200',tax:'200'});
 assert.equal(decimal(calculate(buildRows(edited),edited.config).payout),'1000.00');
 assert.equal(buildRows({...edited,entries:[]}).length,0);
});

test('manual reservations validate stay dates and cannot link or merge',()=>{
 for(const patch of [{checkIn:''},{checkOut:'2026-07-01'},{reservationId:'123'},{attachTo:'reservation:123'}]){
  assert.throws(()=>buildRows(state({...manual,...patch})),/manual reservation/i);
 }
});

test('extras can merge into manual reservations and contribute to fees and taxes',()=>{
 const s=state();s.entries.push({id:'extra',kind:'parking',entryDate:'2026-09-11',attachTo:manual.id,receipts:'110',tax:'10'});
 const t=calculate(buildRows(s),s.config);
 assert.equal(t.rows.length,1);
 assert.equal(decimal(t.payout),'1100.00');
 assert.equal(decimal(t.tax),'110.00');
 assert.equal(decimal(t.managementFee),'150.00');
 assert.equal(decimal(t.managementTax),'19.50');
});

test('manual reservations reject blank channels instead of silently using Airbnb',()=>{
 for(const channel of ['', '   '])assert.throws(()=>buildRows(state({...manual,channel})),/channel/i);
});
