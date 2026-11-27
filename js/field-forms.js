/* Formulários de campo: XLSX preenchível e impressão A4, sem imagens e sem alterar o projeto. */
(function(g){
'use strict';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const xml=v=>esc(String(v??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'')).replace(/&#39;/g,'&apos;');
const statuses=['OK','Não OK','N/A','Não inspecionado'];
const severity=['Monitorar','Anormal','Crítico','Muito Crítico'];
const severityMap={'monitorar':'Monitorar','anormal':'Anormal','critico':'Crítico','muito-critico':'Muito Crítico'};
const instructions='Marque uma única condição por item. OK = conforme; Não OK = anomalia (marque uma única severidade e descreva a condição); N/A = não aplicável; Não inspecionado = aplicável, mas não verificado. Justifique N/A e Não inspecionado. Campo vazio = pendente. Severidade somente para Não OK. Se houver risco imediato, siga os controles de segurança e comunique a supervisão; este formulário não autoriza a liberação do equipamento.';
const textOf=r=>typeof r.rich==='string'&&g.GMINExport?.plainRich?g.GMINExport.plainRich(r.rich):String(r.text||'');
function prepare(state, filled=false){
 const m=state.meta||{},d=state.document||{};
 const fields=[['Data da inspeção',''],['Responsável',''],['Turno',''],['OS / referência SAP','']];
 if(state.showMachine!==false)fields.unshift(['TAG',m.tag||''],['Modelo',m.model||''],['Nº de série',''],['Horímetro (h)',m.hours||''],['Odômetro (km)',m.odometer||'']);
 const documentFields=d.enabled?[['Código',d.code],['Revisão documental',d.revision],['Data do documento',d.date],['Área',d.area],['Elaboração',d.author],['Revisão técnica',d.reviewer],['Aprovação',d.approver]].map(([k,v])=>[k,v||'']):[];
 const blocks=[];let index=0,seq=0;
 for(const r of state.rows||[]){
  if(r.type==='empty')continue;
  index++;
  const heading=String(r.heading||'');
  if(r.type==='assessment'){
   const result=filled?({ok:'OK','not-ok':'Não OK','na':'N/A','not-inspected':'Não inspecionado'}[r.assessment]||''):'';
   blocks.push({kind:'assessment',order:index,n:++seq,heading,system:r.system||'',command:r.command||'',method:r.method||'',source:r.source||'',ref:[r.checklistId,r.checklistRevision,r.checklistItemId].filter(Boolean).join(' / '),result,severity:result==='Não OK'?(severityMap[r.severity]||''):'',comment:filled&&result==='Não OK'?r.comment||'':''});
  }else if(r.type==='list'){
   const mode=r.listMode||'check';
   const items=(r.items||[]).map((it,i)=>({text:it.text||'',done:filled&&!!it.done,n:i+1}));
   blocks.push({kind:'list',order:index,heading,mode,items});
  }else if(r.type==='table'){
   const t=g.GMINDocument.table(r.table);blocks.push({kind:'table',order:index,heading,table:t});
  }else if(r.type==='page-break')blocks.push({kind:'break',order:index});
  else if(r.type==='photo'){
   // Captions and written descriptions are kept; no image, filename or photo placeholder is emitted.
   blocks.push({kind:'photo',order:index,heading,text:textOf(r),notes:(r.photos||[]).map(p=>[p.note,p.caption].filter(Boolean).join(' — ')).filter(Boolean)});
  }else if(r.type==='text'||r.type==='header')blocks.push({kind:'text',order:index,heading,text:textOf(r),header:r.type==='header'});
 }
 if(!blocks.some(b=>b.kind!=='break'))throw Error('Adicione conteúdo ao relatório ou escolha um checklist na biblioteca.');
 const revisions=[...new Set(blocks.filter(b=>b.kind==='assessment'&&b.ref).map(b=>b.ref.split(' / ').slice(0,2).join(' / ')))];
 return {title:state.title||'Checklist de inspeção',kicker:state.kicker||'ENGENHARIA & MANUTENÇÃO DE MINA',fields,documentFields,footer:d.enabled?d.footer||'':'',blocks,revisions,filled,count:seq};
}
const check=(label,marked=false)=>'<span class="choice"><i class="square">'+(marked?'✓':'')+'</i>'+esc(label)+'</span>';
const lines=(n=2)=>'<div class="write-lines">'+Array(n).fill('<div></div>').join('')+'</div>';
const safeText=t=>'<div class="preserve">'+esc(t)+'</div>';
function printHTML(state,filled=false){
 const p=prepare(state,filled);
 const head=()=>'<thead><tr><td colspan="5" class="form-head"><div class="brand"><div><b>G MINING VENTURES · MINA TZ</b><small>'+esc(p.kicker)+'</small></div><b>CHECKLIST DE CAMPO</b></div><h1>'+esc(p.title)+'</h1><div class="fields">'+p.fields.map(([k,v])=>'<div><b>'+esc(k)+'</b><span>'+esc(v||'')+'</span></div>').join('')+'</div>'+(p.documentFields.length?'<div class="doc-meta">'+p.documentFields.map(([k,v])=>esc(k)+': '+esc(v||'________')).join(' · ')+'</div>':'')+(p.revisions.length?'<div class="doc-meta">Catálogo: '+p.revisions.map(esc).join(' · ')+'</div>':'')+'<div class="rules">'+esc(instructions)+'</div></td></tr><tr class="column-head"><th>Item</th><th>Ponto de inspeção / método</th><th>Condição</th><th>Severidade</th><th>Condição observada / ação / referência SAP</th></tr></thead>';
 const table=body=>'<table class="form"><colgroup><col style="width:5%"><col style="width:32%"><col style="width:14%"><col style="width:15%"><col style="width:34%"></colgroup>'+head()+'<tbody>'+body+'</tbody></table>';
 let sections=[],body='',lastGroup='';
 const full=(html,cls='')=>'<tr class="'+cls+'"><td colspan="5">'+html+'</td></tr>';
 for(const b of p.blocks){
  if(b.kind==='break'){if(body){sections.push(table(body));body='';}lastGroup='';continue;}
  if(b.kind==='assessment'){
   const group=[b.source,b.system].filter(Boolean).join(' · ')||'Avaliações';
   if(group!==lastGroup){body+=full(esc(group),'group');lastGroup=group;}
   body+='<tr class="assessment"><td class="num">'+b.n+'<small>'+esc(b.ref.split(' / ').at(-1)||'')+'</small></td><td>'+(b.heading?'<b>'+esc(b.heading)+'</b>':'')+safeText(b.command)+(b.method?'<small>Método: '+esc(b.method)+'</small>':'')+'</td><td>'+statuses.map(v=>check(v,b.result===v)).join('')+'</td><td>'+severity.map(v=>check(v,b.severity===v)).join('')+'</td><td>'+safeText(b.comment)+lines(2)+'</td></tr>';
  }else{
   lastGroup='';
   const title=b.heading?'<h2>'+esc(b.heading)+'</h2>':'';
   if(b.kind==='text')body+=full(title+safeText(b.text)+(!b.text&&!b.header?lines(3):''),'other');
   if(b.kind==='photo')body+=full(title+safeText(b.text)+b.notes.map(safeText).join('')+'<b>Registro escrito de evidências / observações</b>'+lines(3),'other');
   if(b.kind==='list')body+=full(title+b.items.map(it=>'<div class="list-line">'+(b.mode==='check'?check(it.text,it.done):esc((b.mode==='number'?it.n+'. ':'• ')+it.text))+'</div>').join('')+lines(1),'other');
   if(b.kind==='table')body+=full(title+'<table class="nested">'+b.table.rows.map((row,i)=>'<tr>'+row.map(c=>'<'+(i===0&&b.table.header?'th':'td')+' colspan="'+c.span+'">'+safeText(c.text)+(c.text?'':lines(1))+'</'+(i===0&&b.table.header?'th':'td')+'>').join('')+'</tr>').join('')+'</table>','other');
  }
 }
 body+=full('<h2>Encerramento da inspeção</h2><div class="close-fields"><div>Observações gerais / pendências'+lines(3)+'</div><div>Assinatura do responsável'+lines(1)+'Revisão / encaminhamento'+lines(1)+'</div></div><small>'+esc(p.footer||'Registro de inspeção — não substitui avaliação técnica nem registro formal no SAP.')+'</small>','closure');
 sections.push(table(body));
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(p.title)+'</title><style>@page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font:10pt/1.26 "Segoe UI",Arial,sans-serif;color:#152d37;background:#e9edef;margin:0}.screen{max-width:277mm;margin:10px auto;background:#fff;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:10px}.screen button{background:#005471;color:#fff;border:0;padding:10px 18px;border-radius:5px;font-weight:bold;cursor:pointer}.page{width:277mm;margin:12px auto;background:white;padding:0}.form{border-collapse:collapse;width:100%;table-layout:fixed}.form td,.form th{border:1px solid #80929a;padding:2mm;vertical-align:top;overflow-wrap:anywhere}.form-head{padding:2mm!important}.brand{display:flex;justify-content:space-between;align-items:center;color:#005471;font-size:9pt}.brand small{display:block;color:#435964;font-size:8pt}h1{font-size:15pt;color:#005471;margin:1.5mm 0 2mm}h2{font-size:11pt;color:#005471;margin:0 0 1.5mm}.fields{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1.3mm 3mm}.fields div{min-width:0}.fields b{display:block;font-size:7.5pt;color:#364c55}.fields span{display:block;min-height:5mm;border-bottom:1px solid #80929a;white-space:pre-wrap}.rules,.doc-meta{font-size:8pt;margin-top:2mm}.column-head th{background:#e4eaed;color:#005471;font-size:9pt;text-align:left;vertical-align:middle}.group td{font-weight:bold;color:#005471;background:#e8eff1;border-top:2px solid #005471;padding:1.6mm}.assessment td{min-height:23mm}.num{text-align:center;font-weight:bold}.num small{font-weight:normal}.choice{display:flex;align-items:center;gap:1.4mm;font-size:8.6pt;line-height:1.2;margin-bottom:1.3mm;min-height:4mm}.square{display:inline-flex;width:3.8mm;height:3.8mm;border:1px solid #263943;flex:none;align-items:center;justify-content:center;font-size:10pt;font-style:normal;font-weight:bold}.write-lines div{height:6mm;border-bottom:1px solid #9aabb1}.preserve{white-space:pre-wrap;overflow-wrap:anywhere}.form small{display:block;font-size:8pt;color:#485f69;margin-top:1mm}.other td,.closure td{padding:3mm}.nested{border-collapse:collapse;width:100%;table-layout:fixed}.nested th{background:#e4eaed}.nested td,.nested th{padding:1.5mm}.close-fields{display:grid;grid-template-columns:2fr 1fr;gap:5mm}.list-line{margin:1mm 0}.print-page+.print-page{break-before:page}@media print{body{background:white;margin:0}.screen{display:none}.page{width:auto;margin:0;padding:0}.form thead{display:table-header-group}.form tr.assessment,.form tr.closure,.group{break-inside:avoid;page-break-inside:avoid}.group{break-after:avoid}.other{break-inside:auto}.nested tr{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}} </style></head><body><div class="screen"><span>Prévia A4 paisagem · '+p.count+' avaliações · '+(filled?'com respostas existentes':'em branco')+' · sem fotografias</span><button onclick="window.print()">Imprimir / Salvar PDF</button></div><main class="page">'+sections.map(s=>'<div class="print-page">'+s+'</div>').join('')+'</main></body></html>';
}
function print(state,filled=false){
 const markup=printHTML(state,filled);
 const w=g.open('','_blank');if(!w)throw Error('Habilite pop-ups para abrir a prévia de impressão.');
 w.document.open();w.document.write(markup);w.document.close();
}
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG='http://schemas.openxmlformats.org/package/2006/relationships';
const decl='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const col=n=>{let x='';for(;n;n=Math.floor((n-1)/26))x=String.fromCharCode(65+(n-1)%26)+x;return x;};
function cell(v,i,r,s=0){
 const ref=col(i)+r;
 if(v&&typeof v==='object'&&'formula'in v)return '<c r="'+ref+'" s="'+s+'"><f>'+xml(v.formula)+'</f></c>';
 if(typeof v==='number')return '<c r="'+ref+'" s="'+s+'"><v>'+v+'</v></c>';
 return '<c r="'+ref+'" s="'+s+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>';
}
function row(values,r,styles=[],height=24){return '<row r="'+r+'" ht="'+height+'" customHeight="1">'+values.map((v,i)=>cell(v,i+1,r,styles[i]||0)).join('')+'</row>';}
function cols(widths){return '<cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols>';}
const fill=c=>'<fill><patternFill patternType="solid"><fgColor rgb="FF'+c+'"/><bgColor indexed="64"/></patternFill></fill>';
const xf=(fontId,fillId,borderId,wrap=true)=>'<xf numFmtId="0" fontId="'+fontId+'" fillId="'+fillId+'" borderId="'+borderId+'" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="'+(wrap?1:0)+'"/></xf>';
const font=(color,bold=false,size=11)=>'<font>'+(bold?'<b/>':'')+'<sz val="'+size+'"/><color rgb="FF'+color+'"/><name val="Calibri"/></font>';
const styles=decl+'<styleSheet xmlns="'+NS+'"><fonts count="4">'+font('172C37')+font('FFFFFF',true)+font('005471',true,15)+font('005471',true)+'</fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'+fill('005471')+fill('EDF2F4')+fill('FFF4D7')+'</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>'+['left','right','top','bottom'].map(x=>'<'+x+' style="thin"><color rgb="FFCBD6DB"/></'+x+'>').join('')+'<diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6">'+xf(0,0,0)+xf(1,2,1)+xf(2,0,0)+xf(3,3,1)+xf(0,4,1)+xf(0,0,1)+'</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="6">'+['DCEFE5','FBE3E3','FFF0B8','FBD8B8','F6B8B8','E6C4CC'].map(c=>'<dxf>'+fill(c)+'</dxf>').join('')+'</dxfs></styleSheet>';
function sheet({data,widths,freeze=0,merges=[],filter='',validation='',conditional='',print=false}){
 const views='<sheetViews><sheetView workbookViewId="0" showGridLines="0">'+(freeze?'<pane ySplit="'+freeze+'" topLeftCell="A'+(freeze+1)+'" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A'+(freeze+1)+'" sqref="A'+(freeze+1)+'"/>':'')+'</sheetView></sheetViews>';
 return decl+'<worksheet xmlns="'+NS+'">'+(print?'<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>':'')+views+'<sheetFormatPr defaultRowHeight="24"/>'+cols(widths)+'<sheetData>'+data.join('')+'</sheetData>'+(filter?'<autoFilter ref="'+filter+'"/>':'')+(merges.length?'<mergeCells count="'+merges.length+'">'+merges.map(m=>'<mergeCell ref="'+m+'"/>').join('')+'</mergeCells>':'')+conditional+validation+(print?'<pageMargins left="0.25" right="0.25" top="0.35" bottom="0.35" header="0.15" footer="0.15"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>':'')+'</worksheet>';
}
const rule=(range,values,title,msg)=>'<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorStyle="stop" errorTitle="'+xml(title)+'" error="'+xml(msg)+'" sqref="'+range+'"><formula1>'+xml('"'+values.join(',')+'"')+'</formula1></dataValidation>';
const cf=(range,formula,id,priority)=>'<conditionalFormatting sqref="'+range+'"><cfRule type="expression" dxfId="'+id+'" priority="'+priority+'"><formula>'+xml(formula)+'</formula></cfRule></conditionalFormatting>';
function entries(state,filled=false){
 const p=prepare(state,filled),main=[],merges=[],extra=[],info=[];
 let r=0;const line=(v,s,h)=>{main.push(row(v,++r,s,h));return r;};
 line(['G MINING VENTURES · MINA TZ'],[2],27);merges.push('A1:J1');
 line([p.title],[2],32);merges.push('A2:J2');
 line([instructions],[0],54);merges.push('A3:J3');
 for(let i=0;i<p.fields.length;i+=3){
  const a=p.fields.slice(i,i+3);const vals=[],st=[];
  for(const [k,v] of a){vals.push(k,v,'');st.push(3,4,4);}
  const nr=line(vals,st,38);for(let j=0;j<a.length;j++)merges.push(col(2+j*3)+nr+':'+col(3+j*3)+nr);
 }
 for(const [k,v] of p.documentFields){const nr=line([k,v],[3,v?5:4],28);merges.push('B'+nr+':J'+nr);}
 const stats=line(['Resumo',p.count,'avaliações'],[3,5,5],24);
 const coverage=line(['Cobertura'],[3],27);
 const header=line(['Item','Ordem / seção','Ponto de inspeção','Método','Condição','Severidade','Observação / justificativa','Ação / referência SAP','Verificação','Origem / revisão / ID'],Array(10).fill(1),32);
 const first=header+1;
 for(const b of p.blocks.filter(x=>x.kind==='assessment')){
  const nr=r+1;
  const E='E'+nr,F='F'+nr,G='G'+nr;
  const valid=(ref,values)=>'OR('+values.map(v=>ref+'="'+v+'"').join(',')+')';
  const formula='IF('+E+'="","Pendente",IF(NOT('+valid(E,statuses)+'),"Condição inválida",IF('+E+'="Não OK",IF(OR(NOT('+valid(F,severity)+'),LEN(TRIM('+G+'))=0),"Completar severidade / observação","Registrado"),IF('+F+'<>"","Limpar severidade",IF(AND(OR('+E+'="N/A",'+E+'="Não inspecionado"),LEN(TRIM('+G+'))=0),"Justificar","Registrado")))))';
  const h=Math.max(42,Math.min(180,Math.max(Math.ceil(([b.heading,b.command].filter(Boolean).join(' ').length)/55)*17+16,Math.ceil((b.comment||'').length/55)*17+16)));
  line([b.n,b.order+' · '+[b.source,b.system].filter(Boolean).join(' · '),[b.heading,b.command].filter(Boolean).join('\n'),b.method,b.result,b.severity,b.comment,'',{formula},b.ref],[5,5,5,5,4,4,4,4,5,5],h);
 }
 const last=r;
 if(last>=first){
  main[stats-1]=row(['Resumo',p.count,'avaliações','OK',{formula:'COUNTIF(E'+first+':E'+last+',"OK")'},'Não OK',{formula:'COUNTIF(E'+first+':E'+last+',"Não OK")'},'Registro incompleto',{formula:'COUNTIF(I'+first+':I'+last+',"<>Registrado")'}],stats,[3,5,5,3,5,3,5,3,5],32);
  main[coverage-1]=row(['Cobertura','N/A',{formula:'COUNTIF(E'+first+':E'+last+',"N/A")'},'Não inspecionado',{formula:'COUNTIF(E'+first+':E'+last+',"Não inspecionado")'},'Sem resposta',{formula:'COUNTBLANK(E'+first+':E'+last+')'}],coverage,[3,3,5,3,5,3,5],32);
 }
 const lastAssessment=last;
 line(['Encerramento / observações gerais'],[3],25);merges.push('A'+r+':J'+r);
 line([''],[4],66);merges.push('A'+r+':J'+r);
 line(['Responsável / assinatura','','','Revisão / encaminhamento',''],[3,4,4,3,4],35);merges.push('B'+r+':C'+r,'E'+r+':J'+r);
 let dv='',cond='';
 if(lastAssessment>=first){
  dv='<dataValidations count="2">'+rule('E'+first+':E'+lastAssessment,statuses,'Condição inválida','Selecione uma opção da lista.')+rule('F'+first+':F'+lastAssessment,severity,'Severidade inválida','Selecione uma opção da lista; use somente em Não OK.')+'</dataValidations>';
  cond=cf('E'+first+':E'+lastAssessment,'$E'+first+'="OK"',0,1)+cf('E'+first+':E'+lastAssessment,'$E'+first+'="Não OK"',1,2)+severity.map((s,i)=>cf('F'+first+':F'+lastAssessment,'AND($E'+first+'="Não OK",$F'+first+'="'+s+'")',i+2,i+3)).join('');
 }
 let er=0;const listRows=[];const e=(v,s,h=34)=>{extra.push(row(v,++er,s,h));return er;};
 e(['COMPLEMENTOS DO CHECKLIST'],[2]);e(['Ordem original','Tipo / seção','Conteúdo / campo','Registro escrito / valor'],[1,1,1,1]);
 for(const b of p.blocks){
  if(b.kind==='assessment')continue;
  if(b.kind==='text')e([b.order,b.heading||'Texto',b.text,''],[5,5,5,4],Math.max(40,Math.min(180,Math.ceil((b.text||'').length/80)*17+18)));
  if(b.kind==='photo')e([b.order,b.heading||'Evidências escritas',[b.text,...b.notes].filter(Boolean).join('\n'),''],[5,5,5,4],70);
  if(b.kind==='list')for(const it of b.items){const nr=e([b.order,b.heading||'Lista',it.text,b.mode==='check'&&filled&&it.done?'Marcado':''],[5,5,5,4]);if(b.mode==='check')listRows.push('D'+nr);}
  if(b.kind==='table'){
   const heads=b.table.header?b.table.rows[0]||[]:[];
   b.table.rows.forEach((cells,i)=>{
    if(i===0&&b.table.header){e([b.order,b.heading||'Tabela','Cabeçalhos: '+cells.map(c=>c.text).join(' | '),''],[5,3,5,4]);return;}
    let offset=0;for(const c of cells){let h='',pos=0;for(const hc of heads){if(offset>=pos&&offset<pos+hc.span){h=hc.text;break;}pos+=hc.span;}e([b.order,(b.heading||'Tabela')+' · linha '+(i+1),h||'Coluna '+(offset+1),c.text],[5,5,5,4]);offset+=c.span;}
   });
  }
  if(b.kind==='break')e([b.order,'Quebra de página','',''],[5,5,5,4]);
 }
 let ir=0;const i=(v,h=35)=>info.push(row(v,++ir,[3,5],h));
 i(['Como preencher','Use a aba Checklist para avaliações e Complementos para textos, listas, tabelas e registros escritos. Células amarelas são campos de preenchimento; não altere os IDs ou fórmulas.'],70);
 i(['Critérios',instructions],120);
 i(['Modo',filled?'Respostas existentes copiadas quando aplicáveis; edite livremente.':'Formulário em branco; dados de identificação existentes e textos de instrução são mantidos.']);
 i(['Rastreabilidade',p.revisions.join('\n')||'Sem revisão de catálogo informada.'],55);
 i(['Limites','Sem imagens, macros, sincronização, importação automática de respostas ou autorização de liberação. O indicador verifica preenchimento, não o risco técnico.'],65);
 if(p.footer)i(['Rodapé',p.footer]);
 const names=['Checklist','Complementos','Orientações'];
 return [
 {name:'[Content_Types].xml',data:decl+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+names.map((n,j)=>'<Override PartName="/xl/worksheets/sheet'+(j+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>'},
 {name:'_rels/.rels',data:decl+'<Relationships xmlns="'+PKG+'"><Relationship Id="rId1" Type="'+REL+'/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
 {name:'xl/workbook.xml',data:decl+'<workbook xmlns="'+NS+'" xmlns:r="'+REL+'"><sheets>'+names.map((n,j)=>'<sheet name="'+n+'" sheetId="'+(j+1)+'" r:id="rId'+(j+1)+'"/>').join('')+'</sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">Checklist!$1:$'+header+'</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'},
 {name:'xl/_rels/workbook.xml.rels',data:decl+'<Relationships xmlns="'+PKG+'">'+names.map((n,j)=>'<Relationship Id="rId'+(j+1)+'" Type="'+REL+'/worksheet" Target="worksheets/sheet'+(j+1)+'.xml"/>').join('')+'<Relationship Id="rId4" Type="'+REL+'/styles" Target="styles.xml"/></Relationships>'},
 {name:'xl/styles.xml',data:styles},
 {name:'xl/worksheets/sheet1.xml',data:sheet({data:main,widths:[13,30,65,21,22,19,62,38,33,42],freeze:header,merges,filter:lastAssessment>=first?'A'+header+':J'+lastAssessment:'',validation:dv,conditional:cond,print:true})},
 {name:'xl/worksheets/sheet2.xml',data:sheet({data:extra,widths:[13,33,95,65],freeze:2,merges:['A1:D1'],validation:listRows.length?'<dataValidations count="1">'+rule(listRows.join(' '),['Marcado','Pendente','N/A'],'Registro inválido','Selecione uma opção da lista.')+'</dataValidations>':''})},
 {name:'xl/worksheets/sheet3.xml',data:sheet({data:info,widths:[28,120]})}
 ];
}
function makeXLSX(state,filled=false){return g.GMINZip.pack(entries(state,filled));}
function download(state,filled=false){g.GMINExport.download(makeXLSX(state,filled),g.GMINExport.basename(state.title)+'_checklist_preenchivel.xlsx');}
function fromTemplate(t,meta={}){
 const rows=[];if(t.activity||t.safety||t.nonconformity)rows.push({type:'text',heading:t.title,text:[t.activity,t.safety,t.nonconformity,t.scope].filter(Boolean).join('\n')});
 rows.push(...t.items.map(it=>({type:'assessment',source:t.title,system:it.system,command:it.command,method:it.method,checklistId:t.id,checklistRevision:t.revision,checklistItemId:it.id})));
 return {title:t.title,meta:{...meta},showMachine:true,rows};
}
g.GMINFieldForms={prepare,printHTML,print,entries,makeXLSX,download,fromTemplate};
})(window);
