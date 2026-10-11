const vm=require('vm'),fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const ctx={TextEncoder,Blob,Uint8Array,DataView,Date,atob,URL,setTimeout,console};ctx.window=ctx;vm.createContext(ctx);
for (const fn of ['js/logo-data.js','js/zip.js','js/exports.js']) vm.runInContext(fs.readFileSync(path.join(root,fn),'utf8'),ctx,{filename:fn});
fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
const png='data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/logo-tz.png')).toString('base64');
const sample={title:'INSPEÇÃO DE TESTE — CAT 777 / manhã',rows:[{type:'text',text:'Máquina 040-005\nVazamento hidráulico confirmado & foto anexa.'},{type:'list',items:[{text:'Conferir nível',done:true},{text:'Inspecionar mangueira',done:false}]},{type:'photo',photos:[{dataUrl:png,caption:'Foto & exemplo',width:1000,height:401}]}]};
async function main(){for(const [ext,func] of [['docx',ctx.GMINExport.makeDOCX],['xlsx',ctx.GMINExport.makeXLSX]]){const blob=func(sample);const p=path.join(__dirname,'artifacts','sample.'+ext);fs.writeFileSync(p,Buffer.from(await blob.arrayBuffer()));console.log(ext,blob.size)}fs.writeFileSync(path.join(__dirname,'artifacts','sample.html'),ctx.GMINExport.reportHTML(sample));console.log('HTML',ctx.GMINExport.reportHTML(sample).length);}
main().catch(e=>{console.error(e);process.exit(1)});
