// Comprueba el tamaño del paquete principal generado por Vite.
// Evita que una modificación envíe innecesariamente todos los módulos al primer acceso.
import {readFileSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(process.cwd(),'dist');
const html=readFileSync(join(root,'index.html'),'utf8');
const asset=html.match(/<script[^>]+src="\/(assets\/index-[^"]+\.js)"/)?.[1];
if(!asset)throw new Error('No se encontró el entrypoint JavaScript de Vite');
const bytes=statSync(join(root,asset)).size;
const budgetBytes=485000; // Línea de base tras optimización: 469327 bytes.
console.log('JavaScript inicial: '+bytes+' bytes (límite '+budgetBytes+')');
if(bytes>budgetBytes) {
 console.error('El bundle principal excede el presupuesto. Revisar imports estáticos o dependencias.');
 process.exitCode=1;
}
