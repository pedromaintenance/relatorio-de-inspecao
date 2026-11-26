/* Self-contained HTML, PDF print, DOCX and XLSX: no internet or third-party libs. */
(function(global){'use strict';
const UTF8=new TextEncoder(), xmlEscape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const htmlEscape=xmlEscape;
const styleNames=['body','title','section','subheading','caption'];
const styleName=(name,fallback='body')=>styleNames.includes(name)?name:fallback;
const columns=row=>[1,2,3,4].includes(Number(row.columns))?Number(row.columns):2;
function richRuns(html){
 const root=new DOMParser().parseFromString(String(html||''),'text/html').body,out=[];
 const br=()=>out.push({br:true});
 function walk(node,fmt={}){
  if(node.nodeType===3){if(node.nodeValue)out.push({...fmt,text:node.nodeValue});return;}
  if(node.nodeType!==1)return;
  const tag=node.tagName;if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','TEMPLATE'].includes(tag))return;
  if(tag==='BR'){br();return;}
  const block=['DIV','P','LI'].includes(tag);
  if(block&&out.length&&!out.at(-1).br)br();
  const st=node.style||{};
  const next={bold:fmt.bold||['B','STRONG'].includes(tag)||/bold|[6-9]00/.test(st.fontWeight||''),italic:fmt.italic||['I','EM'].includes(tag)||st.fontStyle==='italic',underline:fmt.underline||tag==='U'||(st.textDecoration||'').includes('underline')};
  Array.from(node.childNodes).forEach(child=>walk(child,next));
  if(block&&node.nextSibling&&!out.at(-1)?.br)br();
 }
 Array.from(root.childNodes).forEach(n=>walk(n));return out;
}
function cleanRich(html){return richRuns(html).map(r=>{if(r.br)return '<br>';let t=htmlEscape(r.text);if(r.bold)t='<b>'+t+'</b>';if(r.italic)t='<i>'+t+'</i>';if(r.underline)t='<u>'+t+'</u>';return t;}).join('');}
function plainRich(html){return richRuns(html).map(r=>r.br?'\n':r.text).join('');}
function richHTML(row){return typeof row.rich==='string'?cleanRich(row.rich):htmlEscape(row.text||'').replace(/\n/g,'<br>');}
function headingHTML(row){return row.heading?'<div class="doc-'+styleName(row.headingStyle,'section')+' row-title">'+htmlEscape(row.heading)+'</div>':'';}
function photosHTML(row,photos){let html='';const n=columns(row);for(let i=0;i<photos.length;i+=n){html+='<div class="photo-line" style="--cols:'+n+'">'+photos.slice(i,i+n).map(p=>'<figure class="photo'+(row.largePhotos?' maximized':'')+'">'+(p.note?'<div class="photo-note">'+htmlEscape(p.note)+'</div>':'')+'<img src="'+htmlEscape(p.dataUrl)+'" alt="'+htmlEscape(p.caption||'Fotografia')+'">'+(p.caption?'<figcaption>'+htmlEscape(p.caption)+'</figcaption>':'')+'</figure>').join('')+'</div>';}return html;}
const docStyles={body:{size:22},title:{size:36,bold:true,color:'005471',center:true,font:'Montserrat',keep:true},section:{size:28,bold:true,color:'C3942C',center:true,font:'Montserrat',keep:true},subheading:{size:24,bold:true,color:'005471',keep:true},caption:{size:18,italic:true,color:'657A84',center:true}};

const pad=n=>String(n).padStart(2,'0');
function basename(title){return String(title||'Relatorio_Inspecao').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,75)||'Relatorio_Inspecao';}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function dataBytes(uri){const base=uri.split(',')[1]||'';const binary=atob(base),arr=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)arr[i]=binary.charCodeAt(i);return arr;}
function photoEntries(state){
 const pics=[];
 for(let i=0;i<(state.rows||[]).length;i++){
  const row=state.rows[i];
  if(row.type!=='photo' && !(row.type==='assessment'&&row.assessment==='not-ok'))continue;
  for(let j=0;j<(row.photos||[]).length;j++){
   const photo=row.photos[j];if(!photo.dataUrl?.startsWith('data:image/'))continue;
   const ext=photo.dataUrl.startsWith('data:image/png')?'png':'jpg';
   pics.push({...photo,ref:`foto_${String(i+1).padStart(3,'0')}_${j+1}.${ext}`,block:i+1,ext});
  }
 }
 return pics;
}
function machineLine(state){const m=state.meta||{};return `TAG: ${m.tag||'—'}  |  Modelo: ${m.model||'—'}  |  Horímetro: ${m.hours||'—'} h  |  Odômetro: ${m.odometer||'—'} km`;}
function assessmentTitle(row){return row.assessment==='ok'?'OK':row.assessment==='not-ok'?'Não OK':'Não avaliado';}
const severityLabels={'monitorar':'Monitorar','anormal':'Anormal','critico':'Crítico','muito-critico':'Muito Crítico'};
function severityText(row){return row.assessment==='not-ok'?(severityLabels[row.severity]||'Sem classificação'):'';}
function safeRows(state){return (state.rows||[]).filter(r=>r.type!=='empty');}
const docInfo=state=>GMINDocument.control(state.document);
const docPairs=d=>GMINDocument.fields.filter(([k])=>k!=='footer'&&d[k]).map(([k,label])=>[label,d[k]]);
const cssString=value=>'"'+Array.from(String(value||'').slice(0,180)).map(c=>'\\'+c.codePointAt(0).toString(16)+' ').join('')+'"';
function reportTableHTML(row){
 const t=GMINDocument.table(row.table);
 const rowHTML=(cells,head)=>'<tr>'+cells.map(c=>'<'+(head?'th':'td')+' colspan="'+c.span+'">'+htmlEscape(c.text)+'</'+(head?'th':'td')+'>').join('')+'</tr>';
 return headingHTML(row)+'<table class="doc-table"><colgroup>'+Array(t.cols).fill('<col>').join('')+'</colgroup>'+(t.header?'<thead>'+rowHTML(t.rows[0],true)+'</thead>':'')+'<tbody>'+t.rows.slice(t.header?1:0).map(r=>rowHTML(r,false)).join('')+'</tbody></table>';
}
function reportListHTML(row){
 const mode=GMINDocument.listMode(row.listMode),tag=mode==='number'?'ol':'ul';
 return headingHTML(row)+'<section class="block"><'+tag+' class="doc-list '+mode+'">'+(row.items||[]).map(item=>'<li class="'+(mode==='check'&&item.done?'checked':'')+'">'+(mode==='check'?'<span class="check">'+(item.done?'✓':'')+'</span>':'')+htmlEscape(item.text)+'</li>').join('')+'</'+tag+'></section>';
}
function reportHTML(state,{print=false}={}){
const d=docInfo(state),pairs=docPairs(d);
const docCSS='.doc-control{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 18px;font-size:12px;border-top:1px solid #d4e0e5;border-bottom:1px solid #d4e0e5;padding:10px 0;margin-bottom:16px}.doc-control b{color:#005471}.doc-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;margin:8px 0 20px}.doc-table th,.doc-table td{border:1px solid #95adb7;vertical-align:top;padding:7px;white-space:pre-wrap;overflow-wrap:anywhere}.doc-table th{background:#005471;color:white;text-align:left}.doc-table tbody tr:nth-child(even){background:#f2f6f7}.doc-list.bullet{list-style:disc;padding-left:24px}.doc-list.number{list-style:decimal;padding-left:24px}.doc-footer{border-top:2px solid #C3942C;color:#657a84;font-size:11px;margin-top:24px;padding-top:8px}@media print{.doc-table{print-color-adjust:exact;-webkit-print-color-adjust:exact}.doc-table thead{display:table-header-group}.doc-table tr{break-inside:avoid}.doc-footer{display:none}}'+(d.enabled?'@page{size:A4;margin:18mm 14mm 17mm;'+(d.repeatHeader?'@top-center{content:'+cssString([state.kicker,d.code,d.revision&&'Rev. '+d.revision].filter(Boolean).join(' · '))+';font:9pt sans-serif;color:#005471;}':'')+(d.footer?'@bottom-left{content:'+cssString(d.footer)+';font:8pt sans-serif;color:#657a84;}':'')+(d.pageNumbers?'@bottom-right{content:"Página " counter(page) " / " counter(pages);font:9pt sans-serif;color:#005471;}':'')+'}':'');
const docMeta=d.enabled&&pairs.length?'<div class="doc-control">'+pairs.map(([label,value])=>'<div><b>'+htmlEscape(label)+':</b> '+htmlEscape(value)+'</div>').join('')+'</div>':'';

const styles=`*{box-sizing:border-box}body{margin:0;background:#eaf0f3;color:#1b313b;font-family:'Segoe UI',Arial,sans-serif}article{max-width:840px;min-height:600px;margin:25px auto;padding:52px 65px;background:white;box-shadow:0 10px 35px #002e441c}header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e0e8eb;padding-bottom:22px}img.logo{width:175px;height:auto}header span{font-size:10px;letter-spacing:.07em;color:#718a96;font-weight:700;text-align:right}h1{font-size:26px;color:#005471;line-height:1.25;margin:26px 0 8px}p.meta{color:#83959e;font-size:11px;margin:0 0 28px}.block{margin-bottom:22px;break-inside:avoid}.text{line-height:1.62;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}ul{padding-left:0;list-style:none}li{padding:5px 0;font-size:14px}li.checked{text-decoration:line-through;color:#718793}.check{display:inline-block;border:1px solid #8aa1ac;width:13px;height:13px;margin-right:9px;text-align:center;font-size:10px;line-height:11px}.photos{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}.photo{break-inside:avoid}.photo img{width:100%;height:auto;max-height:350px;object-fit:contain;border-radius:6px;border:1px solid #e3e9ec}.photo figcaption{font-size:12px;color:#516a77;padding-top:4px}figure{margin:0}@media(max-width:600px){article{margin:0;padding:25px 17px}.photos{grid-template-columns:1fr}}@page{size:A4;margin:14mm}@media print{body{background:#fff}article{padding:0;min-height:0;box-shadow:none;margin:0;max-width:none}.block.photos{break-inside:auto}.photos{display:block}.photo{display:inline-block;vertical-align:top;width:47%;margin:0 2% 14px 0;page-break-inside:avoid}}`;
const extraStyles=`.machine{border:1px solid #dde6e9;padding:10px 12px;margin:15px 0 24px;border-radius:6px;font-size:12px;color:#254e60}.assessment{border:1px solid #d0dbe1;border-left:5px solid #a0b4c0;border-radius:7px;padding:13px 15px;margin-bottom:13px;break-inside:avoid}.assessment .sys{font-size:10px;font-weight:800;color:#587a88;margin-bottom:5px;text-transform:uppercase}.assessment .command{font-weight:750;font-size:14px;white-space:pre-wrap}.assessment .result{font-weight:800;font-size:12px;margin:7px 0}.assessment .comment{font-size:13px;white-space:pre-wrap;margin:10px 0}.assessment .photos{margin-top:12px}.assessment.ok{background:#eef8ee;border-left-color:#208154}.assessment.monitorar{background:#fff7cc;border-left-color:#c9ad00}.assessment.anormal{background:#fff0df;border-left-color:#da7523}.assessment.critico{background:#ffebe9;border-left-color:#be2828}.assessment.muito-critico{background:#f2e2e7;border-left-color:#651226;font-weight:900}.assessment.nao-ok{background:#f9f0e8;border-left-color:#bd8160}@media print{.assessment,.machine{print-color-adjust:exact;-webkit-print-color-adjust:exact}}`;
const generalStyles=`.doc-body{font:14px/1.6 'Segoe UI',Arial,sans-serif}.doc-title,.doc-section{font-family:Montserrat,'Segoe UI',Arial,sans-serif;text-align:center;font-weight:700;break-after:avoid}.doc-title{font-size:25px;color:#005471}.doc-section{font-size:20px;color:#C3942C}.doc-subheading{font-size:16px;color:#005471;font-weight:700;break-after:avoid}.doc-caption{font-size:12px;color:#657a84;font-style:italic;text-align:center}.row-title{margin:10px 0 8px;break-after:avoid}.rich-block{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 12px;break-inside:auto}.photo-line{display:grid;grid-template-columns:repeat(var(--cols,2),minmax(0,1fr));gap:12px;margin:12px 0;break-inside:avoid}.photo-note,.photo figcaption{white-space:pre-wrap;overflow-wrap:anywhere}.photo-note{font-size:13px;margin:0 0 6px}.photo.maximized img{max-height:230mm}.page-break{height:1px;border-top:1px dashed #b5c1c7;margin:22px 0}.block.general-photo{break-inside:auto}.assessment:has(.photo-line){break-inside:auto}@media print{.page-break{break-after:page;page-break-after:always;height:0;border:0;margin:0}.photo-line .photo{display:block;width:auto;margin:0}.photo.maximized img{max-height:190mm}.photo img{max-height:95mm}.block{orphans:2;widows:2}}`;
const blocks=safeRows(state).map(row=>{
  if(row.type==='page-break')return '<div class="page-break" aria-label="Quebra de página"></div>';
  if(row.type==='text'||row.type==='header')return headingHTML(row)+`<section class="rich-block doc-${styleName(row.textStyle,row.type==='header'?'title':'body')}">${richHTML(row)}</section>`;
  if(row.type==='list')return reportListHTML(row);
  if(row.type==='table')return reportTableHTML(row);
  if(row.type==='photo')return headingHTML(row)+`<section class="block general-photo">${row.text?`<div class="rich-block doc-${styleName(row.textStyle)}">${richHTML(row)}</div>`:''}${photosHTML(row,row.photos||[])}</section>`;
  if(row.type==='assessment'){
    const level=row.assessment==='ok'?'ok':(row.assessment==='not-ok'?(row.severity||'nao-ok'):'');
    const photos=row.assessment==='not-ok'?(row.photos||[]):[];
    return headingHTML(row)+`<section class="assessment ${level}"><div class="sys">${htmlEscape(row.system||'AVALIAÇÃO DE CAMPO')}</div><div class="command">${htmlEscape(row.command||'Comando não preenchido')}</div>
    <div class="result">${htmlEscape(assessmentTitle(row))}${row.assessment==='not-ok'?' · '+htmlEscape(severityText(row)):''}</div>
    ${row.assessment==='not-ok'&&row.comment?`<p class="comment">${htmlEscape(row.comment)}</p>`:''}
    ${photosHTML(row,photos)}</section>`;
  }
  return '';
}).join('\n');
return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(state.title)}</title><style>${styles}${extraStyles}${generalStyles}${docCSS}</style></head><body><article><header><img class="logo" src="${global.GMIN_LOGO_DATA}" alt="G Mining Mina TZ"><span>${htmlEscape(state.kicker??'ENGENHARIA & MANUTENÇÃO DE MINA')}</span></header><h1>${htmlEscape(state.title)}</h1><p class="meta">Relatório técnico · Gerado em ${htmlEscape(new Date().toLocaleString('pt-BR'))}</p>${state.showMachine===false?'':`<p class="machine">${htmlEscape(machineLine(state))}</p>`}${docMeta}${blocks}${d.enabled&&d.footer?`<footer class="doc-footer">${htmlEscape(d.footer)}</footer>`:''}</article>${print?'<script>window.addEventListener("load",()=>{setTimeout(()=>window.print(),250)})<\/script>':''}</body></html>`;
}
function printPDF(state){const w=window.open('','_blank');if(!w)throw Error('O navegador bloqueou a janela. Habilite pop-ups para exportar PDF.');w.document.open();w.document.write(reportHTML(state,{print:true}));w.document.close();}
function makeDOCX(state){
  const d=docInfo(state),extraParts=[],extraTypes=[];
  const pictures=photoEntries(state),media=[],rels=[{id:'rId1',type:'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',target:'media/logo.png'}],logo=dataBytes(global.GMIN_LOGO_DATA);media.push({name:'word/media/logo.png',data:logo});
  let picNum=2;for(const p of pictures){p.rid='rId'+picNum++;p.mediaName='word/media/'+p.ref;media.push({name:p.mediaName,data:dataBytes(p.dataUrl)});rels.push({id:p.rid,type:'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',target:'media/'+p.ref});}
  const p=(text,opt={})=>`<w:p><w:pPr>${opt.keep?'<w:keepNext/>':''}${opt.center?'<w:jc w:val="center"/>':''}${opt.bullet?'<w:ind w:left="360"/>':''}${opt.space?'<w:spacing w:after="150"/>':''}</w:pPr><w:r><w:rPr>${opt.font?`<w:rFonts w:ascii="${opt.font}" w:hAnsi="${opt.font}"/>`:'<w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>'}${opt.bold?'<w:b/>':''}${opt.italic?'<w:i/>':''}${opt.underline?'<w:u w:val="single"/>':''}${opt.color?`<w:color w:val="${opt.color}"/>`:''}${opt.size?`<w:sz w:val="${opt.size}"/>`:''}${opt.strike?'<w:strike/>':''}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
  function drawing(rid,id,width,height,maxW=5000000,maxH=6500000){const ow=Math.max(1,width||1200),oh=Math.max(1,height||900),cx=Math.min(maxW,Math.round(maxH*ow/oh)),cy=Math.round(cx*oh/ow);return `<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Imagem ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="Fotografia ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;}
  function richWord(row){
    const opt=docStyles[styleName(row.textStyle,row.type==='header'?'title':'body')];
    const runs=richRuns(richHTML(row)), paragraphs=[[]];for(const r of runs){if(r.br)paragraphs.push([]);else paragraphs.at(-1).push(r);}
    return paragraphs.map(parts=>'<w:p><w:pPr>'+(opt.keep?'<w:keepNext/>':'')+'<w:spacing w:after="120"/>'+(opt.center?'<w:jc w:val="center"/>':'')+'</w:pPr>'+parts.map(r=>'<w:r><w:rPr><w:rFonts w:ascii="'+(opt.font||'Segoe UI')+'" w:hAnsi="'+(opt.font||'Segoe UI')+'"/>'+((opt.bold||r.bold)?'<w:b/>':'')+((opt.italic||r.italic)?'<w:i/>':'')+((r.underline)?'<w:u w:val="single"/>':'')+(opt.color?'<w:color w:val="'+opt.color+'"/>':'')+'<w:sz w:val="'+opt.size+'"/></w:rPr><w:t xml:space="preserve">'+xmlEscape(r.text)+'</w:t></w:r>').join('')+'</w:p>').join('');
  }
  const blocks=[drawing('rId1',1,1000,401,2050000),p(state.kicker??'ENGENHARIA & MANUTENÇÃO DE MINA',{color:'005471',bold:true,size:18}),p(state.title,{color:'005471',bold:true,size:32,space:true}),...(state.showMachine===false?[]:[p(machineLine(state),{color:'005471',bold:true,size:20,space:true})]),p('Relatório técnico · '+new Date().toLocaleString('pt-BR'),{color:'8295A0',size:18,space:true})];
  if(d.enabled)for(const [label,value] of docPairs(d))blocks.push(p(label+': '+value,{size:20,space:true}));
  const wordNS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const relNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
  const hdr= d.enabled&&d.repeatHeader;
  const ftr= d.enabled&&(d.pageNumbers||d.footer);
  function addPart(name,type,content){
    const rid='rId'+picNum++;rels.push({id:rid,type:relNS+type,target:name+'.xml'});
    extraParts.push({name:'word/'+name+'.xml',data:content});
    extraTypes.push('<Override PartName="/word/'+name+'.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.'+type+'+xml"/>');
    return rid;
  }
  const headerId=hdr?addPart('header1','header','<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="'+wordNS+'">'+p([state.kicker,d.code,d.revision&&'Rev. '+d.revision].filter(Boolean).join(' · '),{color:'005471',size:18})+'</w:hdr>'):'';
  const footerId=ftr?addPart('footer1','footer','<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="'+wordNS+'">'+(d.footer?p(d.footer,{color:'657A84',size:18}):'')+(d.pageNumbers?'<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t xml:space="preserve">Página </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple><w:r><w:t xml:space="preserve"> / </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p>':'')+'</w:ftr>'):'';
  function tableWord(row){
    const t=GMINDocument.table(row.table),width=Math.floor(9706/t.cols);
    const border=['top','left','bottom','right','insideH','insideV'].map(k=>'<w:'+k+' w:val="single" w:sz="4" w:color="95ADB7"/>').join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="9706" w:type="dxa"/><w:tblBorders>'+border+'</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>'+Array(t.cols).fill('<w:gridCol w:w="'+width+'"/>').join('')+'</w:tblGrid>'+t.rows.map((cells,i)=>{const head=t.header&&i===0;return '<w:tr><w:trPr><w:cantSplit/>'+(head?'<w:tblHeader/>':'')+'</w:trPr>'+cells.map(c=>'<w:tc><w:tcPr><w:tcW w:w="'+width*c.span+'" w:type="dxa"/>'+(c.span>1?'<w:gridSpan w:val="'+c.span+'"/>':'')+(head?'<w:shd w:val="clear" w:color="auto" w:fill="005471"/>':'')+'</w:tcPr>'+String(c.text||'').split('\n').map(line=>p(line,{size:20,bold:head,color:head?'FFFFFF':'202020'})).join('')+'</w:tc>').join('')+'</w:tr>';}).join('')+'</w:tbl><w:p/>';
  }
  let imageIndex=0;
  function photoWord(row){
    const n=columns(row),cellW=Math.floor(9706/n),maxW=(cellW-200)*635,maxH=row.largePhotos?6200000:3400000;
    let output='';
    for(let i=0;i<(row.photos||[]).length;i+=n){
      const cells=row.photos.slice(i,i+n).map(photo=>{
        const item=pictures[imageIndex++];if(!item)return '<w:tc><w:p/></w:tc>';
        const note=String(photo.note||'').split('\n').filter(Boolean).map(t=>p(t,{size:20})).join('');
        const cap=photo.caption?p(photo.caption,{color:'657A84',size:18,italic:true,center:true}):'';
        return '<w:tc><w:tcPr><w:tcW w:w="'+cellW+'" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>'+note+drawing(item.rid,imageIndex+1,item.width,item.height,maxW,maxH)+cap+'</w:tc>';
      });
      while(cells.length<n)cells.push('<w:tc><w:tcPr><w:tcW w:w="'+cellW+'" w:type="dxa"/></w:tcPr><w:p/></w:tc>');
      output+='<w:tbl><w:tblPr><w:tblW w:w="9706" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>'+Array(n).fill('<w:gridCol w:w="'+cellW+'"/>').join('')+'</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>'+cells.join('')+'</w:tr></w:tbl><w:p/>';
    }return output;
  }
  for(const r of safeRows(state)){
    if(r.heading)blocks.push(p(r.heading,{...docStyles[styleName(r.headingStyle,'section')],space:true}));
    if(r.type==='page-break')blocks.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    if(r.type==='text'||r.type==='header')blocks.push(richWord(r));
    if(r.type==='list')(r.items||[]).forEach((item,i)=>blocks.push(p(GMINDocument.prefix(GMINDocument.listMode(r.listMode),i,item.done)+(item.text||''),{space:true,bullet:true,strike:GMINDocument.listMode(r.listMode)==='check'&&item.done})));
    if(r.type==='table')blocks.push(tableWord(r));
    if(r.type==='assessment'){
      if(r.system)blocks.push(p(r.system.toUpperCase(),{color:'005471',bold:true,size:18}));
      blocks.push(p(r.command||'Comando não preenchido',{bold:true,size:22}));
      const color=r.assessment==='ok'?'00814D':r.severity==='monitorar'?'997700':r.severity==='anormal'?'C46E12':r.severity==='critico'?'BC2727':r.severity==='muito-critico'?'651226':'657A84';
      blocks.push(p(assessmentTitle(r)+(r.assessment==='not-ok'?' — '+severityText(r):''),{color,bold:true,size:20,space:true}));
      if(r.assessment==='not-ok'&&r.comment)for(const line of String(r.comment).split('\n'))blocks.push(p(line,{space:true}));
      if(r.assessment==='not-ok')blocks.push(photoWord(r));
    }
    if(r.type==='photo'){if(r.text)blocks.push(richWord(r));blocks.push(photoWord(r));}
  }
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${blocks.join('')}<w:sectPr>${headerId?`<w:headerReference w:type="default" r:id="${headerId}"/>`:''}${footerId?`<w:footerReference w:type="default" r:id="${footerId}"/>`:''}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${hdr?1400:1100}" w:right="1100" w:bottom="${ftr?1450:1000}" w:left="1100" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const relXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map(r=>`<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`).join('')}</Relationships>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${extraTypes.join('')}</Types>`;
  return GMINZip.pack([{name:'[Content_Types].xml',data:ct},{name:'_rels/.rels',data:`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`},{name:'word/document.xml',data:doc},{name:'word/_rels/document.xml.rels',data:relXml},...media,...extraParts]);
}
function makeXLSX(state){
 const photos=photoEntries(state);
 const rows=[['G MINING VENTURES · MINA TZ'],[state.title],[state.showMachine===false?'':machineLine(state)],
 [`Emitido em ${new Date().toLocaleString('pt-BR')}`],
 ['Ordem','Tipo','Sistema','Comando / Conteúdo','Resultado','Avaliação','Comentário','Foto / Arquivo']];
 const d=docInfo(state);if(d.enabled)for(const [label,value] of [...docPairs(d),...(d.footer?[['Rodapé',d.footer]]:[])])rows.push(['','Controle documental',label,value,'','','','']);
 let photoIndex=0;
 for(let i=0;i<(state.rows||[]).length;i++){
  const row=state.rows[i],n=i+1;if(row.type==='empty')continue;
  if(row.heading)rows.push([n,'Título da linha','',row.heading,'',row.headingStyle||'section','','']);
  if(row.type==='text'||row.type==='header')rows.push([n,row.type==='header'?'Cabeçalho':'Texto','',row.text||'','',row.textStyle||'body','','']);
  if(row.type==='page-break')rows.push([n,'Quebra de página','','','','','','']);
  if(row.type==='photo')rows.push([n,'Grupo de fotos','',row.text||'','',columns(row)+' foto(s) por linha'+(row.largePhotos?' · Maximizado':''),'','']);
  if(row.type==='list')(row.items||[]).forEach((item,i)=>rows.push([n,'Lista','',GMINDocument.prefix(GMINDocument.listMode(row.listMode),i,item.done)+(item.text||''),GMINDocument.listMode(row.listMode)==='check'?(item.done?'Marcado':'Pendente'):'',GMINDocument.listMode(row.listMode),'','']));
  if(row.type==='table'){const t=GMINDocument.table(row.table);t.rows.forEach((cells,i)=>{let c=1;for(const item of cells){rows.push([n,'Tabela',`Linha ${i+1} · Coluna ${c}`,item.text,i===0&&t.header?'Cabeçalho':'',`Largura: ${item.span} coluna(s)`,'','']);c+=item.span;}});}
  if(row.type==='photo')for(const item of row.photos||[]){const picture=photos[photoIndex++];rows.push([n,'Fotografia','',item.caption||'','','',item.note||'',picture?.ref||'']);}
  if(row.type==='assessment'){
   const ownPhotos=row.assessment==='not-ok'?(row.photos||[]):[];
   const refs=ownPhotos.map(()=>photos[photoIndex++]?.ref||'');
   rows.push([n,'Avaliação',row.system||'',row.command||'',assessmentTitle(row),severityText(row),row.assessment==='not-ok'?(row.comment||''):'',refs.join('; ')]);
  }
 }
 const sheetPhotos=[['Ordem do bloco','Arquivo','Legenda','Visualização']];
 for(const item of photos)sheetPhotos.push([item.block,item.ref,item.caption||'','']);
 function colId(n){let res='';while(n){n--;res=String.fromCharCode(65+n%26)+res;n=Math.floor(n/26);}return res;}
 function cell(v,col,row,style){const ref=colId(col)+row;if(typeof v==='number')return `<c r="${ref}"${style?' s="'+style+'"':''}><v>${v}</v></c>`;return `<c r="${ref}" t="inlineStr"${style?' s="'+style+'"':''}><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`;}
 function sheet(data,isPhotos=false){const body=data.map((vals,i)=>{let cells='';vals.forEach((v,j)=>cells+=cell(v,j+1,i+1,(i===4&&!isPhotos||i===0&&isPhotos)?1:(i===1&&!isPhotos?2:0)));return `<row r="${i+1}"${isPhotos&&i>0?' ht="102" customHeight="1"':''}>${cells}</row>`;}).join('');
 const widths=(isPhotos?[15,31,48,44]:[12,18,27,68,17,20,60,40]).map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>${widths}</cols><sheetData>${body}</sheetData>${isPhotos&&photos.length?'<drawing r:id="rId1"/>':''}</worksheet>`;}
 const entries=[{name:'[Content_Types].xml',data:`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${photos.length?'<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>':''}</Types>`},
 {name:'_rels/.rels',data:`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
 {name:'xl/workbook.xml',data:`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatório" sheetId="1" r:id="rId1"/><sheet name="Fotografias" sheetId="2" r:id="rId2"/></sheets></workbook>`},
 {name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
 {name:'xl/styles.xml',data:`<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/></font><font><b/><color rgb="FF005471"/><sz val="16"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF005471"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`},
 {name:'xl/worksheets/sheet1.xml',data:sheet(rows)},{name:'xl/worksheets/sheet2.xml',data:sheet(sheetPhotos,true)}];
 if(photos.length){entries.push({name:'xl/worksheets/_rels/sheet2.xml.rels',data:`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`});
 const shapes=photos.map((p,i)=>{const w=p.width||1000,h=p.height||750,maxW=3700000,maxH=1200000,scale=Math.min(maxW/w,maxH/h);return `<xdr:oneCellAnchor><xdr:from><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${i+1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${Math.round(w*scale)}" cy="${Math.round(h*scale)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i+1}" name="${xmlEscape(p.ref)}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${i+1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;}).join('');
 entries.push({name:'xl/drawings/drawing1.xml',data:`<?xml version="1.0"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${shapes}</xdr:wsDr>`});
 entries.push({name:'xl/drawings/_rels/drawing1.xml.rels',data:`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${photos.map((p,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${p.ref}"/>`).join('')}</Relationships>`});
 for(const p of photos)entries.push({name:'xl/media/'+p.ref,data:dataBytes(p.dataUrl)});
 }
 return GMINZip.pack(entries);
}
function exportFile(state,type){const name=basename(state.title);if(type==='pdf')return printPDF(state);if(type==='html')return download(new Blob([reportHTML(state)],{type:'text/html;charset=utf-8'}),name+'.html');if(type==='docx')return download(makeDOCX(state),name+'.docx');if(type==='xlsx')return download(makeXLSX(state),name+'.xlsx');throw Error('Formato inválido');}
global.GMINExport={exportFile,reportHTML,makeDOCX,makeXLSX,basename,download,cleanRich,plainRich,richHTML};
})(window);
