// Smoke tests de navegador: usa un Supabase completamente ficticio.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright';
const WEB='http://127.0.0.1:4173';
const MOCK='https://rpg-e2e.supabase.co';
const staffId='00000000-0000-0000-0000-000000000001';
const playerId='00000000-0000-0000-0000-000000000002';
const characterId='00000000-0000-0000-0000-000000000003';

const now=new Date().toISOString();
const playerProfile={id:playerId,role:'jugador',display_name:'Jugador prueba'};
const exampleCharacter={
  id:characterId,owner_id:playerId,name:'Explorador de pruebas',class_name:'Explorador',
  species:'Humano',xp:0,pc:0,portrait_key:'guerrero',base_damage_die:8,
  backstory:'Personaje ficticio para pruebas',created_at:now
};
function makeSession(role){
 const id=role==='jugador'?playerId:staffId;
 return {access_token:'browser.smoke.token',refresh_token:'browser-smoke-refresh',
   token_type:'bearer',expires_in:7200,expires_at:Math.floor(Date.now()/1000)+7200,
   user:{id,email:'simulado@example.invalid',aud:'authenticated',role:'authenticated',
     app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:now}};
}
async function stubSupabase(context,role,requests){
 const identity={id:staffId,display_name:'Equipo de prueba',role};
 const users=role==='jugador'?[playerProfile]:[identity,playerProfile];
 await context.route(MOCK+'/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  requests.push({path:url.pathname,method:request.method()});
  const h={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS',
    'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,accept,prefer,cache-control',
    'access-control-expose-headers':'content-range,content-type'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:h,body:''});
  let data=[];
  if(url.pathname==='/auth/v1/user')data=makeSession(role).user;
  if(url.pathname.startsWith('/rest/v1/')){
    const table=url.pathname.split('/')[3]??'';
    if(table==='profiles')data=url.searchParams.has('id')?users.find(x=>x.id===url.searchParams.get('id')?.replace(/^eq\./,''))??null:users;
    if(table==='characters')data=[exampleCharacter];
    if(table==='level_thresholds')data=[{level:1,min_xp:0}];
    if(table==='character_resources')data=[
      {character_id:characterId,name:'Vida',current_value:20,max_value:20,sort_order:0},
      {character_id:characterId,name:'Maná',current_value:10,max_value:10,sort_order:1}
    ];
    if(table==='character_wallets'||table==='character_proficiencies')data=null;
    if(table==='rpc')data=[];
  }
  const single=request.headers()['accept']?.includes('application/vnd.pgrst.object+json');
  if(single&&Array.isArray(data))data=data[0]??null;
  return route.fulfill({status:200,headers:{...h,'content-type':'application/json'},body:JSON.stringify(data)});
 });
}

async function runRole(browser,role){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const pageErrors=[],requests=[];
 const session=makeSession(role);
 await context.addInitScript(value=>localStorage.setItem('sb-rpg-e2e-auth-token',JSON.stringify(value)),session);
 await stubSupabase(context,role,requests);
 const page=await context.newPage();
 page.on('pageerror',e=>pageErrors.push(e.message));
 try{
  await page.goto(WEB,{waitUntil:'domcontentloaded'});
  await page.locator('.role-chip').waitFor({timeout:14000});
  const roleLabel=await page.locator('.role-chip').innerText();
  if(role==='jugador'){
    assert.match(roleLabel,/Jugador/);
    await page.locator('nav.mobile-bottom-nav button').first().waitFor();
    const navLabels=await page.locator('nav.mobile-bottom-nav button').allInnerTexts();
    assert.ok(navLabels.some(x=>x.includes('Partida')));
    assert.ok(!navLabels.some(x=>x.includes('Solicitudes')));
    assert.equal(await page.getByText('Crear con IA',{exact:true}).count(),0);
    assert.equal(requests.filter(x=>x.path.endsWith('/rpc/read_private_audit')).length,0);
  }else {
    await page.getByRole('heading',{name:role==='dungeonMaster'?'Dungeon Master':'Panel informático'}).waitFor({timeout:14000});
    await page.locator('nav.mobile-bottom-nav button',{hasText:'Objetos'}).click();
    await page.getByRole('heading',{name:'Catálogo de objetos'}).waitFor({timeout:14000});
    const btn=page.getByRole('button',{name:'Crear con IA'});
    await btn.waitFor({timeout:14000});
    await btn.click();
    await page.getByRole('dialog',{name:/Crear objeto con IA/i}).waitFor();
    // Generación no se ejecuta: botones y formularios solamente, sin consumir créditos.
    await page.getByRole('button',{name:'Cancelar'}).click();
    assert.equal(await page.getByRole('dialog',{name:/Crear objeto con IA/i}).count(),0);
    if(role==='dungeonMaster')assert.equal(requests.filter(x=>x.path.endsWith('/rpc/read_private_audit')).length,0);
    else assert.ok(requests.some(x=>x.path.endsWith('/rpc/read_private_audit')));
  }
  const overflows=await page.evaluate(()=>({
    doc:document.documentElement.scrollWidth,window:window.innerWidth,
  }));
  assert.ok(overflows.doc<=overflows.window+3,'Desbordamiento horizontal en celular: '+JSON.stringify(overflows));
  assert.deepEqual(pageErrors,[],'Errores de React: '+pageErrors.join('; '));
  console.log('PASS interfaz role='+role+', 390px, requests simuladas='+requests.length);
 }finally{await context.close();}
}

async function main(){
 const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4173','--strictPort'],
   {stdio:'ignore',env:process.env});
 let browser;
 try {
  let ready=false;
  for(let i=0;i<70;i++){
   try{const r=await fetch(WEB);if(r.ok){ready=true;break}}catch{}
   await sleep(250);
  }
  assert.ok(ready,'No inició el servidor Vite de pruebas.');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const role of ['jugador','dungeonMaster','adminInformatico'])await runRole(browser,role);
 }finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
 }
}
await main();
