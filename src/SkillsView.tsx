import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, BookOpen, Check, ChevronDown, Coins, Edit3, HandCoins, LockKeyhole, Plus, Search, Shield, Sparkles, UserRound, WandSparkles, X, Zap } from 'lucide-react'
import {FantasyIcon} from './lib/fantasyIcon'
import type { Character, CharacterSkill, CharacterSkillAppearance, DMSkillProgress, Profile, Resource, Skill, SkillDraft, SkillRequest, PersonalSkillProposal, Threshold } from './types'

type Props = {
  character: Character
  characters: Character[]
  profiles: Profile[]
  levels: Threshold[]
  resources: Resource[]
  skills: Skill[]
  learned: CharacterSkill[]
  appearances: CharacterSkillAppearance[]
  dmProgress: DMSkillProgress[]
  requests: SkillRequest[]
  personalProposals: PersonalSkillProposal[]
  isStaff: boolean
  busy: boolean
  onSelectCharacter: (id:string)=>void
  onRequest: (skillId:string)=>Promise<void>
  onRequestUpgrade:(skillId:string)=>Promise<void>
  onInvest: (skillId:string,amount:number)=>Promise<boolean>
  onUse: (id:string)=>Promise<boolean>
  onSave: (draft:SkillDraft,id:string|null)=>Promise<boolean>
  onProposePersonal:(draft:SkillDraft)=>Promise<boolean>
  onAssign: (skillId:string)=>Promise<void>
  onResolve: (requestId:string,approve:boolean)=>Promise<void>
  onCompleteReview:(requestId:string)=>Promise<void>
  onConfigure: (skillId:string,data:CharacterSkillConfig)=>Promise<boolean>
  onRemove: (skillId:string)=>Promise<void>
}

export type CharacterSkillConfig = {
  rank:number
  target_pc:number|null
  max_rank:number|null
  name:string|null
  description:string|null
  resource_name:string|null
  resource_cost:number|null
}
const format=(n:number)=>new Intl.NumberFormat('es-CL').format(n)
const initialDraft:SkillDraft={name:'',description:'',kind:'activa',purchase_pc:0,upgrade_pc:10,max_rank:3,min_level:1,resource_name:null,resource_cost:0,is_active:true,is_visible:true,is_requestable:true,is_usable:true}

