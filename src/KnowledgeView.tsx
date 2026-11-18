import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  BookOpen, Check, ChevronDown, CircleHelp, Compass, Globe2, GraduationCap,
  History, Layers3, MapPinned, Plus, Search, ShieldCheck, Sparkles, Swords, Users, X,
} from 'lucide-react'
import type { Character, KnowledgeCategory, KnowledgeEntry, Profile } from './types'
import {AdventureJournal} from './AdventureJournal'

const categories: {id:KnowledgeCategory;label:string;description:string;Icon:typeof BookOpen}[] = [
  {id:'mundo', label:'Mundo',description:'Culturas, costumbres, regiones y rumores',Icon:Globe2},
  {id:'enemigos',label:'Enemigos',description:'Debilidades y tácticas de adversarios',Icon:Swords},
  {id:'personajes',label:'Personajes y NPC',description:'Personas conocidas, aliados y rivales',Icon:Users},
  {id:'historia',label:'Historia',description:'Eventos, leyendas y hechos del pasado',Icon:History},
  {id:'criaturas',label:'Criaturas',description:'Fauna, monstruos y seres extraordinarios',Icon:Compass},
  {id:'lugares',label:'Lugares',description:'Ciudades, mazmorras y puntos de interés',Icon:MapPinned},
  {id:'magia',label:'Magia y misterios',description:'Rituales, artefactos y fenómenos extraños',Icon:Sparkles},
  {id:'otros',label:'Otros',description:'Todo lo que no cabe en otra categoría',Icon:Layers3},
]
const fmt=(v:number)=>new Intl.NumberFormat('es-CL').format(v)
const getCategory=(id:KnowledgeCategory)=>categories.find(c=>c.id===id)||categories[7]

