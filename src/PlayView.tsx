import {useEffect,useMemo,useState} from 'react'
import {ArrowRight,Calculator,ChevronDown,Dices,FlaskConical,Heart,Minus,Package,Plus,Shield,Swords,UserRound,WandSparkles,X,Zap} from 'lucide-react'
import {FantasyIcon} from './lib/fantasyIcon'
import {BattleCalculator} from './BattleCalculator'
import {equippedWeapon,damageNotation,rollAttack} from './lib/damage'
import {ChosenCompetences} from './CompetenceView'
import type {AchievementDefinition,CharacterAchievement,Character,CharacterItem,CharacterSkill,CharacterSkillAppearance,EffectiveAttribute,ItemDefinition,Resource,Skill,CharacterProficiency,Attribute} from './types'

type Roll={id:number;sides:number;count:number;results:number[];total:number;time:string}
type Props={
 character:Character;resources:Resource[];skills:Skill[];learned:CharacterSkill[];appearances:CharacterSkillAppearance[];
 items:ItemDefinition[];owned:CharacterItem[];effective:EffectiveAttribute[];proficiency:CharacterProficiency|null;attributes:Attribute[];achievements:AchievementDefinition[];earned:CharacterAchievement[];busy:boolean;
 onResource:(id:string,delta:number)=>Promise<void>;onRestoreAll:()=>Promise<void>;onUseSkill:(id:string)=>Promise<boolean>;onUseItem:(id:string)=>Promise<boolean>;
 onNavigate:(tab:'habilidades'|'inventario'|'atributos')=>void
}
const STANDARD=[4,6,8,10,12,20,100]
const SPECIAL=[3,5,15,50]
function fairDie(sides:number){
 const max=2**32,limit=Math.floor(max/sides)*sides
 const random=new Uint32Array(1)
 do {crypto.getRandomValues(random)} while(random[0]>=limit)
 return 1+random[0]%sides
}
const format=(n:number)=>new Intl.NumberFormat('es-CL').format(n)

