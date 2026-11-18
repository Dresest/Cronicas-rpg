import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
const {default:rpg}=await import('../api/generate-rpg.js');
const {default:item}=await import('../api/generate-item.js');
const priorFetch=globalThis.fetch;
const prior={...process.env};
afterEach(()=>{globalThis.fetch=priorFetch;for(const k of ['AI_GENERATION_ENABLED','VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','AI_GATEWAY_API_KEY','VERCEL_OIDC_TOKEN']){if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k]}});
const env=()=>{
  process.env.AI_GENERATION_ENABLED='true';
  process.env.VITE_SUPABASE_URL='https://example.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY='example-public-key';
  process.env.AI_GATEWAY_API_KEY='test-gateway-token';
};
function response(){
  return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;return this},status(v){this.statusCode=v;return this},json(v){this.body=v;return this}};
}
const request=(body={kind:'item',prompt:'Espada mágica de hielo'})=>({method:'POST',headers:{authorization:'Bearer valid.test.jwt'},body});
function ok(json,status=200){return {status,ok:status>=200&&status<300,json:async()=>json};}
const itemBody={name:'Espada helada',description:'Congela',category:'arma',rarity:'raro',attribute_key:null,attribute_bonus:0,damage_bonus:7,passive_text:'',use_resource:null,restore_amount:0};
test('sin habilitación no se llama a Auth, DB ni IA',async()=>{
  delete process.env.AI_GENERATION_ENABLED;
  globalThis.fetch=()=>{throw Error('fetch no debe ejecutarse')};
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,503);
});
test('se rechazan los métodos que no sean POST',async()=>{
  env();let count=0;globalThis.fetch=async()=>{count++;throw Error('unexpected')};
  const res=response();await rpg({...request(),method:'GET'},res);
  assert.equal(res.statusCode,405);assert.equal(count,0);
});
test('la sesión inválida impide gastar cuota y llamar al modelo',async()=>{
  env();let calls=0;
  globalThis.fetch=async(url)=>{calls++;assert.match(url,/\/auth\/v1\/user$/);return ok({},401)};
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,401);assert.equal(calls,1);
});
test('el saldo agotado evita solicitar la IA',async()=>{
  env();let calls=0;
  globalThis.fetch=async(url,options)=>{
    calls++;
    if(url.endsWith('/auth/v1/user'))return ok({id:'player-uuid'});
    assert.match(url,/reserve_ai_generation/);assert.equal(options.method,'POST');
    return ok({allowed:false,reason:'CREDITS_EXHAUSTED'});
  };
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,402);assert.equal(res.body.code,'CREDITS_EXHAUSTED');assert.equal(calls,2);
});
test('la reserva de cuota es obligatoria antes de IA',async()=>{
  env();let calls=0;
  globalThis.fetch=async(url)=>{
    calls++;
    if(url.endsWith('/auth/v1/user'))return ok({id:'staff-uuid'});
    assert.match(url,/reserve_ai_generation/);return ok(null,404);
  };
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,503);assert.equal(calls,2);
});
test('generación de objeto: autorización, cuota, respuesta compatible',async()=>{
  env();const calls=[];
  globalThis.fetch=async(url,opts)=>{
    calls.push(url);
    if(url.endsWith('/auth/v1/user')){assert.match(opts.headers.Authorization,/^Bearer /);return ok({id:'staff-uuid'})}
    if(url.endsWith('/reserve_ai_generation'))return ok({allowed:true,remaining:4});
    assert.equal(url,'https://ai-gateway.vercel.sh/v1/chat/completions');
    const input=JSON.parse(opts.body);
    assert.equal(input.model,'alibaba/qwen-3-32b');
    assert.equal(input.response_format.type,'json_schema');
    return ok({choices:[{message:{content:JSON.stringify(itemBody)}}]});
  };
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.item.damage_bonus,7);
  assert.equal(res.body.item.damage_dice_count,0);
  assert.equal(res.body.item.equip_slot,null);
  assert.equal(calls.length,3);
});
test('generación de habilidad: límite de coste y sin turnos',async()=>{
  env();
  const sample={name:'Escudo',description:'Resiste',kind:'activa',resource_name:'Maná',resource_cost:999,purchase_pc:15,min_level:3};
  globalThis.fetch=async(url)=>url.endsWith('/auth/v1/user')?ok({id:'staff'}):url.endsWith('/reserve_ai_generation')?ok({allowed:true}):ok({choices:[{message:{content:JSON.stringify(sample)}}]});
  const res=response();await rpg(request({kind:'skill',prompt:'Escudo arcano contra magia'}),res);
  assert.equal(res.statusCode,200);assert.equal(res.body.skill.resource_cost,100);
  assert.equal(Object.hasOwn(res.body.skill,'preparation_turns'),false);
});
test('ruta antigua de objetos comparte el control y solo genera item',async()=>{
  env();
  globalThis.fetch=async(url,opts)=>url.endsWith('/auth/v1/user')?ok({id:'staff'}):url.endsWith('/reserve_ai_generation')?(assert.equal(JSON.parse(opts.body).p_kind,'item'),ok({allowed:true})):ok({choices:[{message:{content:JSON.stringify(itemBody)}}]});
  const res=response();await item(request({prompt:'Espada encantada de hielo'}),res);
  assert.equal(res.statusCode,200);assert.ok(res.body.item);
});
test('créditos de Vercel agotados generan el código que espera el cliente',async()=>{
  env();
  globalThis.fetch=async(url)=>url.endsWith('/auth/v1/user')?ok({id:'staff'}):url.endsWith('/reserve_ai_generation')?ok({allowed:true}):ok({},402);
  const res=response();await rpg(request(),res);
  assert.equal(res.statusCode,402);assert.equal(res.body.code,'CREDITS_EXHAUSTED');
});
