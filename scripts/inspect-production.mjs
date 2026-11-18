// Diagnóstico público y de solo lectura del despliegue de Crónicas RPG.
// Nunca imprime el JavaScript compilado, tokens ni encabezados HTTP confidenciales.
const origin='https://cronicas-rpg-dresest.vercel.app';
const assets=[
  '/',
  '/assets/index-db-keepalive-20261030.js',
  '/assets/DMInventoryView-cp8IDlnF-dbKeepalive.js',
  '/assets/SkillsView-BT0yR39X-dbKeepalive.js',
];
let anyReadable=false;
for(const path of assets){
  try {
    const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});
    const ct=response.headers.get('content-type')||'';
    if(!response.ok){
      console.log(JSON.stringify({path,status:response.status,accessible:false}));
      continue;
    }
    const body=await response.text();
    const matches=Object.fromEntries(['/api/generate-item','/api/generate-rpg','generate-item','generate-rpg','database-health'].map(term=>{
      return [term,body.includes(term)];
    }));
    // Extrae SOLO nombres de campos cercanos a las referencias, nunca valores.
    const keys=[];
    for(const term of ['generate-item','generate-rpg']){
      const i=body.indexOf(term);
      if(i<0)continue;
      const around=body.slice(Math.max(0,i-240),Math.min(body.length,i+700));
      const fields=[...around.matchAll(/(?:[{,]|\b)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g)].map(m=>m[1]);
      keys.push({term,fieldNames:[...new Set(fields)].filter(k=>/^[a-zA-Z][a-zA-Z0-9_]*$/.test(k)).slice(0,28)});
    }
    console.log(JSON.stringify({path,status:response.status,bytes:body.length,contentType:ct.split(';')[0],matches,keys}));
    anyReadable=true;
  }catch(error){
    console.log(JSON.stringify({path,accessible:false,error:error instanceof Error?error.name:'unknown'}));
  }
}
if(!anyReadable)console.log('No fue posible analizar archivos publicos (podria existir proteccion de despliegue).');
