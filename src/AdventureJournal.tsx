import {useCallback,useEffect,useState,type FormEvent} from 'react'
import {BookOpen,Check,ChevronDown,Edit3,LockKeyhole,Plus,Search,Share2,Trash2,Users,X} from 'lucide-react'
import {supabase} from './lib/supabase'
import type {Character,Profile} from './types'

type Entry={id:string;owner_id:string;character_id:string;title:string;content:string;created_at:string;updated_at:string}
type Share={entry_id:string;recipient_id:string}
export function AdventureJournal({character,profiles}: {character:Character;profiles:Profile[];characters:Character[]}){
 const [uid,setUid]=useState<string|null>(null)
 const [entries,setEntries]=useState<Entry[]>([])
 const [shares,setShares]=useState<Share[]>([])
 const [recipients,setRecipients]=useState<Profile[]>([])
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [editing,setEditing]=useState<string|null>(null)
 const [title,setTitle]=useState('')
 const [content,setContent]=useState('')
 const [query,setQuery]=useState('')
 const [view,setView]=useState<'mias'|'compartidas'>('mias')
 const [shareEditing,setShareEditing]=useState<string|null>(null)
 const [showEditor,setShowEditor]=useState(false)
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try{
   const {data:auth,error:authError}=await supabase.auth.getUser();if(authError)throw authError
   const myId=auth.user?.id||null;setUid(myId)
   if(!myId){setEntries([]);setShares([]);setRecipients([]);return}
   const [notes,access,directory]=await Promise.all([
    supabase.from('adventure_journal').select('*').order('updated_at',{ascending:false}),
    supabase.from('adventure_journal_shares').select('entry_id,recipient_id'),
    supabase.rpc('journal_recipient_list')
   ])
   if(notes.error)throw notes.error;if(access.error)throw access.error;if(directory.error)throw directory.error
   setEntries((notes.data||[]) as Entry[]);setShares((access.data||[]) as Share[]);setRecipients((directory.data||[]) as Profile[])
  }catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la bitácora')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const mine=entries.filter(e=>e.owner_id===uid),shared=entries.filter(e=>e.owner_id!==uid)
 const filtered=(view==='mias'?mine:shared).filter(e=>`${e.title} ${e.content}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
 const isOwner=uid===character.owner_id
 function startNew(){setEditing(null);setTitle('');setContent('');setShowEditor(true)}
 function startEdit(e:Entry){setEditing(e.id);setTitle(e.title);setContent(e.content);setShowEditor(true)}
 async function save(event:FormEvent){event.preventDefault();if(!uid||!isOwner||busy)return
  setBusy(true);setError('')
  try{
   if(editing){const {error:err}=await supabase.from('adventure_journal').update({title:title.trim(),content,updated_at:new Date().toISOString()}).eq('id',editing).eq('owner_id',uid);if(err)throw err}
   else{const {error:err}=await supabase.from('adventure_journal').insert({owner_id:uid,character_id:character.id,title:title.trim(),content});if(err)throw err}
   setShowEditor(false);setEditing(null);await load()
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar')}
  finally{setBusy(false)}
 }
 async function remove(e:Entry){if(!uid||e.owner_id!==uid||!window.confirm(`¿Eliminar definitivamente «${e.title}»?`))return
  setBusy(true);try{const {error:err}=await supabase.from('adventure_journal').delete().eq('id',e.id).eq('owner_id',uid);if(err)throw err;await load()}
  catch(err){setError(err instanceof Error?err.message:'No se pudo eliminar')}
  finally{setBusy(false)}
 }
 async function toggleShare(entryId:string,personId:string,enabled:boolean){if(busy)return
  setBusy(true);setError('')
  try{
   const result=enabled?await supabase.from('adventure_journal_shares').insert({entry_id:entryId,recipient_id:personId}):await supabase.from('adventure_journal_shares').delete().eq('entry_id',entryId).eq('recipient_id',personId)
   if(result.error)throw result.error
   setShares(prev=>enabled?[...prev,{entry_id:entryId,recipient_id:personId}]:prev.filter(s=>s.entry_id!==entryId||s.recipient_id!==personId))
  }catch(e){setError(e instanceof Error?e.message:'No se pudo cambiar el acceso')}
  finally{setBusy(false)}
 }
 return <section className="journal-section" aria-label="Bitácora de aventura">
  <header className="journal-header"><div><span className="overline">SIN APROBACIÓN DEL DM</span><h2><BookOpen size={23}/> Bitácora de aventura</h2><p>Tus apuntes personales de la historia. Comparte cada entrada solo con quien tú elijas.</p></div>{isOwner&&<button type="button" className="button button-primary" onClick={startNew}><Plus size={17}/> Nueva anotación</button>}</header>
  <div className="journal-toolbar"><div className="journal-tabs"><button type="button" className={view==='mias'?'active':''} onClick={()=>setView('mias')}><LockKeyhole size={15}/> Mis notas ({mine.length})</button><button type="button" className={view==='compartidas'?'active':''} onClick={()=>setView('compartidas')}><Users size={15}/> Compartidas conmigo ({shared.length})</button></div><label className="journal-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar en la historia…"/></label></div>
  {error&&<p className="journal-error" role="alert">{error}</p>}
  {showEditor&&<form className="card journal-form" onSubmit={e=>void save(e)}><div className="card-header"><h3>{editing?'Editar anotación':'Nueva anotación'}</h3><button type="button" onClick={()=>setShowEditor(false)} aria-label="Cerrar"><X size={18}/></button></div><label>Título<input required minLength={2} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Sesión 4 — El bosque prohibido"/></label><label>Apuntes<textarea rows={9} maxLength={30000} value={content} onChange={e=>setContent(e.target.value)} placeholder="¿Qué dijo el DM? ¿Qué pistas encontramos? ¿Qué nombres, lugares o misiones no debo olvidar?"/></label><div className="journal-form-actions"><small>{content.length.toLocaleString('es-CL')} / 30.000 caracteres</small><button type="submit" className="button button-primary" disabled={busy||title.trim().length<2}><Check size={16}/> {busy?'Guardando…':'Guardar anotación'}</button></div></form>}
  {loading?<p className="hint">Cargando apuntes…</p>:filtered.length===0?<div className="card journal-empty"><BookOpen size={30}/><p>{view==='mias'?'Todavía no tienes apuntes. Comienza registrando la próxima sesión.':'Nadie ha compartido anotaciones contigo por ahora.'}</p></div>:<div className="journal-entries">{filtered.map(e=>{const owned=e.owner_id===uid;const entryShares=shares.filter(s=>s.entry_id===e.id);return <article className="card journal-entry" key={e.id}><header><div><small>{new Date(e.updated_at).toLocaleDateString('es-CL',{day:'2-digit',month:'short',year:'numeric'})} · {owned?'Privada por defecto':`De ${profiles.find(p=>p.id===e.owner_id)?.display_name||'otro aventurero'}`}</small><h3>{e.title}</h3></div>{owned&&<div className="journal-entry-actions"><button type="button" onClick={()=>startEdit(e)} title="Editar" aria-label={`Editar ${e.title}`}><Edit3 size={17}/></button><button type="button" onClick={()=>void remove(e)} title="Eliminar" aria-label={`Eliminar ${e.title}`}><Trash2 size={17}/></button></div>}</header><p className="journal-entry-content">{e.content||'Sin apuntes todavía.'}</p>{owned&&<details className="journal-sharing" open={shareEditing===e.id} onToggle={event=>setShareEditing(event.currentTarget.open?e.id:null)}><summary><Share2 size={16}/> Compartir esta anotación <span>{entryShares.length?`· ${entryShares.length} personas`:'· Solo tú'}</span><ChevronDown size={16}/></summary><p className="hint">Solo las personas seleccionadas pueden leer esta anotación. No pueden modificarla.</p>{recipients.map(p=><label key={p.id}><input type="checkbox" disabled={busy} checked={entryShares.some(s=>s.recipient_id===p.id)} onChange={event=>void toggleShare(e.id,p.id,event.target.checked)}/><span>{p.display_name} <small>· {p.role==='jugador'?'Jugador':'DM'}</small></span></label>)}</details>}</article>})}</div>}
 </section>
}
