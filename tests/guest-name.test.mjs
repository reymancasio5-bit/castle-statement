import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeReservation} from '../public/drafts.js';
import {defaults,buildRows,calculate,csv} from '../public/engine.js';
import {renderStatement} from '../public/render.js';

const read=name=>fs.readFileSync(new URL('../n8n/'+name,import.meta.url),'utf8');
const workflow=JSON.parse(read('statement-studio-data.n8n.json'));
const scripts=[read('normalize-finance.js'),workflow.nodes.find(n=>n.parameters.jsCode?.includes('sourceExtras:')).parameters.jsCode];
for(const [index,script] of scripts.entries()){
 const normalize=new Function('$input','$',script);
 for(const [label,names,expected] of [
  ['first and last names',{guestFirstName:' Alex ',guestLastName:' Morgan ',guestName:'Other name'},'Alex Morgan'],
  ['full name only',{guestName:' Alex Morgan '},'Alex Morgan'],
  ['partial name',{guestFirstName:'Alex'},'Alex'],
  ['no name',{},''],
  ['null names',{guestFirstName:null,guestLastName:null,guestName:null},''],
  ['whitespace names',{guestFirstName:' ',guestLastName:' ',guestName:' '},''],
 ]){
  test(`guest name ${index}: ${label} flows to statement and CSV`,()=>{
   const reservation={id:123,listingMapId:101,arrivalDate:'2026-09-01',departureDate:'2026-09-04',channelName:'airbnb',currency:'CAD',...names};
   const result=normalize({all:()=>[{json:{status:'success',result:[{name:'airbnbPayoutSum',total:100}]}}]},name=>name==='Collect reservations'?{first:()=>({json:{listingId:'101',month:'2026-09',reservations:[reservation]}})}:{itemMatching:()=>({json:reservation})})[0].json;
   assert.equal(result.reservations[0].guest,expected);
   const state={config:{...defaults,listingId:'101'},reservations:result.reservations.map(r=>mergeReservation(r)),entries:[]};
   const totals=calculate(buildRows(state),state.config);
   assert.equal(totals.rows[0].guest,expected);
   assert.ok(renderStatement(totals,state.config).includes(`<td>${expected}</td>`));
   assert.ok(csv(totals).includes(`"${expected}","airbnb"`));
  });
 }
}
