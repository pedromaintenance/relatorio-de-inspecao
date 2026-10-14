/* GMIN Inspeções v1.1 — editor offline com avaliação condicional e biblioteca local. */
(function () {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const rowsEl = $('#reportRows');
  const titleEl = $('#reportTitle');
  const statusEl = $('#saveStatus');
  const checklists = Array.isArray(window.GMIN_CHECKLISTS) ? window.GMIN_CHECKLISTS : [];
  const severityOptions = [
    { value: 'monitorar', label: 'Monitorar' },
    { value: 'anormal', label: 'Anormal' },
    { value: 'critico', label: 'Crítico' },
    { value: 'muito-critico', label: 'Muito Crítico' }
  ];
  const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const uid = () => globalThis.crypto?.randomUUID?.() || ('id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const machineEmpty = () => ({ tag: '', model: '', hours: '', odometer: '' });
  const newRow = (type = 'empty') => ({
    id: uid(), type, text: '', items: [], photos: [],
    command: '', system: '', method: '', assessment: '', severity: '', comment: '', source: ''
  });
  const defaultTitle = () => {
    const d = new Date();
    return `Relatório de Inspeção — ${d.toLocaleDateString('pt-BR')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const fresh = () => ({ version: 2, id: uid(), title: defaultTitle(), meta: machineEmpty(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), rows: [newRow()] });

  let state = fresh();
  let saveTimer = null, saveChain = Promise.resolve(), toastTimer = null, loading = true;

  function toast(message) {
    const el = $('#toast'); el.textContent = message; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 4600);
  }
  function setStatus(message, warning = false) {
    statusEl.innerHTML = `<span class="status-dot"></span>${esc(message)}`;
    statusEl.classList.toggle('warn', warning);
  }
  function saveNow() {
    if (loading) return;
    clearTimeout(saveTimer);
    state.updatedAt = new Date().toISOString();
    const snapshot = JSON.parse(JSON.stringify(state));
    saveChain = saveChain.catch(() => {}).then(() => GMINStorage.save(snapshot))
      .then(() => setStatus('Salvo no tablet'))
      .catch(error => {
        console.error(error); setStatus('Falha ao salvar', true);
        toast('Armazenamento indisponível. Exporte um backup JSON.');
      });
    return saveChain;
  }
  function changed() {
    if (loading) return;
    setStatus('Salvando...'); clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
  }
  function resizeArea(textarea, minHeight = 90) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(minHeight, textarea.scrollHeight + 2) + 'px';
  }
  function resizeTitle() { resizeArea(titleEl, 42); }
  function photoMarkup(row) {
    return `<div class="photo-grid">${(row.photos || []).map((photo, i) => `
      <div class="photo-item" data-photo-index="${i}">
        <img src="${photo.dataUrl}" alt="${esc(photo.caption || 'Evidência fotográfica')}" data-action="photo-view">
        <div class="photo-footer"><input type="text" data-field="photo-caption" class="photo-caption"
          value="${esc(photo.caption)}" placeholder="Legenda da foto" aria-label="Legenda da foto ${i + 1}">
          <button type="button" data-action="photo-remove" class="remove-photo no-print" aria-label="Remover fotografia">✕</button></div>
      </div>`).join('')}</div>
      <div class="photo-actions no-print" role="group" aria-label="Adicionar fotografias">
        <button type="button" data-action="photo-camera" class="add-photo photo-camera-button">📷 Tirar foto</button>
        <button type="button" data-action="photo-gallery" class="add-photo photo-gallery-button">＋ Escolher da galeria</button>
      </div>
      <input type="file" accept="image/*" capture="environment" class="photo-input photo-camera-input" aria-label="Tirar foto usando a câmera" hidden>
      <input type="file" accept="image/*" multiple class="photo-input photo-gallery-input" aria-label="Selecionar fotografias da galeria ou de arquivos" hidden>`;
  }
  function assessmentMarkup(row) {
    const val = row.assessment || '';
    const statusClass = val === 'ok' ? 'status-ok' : val === 'not-ok' ? 'status-nok' : '';
    const choices = severityOptions.map(opt => `<button type="button" class="severity-pill severity-${opt.value} ${row.severity === opt.value ? 'selected' : ''}"
      data-action="severity" data-value="${opt.value}" aria-pressed="${row.severity === opt.value}">${opt.label}</button>`).join('');
    return { statusClass: val === 'not-ok' && row.severity ? 'severity-' + row.severity : statusClass,
      html: `<div class="row-content assessment-content">
        <div class="block-heading no-print">${row.source ? 'Checklist pré-definido' : 'Avaliação de inspeção'}${row.system ? ` · ${esc(row.system)}` : ''}</div>
        <textarea class="assessment-command" data-field="command" rows="1" placeholder="Descreva o comando da inspeção..." aria-label="Comando da inspeção">${esc(row.command || '')}</textarea>
        ${row.method ? `<div class="inspection-method">Método: ${esc(row.method)}</div>` : ''}
        <div class="assessment-status no-print">
          <button type="button" data-action="assessment-ok" class="answer-button ${val === 'ok' ? 'selected ok' : ''}" aria-pressed="${val === 'ok'}">✓ OK</button>
          <button type="button" data-action="assessment-nok" class="answer-button ${val === 'not-ok' ? 'selected nok' : ''}" aria-pressed="${val === 'not-ok'}">✕ Não OK</button>
        </div>
        ${val === 'ok' ? '<div class="result-caption result-ok">✓ Condição conforme</div>' : ''}
        ${val === 'not-ok' ? `<div class="assessment-details">
          <div class="severity-label">Avaliação da anomalia</div>
          <div class="severity-options no-print">${choices}</div>
          ${row.severity ? `<div class="result-caption result-severity">${esc(severityOptions.find(s => s.value === row.severity)?.label || '')}</div>` : ''}
          <label class="assessment-comment-label">Comentário / evidência observada
            <textarea class="assessment-comment" data-field="comment" rows="2" placeholder="Descreva a condição, local, intensidade e recomendações...">${esc(row.comment || '')}</textarea></label>
          <div class="assessment-photos"><div class="severity-label">Fotografias</div>${photoMarkup(row)}</div>
        </div>` : ''}
      </div>` };
  }
  function rowHTML(row) {
    const menu = `<button type="button" class="row-menu-trigger no-print" data-action="menu" aria-label="Opções da linha" title="Opções">⋯</button>
      <div class="row-menu no-print" hidden><button type="button" data-action="edit">Editar</button>
      <button type="button" data-action="duplicate">Duplicar</button>
      <button type="button" data-action="delete" class="danger">Excluir linha</button></div>`;
    let content = '', statusClass = '';
    if (row.type === 'empty') content = `<div class="choice-group">
      <button type="button" class="choice-button" data-action="choose-text"><span class="choice-icon">▤</span>Adicionar texto</button>
      <button type="button" class="choice-button" data-action="choose-photo"><span class="choice-icon">▧</span>Adicionar foto</button>
      <button type="button" class="choice-button" data-action="choose-list"><span class="choice-icon">☷</span>Adicionar lista</button>
      <button type="button" class="choice-button" data-action="choose-assessment"><span class="choice-icon">◉</span>Avaliação</button></div>`;
    if (row.type === 'text') content = `<div class="row-content"><div class="block-heading no-print">Texto</div>
      <textarea class="text-editor" data-field="text" placeholder="Observações, sintomas, medições ou serviços necessários...">${esc(row.text)}</textarea></div>`;
    if (row.type === 'list') content = `<div class="row-content"><div class="block-heading no-print">Lista</div><div class="list-items">
      ${(row.items || []).map((item, i) => `<div class="list-entry" data-list-index="${i}"><input type="checkbox" data-field="item-done" aria-label="Marcar item como concluído" ${item.done ? 'checked' : ''}>
      <input type="text" data-field="item-text" class="${item.done ? 'checked' : ''}" placeholder="Item da lista" aria-label="Item ${i + 1}" value="${esc(item.text)}">
      <button type="button" class="remove-list-item no-print" data-action="list-remove" aria-label="Excluir item">✕</button></div>`).join('')}
      </div><button type="button" class="add-item no-print" data-action="list-add">＋ Adicionar item</button></div>`;
    if (row.type === 'photo') content = `<div class="row-content"><div class="block-heading no-print">Fotografias</div>${photoMarkup(row)}</div>`;
    if (row.type === 'assessment') { const result = assessmentMarkup(row); content = result.html; statusClass = result.statusClass; }
    return `<div class="row-unit" data-row-id="${esc(row.id)}">
      <button type="button" class="drag-handle no-print" aria-label="Arrastar linha (ou use setas no teclado)" title="Arraste para reordenar" draggable="false">⋮⋮</button>
      <div class="row-card ${row.type === 'empty' ? 'empty' : ''} ${row.type === 'assessment' ? 'assessment-card' : ''} ${statusClass}">${content}${menu}</div>
      <div class="row-add-wrap no-print"><button type="button" class="add-row" data-action="insert" aria-label="Criar linha abaixo" title="Nova linha">+</button></div></div>`;
  }
  function render({ focusId = null } = {}) {
    rowsEl.innerHTML = state.rows.map(rowHTML).join('');
    rowsEl.querySelectorAll('textarea.text-editor,textarea.assessment-command,textarea.assessment-comment').forEach(t => resizeArea(t, t.classList.contains('assessment-command') ? 50 : 76));
    if (focusId) rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(focusId)}"]`)?.querySelector('textarea,input[type=text]')?.focus();
  }
  function getRow(element) { const container = element.closest('.row-unit'); return container && state.rows.find(row => row.id === container.dataset.rowId); }
  function closeMenus() {
    rowsEl.querySelectorAll('.row-menu').forEach(el => { el.hidden = true; });
    $('#projectMenu').hidden = true; $('#projectMenuButton').setAttribute('aria-expanded', 'false');
  }
  function mutateRow(row, fn, focus = false) { fn(row); changed(); render({ focusId: focus ? row.id : null }); }
  function deleteRow(row) {
    const populated = row.type === 'assessment' ? Boolean(row.command || row.assessment || row.comment || row.photos?.length) :
      row.type === 'text' ? Boolean(row.text.trim()) : row.type === 'list' ? row.items.some(item => item.text.trim()) : row.type === 'photo' && row.photos.length;
    if (populated && !confirm('Excluir esta linha e todo o seu conteúdo?')) return;
    state.rows.splice(state.rows.indexOf(row), 1);
    if (!state.rows.length) state.rows.push(newRow());
    changed(); render();
  }
  function duplicate(row) {
    const clone = JSON.parse(JSON.stringify(row)); clone.id = uid();
    state.rows.splice(state.rows.indexOf(row) + 1, 0, clone);
    changed(); render(); toast('Linha duplicada.');
  }
  rowsEl.addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const action = button.dataset.action, row = getRow(button); if (!row) return;
    if (action === 'menu') {
      const menu = button.nextElementSibling, wasOpen = !menu.hidden;
      closeMenus(); menu.hidden = wasOpen; return;
    }
    if (action === 'insert') { state.rows.splice(state.rows.indexOf(row) + 1, 0, newRow()); changed(); render(); return; }
    if (action === 'choose-text') { mutateRow(row, r => { r.type = 'text'; r.text = ''; }, true); return; }
    if (action === 'choose-list') { mutateRow(row, r => { r.type = 'list'; r.items = [{ id: uid(), text: '', done: false }]; }, true); return; }
    if (action === 'choose-photo') {
      // Exibe as duas formas de inserir imagem, sem abrir automaticamente o seletor de arquivos.
      mutateRow(row, r => { r.type = 'photo'; r.photos = []; }); return;
    }
    if (action === 'choose-assessment') { mutateRow(row, r => Object.assign(r, { type: 'assessment', command: '', assessment: '', severity: '', comment: '', photos: [] }), true); return; }
    if (action === 'edit') { closeMenus(); rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(row.id)}"]`)?.querySelector('textarea,input[type=text]')?.focus(); return; }
    if (action === 'duplicate') { duplicate(row); return; }
    if (action === 'delete') { deleteRow(row); return; }
    if (action === 'assessment-ok') { mutateRow(row, r => { r.assessment = 'ok'; }); return; }
    if (action === 'assessment-nok') { mutateRow(row, r => { r.assessment = 'not-ok'; }); return; }
    if (action === 'severity') { mutateRow(row, r => { r.severity = button.dataset.value; }); return; }
    if (action === 'list-add') {
      row.items.push({ id: uid(), text: '', done: false }); changed(); render();
      rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(row.id)}"] .list-entry:last-child [type=text]`)?.focus(); return;
    }
    if (action === 'list-remove') { row.items.splice(Number(button.closest('[data-list-index]').dataset.listIndex), 1); changed(); render(); return; }
    if (action === 'photo-camera') {
      button.closest('.row-unit').querySelector('.photo-camera-input')?.click(); return;
    }
    if (action === 'photo-gallery') {
      button.closest('.row-unit').querySelector('.photo-gallery-input')?.click(); return;
    }
    if (action === 'photo-remove') {
      if (!confirm('Remover esta fotografia?')) return;
      row.photos.splice(Number(button.closest('[data-photo-index]').dataset.photoIndex), 1); changed(); render(); return;
    }
    if (action === 'photo-view') {
      const image = button.getAttribute('src'), win = window.open('', '_blank');
      if (win) { win.document.write(`<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0;background:#132b36;display:grid;place-items:center;min-height:100vh"><img alt="Fotografia" src="${image}" style="max-width:98vw;max-height:98vh;object-fit:contain"></body>`); win.document.close(); }
    }
  });
  rowsEl.addEventListener('input', event => {
    const el = event.target, row = getRow(el); if (!row) return;
    if (el.dataset.field === 'text') { row.text = el.value; resizeArea(el); changed(); }
    if (el.dataset.field === 'command') { row.command = el.value; resizeArea(el, 50); changed(); }
    if (el.dataset.field === 'comment') { row.comment = el.value; resizeArea(el, 76); changed(); }
    if (el.dataset.field === 'item-text') {
      const item = row.items[Number(el.closest('[data-list-index]').dataset.listIndex)];
      if (item) { item.text = el.value; changed(); }
    }
    if (el.dataset.field === 'photo-caption') {
      const photo = row.photos[Number(el.closest('[data-photo-index]').dataset.photoIndex)];
      if (photo) { photo.caption = el.value; changed(); }
    }
  });
  rowsEl.addEventListener('change', async event => {
    const el = event.target, row = getRow(el); if (!row) return;
    if (el.dataset.field === 'item-done') {
      const item = row.items[Number(el.closest('[data-list-index]').dataset.listIndex)];
      if (item) { item.done = el.checked; el.closest('.list-entry').querySelector('[type=text]').classList.toggle('checked', el.checked); changed(); }
    }
    if (el.classList.contains('photo-input')) {
      const files = Array.from(el.files || []); el.value = ''; if (!files.length) return;
      setStatus('Processando fotos...'); let count = 0;
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        try { row.photos.push({ id: uid(), caption: '', ...await encodeImage(file) }); count++; }
        catch (error) { console.error(error); toast(`Falha ao processar ${file.name}`); }
      }
      if (count) { changed(); render(); toast(`${count} fotografia(s) adicionada(s).`); }
    }
  });
  async function encodeImage(file) {
    if (file.size > 35 * 1024 * 1024) throw Error('Fotografia maior que 35 MB');
    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), photo = new Image();
      photo.onload = () => { URL.revokeObjectURL(url); resolve(photo); };
      photo.onerror = () => { URL.revokeObjectURL(url); reject(Error('Imagem inválida')); };
      photo.src = url;
    });
    const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale)), height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL('image/jpeg', .82), width, height };
  }

  // Reordenação por alça: mouse, toque e setas do teclado.
  let dragging = null;
  rowsEl.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.drag-handle'); if (!handle || event.button !== 0) return;
    const row = getRow(handle); if (!row) return;
    event.preventDefault(); dragging = { id: row.id, pointer: event.pointerId, startY: event.clientY, active: false, target: null, after: false };
    handle.setPointerCapture?.(event.pointerId);
  });
  rowsEl.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== dragging.pointer) return;
    if (Math.abs(event.clientY - dragging.startY) > 5) dragging.active = true;
    if (!dragging.active) return;
    rowsEl.querySelectorAll('.row-unit').forEach(el => el.classList.remove('drop-before', 'drop-after', 'dragging'));
    rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(dragging.id)}"]`)?.classList.add('dragging');
    const dest = document.elementFromPoint(event.clientX, event.clientY)?.closest('.row-unit');
    if (!dest || dest.dataset.rowId === dragging.id) return;
    const box = dest.getBoundingClientRect(), after = event.clientY > box.top + box.height / 2;
    dragging.target = dest.dataset.rowId; dragging.after = after;
    dest.classList.add(after ? 'drop-after' : 'drop-before');
  });
  function endDrag(event) {
    if (!dragging || event.pointerId !== dragging.pointer) return;
    const drop = dragging; dragging = null;
    if (drop.active && drop.target) {
      const from = state.rows.findIndex(r => r.id === drop.id);
      if (from >= 0 && state.rows.some(r => r.id === drop.target)) {
        const [moved] = state.rows.splice(from, 1);
        const to = state.rows.findIndex(r => r.id === drop.target) + (drop.after ? 1 : 0);
        state.rows.splice(to, 0, moved); changed();
      }
    }
    render();
  }
  rowsEl.addEventListener('pointerup', endDrag); rowsEl.addEventListener('pointercancel', endDrag);
  rowsEl.addEventListener('keydown', event => {
    if (!event.target.classList.contains('drag-handle') || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); const row = getRow(event.target), from = state.rows.indexOf(row), to = from + (event.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= state.rows.length) return;
    [state.rows[from], state.rows[to]] = [state.rows[to], state.rows[from]]; changed(); render();
    rowsEl.querySelector(`.row-unit[data-row-id="${CSS.escape(row.id)}"] .drag-handle`)?.focus();
  });

  // Cabeçalho da máquina, filtro e biblioteca de checklists.
  titleEl.addEventListener('input', () => { state.title = titleEl.value; resizeTitle(); changed(); });
  document.querySelectorAll('[data-meta]').forEach(input => input.addEventListener('input', () => {
    state.meta[input.dataset.meta] = input.value;
    if (input.dataset.meta === 'model') renderChecklistChoices();
    changed();
  }));
  function normalize(text) { return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function renderChecklistChoices() {
    const manualQuery = normalize($('#checklistFilter').value);
    const machineQuery = normalize(state.meta.model);
    const matches = (item, query) => [item.title, ...item.models].some(term => normalize(term).includes(query) || query.includes(normalize(term)));
    // Checklists em destaque ficam no topo, mesmo quando o modelo da máquina está preenchido.
    // Uma pesquisa digitada manualmente continua filtrando todos os resultados.
    const visible = checklists.filter(item => manualQuery
      ? matches(item, manualQuery)
      : item.featured || !machineQuery || matches(item, machineQuery));
    const count = checklists.reduce((acc, item) => acc + item.items.length, 0);
    $('#checklistChoices').innerHTML = visible.length ? visible.map(item => `<div class="checklist-choice">
      <div><b>${esc(item.title)}</b><span>${item.items.length} itens · ${esc(item.models.join(', '))}</span></div>
      <button type="button" data-template-id="${esc(item.id)}">＋ Adicionar</button></div>`).join('') :
      `<div class="checklist-empty">Nenhum modelo correspondente. Limpe o filtro para consultar as ${checklists.length} checklists (${count} itens).</div>`;
  }
  $('#checklistsButton').addEventListener('click', () => {
    const panel = $('#checklistPanel'); panel.hidden = !panel.hidden;
    $('#checklistsButton').setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) { $('#checklistFilter').value = ''; renderChecklistChoices(); panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });
  $('#closeChecklistPanel').addEventListener('click', () => {
    $('#checklistPanel').hidden = true; $('#checklistsButton').setAttribute('aria-expanded', 'false');
  });
  $('#checklistFilter').addEventListener('input', renderChecklistChoices);
  $('#checklistChoices').addEventListener('click', event => {
    const btn = event.target.closest('[data-template-id]'); if (!btn) return;
    const template = checklists.find(item => item.id === btn.dataset.templateId); if (!template) return;
    if (!confirm(`Adicionar ${template.items.length} itens do checklist “${template.title}” ao relatório atual?`)) return;
    const inserted = template.items.map(item => ({ ...newRow('assessment'), command: item.command, system: item.system,
      method: item.method || '', source: template.title }));
    if (state.rows.length === 1 && state.rows[0].type === 'empty') state.rows = inserted;
    else state.rows.push(...inserted);
    changed(); render();
    $('#checklistPanel').hidden = true; $('#checklistsButton').setAttribute('aria-expanded', 'false');
    toast(`${inserted.length} itens adicionados. Tudo disponível offline.`);
  });

  window.addEventListener('resize', () => {
    resizeTitle(); rowsEl.querySelectorAll('textarea.text-editor,textarea.assessment-command,textarea.assessment-comment')
      .forEach(t => resizeArea(t, t.classList.contains('assessment-command') ? 50 : 76));
  });
  document.querySelectorAll('[data-export]').forEach(btn => btn.addEventListener('click', () => {
    try {
      GMINExport.exportFile(state, btn.dataset.export);
      toast(btn.dataset.export === 'pdf' ? 'Escolha “Salvar como PDF” na impressão.' : 'Arquivo preparado para download.');
    } catch (error) { console.error(error); toast('Erro na exportação: ' + error.message); }
  }));
  $('#projectMenuButton').addEventListener('click', event => {
    event.stopPropagation(); const menu = $('#projectMenu'), wasOpen = !menu.hidden;
    closeMenus(); menu.hidden = wasOpen;
    $('#projectMenuButton').setAttribute('aria-expanded', String(!menu.hidden));
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.row-menu,.row-menu-trigger,.project-menu,#projectMenuButton')) closeMenus();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') {
    closeMenus(); $('#checklistPanel').hidden = true; $('#checklistsButton').setAttribute('aria-expanded', 'false');
  }});
  $('#backupButton').addEventListener('click', () => {
    GMINExport.download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
      GMINExport.basename(state.title) + '_projeto_editavel.json');
    closeMenus(); toast('Backup JSON exportado.');
  });
  $('#restoreButton').addEventListener('click', () => { $('#restoreInput').click(); closeMenus(); });
  function sanitizedPhoto(photo) {
    if (!photo || !/^data:image\/(jpeg|png|webp);base64,/i.test(photo.dataUrl || '')) return null;
    return { id: uid(), dataUrl: photo.dataUrl, caption: String(photo.caption || '').slice(0, 500),
      width: Number(photo.width) || 1000, height: Number(photo.height) || 800 };
  }
  function normalizeImported(data) {
    if (![1, 2].includes(data.version) || !Array.isArray(data.rows) || typeof data.title !== 'string') throw Error('Formato incompatível');
    return {
      version: 2, id: uid(), title: data.title.slice(0, 180),
      meta: Object.fromEntries(Object.keys(machineEmpty()).map(key => [key, String(data.meta?.[key] || '').slice(0, 120)])),
      createdAt: data.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      rows: data.rows.slice(0, 1200).map(row => ({ ...newRow(),
        type: ['empty', 'text', 'list', 'photo', 'assessment'].includes(row.type) ? row.type : 'empty',
        text: String(row.text || '').slice(0, 200000),
        items: Array.isArray(row.items) ? row.items.slice(0, 500).map(item => ({ id: uid(), text: String(item.text || ''), done: !!item.done })) : [],
        photos: Array.isArray(row.photos) ? row.photos.slice(0, 80).map(sanitizedPhoto).filter(Boolean) : [],
        command: String(row.command || '').slice(0, 5000), system: String(row.system || '').slice(0, 100),
        method: String(row.method || '').slice(0, 100),
        assessment: ['ok', 'not-ok'].includes(row.assessment) ? row.assessment : '',
        severity: severityOptions.some(s => s.value === row.severity) ? row.severity : '',
        comment: String(row.comment || '').slice(0, 200000), source: String(row.source || '').slice(0, 100)
      }))
    };
  }
  function hydrateInputs() {
    titleEl.value = state.title; resizeTitle();
    document.querySelectorAll('[data-meta]').forEach(el => { el.value = state.meta?.[el.dataset.meta] || ''; });
  }
  $('#restoreInput').addEventListener('change', async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (file.size > 80 * 1024 * 1024) { toast('Arquivo maior que 80 MB.'); return; }
    try {
      const imported = normalizeImported(JSON.parse(await file.text()));
      if (!confirm('Substituir o relatório atual pelo backup selecionado?')) return;
      state = imported; if (!state.rows.length) state.rows.push(newRow());
      hydrateInputs(); render(); await saveNow(); toast('Backup importado com sucesso.');
    } catch (error) { console.error(error); toast('Backup inválido: ' + error.message); }
  });
  $('#newProjectButton').addEventListener('click', () => {
    closeMenus();
    if (!confirm('Criar outro relatório? Exporte um backup JSON do atual antes de continuar.')) return;
    state = fresh(); hydrateInputs(); render(); saveNow(); toast('Novo relatório criado.');
  });
  window.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });
  window.addEventListener('online', () => toast('Conexão disponível. Relatório permanece salvo neste dispositivo.'));
  window.addEventListener('offline', () => toast('Sem internet. O aplicativo continua funcionando.'));
  async function init() {
    try {
      const stored = await GMINStorage.load();
      if (stored?.rows && [1, 2].includes(stored.version)) {
        // Preserva dados históricos v1.0; migra formato em memória sem apagar a base antiga antecipadamente.
        state = normalizeImported(stored);
        // Reaproveita IDs de bloco quando restaurando dados locais.
        state.id = stored.id || state.id;
        state.rows.forEach((row, i) => { row.id = stored.rows[i]?.id || row.id; });
        setStatus('Relatório recuperado');
      } else setStatus('Pronto para inspeção');
    } catch (error) { console.warn(error); setStatus('Salvamento indisponível', true); toast('Exporte backups JSON para proteger seus dados.'); }
    loading = false; hydrateInputs(); render(); renderChecklistChoices();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Service Worker:', error));
    }
  }
  init();
})();
