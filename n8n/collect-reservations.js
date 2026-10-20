const request=$('Validate request').first().json,pages=$input.all().map(x=>x.json);
if(!pages.length||pages.some(p=>p.status!=='success'||!Array.isArray(p.result)))throw new Error('Invalid reservation API response.');
if(pages.at(-1).result.length!==0)throw new Error('Pagination limit reached; incomplete results rejected.');
const reservations=[],seen=new Set();
for(const r of pages.flatMap(p=>p.result)){
 if(String(r.listingMapId)!==request.listingId)throw new Error('Hostaway returned a different listing.');
 if(seen.has(String(r.id)))continue;seen.add(String(r.id));
 if(!['new','modified','cancelled'].includes(r.status))continue;
 const a=String(r.arrivalDate||'').slice(0,10),d=String(r.departureDate||'').slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(a)||!/^\d{4}-\d{2}-\d{2}$/.test(d))throw new Error('Missing reservation dates for '+r.id);
 if(a<=request.endDate&&d>=request.startDate)reservations.push(r);
}
return [{json:{...request,reservations}}];
