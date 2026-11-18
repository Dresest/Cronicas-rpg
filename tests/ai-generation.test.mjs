import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
const {default:rpg}=await import('../api/generate-rpg.js');
const {default:item}=await import('../api/generate-item.js');
const initialFetch=globalThis.fetch;
const envVars=['AI_GENERATION_ENABLED','VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY',
  'AI_GATEWAY_API_KEY','VERCEL_OIDC_TOKEN','SUPABASE_SERVICE_ROLE_KEY'];
const original=Object.fromEntries(envVars.map(k=>[k,process.env[k]]));
afterEach(()=>{
  globalThis.fetch=initialFetch;
  for(const k of envVars) {
    if(original[k]===undefined)delete process.env[k];
    else process.env[k]=original[k];
  }
});
const UUID='11111111-1111-4111-8111-111111111111';
const ACCOUNT='22222222-2222-4222-8222-222222222222';
const SUPA='https://example.supabase.co';
const GATEWAY='https://ai-gateway.vercel.sh/v1/chat/completions';
const itemBody={name:'Espada helada',description:'Congela',category:'arma',rarity:'raro',
  attribute_key:null,attribute_bonus:0,damage_bonus:7,passive_text:'',
  use_resource:null,restore_amount:0};
const skillBody={name:'Escudo',description:'Resiste',kind:'activa',resource_name:'Maná',
  resource_cost:10,purchase_pc:15,min_level:3};
function env(){
  process.env.AI_GENERATION_ENABLED='true';
  process.env.VITE_SUPABASE_URL=SUPA;
  process.env.VITE_SUPABASE_ANON_KEY='public-test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY='server-only-test-key';
  process.env.AI_GATEWAY_API_KEY='test-gateway-token';
}
function response(){
  return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;return this},
    status(v){this.statusCode=v;return this},json(v){this.body=v;return this}};
}
function request(body={kind:'item',prompt:'Espada mágica de hielo'}){
  return {method:'POST',headers:{authorization:'Bearer valid.test.jwt'},body};
}
function ok(json,status=200){
  return {status,ok:status>=200&&status<300,json:async()=>json};
}
function mockFlow({generated=itemBody,kind='item',quota={allowed:true,reservation_id:UUID,remaining:4},
  gatewayStatus=200,invalidJSON=false,failedSettle=false,throwGateway=false}={}){
  const calls=[];
  globalThis.fetch=async(url,options)=>{
    const operation=url.endsWith('/auth/v1/user')?'auth':
      url.endsWith('/rpc/reserve_ai_generation')?'reserve':
      url.endsWith('/rpc/settle_ai_generation')?'settle':url===GATEWAY?'gateway':'unexpected';
    calls.push(operation);
    if(operation==='auth'){
      assert.equal(options.method,'GET');
      assert.equal(options.headers.apikey,'public-test-key');
      assert.equal(options.headers.Authorization,'Bearer valid.test.jwt');
      return ok({id:ACCOUNT});
    }
    if(operation==='reserve'){
      assert.equal(options.method,'POST');
      assert.equal(options.headers.apikey,'server-only-test-key');
      assert.equal(options.headers.Authorization,'Bearer server-only-test-key');
      assert.deepEqual(JSON.parse(options.body),{p_user_id:ACCOUNT,p_kind:kind});
      return ok(quota);
    }
    if(operation==='settle'){
      assert.equal(options.headers.apikey,'server-only-test-key');
      const args=JSON.parse(options.body);
      assert.equal(args.p_reservation_id,UUID);
      if(failedSettle)return ok({ok:false,reason:'UNAVAILABLE'},503);
      return ok({ok:true,status:args.p_success?'completed':'released'});
    }
    if(operation==='gateway'){
      assert.equal(options.method,'POST');
      assert.equal(options.headers.Authorization,'Bearer test-gateway-token');
      const body=JSON.parse(options.body);
      assert.equal(body.model,'alibaba/qwen-3-32b');
      assert.equal(body.response_format.type,'json_schema');
      if(throwGateway)throw new Error('network fault');
      if(gatewayStatus!==200)return ok({},gatewayStatus);
      return ok({choices:[{message:{content:invalidJSON?'bad-json':JSON.stringify(generated)}}]});
    }
    throw new Error('unexpected external call '+url);
  };
  return calls;
}

