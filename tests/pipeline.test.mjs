import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeReservation,restoreDraft} from '../public/drafts.js';
import {defaults,calculate,buildRows,format,csv} from '../public/engine.js';
import {renderStatement} from '../public/render.js';
import {makePdf} from '../public/pdf.js';
const normalize=new Function('$input','$',fs.readFileSync(new URL('../n8n/normalize-finance.js',import.meta.url),'utf8'));
function fetched(fields){const reservation={id:123,listingMapId:101,guestName:'Fixture Guest',arrivalDate:'2026-09-01',departureDate:'2026-09-04',channelName:'airbnb',currency:'CAD'};return normalize({all:()=>[{json:{status:'success',result:fields}}]},name=>name==='Collect reservations'?{first:()=>({json:{listingId:'101',month:'2026-09',reservations:[reservation]}})}:{itemMatching:()=>({json:reservation})})[0].json.reservations[0];}
for(const mode of ['gross','net'])test(`finance to saved draft to preview/PDF/CSV: ${mode} and 14.975%`,()=>{
 const fresh=fetched([{name:'airbnbPayoutSum',total:1100},{name:'airbnbPassThroughTax',total:100}]);
 const s=restoreDraft(JSON.stringify({version:1,config:{...defaults,listingId:'101',month:'2026-09',mode,managementRate:'15',taxRate:'14.975',cleaningTaxRate:'14.975',cleaningBase:'100',cleaningChanges:[]},reservations:[mergeReservation(fresh)],entries:[]}));
 const t=calculate(buildRows(s),s.config);
 assert.equal(format(t.managementFee),mode==='gross'?'150.00':'135.00');
 assert.equal(format(t.balance),mode==='gross'?'812.56':'829.81');
 assert.match(renderStatement(t,s.config),/Fee tax \(14\.975%\)/);
 assert.ok(csv(t).includes(mode==='gross'?'"managementTax","22.4625"':'"managementTax","20.21625"'));
 assert.ok(new TextDecoder().decode(makePdf(t,s.config)).startsWith('%PDF-1.4'));
});
test('missing Hostaway tax defaults to zero at the app import boundary',()=>{
 const fresh=fetched([{name:'airbnbPayoutSum',total:1100}]);
 assert.equal(fresh.tax,null);
 const s={config:{...defaults,listingId:'101'},reservations:[mergeReservation(fresh)],entries:[]};
 assert.equal(calculate(buildRows(s),s.config).tax,0n);
});
test('all extra entry kinds generate preview and exports with three-decimal expense tax',()=>{
 const entries=['eci','late','parking','resolution','claim','expense'].map((kind,i)=>({id:String(i),kind,guest:'Fixture '+kind,receipts:'20.00',tax:'0',entryDate:'2026-09-10',checkIn:'2026-08-01',checkOut:'2026-08-02',expenseTax:'14.975',castlePercent:'33.333'}));
 const s={config:{...defaults,listingId:'101',mode:'gross',taxRate:'14.975'},reservations:[],entries};
 const t=calculate(buildRows(s),s.config);
 assert.equal(format(t.payout),'100.00');assert.equal(format(t.managementFee),'15.00');assert.equal(t.cleaning,0n);
 assert.match(renderStatement(t,s.config),/<mark>airbnb-claim<\/mark>/);
 assert.match(csv(t),/airbnb-claim/);assert.ok(makePdf(t,s.config).length>1000);
});
