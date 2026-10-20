// Noto Sans SC (SIL OFL) is loaded locally only for text outside WinAnsi.
export const needsPdfFont=s=>/[^\u0000-\u00ff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/u.test(String(s??''));
let cachedFont;
async function loadFont(){
 if(!cachedFont)cachedFont=(async()=>{
  const response=await fetch(new URL('./fonts/NotoSansSC-Regular.otf',import.meta.url));
  if(!response.ok)throw Error('Chinese PDF font could not be loaded. Refresh the page and try again.');
  return new Uint8Array(await response.arrayBuffer());
 })().catch(error=>{cachedFont=null;throw error;});
 return cachedFont;
}
export async function preparePdfFont(t,c,fontBytes){
 const source=JSON.stringify([t,c],(_,v)=>typeof v==='bigint'?String(v):v);
 if(!needsPdfFont(source))return null;
 const {default:fontkit}=await import('./vendor/fontkit.js');
 const bytes=fontBytes||await loadFont(),font=fontkit.create(bytes);
 const glyphs=new Map(),scale=1000/font.unitsPerEm;
 // This CID-keyed font keeps its original CIDs, which differ from glyph indices.
 const ranges=font['CFF '].topDict.charset.ranges;
 const cidFor=gid=>{const range=ranges.find(r=>gid-1>=r.offset&&gid-1<=r.offset+r.nLeft);if(!range)throw Error('Invalid Chinese PDF font character map.');return range.first+gid-1-range.offset;};
 // Include ASCII used by generated labels along with the actual statement text.
 const characters=new Set([...Array.from({length:95},(_,i)=>String.fromCharCode(i+32)).join('')+source]);
 for(const char of characters){
  if(char.codePointAt(0)<32)continue;
  const glyph=font.glyphForCodePoint(char.codePointAt(0));
  if(!glyph.id)throw Error(`The PDF font does not support "${char}". Please use another character.`);
  glyphs.set(char,{id:cidFor(glyph.id),width:Math.round(glyph.advanceWidth*scale)});
 }
 const lookup=char=>{const glyph=glyphs.get(char);if(!glyph)throw Error(`PDF font is missing "${char}".`);return glyph;};
 const compressed=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
 return {bytes:compressed,glyphs,bbox:[font.bbox.minX,font.bbox.minY,font.bbox.maxX,font.bbox.maxY].map(v=>Math.round(v*scale)),ascent:Math.round(font.ascent*scale),descent:Math.round(font.descent*scale),capHeight:Math.round(font.capHeight*scale),
  encode:s=>[...String(s??'')].map(char=>lookup(char).id.toString(16).padStart(4,'0')).join(''),
  width:(s,size)=>[...String(s??'')].reduce((n,char)=>n+lookup(char).width,0)*size/1000};
}
export function embedPdfFont(add,font){
 const binary=Array.from(font.bytes,b=>String.fromCharCode(b)).join('');
 const file=add(`<< /Subtype /OpenType /Filter /FlateDecode /Length ${binary.length} >>\nstream\n${binary}\nendstream`);
 const name='NotoSansSC-Regular';
 const descriptor=add(`<< /Type /FontDescriptor /FontName /${name} /Flags 4 /FontBBox [${font.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${font.ascent} /Descent ${font.descent} /CapHeight ${font.capHeight} /StemV 80 /FontFile3 ${file} 0 R >>`);
 const widths=new Map([...font.glyphs.values()].map(g=>[g.id,g.width]));
 const descendant=add(`<< /Type /Font /Subtype /CIDFontType0 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /DW 1000 /W [${[...widths].map(([id,width])=>`${id} [${width}]`).join(' ')}] >>`);
 const unicode=s=>s.split('').map(char=>char.charCodeAt(0).toString(16).padStart(4,'0')).join('');
 const mappings=[...new Map([...font.glyphs].map(([char,g])=>[g.id,char]))];
 let cmap='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /CastleUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <ffff>\nendcodespacerange\n';
 for(let i=0;i<mappings.length;i+=100){const batch=mappings.slice(i,i+100);cmap+=`${batch.length} beginbfchar\n`+batch.map(([id,char])=>`<${id.toString(16).padStart(4,'0')}> <${unicode(char)}>`).join('\n')+'\nendbfchar\n';}
 cmap+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
 const toUnicode=add(`<< /Length ${cmap.length} >>\nstream\n${cmap}\nendstream`);
 return add(`<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${toUnicode} 0 R >>`);
}