test('deshabilitado de fábrica no genera solicitudes',async()=>{
  delete process.env.AI_GENERATION_ENABLED;
  globalThis.fetch=()=>{throw new Error('fetch should not run')};
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,503);
});
test('sin clave privada del servidor no reserva ni genera',async()=>{
  env();delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  globalThis.fetch=()=>{throw new Error('fetch should not run')};
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,503);
});
test('sin sesión no realiza ninguna operación de cobro',async()=>{
  env();
  globalThis.fetch=()=>{throw new Error('fetch should not run')};
  const res=response();await rpg({...request(),headers:{}},res);
  assert.equal(res.statusCode,401);
});
test('sesión inválida: no accede al control de cuotas',async()=>{
  env();let calls=0;
  globalThis.fetch=async(url)=>{calls++;assert.match(url,/\/auth\/v1\/user$/);return ok({},401)};
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,401);assert.equal(calls,1);
});
test('solo POST y descripción válida',async()=>{
  env();globalThis.fetch=()=>{throw new Error('fetch should not run')};
  const res=response();await rpg({...request(),method:'GET'},res);
  assert.equal(res.statusCode,405);
  const bad=response();await rpg(request({kind:'item',prompt:'corto'}),bad);
  assert.equal(bad.statusCode,400);
});
test('rol no autorizado: no llama a AI Gateway',async()=>{
  env();const calls=mockFlow({quota:{allowed:false,reason:'FORBIDDEN'}});
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,403);
  assert.deepEqual(calls,['auth','reserve']);
});
test('sin cuota: no llama al modelo',async()=>{
  env();const calls=mockFlow({quota:{allowed:false,reason:'CREDITS_EXHAUSTED'}});
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,402);assert.equal(res.body.code,'CREDITS_EXHAUSTED');
  assert.deepEqual(calls,['auth','reserve']);
});
test('respuesta de reserva incorrecta: falla cerrado',async()=>{
  env();const calls=mockFlow({quota:{allowed:true,remaining:4}});
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,503);
  assert.deepEqual(calls,['auth','reserve']);
});
test('objeto válido: confirma el crédito antes de enviar el resultado',async()=>{
  env();const calls=mockFlow();
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.item.name,'Espada helada');
  assert.equal(res.body.item.damage_bonus,7);
  assert.deepEqual(calls,['auth','reserve','gateway','settle']);
});
test('habilidad válida: confirma el crédito y no incluye turnos',async()=>{
  env();const calls=mockFlow({kind:'skill',generated:skillBody});
  const res=response();await rpg(request({kind:'skill',prompt:'Escudo arcano protector'}),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.skill.resource_cost,10);
  assert.equal(Object.hasOwn(res.body.skill,'preparation_turns'),false);
  assert.deepEqual(calls,['auth','reserve','gateway','settle']);
});
test('proveedor falla 502: libera el crédito antes de responder',async()=>{
  env();const calls=mockFlow({gatewayStatus:502});
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,502);
  assert.deepEqual(calls,['auth','reserve','gateway','settle']);
});
test('proveedor agota presupuesto 402: libera el crédito y conserva código cliente',async()=>{
  env();const calls=mockFlow({gatewayStatus:402});
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,402);assert.equal(res.body.code,'CREDITS_EXHAUSTED');
  assert.deepEqual(calls,['auth','reserve','gateway','settle']);
});
test('error 429: libera el crédito y propaga la espera',async()=>{
  env();const calls=mockFlow({gatewayStatus:429});
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,429);
  assert.deepEqual(calls,['auth','reserve','gateway','settle']);
});
test('JSON malformado: libera el crédito',async()=>{
  env();const calls=mockFlow({invalidJSON:true});
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,502);
  assert.deepEqual(calls,['auth','reserve','gateway','settle']);
});
test('fallo de red: intenta devolución y no revela datos privados',async()=>{
  env();const calls=mockFlow({throwGateway:true});
  const priorLog=console.error;console.error=()=>{};
  try{
    const res=response();await rpg(request(),res);
    assert.equal(res.statusCode,503);
    assert.deepEqual(calls,['auth','reserve','gateway','settle']);
  }finally{console.error=priorLog}
});
test('si falla la devolución no promete que el crédito haya regresado',async()=>{
  env();const calls=mockFlow({gatewayStatus:502,failedSettle:true});
  const priorLog=console.error;console.error=()=>{};
  try{
    const res=response();await rpg(request(),res);
    assert.equal(res.statusCode,503);
    assert.match(res.body.error,/regularizará/);
    assert.deepEqual(calls,['auth','reserve','gateway','settle']);
  }finally{console.error=priorLog}
});
test('compatibilidad /api/generate-item obliga el tipo item',async()=>{
  env();const calls=mockFlow();
  const res=response();await item(request({prompt:'Una espada helada encantada'}),res);
  assert.equal(res.statusCode,200);
  assert.ok(res.body.item);
  assert.deepEqual(calls,['auth','reserve','gateway','settle']);
});
test('un arma no puede mezclar daño, bono de atributo y curación',async()=>{
  env();mockFlow({generated:{...itemBody,attribute_key:'Fuerza',attribute_bonus:3,
    damage_bonus:8,use_resource:'Vida',restore_amount:45}});
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(res.body.item.bonuses,{Fuerza:3});
  assert.equal(res.body.item.damage_bonus,0);
  assert.equal(res.body.item.use_resource,null);
  assert.equal(res.body.item.restore_amount,0);
});
test('un consumible solo restaura recursos admitidos',async()=>{
  env();mockFlow({generated:{...itemBody,category:'objeto',damage_bonus:8,
    use_resource:'Maná',restore_amount:25}});
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.item.damage_bonus,0);
  assert.equal(res.body.item.restore_amount,25);
});
test('habilidad pasiva no consume recursos por uso',async()=>{
  env();mockFlow({kind:'skill',generated:{...skillBody,kind:'pasiva',resource_cost:50}});
  const res=response();await rpg(request({kind:'skill',prompt:'Una habilidad pasiva arcana'}),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.skill.resource_cost,0);
  assert.equal(res.body.skill.resource_name,null);
});
