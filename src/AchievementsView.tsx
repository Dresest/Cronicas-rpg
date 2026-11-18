import {useMemo,useState,type FormEvent} from 'react'
import {Award,Check,ChevronDown,Crown,LockKeyhole,Medal,Pencil,Plus,Search,ShieldCheck,Sparkles,Swords,X} from 'lucide-react'
import type {AchievementDefinition,AchievementDraft,Character,CharacterAchievement,Skill} from './types'

const attributes=['Sabiduría','Carisma','Constitución','Destreza','Fuerza','Inteligencia'] as const
const rarities=[['comun','Común'],['poco_comun','Poco común'],['raro','Raro'],['epico','Épico'],['legendario','Legendario']] as const
const defaultDraft:AchievementDraft={name:'',description:'',category:'logro',rarity:'comun',bonuses:{},per_rank_bonuses:{},passive_text:'',skill_id:null,upgradeable:false,upgrade_pc:10,max_rank:1,is_public:true,is_active:true}

export type AchievementsProps={
 character:Character;characters:Character[];definitions:AchievementDefinition[];earned:CharacterAchievement[];
 skills:Skill[];isStaff:boolean;busy:boolean;
 onSelectCharacter:(id:string)=>void;
 onSave:(data:AchievementDraft,id:string|null)=>Promise<boolean>;
 onGrant:(id:string,characterIds:string[],grant:boolean)=>Promise<boolean>;
 onUpgrade:(id:string)=>Promise<boolean>;
 onSetTitle:(id:string|null)=>Promise<boolean>;
}
function Editor({data,skills,onSave,onClose,busy}:{data:AchievementDefinition|null;skills:Skill[];onSave:AchievementsProps['onSave'];onClose:()=>void;busy:boolean}){
 const [draft,setDraft]=useState<AchievementDraft>(data?{
  name:data.name,description:data.description,category:data.category,rarity:data.rarity,bonuses:data.bonuses||{},
  per_rank_bonuses:data.per_rank_bonuses||{},passive_text:data.passive_text,skill_id:data.skill_id,
  upgradeable:data.upgradeable,upgrade_pc:data.upgrade_pc,max_rank:data.max_rank,is_public:data.is_public,is_active:data.is_active
 }:defaultDraft)
 const change=(k:keyof AchievementDraft,value:unknown)=>setDraft(d=>({...d,[k]:value}))
 const [saveBusy,setSaveBusy]=useState(false)
 async function submit(e:FormEvent){e.preventDefault();setSaveBusy(true);try{if(await onSave(draft,data?.id||null))onClose()}finally{setSaveBusy(false)}}
 return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!saveBusy)onClose()}}><section className="card achieve-modal" role="dialog" aria-modal="true" aria-labelledby="achieve-editor-title">
  <div className="card-header"><div><span className="overline">DUNGEON MASTER</span><h3 id="achieve-editor-title">{data?'Modificar':'Crear'} {draft.category==='titulo'?'título':'logro'}</h3></div><button type="button" className="inv-icon" onClick={onClose} aria-label="Cerrar editor"><X size={18}/></button></div>
  <form className="achieve-form" onSubmit={e=>void submit(e)}>
   <label>Nombre<input autoFocus required minLength={2} maxLength={100} value={draft.name} onChange={e=>change('name',e.target.value)} placeholder="Ej.: Vencedor de dragones"/></label>
   <label>Historia o descripción<textarea maxLength={2000} rows={3} value={draft.description} onChange={e=>change('description',e.target.value)} placeholder="¿Qué representa este reconocimiento?"/></label>
   <div className="inv-fields-2"><label>Tipo<select value={draft.category} onChange={e=>change('category',e.target.value)}><option value="logro">Logro (activo siempre)</option><option value="titulo">Título (equipar uno)</option></select></label><label>Rareza<select value={draft.rarity} onChange={e=>change('rarity',e.target.value)}>{rarities.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label></div>
   <details className="inv-edit-fold" open><summary>Atributos y bonificaciones <ChevronDown size={17}/></summary><p className="hint">Bonificación inicial al conseguirlo. El valor por rango se suma por cada rango superior a 1. Los atributos base no se modifican.</p>
    <div className="achieve-bonus-grid">{attributes.map(key=><div key={key} className="achieve-attr-row"><strong>{key}</strong><label>Inicial<input type="number" min={-1000} max={1000} value={draft.bonuses[key]??0} onChange={e=>setDraft(d=>({...d,bonuses:{...d.bonuses,[key]:Number(e.target.value)}}))}/></label><label>+ por rango<input type="number" min={-1000} max={1000} value={draft.per_rank_bonuses[key]??0} onChange={e=>setDraft(d=>({...d,per_rank_bonuses:{...d.per_rank_bonuses,[key]:Number(e.target.value)}}))}/></label></div>)}</div>
   </details>
   <label>Característica o efecto pasivo<textarea maxLength={1200} rows={2} value={draft.passive_text} onChange={e=>change('passive_text',e.target.value)} placeholder="Ej.: Puedes comprender el idioma de los dragones."/></label>
   <label>Habilidad que se desbloquea al obtenerlo<select value={draft.skill_id||''} onChange={e=>change('skill_id',e.target.value||null)}><option value="">No concede habilidad</option>{skills.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
   <div className="achieve-settings"><label className="achieve-check"><input type="checkbox" checked={draft.upgradeable} onChange={e=>setDraft(d=>({...d,upgradeable:e.target.checked,max_rank:e.target.checked?Math.max(2,d.max_rank):1}))}/> Permitir mejorar con PC</label>
    {draft.upgradeable&&<div className="inv-fields-2"><label>PC por rango<input type="number" min={1} max={1000000} required value={draft.upgrade_pc} onChange={e=>change('upgrade_pc',Number(e.target.value))}/></label><label>Rango máximo<input type="number" min={2} max={20} required value={draft.max_rank} onChange={e=>change('max_rank',Number(e.target.value))}/></label></div>}
    <label className="achieve-check"><input type="checkbox" checked={draft.is_public} onChange={e=>change('is_public',e.target.checked)}/> Mostrar a jugadores que todavía no lo tienen</label>
    <label className="achieve-check"><input type="checkbox" checked={draft.is_active} onChange={e=>change('is_active',e.target.checked)}/> Efectos activos</label></div>
   <p className="hint">La habilidad concedida queda desbloqueada de forma permanente. Retirar un logro no elimina habilidades ya concedidas.</p>
   <div className="inv-actions achieve-form-actions"><button type="button" className="inv-button subtle" onClick={onClose}>Cancelar</button><button type="submit" className="inv-button primary" disabled={busy||saveBusy||draft.name.trim().length<2||draft.upgradeable&&draft.max_rank<2}>{saveBusy?'Guardando…':<><Check size={17}/> Guardar</>}</button></div>
  </form>
 </section></div>
}

export function AchievementsView({character,characters,definitions,earned,skills,isStaff,busy,onSelectCharacter,onSave,onGrant,onUpgrade,onSetTitle}:AchievementsProps){
 const [search,setSearch]=useState('')
 const [editor,setEditor]=useState<AchievementDefinition|null|undefined>(undefined)
 const [grantId,setGrantId]=useState<string|null>(null)
 const [selected,setSelected]=useState<string[]>([])
 const owned=useMemo(()=>definitions.filter(d=>earned.some(e=>e.achievement_id===d.id)),[definitions,earned])
 const unowned=useMemo(()=>definitions.filter(d=>!earned.some(e=>e.achievement_id===d.id)&&d.is_public),[definitions,earned])
 const lower=search.toLocaleLowerCase('es').trim()
 const matches=(d:AchievementDefinition)=>(d.name+' '+d.description+' '+d.passive_text).toLocaleLowerCase('es').includes(lower)
 const grantDef=definitions.find(d=>d.id===grantId)||null
 async function grantMany(grant:boolean){if(!grantId||selected.length===0)return;const ok=await onGrant(grantId,selected,grant);if(ok){setGrantId(null);setSelected([])}}
 const title=owned.find(d=>d.category==='titulo'&&earned.find(e=>e.achievement_id===d.id)?.active_title)
 const card=(def:AchievementDefinition,isOwned:boolean)=>{
  const state=earned.find(e=>e.achievement_id===def.id)
  const rank=state?.rank||1
  const bonuses=attributes.map(key=>({key,total:(def.bonuses?.[key]||0)+(def.per_rank_bonuses?.[key]||0)*(rank-1)})).filter(x=>x.total!==0)
  return <details className="achieve-tile" key={def.id}><summary><span className="achieve-seal">{def.category==='titulo'?<Crown size={23}/>:<Medal size={23}/>}</span><span className="achieve-tile-name"><strong>{def.name}</strong><small>{def.category==='titulo'?'Título':'Logro'} · {rarities.find(r=>r[0]===def.rarity)?.[1]}{isOwned?` · Rango ${rank}`:''}</small></span>{state?.active_title&&<span className="achieve-active-label">Activo</span>}<ChevronDown className="achieve-chevron" size={19}/></summary>
   <div className="achieve-tile-body">{def.description&&<p className="muted">{def.description}</p>}{bonuses.length>0&&<div className="inv-bonus-tags">{bonuses.map(x=><span key={x.key}><Sparkles size={13}/>{x.total>0?'+':''}{x.total} {x.key}</span>)}</div>}
    {def.passive_text&&<p className="achieve-passive"><ShieldCheck size={16}/>{def.passive_text}</p>}
    {def.skill_id&&<p className="achieve-passive"><Swords size={16}/> Habilidad otorgada: <b>{skills.find(s=>s.id===def.skill_id)?.name||'Habilidad especial'}</b></p>}
    {def.category==='titulo'&&isOwned&&<button type="button" className="inv-button subtle" disabled={busy||!def.is_active} onClick={()=>void onSetTitle(state?.active_title?null:def.id)}>{state?.active_title?'Quitar título activo':'Seleccionar como título activo'}</button>}
    {isOwned&&def.upgradeable&&<div className="achieve-upgrade"><span>{rank>=def.max_rank?'Rango máximo alcanzado':`Mejorar a rango ${rank+1} · ${def.upgrade_pc} PC`}</span><button className="inv-button primary" type="button" disabled={busy||!def.is_active||rank>=def.max_rank||character.pc<def.upgrade_pc} onClick={()=>void onUpgrade(def.id)}>Mejorar con PC</button></div>}
    {!isOwned&&<p className="hint">Solo el DM puede otorgar este {def.category==='titulo'?'título':'logro'} o incluirlo como premio de misión.</p>}
    {isStaff&&<div className="achieve-dm-actions"><button type="button" className="inv-button subtle" onClick={()=>setEditor(def)}><Pencil size={15}/> Editar</button><button type="button" className="inv-button subtle" onClick={()=>{setSelected([character.id]);setGrantId(def.id)}}><Award size={15}/> Asignar a jugadores</button>{isOwned&&<button type="button" className="inv-button subtle" disabled={busy} onClick={()=>void onGrant(def.id,[character.id],false)}>Retirar a este personaje</button>}</div>}
   </div></details>
 }
 return <div className="stack achieve-page">
  <div className="page-heading"><div><span className="overline">RECONOCIMIENTOS DE CAMPAÑA</span><h1>Títulos y logros</h1><p>Conquistas, recompensas y poderes especiales de tu aventurero.</p></div>{isStaff&&<button type="button" className="inv-button primary" onClick={()=>setEditor(null)}><Plus size={17}/> Nuevo logro</button>}</div>
  {isStaff&&<section className="card inv-character-bar"><label><span>Personaje administrado</span><select value={character.id} onChange={e=>onSelectCharacter(e.target.value)}>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><p className="hint">Los logros se asignan a personajes específicos o a varios a la vez. Puedes crearlos y configurar sus efectos desde aquí.</p></section>}
  <div className="achieve-topline"><span><Award size={18}/> {owned.filter(x=>x.category==='logro').length} logros</span><span><Crown size={18}/> {owned.filter(x=>x.category==='titulo').length} títulos</span><span><Sparkles size={18}/> {character.pc} PC</span></div>
  {title&&<div className="achieve-title-highlight"><Crown size={20}/><span><strong>Título activo: {title.name}</strong><small>Sus efectos se suman a tu ficha mientras lo lleves seleccionado.</small></span></div>}
  <label className="inv-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar logros o títulos…" aria-label="Buscar logros"/></label>
  <details className="card inv-fold" open><summary><span><Medal size={20}/><strong>Mis logros <em>{owned.filter(d=>d.category==='logro').length}</em></strong><small>Reconocimientos obtenidos y mejoras</small></span><ChevronDown size={20}/></summary><div className="inv-fold-body">{owned.filter(d=>d.category==='logro'&&matches(d)).length?owned.filter(d=>d.category==='logro'&&matches(d)).map(d=>card(d,true)):<p className="empty">Todavía no tienes logros de este tipo.</p>}</div></details>
  <details className="card inv-fold"><summary><span><Crown size={20}/><strong>Mis títulos <em>{owned.filter(d=>d.category==='titulo').length}</em></strong><small>Selecciona uno para mostrar sus efectos</small></span><ChevronDown size={20}/></summary><div className="inv-fold-body">{owned.filter(d=>d.category==='titulo'&&matches(d)).length?owned.filter(d=>d.category==='titulo'&&matches(d)).map(d=>card(d,true)):<p className="empty">Aún no tienes títulos.</p>}</div></details>
  <details className="card inv-fold"><summary><span><LockKeyhole size={20}/><strong>Descubribles <em>{unowned.length}</em></strong><small>Conoce recompensas que podrías conseguir</small></span><ChevronDown size={20}/></summary><div className="inv-fold-body">{unowned.filter(matches).length?unowned.filter(matches).map(d=>card(d,false)):<p className="empty">No hay logros públicos por descubrir.</p>}</div></details>
  {isStaff&&<details className="card inv-fold"><summary><span><ShieldCheck size={20}/><strong>Catálogo completo del DM <em>{definitions.length}</em></strong><small>Incluye títulos secretos y desactivados</small></span><ChevronDown size={20}/></summary><div className="inv-fold-body">{definitions.filter(matches).map(d=>card(d,!!earned.find(e=>e.achievement_id===d.id)))}</div></details>}
  {editor!==undefined&&<Editor data={editor} skills={skills} onSave={onSave} onClose={()=>setEditor(undefined)} busy={busy}/>}
  {grantDef&&<div className="modal-backdrop" role="presentation"><section className="card achieve-modal" role="dialog" aria-modal="true" aria-labelledby="achieve-assign-title"><div className="card-header"><div><span className="overline">DUNGEON MASTER</span><h3 id="achieve-assign-title">Asignar «{grantDef.name}»</h3></div><button className="inv-icon" aria-label="Cerrar" onClick={()=>setGrantId(null)}><X size={18}/></button></div><p className="hint">Selecciona uno o varios personajes. La habilidad y los efectos se entregarán individualmente. Puedes asignar un logro secreto.</p><div className="achieve-assignee-list">{characters.map(c=><label key={c.id}><input type="checkbox" checked={selected.includes(c.id)} onChange={e=>setSelected(x=>e.target.checked?[...x,c.id]:x.filter(id=>id!==c.id))}/><span>{c.name}</span></label>)}</div><div className="inv-actions achieve-form-actions"><button className="inv-button subtle" onClick={()=>setGrantId(null)}>Cancelar</button><button className="inv-button primary" disabled={busy||selected.length===0} onClick={()=>void grantMany(true)}><Check size={16}/> Asignar a {selected.length}</button></div></section></div>}
 </div>
}