function SkillEditor({skill,resources,busy,onClose,onSave,playerMode=false}:{
  skill:Skill|null;resources:Resource[];busy:boolean;onClose:()=>void;playerMode?:boolean;
  onSave:(data:SkillDraft,id:string|null)=>Promise<boolean>
}) {
  const [draft,setDraft]=useState<SkillDraft>(skill?{
    name:skill.name,description:skill.description,kind:skill.kind,
    purchase_pc:skill.purchase_pc??0,upgrade_pc:skill.upgrade_pc??10,
    max_rank:skill.max_rank??3,min_level:skill.min_level,
    resource_name:skill.resource_name,resource_cost:skill.resource_cost,is_active:skill.is_active,
    is_visible:skill.is_visible,is_requestable:skill.is_requestable,is_usable:skill.is_usable
  }:initialDraft)
  const names=[...new Set(['Vida','Maná','NEM','Éter',...resources.map(r=>r.name)])]
  const valid=draft.name.trim().length>=2&&draft.name.length<=70&&draft.description.trim().length>=1&&draft.description.length<=1500&&
    Number.isInteger(draft.purchase_pc)&&draft.purchase_pc>=0&&draft.purchase_pc<=100000&&
    Number.isInteger(draft.upgrade_pc)&&draft.upgrade_pc>=1&&draft.upgrade_pc<=100000&&
    Number.isInteger(draft.max_rank)&&draft.max_rank>=1&&draft.max_rank<=20&&
    Number.isInteger(draft.min_level)&&draft.min_level>=1&&draft.min_level<=10000&&
    Number.isInteger(draft.resource_cost)&&draft.resource_cost>=0&&draft.resource_cost<=1000000&&
    (draft.kind==='pasiva'||(draft.resource_name?draft.resource_cost>0:draft.resource_cost===0))
  async function submit(e:FormEvent){
    e.preventDefault();if(!valid)return
    const saved=await onSave({...draft,name:draft.name.trim(),resource_name:draft.kind==='pasiva'||draft.resource_cost===0?null:draft.resource_name,resource_cost:draft.kind==='pasiva'?0:draft.resource_cost},skill?.id||null)
    if(saved)onClose()
  }
  return <section className="card skill-editor">
    <div className="card-header"><div><span className="overline">{playerMode?'PROPUESTA PERSONAL PARA EL DM':'CATÁLOGO GLOBAL · DM'}</span><h3>{playerMode?'Escribir habilidad para mi personaje':skill?'Editar plantilla de habilidad':'Crear nueva habilidad'}</h3></div><button type="button" className="skill-icon-button" aria-label="Cerrar editor" onClick={onClose}><X size={19}/></button></div>
    <form className="skill-form" onSubmit={e=>void submit(e)}>
      <label>Nombre<input required minLength={2} maxLength={70} value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Ej. Corte sombrío"/></label>
      <label>Descripción / efecto<textarea required rows={3} maxLength={1500} value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} placeholder="¿Qué hace esta habilidad?"/></label>
      <div className="skill-form-row"><label>Tipo<select value={draft.kind} onChange={e=>setDraft(d=>({...d,kind:e.target.value as Skill['kind'],resource_name:e.target.value==='pasiva'?null:d.resource_name,resource_cost:e.target.value==='pasiva'?0:d.resource_cost}))}><option value="activa">Activa</option><option value="pasiva">Pasiva</option></select></label>{!playerMode&&<label>Nivel mínimo<input type="number" min={1} max={10000} value={draft.min_level} onChange={e=>setDraft(d=>({...d,min_level:Number(e.target.value)}))}/></label>}</div>
      {!playerMode&&<div className="skill-form-row"><label>PC necesarios para subir de rango (SECRETO)<input type="number" min={1} max={100000} value={draft.upgrade_pc} onChange={e=>setDraft(d=>({...d,upgrade_pc:Number(e.target.value)}))}/></label><label>Rango máximo (SECRETO)<input type="number" min={1} max={20} value={draft.max_rank} onChange={e=>setDraft(d=>({...d,max_rank:Number(e.target.value)}))}/></label></div>}
      {draft.kind==='activa'&&<div className="skill-form-row"><label>Recurso consumido<select value={draft.resource_name??''} onChange={e=>setDraft(d=>({...d,resource_name:e.target.value||null,resource_cost:e.target.value?Math.max(1,d.resource_cost):0}))}><option value="">Sin consumo</option>{names.map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>Consumo por uso<input type="number" min={draft.resource_name?1:0} max={1000000} disabled={!draft.resource_name} value={draft.resource_cost} onChange={e=>setDraft(d=>({...d,resource_cost:Number(e.target.value)}))}/></label></div>}
      {!playerMode&&<div className="skill-access-panel" role="group" aria-label="Permisos y visibilidad">
        <div className="skill-access-heading"><Shield size={19}/><div><b>Disponibilidad para jugadores</b><small>Estos controles son independientes. Asignar una habilidad es siempre una acción del DM.</small></div></div>
        <label className="skill-access-switch"><span><b>Visible en el catálogo</b><small>Todos los jugadores la pueden descubrir. Si está oculta, solo la ven el DM y quienes la tengan asignada.</small></span><input type="checkbox" checked={draft.is_visible} onChange={e=>setDraft(d=>({...d,is_visible:e.target.checked}))}/></label>
        <label className="skill-access-switch"><span><b>Permitir solicitar aprendizaje</b><small>Los jugadores pueden pedirla al DM cuando esté visible. No se asigna automáticamente.</small></span><input type="checkbox" checked={draft.is_requestable} onChange={e=>setDraft(d=>({...d,is_requestable:e.target.checked}))}/></label>
        <label className="skill-access-switch"><span><b>Permitir utilizarla</b><small>Los personajes que la tienen asignada pueden activarla durante la partida.</small></span><input type="checkbox" checked={draft.is_usable} onChange={e=>setDraft(d=>({...d,is_usable:e.target.checked}))}/></label>
        <label className="skill-access-switch"><span><b>Habilidad habilitada</b><small>Interruptor general: si se desactiva, suspende solicitudes, entrenamiento y uso.</small></span><input type="checkbox" checked={draft.is_active} onChange={e=>setDraft(d=>({...d,is_active:e.target.checked}))}/></label>
      </div>}
      <div className="skill-editor-actions"><button type="button" className="skill-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="skill-primary" disabled={busy||!valid}><Check size={17}/>{playerMode?'Enviar al DM':skill?'Guardar plantilla':'Crear habilidad'}</button></div>
      <p className="hint">{playerMode?'Describe la habilidad y su consumo por uso. El DM establecerá los requisitos, los rangos y los PC al revisar la solicitud. Si la aprueba, será exclusiva de tu personaje.':'Crear una plantilla no se la entrega a todos. El DM la asigna individualmente. El umbral y rango máximo permanecen ocultos para el jugador.'}</p>
    </form>
  </section>
}

