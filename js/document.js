/* v1.3 document model, table operations and reusable templates. */
(function(g){'use strict';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const str=(v,n=500)=>String(v??'').slice(0,n);
const fields=[['code','Código'],['revision','Revisão'],['date','Data'],['area','Área'],['author','Elaboração'],['reviewer','Revisão técnica'],['approver','Aprovação'],['footer','Rodapé']];
const defaults=()=>Object.fromEntries([...fields.map(([k])=>[k,'']),['enabled',false],['repeatHeader',true],['pageNumbers',true]]);
function control(v){const d=defaults();for(const [k] of fields)d[k]=str(v?.[k]);for(const k of ['enabled','repeatHeader','pageNumbers'])if(typeof v?.[k]==='boolean')d[k]=v[k];return d;}
const cell=(text='',span=1)=>({text:str(text,20000),span});
function table(v){
 const cols=Math.max(1,Math.min(12,Math.floor(Number(v?.cols)||2)));
 const raw=Array.isArray(v?.rows)&&v.rows.length?v.rows.slice(0,200):[[],[]];
 return {cols,header:v?.header!==false,rows:raw.map(r=>{
  let remaining=cols;const out=[];
  for(const c of Array.isArray(r)?r:[]){if(!remaining)break;const span=Math.max(1,Math.min(remaining,Math.floor(Number(c?.span)||1)));out.push(cell(c?.text??(typeof c==='string'?c:''),span));remaining-=span;}
  while(remaining-- >0)out.push(cell());return out;
 })};
}
function tableEdit(t,action,r,c){
 if(action==='row-add'&&t.rows.length<200)t.rows.splice(r==null?t.rows.length:r+1,0,Array.from({length:t.cols},()=>cell()));
 if(action==='row-delete'&&t.rows.length>1)t.rows.splice(r,1);
 if(action==='col-add'&&t.cols<12){t.cols++;t.rows.forEach(row=>row.push(cell()));}
 if(action==='col-delete'&&t.cols>1){t.cols--;t.rows.forEach(row=>{const last=row.at(-1);if(last.span>1)last.span--;else row.pop();});}
 if(action==='merge'){const a=t.rows[r]?.[c],b=t.rows[r]?.[c+1];if(a&&b){a.text=[a.text,b.text].filter(Boolean).join('\n');a.span+=b.span;t.rows[r].splice(c+1,1);}}
 if(action==='split'){const a=t.rows[r]?.[c];if(a&&a.span>1){const count=a.span-1;a.span=1;t.rows[r].splice(c+1,0,...Array.from({length:count},()=>cell()));}}
 return t;
}
const listMode=v=>['check','bullet','number'].includes(v)?v:'check';
function prefix(mode,i,done){return mode==='number'?(i+1)+'. ':mode==='bullet'?'• ':done?'☑ ':'☐ ';}
function tableMarkup(row){const t=row.table;return '<div class="table-toolbar no-print"><button type="button" data-action="table-row-add">+ Linha</button><button type="button" data-action="table-col-add">+ Coluna</button><button type="button" data-action="table-col-delete">− Última coluna</button><label><input type="checkbox" data-field="table-header" '+(t.header?'checked':'')+'> Cabeçalho</label></div><div class="table-scroll"><table class="edit-table"><colgroup>'+Array(t.cols).fill('<col>').join('')+'</colgroup><tbody>'+t.rows.map((cells,r)=>'<tr class="'+(r===0&&t.header?'table-head':'')+'">'+cells.map((c,i)=>'<td colspan="'+c.span+'"><textarea rows="2" data-field="table-cell" data-r="'+r+'" data-c="'+i+'" aria-label="Célula '+(r+1)+' / '+(i+1)+'">'+esc(c.text)+'</textarea><div class="cell-tools no-print">'+(i<cells.length-1?'<button type="button" data-action="table-merge" data-r="'+r+'" data-c="'+i+'" title="Mesclar com célula à direita">Mesclar →</button>':'')+(c.span>1?'<button type="button" data-action="table-split" data-r="'+r+'" data-c="'+i+'">Separar</button>':'')+'</div></td>').join('')+'<td class="table-row-tools no-print"><button type="button" data-action="table-row-add" data-r="'+r+'" title="Inserir linha abaixo">+</button><button type="button" data-action="table-row-delete" data-r="'+r+'" title="Excluir linha">−</button></td></tr>').join('')+'</tbody></table></div>';}
const section=h=>({type:'text',heading:h,text:''});
const photo=h=>({type:'photo',heading:h,text:'',photos:[]});
const tbl=(h,heads)=>({type:'table',heading:h,table:{cols:heads.length,header:true,rows:[heads.map(x=>cell(x)),heads.map(()=>cell())]}});
const list=h=>({type:'list',heading:h,listMode:'bullet',items:[{text:'',done:false}]});
const builtins=[
 ['inspection','Relatório de inspeção',true,[section('Condição encontrada'),{type:'assessment'},photo('Evidências fotográficas'),section('Recomendações')]],
 ['free','Relatório técnico livre',false,[section('Objetivo'),section('Desenvolvimento'),section('Conclusão')]],
 ['condition','Ficha técnica de monitoramento de condição',false,[section('1. Responsáveis e envolvidos'),section('2. Método'),tbl('Controle e registros',['Objeto','Informação / controle necessário']),section('3. Modo e frequência de acompanhamento'),section('4. Registros'),tbl('5. Limites de aceitação e indicadores',['Indicador','Regra / critério']),tbl('6. Tratativas',['Código','Condição / gatilho','Encaminhamento']),section('Validação da ficha')]],
 ['afa','Análise de falha (AFA)',true,[section('1. Descrição da falha'),section('2. Histórico e contexto'),photo('3. Evidências'),section('4. Mecanismo e hipóteses'),section('5. Causa confirmada / a determinar'),tbl('6. Plano de ações',['Ação','Responsável','Prazo','Evidência']),section('7. Conclusão')]],
 ['pop','Procedimento operacional padrão (POP)',false,[section('1. Objetivo'),section('2. Campo de aplicação'),section('3. Referências e definições'),list('4. Recursos e controles de segurança'),{...list('5. Procedimento'),listMode:'number'},section('6. Critérios de aceitação'),section('7. Responsabilidades')]],
 ['intervention','Relatório de intervenção',true,[section('1. Escopo'),section('2. Condição inicial'),list('3. Atividades executadas'),photo('4. Evidências'),tbl('5. Testes e medições',['Teste','Resultado','Critério']),section('6. Condição final e pendências')]],
 ['charter','Project Charter',false,[section('1. Problema e justificativa'),section('2. Objetivo e metas'),section('3. Escopo e exclusões'),tbl('4. Indicadores',['Indicador','Linha de base','Meta']),tbl('5. Equipe e recursos',['Responsável','Papel','Recurso']),tbl('6. Cronograma',['Fase','Prazo','Entrega']),section('7. Riscos e aprovação')]],
 ['improvement','Relatório de melhoria contínua',false,[section('1. Oportunidade'),section('2. Define'),section('3. Measure'),section('4. Analyze'),section('5. Improve'),section('6. Control'),tbl('7. Plano de ações',['Ação','Responsável','Prazo','Status']),section('8. Resultados e sustentação')]]
].map(([id,name,showMachine,rows])=>({id,name,project:{version:4,title:name,showMachine,document:control({enabled:!showMachine}),rows}}));
const key='gmin-document-templates-v1';
function load(){try{const raw=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(raw)?raw:[];}catch{return [];}}
function save(items){localStorage.setItem(key,JSON.stringify(items));}
function templateProject(state){const clone=JSON.parse(JSON.stringify(state));delete clone.id;delete clone.createdAt;delete clone.updatedAt;clone.meta={};clone.document={...control(clone.document),date:'',author:'',reviewer:'',approver:''};clone.rows=clone.rows.filter(r=>r.type!=='empty').map(r=>({...r,photos:[],assessment:'',severity:'',comment:r.type==='assessment'?'':r.comment,items:(r.items||[]).map(i=>({...i,done:false}))}));if(!clone.rows.length)clone.rows=[{type:'empty'}];return clone;}
g.GMINDocument={fields,defaults,control,table,tableEdit,listMode,prefix,tableMarkup,builtins,load,save,templateProject};
})(window);