interface Props {
  character:Character
  characters:Character[]
  profiles:Profile[]
  knowledge:KnowledgeEntry[]
  isStaff:boolean
  canCreate:boolean
  busy:boolean
  onSelectCharacter:(id:string)=>void
  onPropose:(name:string,description:string,category:KnowledgeCategory)=>Promise<boolean>
  onReview:(id:string,approve:boolean,reason:string)=>Promise<boolean>
  onIncrease:(id:string)=>Promise<boolean>
}
export function KnowledgeView({character,characters,profiles,knowledge,isStaff,canCreate,busy,onSelectCharacter,onPropose,onReview,onIncrease}:Props){
  const [section,setSection]=useState<'bitacora'|'conocimientos'>('bitacora')
  const [createOpen,setCreateOpen]=useState(false)
  const createDialogRef=useRef<HTMLDivElement|null>(null)
  const busyRef=useRef(busy)
  busyRef.current=busy
  const [title,setTitle]=useState('')
  const [description,setDescription]=useState('')
  const [category,setCategory]=useState<KnowledgeCategory>('mundo')
  const [query,setQuery]=useState('')
  const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({})
  const [activeId,setActiveId]=useState<string|null>(null)
  useEffect(()=>{setQuery('');setCreateOpen(false)},[character.id])
  useEffect(()=>{
    if(!createOpen)return
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    // Focus the close button rather than the text input: opening must not raise
    // the mobile keyboard and obscure the form before the user starts writing.
    createDialogRef.current?.querySelector<HTMLButtonElement>('[data-knowledge-close]')?.focus({preventScroll:true})
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        if(!busyRef.current){event.preventDefault();setCreateOpen(false)}
        return
      }
      if(event.key!=='Tab')return
      const focusables=Array.from(createDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')??[])
      if(!focusables.length)return
      const first=focusables[0],last=focusables[focusables.length-1]
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
    window.addEventListener('keydown',onKey)
    return ()=>{window.removeEventListener('keydown',onKey);document.body.style.overflow=previousOverflow;previousFocus?.focus({preventScroll:true})}
  },[createOpen])
  const own=useMemo(()=>knowledge.filter(k=>k.character_id===character.id),[knowledge,character.id])
  const approved=own.filter(k=>k.status==='aprobado')
  const requests=own.filter(k=>k.status!=='aprobado')
  const pending=knowledge.filter(k=>k.status==='pendiente')
  const filtered=approved.filter(k=>`${k.title} ${k.description}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
  const groups=categories.map(c=>({category:c,entries:filtered.filter(k=>k.category===c.id)})).filter(x=>x.entries.length>0)
  const characterName=(id:string)=>{
    const c=characters.find(x=>x.id===id)
    const p=profiles.find(x=>x.id===c?.owner_id)
    return c?`${c.name} · ${p?.display_name||'Jugador'}`:'Personaje'
  }
  async function handlePropose(event:FormEvent){
    event.preventDefault()
    if(!title.trim()||!description.trim())return
    const success=await onPropose(title.trim(),description.trim(),category)
    if(success){setCreateOpen(false);setTitle('');setDescription('');setCategory('mundo')}
  }
  async function handleReview(id:string,approve:boolean){
    setActiveId(id)
    try {const ok=await onReview(id,approve,reviewNotes[id]||'');if(ok)setReviewNotes(x=>({...x,[id]:''}))}
    finally{setActiveId(null)}
  }
  async function handleIncrease(id:string){setActiveId(id);try{await onIncrease(id)}finally{setActiveId(null)}}
  return <div className="stack knowledge-module">
   <div className="journal-module-tabs" role="group" aria-label="Secciones de Conocimientos"><button type="button" className={section==='bitacora'?'active':''} onClick={()=>setSection('bitacora')}>Bitácora de aventura</button><button type="button" className={section==='conocimientos'?'active':''} onClick={()=>setSection('conocimientos')}>Conocimientos</button></div>
   {section==='bitacora'?<AdventureJournal character={character} profiles={profiles} characters={characters}/>:<div className="knowledge-original-content">
    <div className="page-heading knowledge-heading"><div><span className="overline">BITÁCORA PERSONAL</span><h1>Conocimientos</h1><p>Lo que tu personaje aprende sobre el mundo. Cada conocimiento tiene su propia experiencia.</p></div>
      {canCreate&&<button className="button button-primary" type="button" onClick={()=>setCreateOpen(true)}><Plus size={17}/> Nuevo conocimiento</button>}
    </div>
    <div className="knowledge-summary">
      <div><BookOpen size={22}/><span><b>{fmt(approved.length)}</b><small>Conocimientos adquiridos</small></span></div>
      <div><GraduationCap size={22}/><span><b>{fmt(approved.reduce((n,k)=>n+k.points,0))}</b><small>Puntos de conocimiento</small></span></div>
      <div><CircleHelp size={22}/><span><b>{fmt(own.filter(k=>k.status==='pendiente').length)}</b><small>Solicitudes pendientes</small></span></div>
    </div>
    <div className="knowledge-explain"><Sparkles size={18}/><span>Crear un conocimiento envía una solicitud al DM con <b>0 puntos</b>. Al aprobarlo, comienza con <b>1 punto</b>. Después puedes aumentarlo gratis de uno en uno. No modifica atributos, PC ni niveles.</span></div>
    {isStaff&&<details className="card admin-fold" open={pending.length>0} key={`knowledge-admin-${pending.length>0}`}>
      <summary className="admin-fold-title"><div><span className="overline">DUNGEON MASTER</span><h3>Solicitudes de conocimiento {pending.length>0&&<span className="admin-request-count">{pending.length}</span>}</h3></div><ChevronDown size={20}/></summary>
      <div className="admin-fold-body">
        {pending.length===0?<p className="empty">No hay conocimientos pendientes de aprobación.</p>:<div className="knowledge-request-list">{pending.map(k=>{
          const cat=getCategory(k.category)
          return <article className="knowledge-request-card" key={k.id}>
            <div className="knowledge-request-top"><div><span className="knowledge-category-label">{cat.label}</span><h4>{k.title}</h4><small>{characterName(k.character_id)}</small></div><span className="knowledge-tag pending">Pendiente · 0 puntos</span></div>
            <p>{k.description}</p>
            <label className="knowledge-review-note">Observación del DM (opcional)<input maxLength={500} placeholder="Motivo o comentario para el jugador" value={reviewNotes[k.id]||''} onChange={e=>setReviewNotes(s=>({...s,[k.id]:e.target.value}))}/></label>
            <div className="knowledge-actions"><button className="button button-outline" disabled={busy||activeId===k.id} type="button" onClick={()=>void handleReview(k.id,false)}><X size={15}/> Rechazar</button><button className="button button-primary" disabled={busy||activeId===k.id} type="button" onClick={()=>void handleReview(k.id,true)}><Check size={15}/> Aprobar y dar 1 punto</button></div>
          </article>
        })}</div>}
      </div>
    </details>}
    {isStaff&&<div className="card knowledge-staff-selector"><div><span className="overline">FICHA QUE ESTÁS VIENDO</span><h3>Conocimientos por personaje</h3></div><label>Seleccionar personaje<select value={character.id} onChange={e=>onSelectCharacter(e.target.value)}>{characters.map(c=><option key={c.id} value={c.id}>{characterName(c.id)}</option>)}</select></label></div>}
    <section className="knowledge-section"><div className="knowledge-section-head"><div><span className="overline">COLECCIÓN INDIVIDUAL</span><h2>Conocimientos de {character.name}</h2><p>{approved.length===0?'Todavía no tiene conocimientos aprobados.':'Abre una categoría y expande cualquier conocimiento para leer sus detalles.'}</p></div><label className="knowledge-search"><Search size={17}/><input type="search" placeholder="Buscar conocimiento…" aria-label="Buscar conocimientos" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
      {groups.length===0?<div className="card knowledge-empty"><BookOpen size={26}/><strong>{query?'Sin coincidencias':'Aún no hay conocimientos aprobados'}</strong><p>{query?'Prueba con otro término.':canCreate?'Crea el primero para solicitar su aprobación al DM.':'Los conocimientos se mostrarán aquí después de ser aprobados.'}</p>{canCreate&&!query&&<button className="button button-outline" onClick={()=>setCreateOpen(true)}><Plus size={16}/> Proponer un conocimiento</button>}</div>:
        <div className="knowledge-categories">{groups.map(({category:cat,entries})=>{
          const Icon=cat.Icon
          return <details className="card admin-fold knowledge-category-fold" key={cat.id} open={groups.length===1}>
            <summary className="admin-fold-title"><div className="knowledge-fold-label"><span className="knowledge-fold-icon"><Icon size={21}/></span><span><h3>{cat.label} <span className="knowledge-count">{entries.length}</span></h3><small>{cat.description}</small></span></div><ChevronDown size={20}/></summary>
            <div className="admin-fold-body knowledge-entries">{entries.map(entry=><details className="knowledge-entry" key={entry.id}>
              <summary className="knowledge-entry-top"><span><b>{entry.title}</b><small>Conocimiento personal</small></span><span className="knowledge-score">{fmt(entry.points)} <small>pts.</small></span><ChevronDown size={16}/></summary>
              <div className="knowledge-entry-body"><p>{entry.description}</p><div className="knowledge-entry-foot"><small>Adquirido: {new Date(entry.reviewed_at||entry.created_at).toLocaleDateString('es-CL')}</small>{canCreate&&<button className="button button-primary" type="button" disabled={busy||activeId===entry.id||entry.points>=2147483647} onClick={()=>void handleIncrease(entry.id)}><Plus size={17}/> {activeId===entry.id?'Sumando…':'+1 punto'}</button>}</div></div>
            </details>)}</div>
          </details>
        })}</div>}
    </section>
    {requests.length>0&&<details className="card admin-fold knowledge-personal-requests" open={requests.some(x=>x.status==='pendiente')}><summary className="admin-fold-title"><div><span className="overline">ESTADO DE SOLICITUDES</span><h3>Enviadas y rechazadas <span className="knowledge-count">{requests.length}</span></h3></div><ChevronDown size={20}/></summary>
      <div className="admin-fold-body knowledge-request-history">{requests.map(req=>{
        const cat=getCategory(req.category)
        return <div key={req.id} className="knowledge-history-row"><div><b>{req.title}</b><small>{cat.label} · {req.description}</small>{req.dm_note&&<p>Respuesta del DM: {req.dm_note}</p>}</div><span className={`knowledge-tag ${req.status==='pendiente'?'pending':'rejected'}`}>{req.status==='pendiente'?'Pendiente · 0 puntos':'Rechazado · 0 puntos'}</span></div>
      })}</div></details>}
    {createOpen&&<div className="modal-backdrop knowledge-modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setCreateOpen(false)}}>
      <div ref={createDialogRef} className="knowledge-modal" role="dialog" aria-modal="true" aria-labelledby="knowledge-modal-title" aria-describedby="knowledge-modal-summary">
        <div className="knowledge-modal-heading">
          <div className="knowledge-modal-emblem" aria-hidden="true"><BookOpen size={22}/></div>
          <div className="knowledge-modal-title"><span className="overline">PROPUESTA AL DUNGEON MASTER</span><h2 id="knowledge-modal-title">Nuevo conocimiento</h2><p id="knowledge-modal-summary">Registra lo que tu personaje ha descubierto.</p></div>
          <button data-knowledge-close className="knowledge-modal-close" type="button" aria-label="Cerrar ventana" disabled={busy} onClick={()=>setCreateOpen(false)}><X size={21}/></button>
        </div>
        <form className="knowledge-form" onSubmit={e=>void handlePropose(e)}>
          <div className="knowledge-form-fields">
            <div className="knowledge-form-field">
              <label htmlFor="knowledge-name">Nombre del conocimiento <span aria-hidden="true">*</span></label>
              <input id="knowledge-name" required minLength={2} maxLength={100} autoComplete="off" placeholder="Ej. Debilidad de los dragones de hielo" value={title} onChange={e=>setTitle(e.target.value)}/>
              <small>Un nombre breve para encontrarlo fácilmente.</small>
            </div>
            <div className="knowledge-form-field">
              <label htmlFor="knowledge-category">Categoría</label>
              <select id="knowledge-category" value={category} onChange={e=>setCategory(e.target.value as KnowledgeCategory)}>{categories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
              <small>{getCategory(category).description}</small>
            </div>
            <div className="knowledge-form-field">
              <div className="knowledge-field-heading"><label htmlFor="knowledge-description">Descripción <span aria-hidden="true">*</span></label><small>{description.length}/1500</small></div>
              <textarea id="knowledge-description" required rows={4} maxLength={1500} placeholder="¿Qué descubrió tu personaje? Escribe aquí lo que sabe…" value={description} onChange={e=>setDescription(e.target.value)}/>
            </div>
            <div className="knowledge-modal-note"><ShieldCheck size={19}/><span><b>El DM revisará tu propuesta.</b> Empieza en 0 puntos y, cuando se apruebe, tendrá 1 punto. Después podrás aumentarla libremente.</span></div>
          </div>
          <div className="knowledge-form-footer">
            <button className="skill-secondary" type="button" disabled={busy} onClick={()=>setCreateOpen(false)}>Cancelar</button>
            <button className="skill-primary" type="submit" disabled={busy||title.trim().length<2||!description.trim()}><BookOpen size={18}/>{busy?'Enviando…':'Enviar al DM'}</button>
          </div>
        </form>
      </div>
    </div>}
  </div>}
  </div>
}
