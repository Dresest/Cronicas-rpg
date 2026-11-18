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
      const around=body.slice(Math.max(0,i-1200),Math.min(body.length,i+2200));
      const fields=[...around.matchAll(/(?:[{,]|\b)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g)].map(m=>m[1]);
      keys.push({term,fieldNames:[...new Set(fields)].filter(k=>/^[a-zA-Z][a-zA-Z0-9_]*$/.test(k)).slice(0,80)});
    }
    console.log(JSON.stringify({path,status:response.status,bytes:body.length,contentType:ct.split(';')[0],matches,keys}));
    // Solo se imprime un fragmento de la llamada del navegador, nunca secretos o tokens.
    if(path.includes('index-db-keepalive-20261030.js')){
      // Contrato público cliente-servidor: definición y llamadas sin valores de tokens.
      const indexes=[...body.matchAll(/AiRpgRequest\(/g)].map(m=>m.index);
      for(const [n,p] of indexes.slice(0,6).entries()){
        const segment=body.slice(Math.max(0,p-(n===0?20:240)),Math.min(body.length,p+(n===0?1250:300)))
          .replace(/eyJ[A-Za-z0-9_.-]{30,}/g,'[JWT REDACTADO]')
          .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g,'[CLAVE REDACTADA]');
        console.log(JSON.stringify({clientCallIndex:n,excerpt:segment}));
      }

      const needle='/api/generate-rpg';
      const p=body.indexOf(needle);
      if(p>=0){
        const excerpt=body.slice(Math.max(0,p-560),Math.min(body.length,p+240))
          .replace(/eyJ[A-Za-z0-9_.-]{30,}/g,'[JWT REDACTADO]')
          .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g,'[CLAVE REDACTADA]')
          .replace(/https:\/\/[^ "'`]+?supabase\.co/g,'[URL SUPABASE REDACTADA]');
        console.log(JSON.stringify({clientContractExcerpt:excerpt}));
      }
    }

    anyReadable=true;
  }catch(error){
    console.log(JSON.stringify({path,accessible:false,error:error instanceof Error?error.name:'unknown'}));
  }
}
if(!anyReadable)console.log('No fue posible analizar archivos publicos (podria existir proteccion de despliegue).');
