// Implementación nueva y revisable; NO es la fuente histórica exacta de Vercel.
// Solo lectura Supabase Auth, una reserva atómica de cuota y una llamada a AI Gateway.
const ATTRIBUTES = ['Fuerza','Destreza','Constitución','Inteligencia','Sabiduría','Carisma'];
const RESOURCES = ['Vida','Maná','NEM','Éter'];
const CATEGORIES = ['arma','armadura','objeto','clave'];
const RARITIES = ['comun','poco_comun','raro','epico','legendario'];
const P = { 'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff' };
const send=(res,status,body)=>res.status(status).json(body);
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const clamp=(v,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.trunc(Number(v)))):min;
const choose=(v,arr,fallback)=>arr.includes(v)?v:fallback;

const ITEM_SCHEMA={
  type:'object',additionalProperties:false,
  properties:{
    name:{type:'string'},description:{type:'string'},category:{type:'string',enum:CATEGORIES},
    rarity:{type:'string',enum:RARITIES},
    attribute_key:{type:['string','null'],enum:[...ATTRIBUTES,null]},
    attribute_bonus:{type:'integer'},damage_bonus:{type:'integer'},
    passive_text:{type:'string'},use_resource:{type:['string','null'],enum:[...RESOURCES,null]},
    restore_amount:{type:'integer'}
  },
  required:['name','description','category','rarity','attribute_key','attribute_bonus','damage_bonus','passive_text','use_resource','restore_amount']
};
const SKILL_SCHEMA={
  type:'object',additionalProperties:false,
  properties:{
    name:{type:'string'},description:{type:'string'},kind:{type:'string',enum:['activa','pasiva']},
    resource_name:{type:['string','null'],enum:[...RESOURCES,null]},
    resource_cost:{type:'integer'},purchase_pc:{type:'integer'},min_level:{type:'integer'}
  },
  required:['name','description','kind','resource_name','resource_cost','purchase_pc','min_level']
};

function normalizeItem(o){
  if(!o||typeof o!=='object'||Array.isArray(o))throw Error('invalid item');
  const category=choose(o.category,CATEGORIES,'objeto');
  const attribute=choose(o.attribute_key,ATTRIBUTES,null);
  const attributeBonus=clamp(o.attribute_bonus,-10,10);
  const bonuses=attribute&&attributeBonus?{[attribute]:attributeBonus}:{};
  const dmg=category==='arma'&&!attributeBonus?clamp(o.damage_bonus,0,10):0;
  const useResource=choose(o.use_resource,RESOURCES,null);
  return {
    name:text(o.name,70)||'Objeto sin nombre',
    description:text(o.description,800),
    category,
    rarity:choose(o.rarity,RARITIES,'comun'),
    bonuses,
    passive_text:text(o.passive_text,600),
    use_resource:useResource,
    restore_amount:useResource?clamp(o.restore_amount,0,100):0,
    damage_bonus:dmg,damage_dice_count:0,damage_die_sides:null,equip_slot:null
  };
}
function normalizeSkill(o){
  if(!o||typeof o!=='object'||Array.isArray(o))throw Error('invalid skill');
  const kind=choose(o.kind,['activa','pasiva'],'activa');
  const resource=kind==='activa'?choose(o.resource_name,RESOURCES,null):null;
  return {
    name:text(o.name,70)||'Habilidad sin nombre',
    description:text(o.description,800),
    kind,resource_name:resource,
    resource_cost:resource?clamp(o.resource_cost,0,100):0,
    purchase_pc:clamp(o.purchase_pc,0,100),
    min_level:clamp(o.min_level,1,30)
  };
}

async function jsonFetch(url,options){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});
  let json=null;
  try{json=await response.json()}catch{}
  return {status:response.status,ok:response.ok,json};
}

