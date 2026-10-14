/* Teste estrutural dos exportadores offline, sem bibliotecas externas. Execute: node tests/test_exports.cjs */
const vm = require('vm'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const ctx = { TextEncoder, Blob, Uint8Array, DataView, Date, atob, URL, setTimeout, console };
ctx.window = ctx; vm.createContext(ctx);
for (const file of ['js/logo-data.js', 'js/zip.js', 'js/exports.js', 'js/checklists-data.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}

// Contrato da interface de inserção de fotografias (captura nativa e galeria).
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const photoMarkupCode = appSource.slice(appSource.indexOf('  function photoMarkup(row) {'), appSource.indexOf('  function assessmentMarkup(row) {'));
assert(photoMarkupCode.includes('data-action="photo-camera"'), 'Faltou botão Tirar foto');
assert(photoMarkupCode.includes('data-action="photo-gallery"'), 'Faltou botão Galeria');
assert(photoMarkupCode.includes('capture="environment"'), 'Faltou solicitação de câmera traseira');
assert(photoMarkupCode.includes('class="photo-input photo-camera-input"'), 'Faltou campo de captura');
assert(photoMarkupCode.includes('multiple class="photo-input photo-gallery-input"'), 'Faltou seleção múltipla na galeria');
assert(appSource.includes("if (action === 'photo-camera')") && appSource.includes("querySelector('.photo-camera-input')?.click()"), 'Botão de câmera não conectado');
assert(appSource.includes("if (action === 'photo-gallery')") && appSource.includes("querySelector('.photo-gallery-input')?.click()"), 'Botão da galeria não conectado');
assert(appSource.includes("if (el.classList.contains('photo-input'))"), 'Pipeline de processamento de imagem não compartilhado');

const templates = ctx.GMIN_CHECKLISTS;
assert.strictEqual(templates.length, 11);
assert.strictEqual(templates.reduce((sum, t) => sum + t.items.length, 0), 482);
assert.strictEqual(templates[0].id, 'check-11');
assert.strictEqual(templates[0].title, 'Inspeção de Caçamba');
assert.strictEqual(templates[0].featured, true);
assert.deepStrictEqual(Array.from(templates[0].items, item => item.command), ["Caçamba - Capas de Unha","Caçamba - Adaptadores","Caçamba - Lábio","Caçamba - Entredentes","Caçamba - Protetor Lateral","Caçamba - Protetor de Canto","Caçamba - Chapas de Desgaste","Caçamba - Estrutura"]);
const png = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets/logo-tz.png')).toString('base64');
const sample = {
  version: 2,
  title: 'INSPEÇÃO DE TESTE — CAT 777 / manhã',
  meta: { tag: '040-005', model: 'CAT 777', hours: '14344,2', odometer: '922,0' },
  rows: [
    { type: 'text', text: 'Máquina 040-005\nInspeção sensitiva de rotina.' },
    { type: 'assessment', command: 'Inspecionar estado das mangueiras', system: 'Sistema Hidráulico', assessment: 'ok', photos: [] },
    { type: 'assessment', command: 'Verificar vazamentos no motor', system: 'Motor Diesel', assessment: 'not-ok', severity: 'muito-critico', comment: 'Vazamento em conexão & mangueira', photos: [{ dataUrl: png, caption: 'Anomalia & exemplo', width: 1000, height: 401 }] },
    { type: 'list', items: [{ text: 'Conferir nível', done: true }, { text: 'Inspecionar mangueira', done: false }] },
    { type: 'photo', photos: [{ dataUrl: png, caption: 'Foto geral', width: 1000, height: 401 }] }
  ]
};
const html = ctx.GMINExport.reportHTML(sample);
for (const check of ['040-005', 'CAT 777', 'Muito Crítico', 'Não OK', 'Anomalia &amp; exemplo']) assert(html.includes(check), 'HTML sem ' + check);
async function main() {
  const target = path.join(__dirname, 'artifacts'); fs.mkdirSync(target, { recursive: true });
  for (const [ext, fn] of [['docx', ctx.GMINExport.makeDOCX], ['xlsx', ctx.GMINExport.makeXLSX]]) {
    const blob = fn(sample); const output = path.join(target, 'sample.' + ext);
    fs.writeFileSync(output, Buffer.from(await blob.arrayBuffer()));
    console.log(ext, blob.size);
  }
  fs.writeFileSync(path.join(target, 'sample.html'), html);
  console.log('HTML', html.length, '| Modelos', templates.length, '| Itens', templates.reduce((n, x) => n + x.items.length, 0));
}
main().catch(error => { console.error(error); process.exit(1); });
