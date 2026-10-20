import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {preparePdfFont} from '../public/pdf-font.js';
import {makePdf} from '../public/pdf.js';
import {calculate,defaults} from '../public/engine.js';
const bytes=fs.readFileSync(new URL('../public/fonts/NotoSansSC-Regular.otf',import.meta.url));
test('Chinese owner and guest names use an embedded font with Unicode text mappings',async()=>{
 const c={...defaults,owner:'刘瑞霞',listingId:'101'};
 const rows=[{id:'1',kind:'claim',guest:'劉瑞霞 / Andrée',checkIn:'2026-09-01',checkOut:'2026-09-02',entryDate:'2026-09-02',receipts:100,tax:0,castlePercent:100}];
 const t=calculate(rows,c),font=await preparePdfFont(t,c,bytes);
 const pdf=Buffer.from(makePdf(t,c,null,font)).toString('latin1');
 assert.match(pdf,/\/FontFile3/);
 assert.match(pdf,/\/Subtype \/OpenType/);
 assert.match(pdf,/\/Filter \/FlateDecode/);
 assert.match(pdf,/\/ToUnicode/);
 for(const char of '刘瑞霞劉')assert.ok(pdf.includes(char.charCodeAt(0).toString(16)));
 assert.ok(font.bytes.length<bytes.length,'Embedded font should be compressed');
 assert.ok(font.width('刘瑞霞',8)>20,'Chinese glyphs require their full width');
 assert.throws(()=>makePdf(t,c),/font/i,'Never silently replace Chinese with question marks');
});
test('Western-only statements do not need the Chinese font download',async()=>{
 const c={...defaults,owner:'Andrée-Anne'},t=calculate([],c);
 assert.equal(await preparePdfFont(t,c),null);
});
test('font fetch errors prevent a corrupted export and allow a retry',async()=>{
 const original=globalThis.fetch,c={...defaults,owner:'刘瑞霞'},t=calculate([],c);
 try{
  globalThis.fetch=async()=>({ok:false,status:404});
  await assert.rejects(()=>preparePdfFont(t,c),/font/i);
  globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  assert.ok(await preparePdfFont(t,c));
 }finally{globalThis.fetch=original;}
});
