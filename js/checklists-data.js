/* Registro local: carregue antes dos módulos individuais (index.html). Sem rede ou build. */
window.GMIN_CHECKLISTS = [];
window.GMINRegisterChecklist = function (template) {
  if (!template.id || !template.title || !template.category || !template.context || !template.revision || !Array.isArray(template.models) || !Array.isArray(template.items) || !template.items.length) throw new Error("Checklist inválido: " + template.id);
  if (window.GMIN_CHECKLISTS.some(item => item.id === template.id)) throw new Error("ID de checklist duplicado: " + template.id);
  const ids = new Set();
  for (const item of template.items) {
    if (!item.id || ids.has(item.id) || !item.command) throw new Error("Item inválido ou duplicado: " + template.id);
    ids.add(item.id);
  }
  window.GMIN_CHECKLISTS.push(template);
};
