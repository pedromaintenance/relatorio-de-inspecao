/* GMIN — editor de relatórios offline-first. Sem frameworks e sem bibliotecas externas. */
(function(){'use strict';
const $=s=>document.querySelector(s), rowsEl=$('#reportRows'), titleEl=$('#reportTitle'), statusEl=$('#saveStatus');
const escapeHTML=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const uid=()=>globalThis.crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const newRow=(type='empty')=>({id:uid(),type,text:'',items:[],photos:[]});
const titleDefault=()=>{const d=new Date();return 'Relatório de Inspeção — '+d.toLocaleDateString('pt-BR')+' às '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const fresh=()=>({version:1,id:uid(),title:titleDefault(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),rows:[newRow()]});
let state=fresh(),saveTimer=null,saveChain=Promise.resolve(),openedMenu=null,toastTimer=null,loading=true;
function toast(message){const el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,4800);}
function setStatus(text,warn=false){statusEl.innerHTML='<span class="status-dot"></span>'+escapeHTML(text);statusEl.classList.toggle('warn',warn);}
function saveNow(){if(loading)return;clearTimeout(saveTimer);state.updatedAt=new Date().toISOString();const snapshot=JSON.parse(JSON.stringify(state));saveChain=saveChain.catch(()=>{}).then(()=>GMINStorage.save(snapshot)).then(()=>{setStatus('Salvo no tablet');}).catch(err=>{console.error(err);setStatus('Não foi possível salvar',true);toast('Falha no armazenamento local. Exporte um backup JSON para proteger os dados.');});return saveChain;}
function changed(){if(loading)return;setStatus('Salvando...');clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,420);}
function resizeTextarea(ta){ta.style.height='auto';ta.style.height=Math.max(90,ta.scrollHeight+2)+'px';}
function rowHTML(row){
 const id=escapeHTML(row.id);const menu=`<button type="button" class="row-menu-trigger" data-action="menu" aria-label="Opções da linha" title="Opções">⋯</button><div class="row-menu" hidden><button type="button" data-action="edit">Editar</button><button type="button" data-action="duplicate">Duplicar</button><button type="button" data-action="delete" class="danger">Excluir linha</button></div>`;
 let contents='';
 if(row.type==='empty')contents=`<div class="choice-group"><button type="button" class="choice-button" data-action="choose-text"><span class="choice-icon">▤</span>Adicionar texto</button><button type="button" class="choice-button" data-action="choose-photo"><span class="choice-icon">▧</span>Adicionar foto</button><button type="button" class="choice-button" data-action="choose-list"><span class="choice-icon">☷</span>Adicionar lista</button></div>`;
 if(row.type==='text')contents=`<div class="row-content"><div class="block-heading no-print">Texto</div><textarea class="text-editor" data-field="text" placeholder="Digite as observações, sintomas, medições ou serviços necessários..." aria-label="Texto da linha">${escapeHTML(row.text)}</textarea></div>`;
 if(row.type==='list')contents=`<div class="row-content"><div class="block-heading no-print">Lista / checklist</div><div class="list-items">${(row.items||[]).map((item,i)=>`<div class="list-entry" data-list-index="${i}"><input type="checkbox" data-field="item-done" aria-label="Marcar item como concluído" ${item.done?'checked':''}><input type="text" data-field="item-text" class="${item.done?'checked':''}" placeholder="Item da lista" aria-label="Item da lista ${i+1}" value="${escapeHTML(item.text)}"><button type="button" class="remove-list-item no-print" data-action="list-remove" aria-label="Excluir item">✕</button></div>`).join('')}</div><button type="button" class="add-item no-print" data-action="list-add">＋ Adicionar item</button></div>`;
 if(row.type==='photo')contents=`<div class="row-content"><div class="block-heading no-print">Fotografias</div><div class="photo-grid">${(row.photos||[]).map((photo,i)=>`<div class="photo-item" data-photo-index="${i}"><img src="${photo.dataUrl}" alt="${escapeHTML(photo.caption||'Evidência fotográfica')}" data-action="photo-view"><div class="photo-footer"><input type="text" data-field="photo-caption" class="photo-caption" value="${escapeHTML(photo.caption)}" placeholder="Legenda da foto" aria-label="Legenda da foto ${i+1}"><button type="button" data-action="photo-remove" class="remove-photo no-print" aria-label="Remover fotografia">✕</button></div></div>`).join('')}</div>${!row.photos?.length?'<div class="photo-instruction no-print">Adicione uma foto da câmera ou galeria do tablet.</div>':''}<button type="button" data-action="photo-add" class="add-photo no-print">＋ Adicionar fotografia</button><input type="file" accept="image/*" multiple class="photo-input" hidden></div>`;
 return `<div class="row-unit" data-row-id="${id}"><button type="button" class="drag-handle no-print" title="Arrastar para reordenar (ou use ↑/↓ no teclado)" aria-label="Arrastar linha para reordenar" draggable="false">⋮⋮</button><div class="row-card ${row.type==='empty'?'empty':''}">${contents}${menu}</div><div class="row-add-wrap no-print"><button type="button" class="add-row" data-action="insert" aria-label="Criar linha abaixo" title="Adicionar nova linha">+</button></div></div>`;
}
function render({focusId=null}={}){rowsEl.innerHTML=state.rows.map(rowHTML).join('');rowsEl.querySelectorAll('textarea.text-editor').forEach(resizeTextarea);if(focusId){const row=rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(focusId)}"]`);row?.querySelector('textarea, input[type=text]')?.focus();}}
function getRow(el){const wrap=el.closest('.row-unit');if(!wrap)return null;return state.rows.find(r=>r.id===wrap.dataset.rowId);}
function closeMenus(){rowsEl.querySelectorAll('.row-menu').forEach(menu=>menu.hidden=true);$('#projectMenu').hidden=true;$('#projectMenuButton').setAttribute('aria-expanded','false');openedMenu=null;}
function mutateRow(row,fn,{rerender=true,focus=false}={}){fn(row);changed();if(rerender)render({focusId:focus?row.id:null});}
function duplicate(row){const i=state.rows.indexOf(row),clone=JSON.parse(JSON.stringify(row));clone.id=uid();state.rows.splice(i+1,0,clone);changed();render();toast('Linha duplicada.');}
function deleteRow(row){const hasContent=(row.type==='text'&&row.text.trim())||(row.type==='list'&&row.items.some(x=>x.text.trim()))||(row.type==='photo'&&row.photos.length);if(hasContent&&!confirm('Excluir esta linha e todo o seu conteúdo?'))return;
 const i=state.rows.indexOf(row);state.rows.splice(i,1);if(!state.rows.length)state.rows.push(newRow());changed();render();}
function maybeEdit(row){closeMenus();if(row.type==='empty')return;let el=rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(row.id)}"]`);el?.querySelector('textarea,input[type=text]')?.focus();}
rowsEl.addEventListener('click',event=>{
 const btn=event.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action,row=getRow(btn);if(!row)return;
 if(action==='menu'){const menu=btn.nextElementSibling,wasOpen=!menu.hidden;closeMenus();menu.hidden=wasOpen;return;}
 if(action==='insert'){const i=state.rows.indexOf(row);state.rows.splice(i+1,0,newRow());changed();render();return;}
 if(action==='choose-text'){mutateRow(row,r=>{r.type='text';r.text='';},{focus:true});return;}
 if(action==='choose-list'){mutateRow(row,r=>{r.type='list';r.items=[{id:uid(),text:'',done:false}];},{focus:true});return;}
 if(action==='choose-photo'){mutateRow(row,r=>{r.type='photo';r.photos=[];});rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(row.id)}"] .photo-input`)?.click();return;}
 if(action==='edit')return maybeEdit(row);
 if(action==='duplicate')return duplicate(row);
 if(action==='delete')return deleteRow(row);
 if(action==='list-add'){const x={id:uid(),text:'',done:false};row.items.push(x);changed();render();const wrap=rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(row.id)}"]`);wrap?.querySelector('.list-entry:last-child [type=text]')?.focus();return;}
 if(action==='list-remove'){const i=Number(btn.closest('[data-list-index]').dataset.listIndex);row.items.splice(i,1);changed();render();return;}
 if(action==='photo-add'){btn.closest('.row-unit').querySelector('.photo-input').click();return;}
 if(action==='photo-remove'){const i=Number(btn.closest('[data-photo-index]').dataset.photoIndex);if(!confirm('Remover fotografia desta linha?'))return;row.photos.splice(i,1);changed();render();return;}
 if(action==='photo-view'){const src=btn.getAttribute('src');const w=window.open('','_blank');if(w){w.document.write('<!doctype html><meta name="viewport" content="width=device-width"><body style="background:#132b36;margin:0;display:grid;place-items:center;min-height:100vh"><img style="max-width:98vw;max-height:98vh;object-fit:contain" src="'+src+'"></body>');w.document.close();}return;}
});
rowsEl.addEventListener('input',event=>{const el=event.target,row=getRow(el);if(!row)return;
 if(el.dataset.field==='text'){row.text=el.value;resizeTextarea(el);changed();}
 if(el.dataset.field==='item-text'){const i=Number(el.closest('[data-list-index]').dataset.listIndex);if(row.items[i]){row.items[i].text=el.value;changed();}}
 if(el.dataset.field==='photo-caption'){const i=Number(el.closest('[data-photo-index]').dataset.photoIndex);if(row.photos[i]){row.photos[i].caption=el.value;changed();}}
});
rowsEl.addEventListener('change',async event=>{const el=event.target,row=getRow(el);if(!row)return;
 if(el.dataset.field==='item-done'){const i=Number(el.closest('[data-list-index]').dataset.listIndex);if(row.items[i]){row.items[i].done=el.checked;el.closest('.list-entry').querySelector('[type=text]').classList.toggle('checked',el.checked);changed();}}
 if(el.classList.contains('photo-input')){const files=Array.from(el.files||[]);el.value='';if(!files.length)return;setStatus('Processando fotos...');let count=0;for(const f of files){if(!f.type.startsWith('image/')){toast('Arquivo ignorado: selecione apenas imagens.');continue;}try{const image=await encodeImage(f);row.photos.push({id:uid(),caption:'',dataUrl:image.dataUrl,width:image.width,height:image.height});count++;}catch(err){console.error(err);toast('Não foi possível processar: '+f.name);}}
 if(count){changed();render();toast(count+' fotografia(s) adicionada(s).');}}
});
async function encodeImage(file){if(file.size>35*1024*1024)throw Error('Imagem maior que 35 MB');const bitmap=await new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Imagem inválida'));};img.src=url;});
 let w=bitmap.naturalWidth,h=bitmap.naturalHeight;const limit=1800,ratio=Math.min(1,limit/Math.max(w,h));w=Math.max(1,Math.round(w*ratio));h=Math.max(1,Math.round(h*ratio));const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);return {dataUrl:canvas.toDataURL('image/jpeg',.82),width:w,height:h};}
// Pointer events: drag-and-drop in desktop AND tablets. Up/down via keyboard.
let dragging=null;
rowsEl.addEventListener('pointerdown',event=>{const handle=event.target.closest('.drag-handle');if(!handle||event.button!==0)return;const row=getRow(handle);if(!row)return;event.preventDefault();dragging={id:row.id,pointer:event.pointerId,startY:event.clientY,active:false,target:null,after:false};handle.setPointerCapture?.(event.pointerId);});
rowsEl.addEventListener('pointermove',event=>{if(!dragging||event.pointerId!==dragging.pointer)return;if(Math.abs(event.clientY-dragging.startY)>5)dragging.active=true;if(!dragging.active)return;rowsEl.querySelectorAll('.row-unit').forEach(el=>el.classList.remove('drop-before','drop-after','dragging'));
 const source=rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(dragging.id)}"]`);source?.classList.add('dragging');const el=document.elementFromPoint(event.clientX,event.clientY)?.closest('.row-unit');if(!el||el.dataset.rowId===dragging.id)return;const r=el.getBoundingClientRect(),after=event.clientY>r.top+r.height/2;dragging.target=el.dataset.rowId;dragging.after=after;el.classList.add(after?'drop-after':'drop-before');});
function endDrag(event){if(!dragging||event.pointerId!==dragging.pointer)return;const d=dragging;dragging=null;if(d.active&&d.target){const from=state.rows.findIndex(x=>x.id===d.id),to=state.rows.findIndex(x=>x.id===d.target);if(from>=0&&to>=0){const [moved]=state.rows.splice(from,1);let insert=state.rows.findIndex(x=>x.id===d.target)+(d.after?1:0);state.rows.splice(insert,0,moved);changed();}}render();}
rowsEl.addEventListener('pointerup',endDrag);rowsEl.addEventListener('pointercancel',endDrag);
rowsEl.addEventListener('keydown',e=>{if(!e.target.classList.contains('drag-handle')||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const row=getRow(e.target),i=state.rows.indexOf(row),j=e.key==='ArrowUp'?i-1:i+1;if(j<0||j>=state.rows.length)return;[state.rows[i],state.rows[j]]=[state.rows[j],state.rows[i]];changed();render();rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(row.id)}"] .drag-handle`)?.focus();});
// Title and exports
titleEl.addEventListener('input',()=>{state.title=titleEl.value;resizeTitle();changed();});
function resizeTitle(){titleEl.style.height='auto';titleEl.style.height=Math.max(42,titleEl.scrollHeight+2)+'px';}
window.addEventListener('resize',()=>{resizeTitle();rowsEl.querySelectorAll('textarea.text-editor').forEach(resizeTextarea);});
document.querySelectorAll('[data-export]').forEach(btn=>btn.addEventListener('click',()=>{try{GMINExport.exportFile(state,btn.dataset.export);if(btn.dataset.export==='pdf')toast('Na janela de impressão, escolha “Salvar como PDF”.');else toast('Arquivo preparado para download.');}catch(err){console.error(err);toast('Não foi possível exportar: '+err.message);}}));
$('#projectMenuButton').addEventListener('click',e=>{e.stopPropagation();const menu=$('#projectMenu'),isOpen=!menu.hidden;closeMenus();menu.hidden=isOpen;$('#projectMenuButton').setAttribute('aria-expanded',String(!menu.hidden));});
document.addEventListener('click',e=>{if(!e.target.closest('.row-menu,.row-menu-trigger,.project-menu,#projectMenuButton'))closeMenus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenus();});
$('#backupButton').addEventListener('click',()=>{GMINExport.download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),GMINExport.basename(state.title)+'_projeto_editavel.json');closeMenus();toast('Backup do projeto exportado.');});
$('#restoreButton').addEventListener('click',()=>{$('#restoreInput').click();closeMenus();});
$('#restoreInput').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>80*1024*1024){toast('Arquivo muito grande (limite de 80 MB).');return;}try{const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.rows)||typeof data.title!=='string')throw Error('Formato incompatível');if(!confirm('Substituir o relatório atual pelo backup selecionado?'))return;
 state={version:1,id:uid(),title:data.title.slice(0,180),createdAt:data.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),rows:data.rows.slice(0,1000).map(x=>({id:uid(),type:['empty','text','list','photo'].includes(x.type)?x.type:'empty',text:String(x.text||''),items:Array.isArray(x.items)?x.items.slice(0,500).map(z=>({id:uid(),text:String(z.text||''),done:!!z.done})):[],photos:Array.isArray(x.photos)?x.photos.filter(z=>typeof z.dataUrl==='string'&&/^data:image\/(jpeg|png|webp);base64,/i.test(z.dataUrl)).slice(0,80).map(z=>({id:uid(),dataUrl:z.dataUrl,caption:String(z.caption||''),width:Number(z.width)||1000,height:Number(z.height)||800})):[]}))};if(!state.rows.length)state.rows.push(newRow());titleEl.value=state.title;resizeTitle();render();saveNow();toast('Projeto importado.');
 }catch(err){console.error(err);toast('Backup inválido: '+err.message);}});
$('#newProjectButton').addEventListener('click',()=>{closeMenus();if(!confirm('Criar outro relatório? Salve um backup JSON do atual antes de continuar.'))return;state=fresh();titleEl.value=state.title;resizeTitle();render();saveNow();toast('Novo relatório criado.');});
window.addEventListener('pagehide',()=>{if(saveTimer)saveNow();});
window.addEventListener('online',()=>{toast('Internet disponível. O relatório permanece salvo neste dispositivo.');});
window.addEventListener('offline',()=>{toast('Sem internet. Pode continuar preenchendo normalmente.');});
async function init(){try{const stored=await GMINStorage.load();if(stored?.version===1&&Array.isArray(stored.rows)){state=stored;setStatus('Recuperado do tablet');}else setStatus('Pronto para inspeção');}
catch(err){console.warn(err);setStatus('Salvamento indisponível',true);toast('O navegador bloqueou o armazenamento. Exporte backups JSON frequentemente.');}
 loading=false;titleEl.value=state.title;resizeTitle();render();if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Offline PWA:',err));}}
init();
})();
