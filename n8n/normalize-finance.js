const request=$('Collect reservations').first().json;
const reservations=$input.all().map((item,i)=>{
 const r=$('Reservation items').itemMatching(i).json,p=item.json;
 if(p.status!=='success'||!Array.isArray(p.result))throw new Error('Invalid finance response for '+r.id);
 const fields=new Map();for(const f of p.result){if(Number(f.isDeleted)===1)continue;if(fields.has(f.name))throw new Error('Duplicate finance field '+f.name+' for '+r.id);fields.set(f.name,f);}
 const value=name=>{const v=fields.get(name)?.total;if(v==null||v===''||!Number.isFinite(Number(v)))return null;return Number(v);};
 // Missing fields stay null so the user can reconcile unsupported channels explicitly.
 return {id:String(r.id),listingId:String(r.listingMapId),status:r.status,guest:[r.guestFirstName,r.guestLastName].map(name=>typeof name==='string'?name.trim():'').filter(Boolean).join(' ')||(typeof r.guestName==='string'?r.guestName.trim():''),checkIn:String(r.arrivalDate).slice(0,10),checkOut:String(r.departureDate).slice(0,10),channel:r.channelName||String(r.channelId),currency:r.currency,receipts:value('airbnbPayoutSum'),tax:value('airbnbPassThroughTax'),sourceExtras:value('reservationExpensesAndExtras'),source:'Hostaway finance',fetchedAt:new Date().toISOString()};
});
if(reservations.length!==request.reservations.length||new Set(reservations.map(r=>r.id)).size!==reservations.length)throw new Error('Missing or duplicate finance results.');
return [{json:{schemaVersion:1,listingId:request.listingId,month:request.month,property:request.reservations[0]?.listingName||'',reservations:reservations.filter(r=>r.status!=='cancelled'||r.receipts>0)}}];