export function PlayView({character,resources,skills,learned,appearances,items,owned,effective,proficiency,attributes,achievements,earned,busy,onResource,onRestoreAll,onUseSkill,onUseItem,onNavigate}:Props){
 const [sides,setSides]=useState(20)
 const [count,setCount]=useState(1)
 const [rolls,setRolls]=useState<Roll[]>([])
 const [activeId,setActiveId]=useState<string|null>(null)
 const [openSkillId,setOpenSkillId]=useState<string|null>(null)
 const [skillDamageRoll,setSkillDamageRoll]=useState<{sides:number;value:number}|null>(null)
 const [attackResult,setAttackResult]=useState<ReturnType<typeof rollAttack>|null>(null)
 const weapon=equippedWeapon(items,owned)
 const [amountDraft,setAmountDraft]=useState('1')
 const amount=Number(amountDraft)
 const validAmount=/^[0-9]+$/.test(amountDraft)&&Number.isSafeInteger(amount)&&amount>=1&&amount<=1000000
 const [selectedPanel,setSelectedPanel]=useState<'habilidades'|'objetos'>('habilidades')
 useEffect(()=>{setRolls([]);setActiveId(null);setOpenSkillId(null);setSkillDamageRoll(null);setAmountDraft('1');setAttackResult(null)},[character.id])
 useEffect(()=>{
  if(!openSkillId)return
  const handleKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpenSkillId(null)}
  document.addEventListener('keydown',handleKey)
  return ()=>document.removeEventListener('keydown',handleKey)
 },[openSkillId])
 const activeSkills=useMemo(()=>learned.flatMap(cs=>{
  const s=skills.find(item=>item.id===cs.skill_id)
  if(!s||s.kind!=='activa')return []
  const v=appearances.find(a=>a.skill_id===s.id)
  const cost=v?.resource_cost??s.resource_cost
  const resource=v?.resource_name??s.resource_name
  const enough=cost===0||resources.some(r=>r.name.toLocaleLowerCase('es')===resource?.toLocaleLowerCase('es')&&r.current_value>=cost)
  return [{id:s.id,name:v?.name||s.name,description:v?.description??s.description,rank:cs.rank,cost,resource,enough,usable:s.is_active&&s.is_usable}]
 }),[learned,skills,appearances,resources])
 const openSkill=activeSkills.find(s=>s.id===openSkillId)||null
 const consumables=useMemo(()=>owned.flatMap(ci=>{
  const item=items.find(x=>x.id===ci.item_id)
  if(!item||item.category!=='objeto'||!item.is_active||item.restore_amount<=0||!item.use_resource||ci.quantity<1)return []
  return [{id:item.id,name:item.name,description:item.description,quantity:ci.quantity,restore:item.restore_amount,resource:item.use_resource}]
 }),[owned,items])
 const passives=useMemo(()=>{
  const fromSkills=learned.flatMap(cs=>{const s=skills.find(x=>x.id===cs.skill_id);return s?.kind==='pasiva'?[{id:s.id,name:appearances.find(a=>a.skill_id===s.id)?.name||s.name,desc:appearances.find(a=>a.skill_id===s.id)?.description||s.description,type:'Habilidad'}]:[]})
  const fromItems=owned.flatMap(ci=>{const x=items.find(item=>item.id===ci.item_id);return x?.passive_text&&(ci.equipped||x.category==='clave')?[{id:x.id,name:x.name,desc:x.passive_text,type:'Equipo'}]:[]})
  const fromAchievements=earned.flatMap(e=>{const a=achievements.find(x=>x.id===e.achievement_id);return a?.is_active&&a.passive_text&&(a.category==='logro'||e.active_title)?[{id:a.id,name:a.name,desc:a.passive_text,type:a.category==='titulo'?'Título':'Logro'}]:[]})
  return [...fromSkills,...fromItems,...fromAchievements]
 },[learned,skills,appearances,owned,items,achievements,earned])
 function roll(){
  const results=Array.from({length:count},()=>fairDie(sides))
  const total=results.reduce((sum,val)=>sum+val,0)
  setRolls(old=>[{id:Date.now(),sides,count,results,total,time:new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})},...old].slice(0,8))
 }
 async function use(id:string,kind:'habilidad'|'objeto'){
  setActiveId(id)
  try{await (kind==='habilidad'?onUseSkill(id):onUseItem(id))}finally{setActiveId(null)}
 }
 return <div className="stack play-page">
  <header className="play-hero"><span className="overline"><Zap size={14}/> MODO PARTIDA · EN VIVO</span><h1>Tu mesa de juego</h1><p>Dados, recursos, habilidades y objetos, sin abandonar esta pantalla.</p><div className="play-hero-character"><UserRound size={17}/><strong>{character.name}</strong><small>{character.class_name}</small></div></header>
  <section className="card play-resources"><div className="play-section-heading"><div><span className="overline">ESTADO ACTUAL</span><h2>Recursos</h2></div><label className="play-amount-control"><span>Cantidad libre</span><input type="number" inputMode="numeric" pattern="[0-9]*" min="1" max="1000000" step="1" value={amountDraft} onChange={e=>setAmountDraft(e.target.value)} aria-label="Puntos para gastar o recuperar"/></label></div><p className="play-resource-explainer">Elige cualquier cantidad de 1 a 1.000.000 para gastar o recuperar un recurso. Para descansar en una posada, puedes recuperar todos de una vez.</p>
   <div className="play-resource-grid">{resources.map(r=><div className="play-resource" key={r.id}><div className="play-resource-title"><span><Heart size={17}/>{r.name}</span><strong>{format(r.current_value)}<small> / {format(r.max_value)}</small></strong></div><div className="meter"><span style={{display:'block',height:'100%',width:`${Math.min(100,100*r.current_value/r.max_value)}%`,background:'var(--gold)',borderRadius:99}}/></div><div className="play-resource-controls"><button disabled={busy||!validAmount||r.current_value===0} onClick={()=>void onResource(r.id,-amount)} aria-label={`Quitar ${amount} de ${r.name}`}><Minus size={16}/> Gastar</button><button disabled={busy||!validAmount||r.current_value>=r.max_value} onClick={()=>void onResource(r.id,amount)} aria-label={`Recuperar ${amount} de ${r.name}`}><Plus size={16}/> Recuperar</button></div></div>)}</div><button type="button" className="play-restore-all" disabled={busy||resources.length===0||resources.every(r=>r.current_value>=r.max_value)} onClick={()=>void onRestoreAll()}><Heart size={18}/> Recuperar todo al máximo</button>
  </section>
  <section className="card play-attack-card"><div className="play-section-heading"><div><span className="overline">ATAQUE NORMAL</span><h2>Tu daño preparado</h2><p>{weapon?`Con ${weapon.name}`:'Sin arma equipada'}</p></div></div><div className="play-attack-total"><strong>{damageNotation(character,weapon)}</strong><button className="button button-primary" type="button" onClick={()=>setAttackResult(rollAttack(character,weapon))}><Dices size={18}/> Tirar daño</button></div>{attackResult&&<div className="play-attack-result" aria-live="polite"><strong>{attackResult.total} de daño</strong><small>Dado base: {attackResult.base}{attackResult.extra.length?` · Dados extra: ${attackResult.extra.join(' + ')}`:''}{attackResult.fixed?` · Arma: ${attackResult.fixed>0?'+':''}${attackResult.fixed}`:''}</small></div>}<p className="hint">El dado base se configura en Mi personaje. Los atributos no aumentan este daño automáticamente.</p></section>
  <section className="card play-dice"><div className="play-section-heading"><div><span className="overline">DADOS DE ROL · SIN SERVIDOR</span><h2><Dices size={22}/> Lanzar dados</h2></div><span className="play-local-tag">Solo en tu teléfono</span></div>
   <p className="play-helper">Estos resultados son locales y no modifican tu personaje. También puedes seguir usando dados físicos.</p>
   <div className="play-dice-list" role="group" aria-label="Dados habituales">{STANDARD.map(n=><button key={n} type="button" aria-pressed={sides===n} className={sides===n?'selected':''} onClick={()=>setSides(n)}>d{n}</button>)}</div>
   <details className="play-extra-dice"><summary>Dados especiales <ChevronDown size={16}/></summary><div className="play-dice-list">{SPECIAL.map(n=><button key={n} type="button" aria-pressed={sides===n} className={sides===n?'selected':''} onClick={()=>setSides(n)}>d{n}</button>)}</div></details>
   <div className="play-roll-controls"><div className="play-count"><small>Cantidad de dados</small><div><button type="button" aria-label="Un dado menos" disabled={count<=1} onClick={()=>setCount(x=>Math.max(1,x-1))}><Minus size={17}/></button><b>{count}</b><button type="button" aria-label="Un dado más" disabled={count>=10} onClick={()=>setCount(x=>Math.min(10,x+1))}><Plus size={17}/></button></div></div><button type="button" className="play-roll-button" onClick={roll}><Dices size={20}/> Lanzar {count}d{sides}</button></div>
   {rolls.length>0&&<div className="play-roll-result" aria-live="polite"><div><span>RESULTADO · {rolls[0].count}d{rolls[0].sides}</span><strong>{format(rolls[0].total)}</strong><small>{rolls[0].results.join(' + ')}</small></div></div>}
   {rolls.length>1&&<details className="play-roll-history"><summary>Últimas tiradas <ChevronDown size={16}/></summary><div>{rolls.slice(1).map(r=><p key={r.id}><span>{r.time} · {r.count}d{r.sides}</span><strong>{r.total}</strong></p>)}</div></details>}
  </section>
  <section className="card play-actions"><div className="play-section-heading"><div><span className="overline">ACCIONES RÁPIDAS</span><h2>Durante el combate</h2></div></div><div className="play-action-tabs"><button className={selectedPanel==='habilidades'?'active':''} onClick={()=>setSelectedPanel('habilidades')}><WandSparkles size={17}/> Habilidades ({activeSkills.length})</button><button className={selectedPanel==='objetos'?'active':''} onClick={()=>setSelectedPanel('objetos')}><FlaskConical size={17}/> Objetos ({consumables.length})</button></div>
   <div className="play-action-list">{selectedPanel==='habilidades'?activeSkills.length===0?<div className="play-empty"><Swords size={23}/><p>No tienes habilidades activas asignadas.</p><button onClick={()=>onNavigate('habilidades')}>Ver habilidades <ArrowRight size={15}/></button></div>:activeSkills.map(s=><article key={s.id} className="play-action-item"><div className="play-action-item-icon"><FantasyIcon name={s.name} description={s.description} category="activa"/></div><div className="play-action-item-info"><strong>{s.name}</strong><small>{s.cost?`${s.cost} ${s.resource||'recurso'}`:'Sin coste'}</small></div><button type="button" onClick={()=>{setOpenSkillId(s.id);setSkillDamageRoll(null)}} aria-label={`Ver habilidad y calcular daño: ${s.name}`}><Calculator size={17}/> Ver y calcular</button></article>):consumables.length===0?<div className="play-empty"><Package size={23}/><p>No tienes consumibles disponibles.</p><button onClick={()=>onNavigate('inventario')}>Abrir inventario <ArrowRight size={15}/></button></div>:consumables.map(c=><article key={c.id} className="play-action-item"><div className="play-action-item-icon"><FantasyIcon name={c.name} description={c.description} category="objeto"/></div><div className="play-action-item-info"><strong>{c.name}</strong><small>{c.quantity} disponibles{c.restore>0?` · +${c.restore} ${c.resource||''}`:''}</small></div><button disabled={busy||activeId!==null} onClick={()=>void use(c.id,'objeto')}>{activeId===c.id?'Usando…':'Usar 1'}</button></article>)}</div>
  </section>
  {openSkill&&<div className="modal-backdrop play-skill-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setOpenSkillId(null)}}>
    <section role="dialog" aria-modal="true" aria-labelledby="play-skill-detail-title" className="card play-skill-modal">
      <header className="play-skill-modal-head"><div><span className="overline">HABILIDAD DE COMBATE</span><h2 id="play-skill-detail-title">{openSkill.name}</h2></div><button type="button" className="play-skill-modal-close" onClick={()=>setOpenSkillId(null)} aria-label="Cerrar habilidad"><X size={21}/></button></header>
      <div className="play-skill-modal-content">
        <div className="play-skill-modal-effect"><strong><WandSparkles size={17}/> Descripción completa</strong><p>{openSkill.description||'Esta habilidad no tiene una descripción registrada.'}</p></div>
        <div className="play-skill-modal-resource"><span>{openSkill.cost?`${openSkill.cost} ${openSkill.resource||'recurso'} por uso`:'Sin consumo de recursos'}</span>{!openSkill.enough&&<strong>Recurso insuficiente</strong>}{!openSkill.usable&&<strong>Deshabilitada por el DM</strong>}</div>
        <div className="play-skill-modal-dice"><strong><Dices size={16}/> Dados rápidos</strong><div className="play-skill-modal-dice-buttons">{[4,6,8,10,12,20].map(d=><button type="button" key={d} onClick={()=>setSkillDamageRoll({sides:d,value:fairDie(d)})}>d{d}</button>)}</div>{skillDamageRoll&&<p aria-live="polite">Resultado d{skillDamageRoll.sides}: <b>{skillDamageRoll.value}</b> · Tócalo en la calculadora para sumarlo.</p>}</div>
        <BattleCalculator key={openSkill.id} attributes={effective} lastDice={skillDamageRoll?.value??rolls[0]?.total??null} suggestedDamage={damageNotation(character,weapon)} />
      </div>
      <footer className="play-skill-modal-actions"><button type="button" className="button button-outline" onClick={()=>setOpenSkillId(null)}>Cerrar</button><button type="button" className="button button-primary" disabled={busy||activeId!==null||!openSkill.enough||!openSkill.usable} onClick={()=>void use(openSkill.id,'habilidad')}><Zap size={17}/>{activeId===openSkill.id?'Activando…':openSkill.cost?`Usar · gastar ${openSkill.cost} ${openSkill.resource||''}`:'Usar habilidad'}</button></footer>
      <small className="play-skill-modal-note">La calculadora y los dados son locales; solo «Usar habilidad» descuenta el recurso.</small>
    </section>
  </div>}
  {proficiency?.primary_attribute&&<section className="card campaign-play-competences campaign-play-competences-compact" aria-label="Competencias aprendidas"><div className="play-section-heading"><h2>Competencias</h2><span className="play-competence-bonus">Bonificación +{proficiency.proficiency_bonus}</span></div><ChosenCompetences proficiency={proficiency} attributes={attributes} effective={effective} compact/></section>}
  <BattleCalculator attributes={effective} lastDice={rolls[0]?.total??null} suggestedDamage={damageNotation(character,weapon)} attackTotal={attackResult?.total??null}/>
  <details className="card play-passives"><summary><span><Shield size={20}/><b>Pasivas y atributos</b><small>{passives.length} efectos · {effective.length} atributos</small></span><ChevronDown size={20}/></summary><div className="play-passives-body"><div className="play-attribute-chips">{effective.map(e=><span key={e.attribute_key}>{e.attribute_key} <strong>{e.total_score}</strong></span>)}</div>{passives.map(p=><div className="play-passive" key={p.id}><span>{p.type}</span><strong>{p.name}</strong><p>{p.desc}</p></div>)}<button className="button button-outline" onClick={()=>onNavigate('atributos')}>Ver todos los atributos <ArrowRight size={16}/></button></div></details>
 </div>
}
