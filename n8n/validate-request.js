const q=$input.first().json.query||{};
if(!/^\d+$/.test(String(q.listingId||''))||!Number.isSafeInteger(Number(q.listingId))||Number(q.listingId)<=0)throw new Error('A positive numeric listingId is required.');
if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(q.month||''))throw new Error('month must be YYYY-MM.');
const [y,m]=q.month.split('-').map(Number);
return [{json:{listingId:String(q.listingId),month:q.month,startDate:q.month+'-01',endDate:q.month+'-'+new Date(Date.UTC(y,m,0)).getUTCDate()}}];
