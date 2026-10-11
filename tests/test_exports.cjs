/* Teste estrutural dos exportadores offline, sem bibliotecas externas. Execute: node tests/test_exports.cjs */
const vm = require('vm'), fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const ctx = { TextEncoder, Blob, Uint8Array, DataView, Date, atob, URL, setTimeout, console };
ctx.window = ctx; vm.createContext(ctx);
for (const file of ['js/logo-data.js', 'js/zip.js', 'js/exports.js', 'js/checklists-data.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
const templates = ctx.GMIN_CHECKLISTS;
assert.strictEqual(templates.length, 10);
assert.strictEqual(templates.reduce((sum, t) => sum + t.items.length, 0), 474);
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