export async function generate(req,res,forcedKind=null){
  for(const [k,v] of Object.entries(P))res.setHeader(k,v);
  if(req.method!=='POST')return send(res,405,{error:'Método no permitido.'});
  if(process.env.AI_GENERATION_ENABLED!=='true'){
    return send(res,503,{error:'Generación de IA no habilitada todavía.'});
  }
  const supabaseUrl=(process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
  const supabaseKey=process.env.VITE_SUPABASE_ANON_KEY||'';
  const gatewayKey=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN||'';
  if(!supabaseUrl||!supabaseKey||!gatewayKey)return send(res,503,{error:'Servicio de IA no configurado.'});
  const body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body))return send(res,400,{error:'Solicitud inválida.'});
  const kind=forcedKind||body.kind;
  const prompt=text(body.prompt,801);
  if(!['item','skill'].includes(kind)||prompt.length<8||prompt.length>800){
    return send(res,400,{error:'Selecciona objeto o habilidad e ingresa una descripción entre 8 y 800 caracteres.'});
  }
  const authorization=req.headers?.authorization||req.headers?.Authorization||'';
  const token=/^Bearer\s+([a-zA-Z0-9_.-]+)$/.exec(authorization)?.[1];
  if(!token)return send(res,401,{error:'Debes iniciar sesión.'});
  const headers={apikey:supabaseKey,Authorization:'Bearer '+token,Accept:'application/json'};
  try{
    const user=await jsonFetch(supabaseUrl+'/auth/v1/user',{method:'GET',headers});
    if(!user.ok||!user.json?.id)return send(res,401,{error:'Tu sesión expiró. Inicia sesión nuevamente.'});

    // RPC definida por sql/ai_generation_quota.sql: valida rol y reserva cuota mensualmente.
    // No se hace ninguna solicitud al modelo si la reserva falla.
    const quota=await jsonFetch(supabaseUrl+'/rest/v1/rpc/reserve_ai_generation',{
      method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({p_kind:kind})
    });
    if(!quota.ok||!quota.json||typeof quota.json.allowed!=='boolean'){
      return send(res,503,{error:'El control de créditos todavía no está disponible.'});
    }
    if(!quota.json.allowed){
      if(quota.json.reason==='FORBIDDEN')return send(res,403,{error:'No tienes permiso para generar contenido.'});
      return send(res,402,{code:'CREDITS_EXHAUSTED',error:'Créditos de IA agotados. Inténtalo en el próximo período.'});
    }

    const schema=kind==='item'?ITEM_SCHEMA:SKILL_SCHEMA;
    const instruction=kind==='item'
      ? 'Genera un objeto de fantasía para RPG en español. Respeta el esquema JSON. Las armas pueden mejorar un atributo O causar daño fijo (+1 a +10), no ambos. No generes instrucciones peligrosas.'
      : 'Genera una habilidad RPG en español coherente y equilibrada. Usa solo el esquema JSON. No incluyas turnos de preparación.';
    const gateway=await jsonFetch('https://ai-gateway.vercel.sh/v1/chat/completions',{
      method:'POST',
      headers:{Authorization:'Bearer '+gatewayKey,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.AI_GATEWAY_MODEL||'alibaba/qwen-3-32b',
        messages:[{role:'system',content:instruction},{role:'user',content:prompt}],
        temperature:0.6,max_tokens:650,
        response_format:{type:'json_schema',json_schema:{name:'rpg_'+kind,strict:true,schema}}
      })
    });
    if(gateway.status===402)return send(res,402,{code:'CREDITS_EXHAUSTED',error:'Créditos de IA agotados.'});
    if(gateway.status===429)return send(res,429,{error:'Demasiadas solicitudes. Inténtalo nuevamente.'});
    if(!gateway.ok)return send(res,502,{error:'No se pudo generar el contenido.'});
    const raw=gateway.json?.choices?.[0]?.message?.content;
    if(typeof raw!=='string'||raw.length>12000)return send(res,502,{error:'Respuesta de IA inválida.'});
    let value;
    try{value=JSON.parse(raw)}catch{return send(res,502,{error:'Respuesta de IA inválida.'})}
    const result=kind==='item'?normalizeItem(value):normalizeSkill(value);
    return send(res,200,{[kind]:result});
  }catch(error){
    // No revelar detalles de auth, tokens, prompts ni respuestas de IA.
    console.error('RPG IA request failed:',error instanceof Error?error.name:'unknown');
    return send(res,503,{error:'El servicio de IA no está disponible.'});
  }
}