function CharacterSkillEditor({skill,appearance,progress,rank,busy,onClose,onSave,onRemove}: {
  skill:Skill;appearance?:CharacterSkillAppearance;progress?:DMSkillProgress;rank:number;busy:boolean;
  onClose:()=>void;onSave:(data:CharacterSkillConfig)=>Promise<boolean>;onRemove:()=>Promise<void>
}) {
  const [form,setForm]=useState({
    rank:String(rank),target_pc:String(progress?.target_pc_override??''),
    max_rank:String(progress?.max_rank_override??''),
    name:progress?.name_override??'',description:progress?.description_override??'',
    resource_name:progress?.resource_name_override??'',
    resource_cost:progress?.resource_cost_override==null?'':String(progress.resource_cost_override),
  })
  const effectiveMax=form.max_rank?Number(form.max_rank):(skill.max_rank??20)
  const valid=Number.isInteger(Number(form.rank))&&Number(form.rank)>=1&&Number(form.rank)<=effectiveMax&&
    (!form.target_pc||(Number.isInteger(Number(form.target_pc))&&Number(form.target_pc)>=1&&Number(form.target_pc)<=1000000))&&
    (!form.max_rank||(Number.isInteger(Number(form.max_rank))&&Number(form.max_rank)>=1&&Number(form.max_rank)<=20))&&
    (!form.resource_cost||(Number.isInteger(Number(form.resource_cost))&&Number(form.resource_cost)>=0&&Number(form.resource_cost)<=1000000))&&
    form.name.length<=70&&form.description.length<=1500
  const currentTarget=progress?.target_pc??skill.upgrade_pc??0
  async function submit(e:FormEvent){e.preventDefault();if(!valid)return;
    const saved=await onSave({
      rank:Number(form.rank),target_pc:form.target_pc?Number(form.target_pc):null,
      max_rank:form.max_rank?Number(form.max_rank):null,
      name:form.name.trim()||null,description:form.description.trim()||null,
      resource_name:form.resource_name.trim()||null,
      resource_cost:form.resource_cost===''?null:Number(form.resource_cost)
    });if(saved)onClose()
  }
  return <section className="card skill-editor skill-individual-editor">
    <div className="card-header"><div><span className="overline">MODIFICACIÓN INDIVIDUAL · SOLO DM</span><h3>{appearance?.name||skill.name}</h3></div><button type="button" className="skill-icon-button" aria-label="Cerrar" onClick={onClose}><X size={19}/></button></div>
    <div className="skill-secret-info"><LockKeyhole size={18}/><span><b>Progreso secreto:</b> {format(progress?.invested_pc??0)} / {format(currentTarget)} PC. El jugador nunca ve esta cifra.</span></div>
    <form className="skill-form" onSubmit={e=>void submit(e)}>
      <div className="skill-form-row"><label>Rango actual de este personaje<input type="number" min={1} max={effectiveMax} value={form.rank} onChange={e=>setForm(f=>({...f,rank:e.target.value}))}/></label><label>Rango máximo individual (opcional)<input type="number" min={1} max={20} placeholder={`Plantilla: ${skill.max_rank??'—'}`} value={form.max_rank} onChange={e=>setForm(f=>({...f,max_rank:e.target.value}))}/></label></div>
      <label>Meta secreta de PC para la próxima mejora<input type="number" min={1} max={1000000} placeholder={`Plantilla: ${skill.upgrade_pc??'—'} PC`} value={form.target_pc} onChange={e=>setForm(f=>({...f,target_pc:e.target.value}))}/></label>
      <label>Nombre personalizado (opcional)<input maxLength={70} value={form.name} placeholder={skill.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></label>
      <label>Efecto y descripción para este personaje<textarea maxLength={1500} rows={3} value={form.description} placeholder={skill.description||'Usar descripción global'} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></label>
      {skill.kind==='activa'&&<div className="skill-form-row"><label>Recurso personalizado<input maxLength={40} placeholder={skill.resource_name||'Ninguno'} value={form.resource_name} onChange={e=>setForm(f=>({...f,resource_name:e.target.value}))}/></label><label>Consumo personalizado<input type="number" min={0} max={1000000} placeholder={`Global: ${skill.resource_cost}`} value={form.resource_cost} onChange={e=>setForm(f=>({...f,resource_cost:e.target.value}))}/></label></div>}
      <div className="skill-editor-actions skill-editor-actions-split"><button className="skill-danger" type="button" disabled={busy} onClick={()=>{if(window.confirm('¿Retirar esta habilidad del personaje? Los PC invertidos no se devolverán.'))void onRemove()}}>Retirar habilidad</button><div><button type="button" className="skill-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="skill-primary" disabled={busy||!valid}><Check size={17}/>Guardar para este personaje</button></div></div>
      <p className="hint">Subir el rango reinicia el progreso de PC de la nueva etapa, sin devolver inversiones anteriores. Deja campos opcionales vacíos para usar el valor de la plantilla.</p>
    </form>
  </section>
}

export function SkillsView({character,characters,profiles,levels,resources,skills,learned,appearances,dmProgress,requests,personalProposals,isStaff,busy,onSelectCharacter,onRequest,onRequestUpgrade,onInvest,onUse,onSave,onProposePersonal,onAssign,onResolve,onCompleteReview,onConfigure,onRemove}:Props) {
  const [filter,setFilter]=useState<'mias'|'todas'>('mias')
  const [search,setSearch]=useState('')
  const [editing,setEditing]=useState<Skill|null|undefined>(undefined)
  const [editingPersonal,setEditingPersonal]=useState<string|null>(null)
  const [investingSkillId,setInvestingSkillId]=useState<string|null>(null)
  const [investAmount,setInvestAmount]=useState('1')
  useEffect(()=>{setInvestingSkillId(null);setInvestAmount('1')},[character.id])
  useEffect(()=>{
    if(!investingSkillId)return
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)setInvestingSkillId(null)}
    document.addEventListener('keydown',onKeyDown)
    return ()=>document.removeEventListener('keydown',onKeyDown)
  },[investingSkillId,busy])
  const level=useMemo(()=>levels.reduce((result,x)=>character.xp>=x.min_xp?Math.max(result,x.level):result,1),[character.xp,levels])
  const owned=useMemo(()=>new Map(learned.map(x=>[x.skill_id,x])),[learned])
  const appearanceById=useMemo(()=>new Map(appearances.map(x=>[x.skill_id,x])),[appearances])
  const secretById=useMemo(()=>new Map(dmProgress.map(x=>[x.skill_id,x])),[dmProgress])
  const matching=useMemo(()=>skills.filter(s=>(filter==='todas'||owned.has(s.id)) &&
    (appearanceById.get(s.id)?.name||s.name).toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
    .sort((a,b)=>Number(owned.has(b.id))-Number(owned.has(a.id))||a.name.localeCompare(b.name,'es')),[skills,filter,owned,search,appearanceById])
  const pendingForSelected=requests.filter(r=>r.character_id===character.id&&r.status==='pendiente')
  const allPending=isStaff?requests.filter(r=>r.status==='pendiente'):[]
  const skillName=(id:string)=>skills.find(s=>s.id===id)?.name||'Habilidad'
  const investingSkill=skills.find(s=>s.id===investingSkillId)
  const investingName=investingSkill?(appearanceById.get(investingSkill.id)?.name||investingSkill.name):''
  const amountNumber=Number(investAmount)
  const amountValid=Number.isSafeInteger(amountNumber)&&amountNumber>=1&&amountNumber<=100000&&amountNumber<=character.pc
  async function submitInvestment(event:FormEvent){
    event.preventDefault()
    if(!investingSkill||!owned.has(investingSkill.id)||!amountValid||busy)return
    const succeeded=await onInvest(investingSkill.id,amountNumber)
    if(succeeded){setInvestingSkillId(null);setInvestAmount('1')}
  }
  const characterLabel=(id:string)=>{const c=characters.find(x=>x.id===id);const p=profiles.find(x=>x.id===c?.owner_id);return c?`${c.name} · ${p?.display_name||'Jugador'}`:'Personaje'}
  return <div className="stack skill-page">
    <div className="skill-warning-banner"><LockKeyhole size={20}/><strong>UNA VEZ QUE TOMAS UNA DECISIÓN, NO TE PUEDES ARREPENTIR.</strong><span>Los PC invertidos en habilidades no se pueden retirar ni recuperar.</span></div>
    <div className="page-heading"><div><span className="overline">TÉCNICAS Y PODERES</span><h1>Habilidades</h1><p>{isStaff?'Asigna habilidades y decide las mejoras de cada personaje.':'Escribe habilidades improvisadas, pide aprobación al DM y utiliza las que recibas.'}</p></div><button type="button" className="skill-primary skill-create-btn" disabled={busy} onClick={()=>setEditing(null)}><Plus size={18}/> {isStaff?'Nueva plantilla':'Escribir habilidad'}</button></div>
    {isStaff&&<section className="card skill-manage-card"><div className="skill-manage-header"><div><span className="overline">PANEL DE GESTIÓN DEL DM</span><h3>¿Qué jugador estás modificando?</h3><p>Cualquier cambio realizado abajo afectará únicamente al personaje seleccionado.</p></div><Shield size={24}/></div><label className="skill-select-character"><UserRound size={18}/><select value={character.id} onChange={e=>{setEditingPersonal(null);onSelectCharacter(e.target.value)}} aria-label="Seleccionar personaje para habilidades">{characters.map(c=><option key={c.id} value={c.id}>{characterLabel(c.id)}</option>)}</select></label><div className="skill-management-stats"><span><BookOpen size={15}/> {learned.length} asignadas</span><span><Coins size={15}/> {format(character.pc)} PC del personaje</span><span>{allPending.length} solicitud(es) pendientes</span></div></section>}
    <div className="skill-summary"><div><span><BookOpen size={18}/> {isStaff?'Asignadas':'Mis habilidades'}</span><strong>{learned.length}</strong></div><div><span><Coins size={18}/> PC disponibles</span><strong>{format(character.pc)}</strong></div><div><span><Shield size={18}/> Nivel</span><strong>{level}</strong></div></div>
    {!isStaff&&personalProposals.some(x=>x.character_id===character.id)&&<section className="card skill-personal-proposals">
      <div className="card-header"><div><span className="overline">HABILIDADES INVENTADAS DURANTE LA PARTIDA</span><h3>Mis propuestas</h3></div><BookOpen size={20}/></div>
      <div className="skill-requests-list">{personalProposals.filter(x=>x.character_id===character.id).slice(0,8).map(p=><div className="skill-request-row" key={p.id}>
        <div><div className="request-title"><span className={`request-kind ${p.status==='pendiente'?'request-learning':''}`}>{p.status==='pendiente'?'PENDIENTE':p.status==='aprobada'?'APROBADA':'RECHAZADA'}</span><b>{p.name}</b></div>
        <small>{p.kind==='activa'?(p.resource_cost>0?`${p.resource_cost} ${p.resource_name} por uso`:'Sin consumo'):'Pasiva'} · {p.description}</small>
      </div></div>)}</div>
    </section>}
    {isStaff&&<details className="card admin-fold skill-requests" open={allPending.length>0} key={`skill-requests-${allPending.length>0}`}>
      <summary className="admin-fold-title"><div><span className="overline">SOLICITUDES DE JUGADORES</span><h3>Pendientes ({allPending.length})</h3></div><ChevronDown size={20}/></summary>
      <div className="admin-fold-body"><p className="hint">Aprender: asignar. Mejorar: subir el rango (si hay un rango disponible) o transformar la habilidad del personaje. Para finalizar una transformación primero edita su ficha individual.</p>
        {allPending.length===0?<p className="empty">Sin solicitudes. Se separan las de aprendizaje y las de mejora, generadas al finalizar el entrenamiento.</p>
        :<div className="skill-requests-list">{allPending.map(req=><div className="skill-request-row" key={req.id}><div><div className="request-title"><span className={`request-kind ${req.request_type==='mejorar'?'request-upgrade':'request-learning'}`}>{req.request_type==='mejorar'?'MEJORAR':'APRENDER'}</span><b>{skillName(req.skill_id)}</b></div><small>{characterLabel(req.character_id)}{req.request_type==='mejorar'?' · Entrenamiento completo':''}</small></div><div className="skill-request-actions">{req.character_id!==character.id&&<button className="skill-secondary" type="button" onClick={()=>onSelectCharacter(req.character_id)}>Ver personaje</button>}<button className="skill-secondary" type="button" disabled={busy} onClick={()=>void onResolve(req.id,false)}>Rechazar</button><button className="skill-primary" type="button" disabled={busy} onClick={()=>void onResolve(req.id,true)}><Check size={15}/> {req.request_type==='mejorar'?'Subir rango':'Asignar habilidad'}</button>{req.request_type==='mejorar'&&<button className="skill-secondary skill-resolve-custom" type="button" disabled={busy} onClick={()=>void onCompleteReview(req.id)}><WandSparkles size={15}/> Finalizar transformación</button>}</div></div>)}</div>}
      </div>
    </details>}
    {editing!==undefined&&<SkillEditor key={editing?.id||'create'} skill={editing} resources={resources} busy={busy} playerMode={!isStaff} onClose={()=>setEditing(undefined)} onSave={isStaff?onSave:async draft=>onProposePersonal(draft)}/>}
    {isStaff&&editingPersonal&&(()=>{const s=skills.find(x=>x.id===editingPersonal),cs=owned.get(editingPersonal);return s&&cs?<CharacterSkillEditor key={character.id+'-'+s.id} skill={s} rank={cs.rank} appearance={appearanceById.get(s.id)} progress={secretById.get(s.id)} busy={busy} onClose={()=>setEditingPersonal(null)} onSave={data=>onConfigure(s.id,data)} onRemove={async()=>{await onRemove(s.id);setEditingPersonal(null)}}/>:null})()}
    <div className="skills-toolbar"><div className="skill-tabs" role="group" aria-label="Vista de habilidades"><button className={filter==='mias'?'current':''} onClick={()=>setFilter('mias')} aria-pressed={filter==='mias'}>{isStaff?'Asignadas':'Mis habilidades'} <span>{learned.length}</span></button><button className={filter==='todas'?'current':''} onClick={()=>setFilter('todas')} aria-pressed={filter==='todas'}>Catálogo <span>{skills.length}</span></button></div><label className="skill-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Buscar habilidad" placeholder="Buscar habilidad…"/></label></div>
    {matching.length===0?<section className="card skill-empty"><BookOpen size={31}/><h3>{filter==='mias'?'Sin habilidades asignadas':'Sin resultados'}</h3><p>{filter==='mias'?(isStaff?'Abre el catálogo y asigna una habilidad a este personaje.':'El DM debe asignarte una habilidad. También puedes solicitarla en el catálogo.'):'Prueba con otro nombre o pide al DM crear una nueva.'}</p><button className="skill-primary" type="button" onClick={()=>{setFilter('todas');setSearch('')}}>Ver catálogo <ArrowRight size={16}/></button></section>:<div className="skills-grid">{matching.map(s=>{
      const cs=owned.get(s.id)
      const appearance=appearanceById.get(s.id)
      const secret=secretById.get(s.id)
      const name=appearance?.name||s.name
      const description=appearance?.description??s.description
      const consumed=appearance?.resource_cost??s.resource_cost
      const resourceName=appearance?.resource_name??s.resource_name
      const enoughResource=consumed===0||!!resources.find(r=>r.name.toLocaleLowerCase('es')===resourceName?.toLocaleLowerCase('es')&&r.current_value>=consumed)
      const pendingRequest=pendingForSelected.find(r=>r.skill_id===s.id)
      const pending=!!pendingRequest
      const maxed=isStaff&&cs?cs.rank>=(secret?.effective_max_rank??s.max_rank??20):false
      return <article key={s.id} className={`card skill-card ${cs?'skill-owned':''} ${!s.is_active?'skill-inactive':''}`}>
        <div className="skill-card-header"><span className={`skill-emblem ${s.kind}`}><FantasyIcon name={name} description={s.description} category={s.kind}/></span><div className="skill-title"><div className="skill-title-line"><h3>{name}</h3>{!s.is_active&&<span className="skill-badge">Inactiva</span>}{isStaff&&!s.is_visible&&<span className="skill-badge"><LockKeyhole size={12}/> Oculta</span>}{isStaff&&!s.is_requestable&&<span className="skill-badge">Solo por DM</span>}{isStaff&&!s.is_usable&&<span className="skill-badge">Uso bloqueado</span>}</div><span>{s.kind==='activa'?'Activa':'Pasiva'}{isStaff?` · Nivel mínimo ${s.min_level}`:''}{cs?` · Rango ${cs.rank}`:''}</span></div>{isStaff&&<button type="button" className="skill-icon-button" title="Editar plantilla global" aria-label={`Editar plantilla ${s.name}`} onClick={()=>setEditing(s)}><Edit3 size={17}/></button>}</div>
        <p className="skill-description">{description||'El DM explicará cómo funciona esta habilidad.'}</p>
        <div className="skill-facts">{s.kind==='activa'?<span><WandSparkles size={15}/>{consumed>0?`${consumed} ${resourceName} por uso`:'Sin consumo'}</span>:<span><Sparkles size={15}/>Efecto pasivo</span>}{isStaff&&cs&&<span><LockKeyhole size={15}/>{format(secret?.invested_pc??0)} / {format(secret?.target_pc??s.upgrade_pc??0)} PC secretos</span>}</div>
        <div className="skill-card-controls">
          {cs&&<div className="skill-primary-actions">{s.kind==='activa'&&<button className="skill-primary" type="button" disabled={busy||!s.is_active||!s.is_usable||!enoughResource} onClick={()=>void onUse(s.id)}><Zap size={16}/> Usar habilidad</button>}{s.kind==='pasiva'&&<span className="skill-passive-note"><Check size={16}/> {s.is_active&&s.is_usable?'Pasiva activa':'Pasiva suspendida'}</span>}</div>}
          {isStaff?<div className="skill-secondary-actions">{cs?<button type="button" className="skill-secondary" onClick={()=>setEditingPersonal(s.id)}><Edit3 size={16}/> Configurar para {character.name}</button>:<button type="button" className="skill-primary" disabled={busy} onClick={()=>void onAssign(s.id)}><Plus size={16}/> Asignar directamente a {character.name}</button>}{maxed&&<span className="skill-max-note">Rango máximo · el DM puede desbloquear más</span>}</div>:cs?<div className="skill-secondary-actions"><><button className="skill-secondary" type="button" disabled={busy||!s.is_active||character.pc<1} onClick={()=>{setInvestAmount('1');setInvestingSkillId(s.id)}}><HandCoins size={16}/> Invertir PC</button>{pending?<span className="skill-request-pending"><Check size={16}/> Revisión pendiente · puedes seguir invirtiendo PC</span>:<button className="skill-secondary skill-review-btn" type="button" disabled={busy} onClick={()=>void onRequestUpgrade(s.id)}><BookOpen size={16}/> Solicitar revisión</button>}</></div>:<div className="skill-secondary-actions">{pending?<span className="skill-request-pending"><BookOpen size={16}/> Aprendizaje solicitado · esperando al DM</span>:<button type="button" className="skill-secondary" disabled={busy||!s.is_active||!s.is_visible||!s.is_requestable} onClick={()=>void onRequest(s.id)}><BookOpen size={16}/> {s.is_requestable&&s.is_visible?'Solicitar aprendizaje al DM':'Solo asignación directa por DM'}</button>}</div>}
        </div>
        {!enoughResource&&!!cs&&s.kind==='activa'&&<p className="skill-warning">No tienes suficiente {resourceName} para utilizarla.</p>}
      </article>
    })}</div>}
    {investingSkill&&!isStaff&&owned.has(investingSkill.id)&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setInvestingSkillId(null)}}>
      <div className="card skill-invest-modal" role="dialog" aria-modal="true" aria-labelledby="skill-invest-modal-title" aria-describedby="skill-invest-modal-info">
        <div className="card-header"><div><span className="overline">ENTRENAMIENTO</span><h3 id="skill-invest-modal-title">Invertir PC en {investingName}</h3></div><button type="button" className="skill-icon-button" aria-label="Cerrar ventana" onClick={()=>setInvestingSkillId(null)} disabled={busy}><X size={19}/></button></div>
        <div className="skill-modal-balance"><Coins size={20}/><span>PC disponibles</span><strong>{format(character.pc)}</strong></div>
        <p id="skill-invest-modal-info" className="hint">El DM establece una meta secreta. Puedes invertir incluso más de la meta secreta. TODOS los PC ingresados se descuentan, también los excedentes, sin devolución ni traspaso al siguiente rango. El DM decide cuándo mejorar o transformar la habilidad.</p>
        <form onSubmit={e=>void submitInvestment(e)} className="skill-invest-form">
          <label htmlFor="skill-pc-input">PC que deseas invertir<input id="skill-pc-input" type="number" autoFocus required min={1} max={Math.min(100000,Math.max(1,character.pc))} step={1} value={investAmount} onChange={e=>setInvestAmount(e.target.value)} /></label>
          <p className="skill-modal-no-refund"><LockKeyhole size={16}/> Los PC invertidos, incluidos los que superen la meta, no se pueden retirar ni recuperar.</p>
          <div className="skill-editor-actions"><button type="button" className="skill-secondary" disabled={busy} onClick={()=>setInvestingSkillId(null)}>Cerrar</button><button type="submit" className="skill-primary" disabled={busy||!amountValid}>{busy?'Invirtiendo…':<><HandCoins size={16}/> Invertir PC</>}</button></div>
        </form>
      </div>
    </div>}
    <p className="hint">Aprender y mejorar requieren la aprobación del DM. Cada personaje tiene habilidades y progresos individuales. Los PC gastados nunca se reembolsan.</p>
  </div>
}
