/* Teste dos formulários offline. node tests/test_field_forms.cjs */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..');
const ctx={TextEncoder,Blob,Uint8Array,DataView,Date,console};
ctx.window=ctx;vm.createContext(ctx);
for(const f of ['js/zip.js','js/document.js','js/field-forms.js','js/checklists-data.js','js/checklists/pm/pre-lavador/grande-porte.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const F=ctx.GMINFieldForms,t=ctx.GMIN_CHECKLISTS[0],s=F.fromTemplate(t,{tag:'040-005',hours:'12800'});
s.rows.push({type:'photo',heading:'Evidência',photos:[{dataUrl:'data:image/png;base64,SECRET',caption:'Descrição da evidência'}]});
s.rows.push({type:'table',heading:'Medição',table:{cols:2,header:true,rows:[[{text:'Parâmetro'},{text:'Valor'}],[{text:'Pressão'},{text:''}]]}});
s.rows.push({type:'list',listMode:'check',items:[{text:'Verificar',done:true}]});
s.rows.push({type:'page-break'},{type:'text',text:'Instrução final'});
const a=s.rows.find(r=>r.type==='assessment');Object.assign(a,{assessment:'not-ok',severity:'critico',comment:'Anomalia <observada>',photos:[{dataUrl:'data:image/png;base64,SECRET'}]});
const snapshot=JSON.stringify(s),blank=F.prepare(s),filled=F.prepare(s,true);
assert.equal(blank.count,94);assert.equal(blank.blocks.find(b=>b.kind==='assessment').result,'');assert.equal(filled.blocks.find(b=>b.kind==='assessment').result,'Não OK');
const html=F.printHTML(s,true);for(const term of ['A4 portrait','NI (não inspecionado)','MC = Muito Crítico','N/A','Anomalia &lt;observada&gt;','Descrição da evidência','Pressão','Instrução final','040-005'])assert(html.includes(term),term);
assert(!html.includes('SECRET')&&!html.includes('<img'));assert.equal((html.match(/class="assessment"/g)||[]).length,94);
assert(html.includes('font:8.5pt/1.13')&&html.includes('.assessment{height:9.4mm}'));
const assessmentRows=[...html.matchAll(/<tr class="assessment">([\s\S]*?)<\/tr>/g)];
for(const [,r] of assessmentRows){assert.equal((r.match(/class="square"/g)||[]).length,6);assert.equal((r.match(/class="options"/g)||[]).length,2);assert(!r.includes('>N/A</span>')&&!r.includes('>Não inspecionado</span>'));}
assert.equal((html.match(/<caption>/g)||[]).length,1);
assert(html.includes('<thead>')&&html.includes('>NO</span>')&&html.includes('>MC</span>'));
const files=F.entries(s,true),xml=files.find(f=>f.name.endsWith('sheet1.xml')).data;
for(const term of ['dataValidations count="2"','Não inspecionado','Muito Crítico','COUNTIF','autoFilter','conditionalFormatting','Anomalia &lt;observada&gt;','pm-pre-lavador-grande-porte'])assert(xml.includes(term),term);
assert(files.every(f=>!f.data.includes('SECRET')));assert.equal(JSON.stringify(s),snapshot);
(async()=>{const blob=F.makeXLSX(s);const bytes=Buffer.from(await blob.arrayBuffer());assert.equal(bytes.readUInt32LE(0),0x04034b50);const dir=path.join(__dirname,'artifacts');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'checklist-pre-lavador.xlsx'),bytes);fs.writeFileSync(path.join(dir,'checklist-pre-lavador.html'),F.printHTML(s));console.log('OK: 94 avaliações, formulário físico, XLSX, sem imagens, sem mutação');})().catch(e=>{console.error(e);process.exit(1)});
