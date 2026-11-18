import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  Activity, ArrowLeft, ArrowRight, Award, BookOpen, Check, ChevronDown, CircleAlert,
  ClipboardCheck, Crown, Dices, Heart, LayoutDashboard, LockKeyhole, Palette,
  LogOut, Menu, Package, Plus, ScrollText, Settings2, Shield, Search,
  ShieldCheck, Sparkles, Swords, TrendingUp, UserRound, Users, WandSparkles, X, Sword, Compass, Sun, Zap,
} from 'lucide-react'
import {FantasyIcon} from './lib/fantasyIcon'
import { configured, supabase } from './lib/supabase'
import { PlayView } from './PlayView'
import {CharacterSheet} from './CharacterSheet'
import { MoreView } from './MoreView'
import { DMBulkRewards } from './DMBulkRewards'
import {CompetenceView,campaignClasses} from './CompetenceView'
const SkillsView = lazy(() => import('./SkillsView').then(m => ({default:m.SkillsView})))
const MissionsView = lazy(() => import('./MissionsView').then(m => ({default:m.MissionsView})))
const InventoryView = lazy(() => import('./InventoryView').then(m => ({default:m.InventoryView})))
const DMInventoryView = lazy(() => import('./DMInventoryView').then(m => ({default:m.DMInventoryView})))
const AchievementsView = lazy(() => import('./AchievementsView').then(m => ({default:m.AchievementsView})))
const KnowledgeView = lazy(() => import('./KnowledgeView').then(m => ({default:m.KnowledgeView})))
const DMInboxView = lazy(() => import('./DMInboxView').then(m => ({default:m.DMInboxView})))
const formatMoney=(copper:number)=>{const gold=Math.floor(copper/100),silver=Math.floor((copper%100)/10),rest=copper%10;return `${new Intl.NumberFormat('es-CL').format(gold)} oro · ${new Intl.NumberFormat('es-CL').format(silver)} plata · ${new Intl.NumberFormat('es-CL').format(rest)} cobre`}

import type { CharacterSkillConfig } from './SkillsView'
import type { Activity as ActivityEvent, Attribute, AttributeCost, CampaignUnlock, Character, CharacterSkill, CharacterSkillAppearance, DMSkillProgress, SkillRequest, PersonalSkillProposal, PrivateActivity, Profile, Resource, Skill, SkillDraft, Tab, Threshold, Mission, MissionParticipant, MissionObjective, MissionJournalEntry, MissionCompletionRequest, MissionVisibility, ItemDefinition, ItemDraft, CharacterItem, CharacterWallet, EffectiveAttribute, MissionLoot, AchievementDefinition, AchievementDraft, CharacterAchievement, MissionAchievementReward, KnowledgeCategory, KnowledgeEntry, CharacterProficiency } from './types'

const nav: Array<{ tab: Tab; title: string; Icon: typeof Heart }> = [
  { tab: 'inicio', title: 'Mi personaje', Icon: LayoutDashboard },
  { tab: 'partida', title: 'Modo partida', Icon: Dices },
  { tab: 'atributos', title: 'Atributos', Icon: TrendingUp },
  { tab: 'habilidades', title: 'Habilidades', Icon: Swords },
  { tab: 'inventario', title: 'Inventario', Icon: Package },
  { tab: 'misiones', title: 'Misiones', Icon: ScrollText },
  { tab: 'titulos', title: 'Títulos y logros', Icon: Award },
  { tab: 'conocimientos', title: 'Conocimientos', Icon: BookOpen },
  { tab: 'mas', title: 'Más opciones', Icon: Menu },
]
const dmNav: Array<{ tab: Tab; title: string; Icon: typeof Heart }> = [
  {tab:'admin',title:'Panel DM',Icon:ShieldCheck},
  {tab:'inventario',title:'Catálogo y objetos',Icon:Package},
  {tab:'misiones',title:'Misiones',Icon:ScrollText},
  {tab:'bandeja',title:'Solicitudes',Icon:ClipboardCheck},
  {tab:'habilidades',title:'Habilidades',Icon:Swords},
  {tab:'titulos',title:'Logros y títulos',Icon:Award},
  {tab:'conocimientos',title:'Conocimientos',Icon:BookOpen},
  {tab:'mas',title:'Más herramientas',Icon:Menu},
]
type Theme = 'chaos' | 'solo' | 'cute' | 'chatgpt'
const themeOptions: {id: Theme; name: string; description: string}[] = [
  {id:'chaos', name:'Chaos medieval', description:'Oscuro y dorado'},
  {id:'solo', name:'Estilo Solo Leveling', description:'Negro y violeta neón'},
  {id:'cute', name:'Fantasía cute', description:'Lavanda, rosa y menta'},
  {id:'chatgpt', name:'Estilo ChatGPT', description:'Verde jade y gris · Creado con ayuda de ChatGPT'},
]
// Google se habilita solamente cuando el proveedor OAuth está listo en Supabase.
const googleAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true'
const validTheme = (val: string | null): Theme => (val === 'solo' || val === 'cute' || val === 'chaos' || val === 'chatgpt') ? val : 'chaos'
const portraitOptions = [
  {id:'guerrero', label:'Guerrero',Icon:Sword},
  {id:'mago', label:'Mago',Icon:WandSparkles},
  {id:'explorador', label:'Explorador',Icon:Compass},
  {id:'clerigo', label:'Clérigo',Icon:Sun},
  {id:'picaro', label:'Pícaro',Icon:Sparkles},
  {id:'guardian', label:'Guardián',Icon:Shield},
] as const
const formatNum = (n: number) => new Intl.NumberFormat('es-CL').format(n)
const errText = (e: unknown) => {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string') {
    const details = 'details' in e && typeof e.details === 'string' && e.details ? ` · ${e.details}` : ''
    return `${e.message}${details}`
  }
  return typeof e === 'string' ? e : 'Ocurrió un error. Intenta nuevamente.'
}
const readableAction = (a: string) => ({
  award: 'XP / PC asignados', campaign_reward_group:'Recompensa de campaña (XP / monedas)', resource_change: 'Recurso actualizado',
  attribute_upgrade: 'Atributo mejorado', resource_max_change: 'Máximo modificado',
  resource_created: 'Recurso creado', level_threshold_changed: 'Umbral de nivel modificado',
  attribute_cost_changed: 'Coste de atributo modificado',
  skill_created: 'Habilidad creada', skill_updated: 'Habilidad editada',
  skill_purchased: 'Habilidad aprendida', skill_upgraded: 'Habilidad mejorada',
  skill_used: 'Habilidad utilizada', skill_requested:'Habilidad solicitada', skill_assigned:'Habilidad asignada',
  skill_request_resolved:'Solicitud de habilidad resuelta', skill_pc_invested:'PC invertidos en habilidad',
  skill_character_modified:'Habilidad personalizada', skill_removed:'Habilidad retirada',
  skill_upgrade_requested:'Revisión de habilidad solicitada', skill_upgrade_approved:'Mejora de habilidad aprobada',
  skill_review_transformed:'Revisión resuelta por transformación', skill_access_changed:'Permisos de habilidad modificados',
  mission_created:'Misión creada', mission_assigned:'Misión asignada', mission_proposal_reviewed:'Propuesta de misión revisada',
  mission_updated:'Misión actualizada', mission_reward_configured:'Recompensa configurada',
  mission_objective_saved:'Objetivo añadido',mission_objective_removed:'Objetivo retirado',mission_objective_claimed:'Objetivo entregado',
  mission_objective_reviewed:'Objetivo revisado',mission_journal_entry:'Avance de misión registrado',
  mission_completion_requested:'Finalización solicitada',mission_completion_rejected:'Entrega rechazada',
  mission_reward_paid:'Recompensa de misión otorgada',mission_completed:'Misión completada',
  item_catalog_saved:'Objeto creado o modificado',item_granted:'Objeto entregado o retirado',
  item_equipped:'Objeto equipado',item_unequipped:'Objeto desequipado',item_consumed:'Objeto utilizado',
  money_changed:'Movimiento de monedas',mission_money_configured:'Dinero de misión configurado',mission_loot_configured:'Botín de misión configurado',
  campaign_resource_unlocked:'Recurso de campaña desbloqueado', character_dice_stats_set:'Valores de dados físicos configurados',
  knowledge_proposed:'Conocimiento propuesto',knowledge_reviewed:'Solicitud de conocimiento revisada',knowledge_increased:'Punto de conocimiento añadido',proficiency_chosen:'Atributo principal y competencias seleccionados',proficiency_skills_completed:'Dos habilidades completadas',proficiency_bonus_updated:'Bonificación de competencia modificada',class_primary_chosen:'Clase principal confirmada',second_class_chosen:'Segunda clase seleccionada',
  achievement_saved:'Logro creado o modificado',achievement_granted:'Logro asignado',achievement_removed:'Logro retirado',achievement_upgraded:'Logro mejorado',title_selected:'Título activo seleccionado',mission_achievement_configured:'Logro añadido como recompensa',
} as Record<string, string>)[a] || a

function levelFor(xp: number, levels: Threshold[]) {
  return [...levels].sort((a, b) => a.min_xp - b.min_xp).reduce((prev, t) => xp >= t.min_xp ? t.level : prev, 1)
}
function Button({ children, className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'outline'|'ghost' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>
}
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}
function Brand() {
  return <div className="brand"><span className="brand-mark"><Crown size={23} /></span><span><strong>CRÓNICAS</strong><small>RPG · CAMPAÑAS</small></span></div>
}

function ThemeSwitcher({ theme, setTheme, compact = false }: {theme: Theme;setTheme: (t: Theme) => void;compact?: boolean}) {
  const [open,setOpen]=useState(false)
  const active=themeOptions.find(o=>o.id===theme)!
  return <div className={`theme-control ${compact?'theme-control-compact':''}`}>
    <button className="theme-toggle" type="button" onClick={()=>setOpen(!open)} aria-label="Cambiar apariencia" title="Cambiar colores" aria-expanded={open}>
      <Palette size={18}/>{!compact&&<span>{active.name}</span>}<ChevronDown size={14}/>
    </button>
    {open&&<><button className="theme-popover-backdrop" aria-label="Cerrar selector de temas" onClick={()=>setOpen(false)}/><div className="theme-popover" role="group" aria-label="Selecciona un tema visual">
      <strong>Elige tu estilo</strong><p>Solo cambia la apariencia. Tus datos no se modifican.</p>
      {themeOptions.map(option=><button type="button" key={option.id} className={`theme-option ${theme===option.id?'selected':''}`} onClick={()=>{setTheme(option.id);setOpen(false)}}>
        <span className={`theme-swatches swatches-${option.id}`}><i/><i/><i/></span>
        <span className="theme-option-text"><b>{option.name}</b><small>{option.description}</small></span>
        {theme===option.id&&<Check size={17}/>}
      </button>)}
    </div></>}
  </div>
}

function AuthView({ onError, theme, setTheme }: { onError: (msg: string) => void; theme:Theme;setTheme:(t:Theme)=>void }) {
  const [mode, setMode] = useState<'login'|'register'|'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 1800)
    return () => window.clearTimeout(timeout)
  }, [notice])
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setNotice('')
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() || 'Aventurero' }, emailRedirectTo: window.location.origin } })
        if (error) throw error
        setNotice('Revisa tu correo para confirmar la cuenta, si la verificación está activada.')
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
        if (error) throw error
        setNotice('Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) { onError(errText(err)) } finally { setBusy(false) }
  }
  async function google() {
    if (!googleAuthEnabled) {
      setNotice('Google todavía no está habilitado. Regístrate con correo electrónico y contraseña.')
      setMode('register')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) { onError(error.message); setBusy(false) }
  }
  return <div className="auth-page"><div className="auth-theme"><ThemeSwitcher theme={theme} setTheme={setTheme}/></div>
    <div className="auth-art"><div className="auth-art-content"><Brand /><span className="overline">TU HISTORIA COMIENZA AQUÍ</span><h1>Forja tu destino.<br/><em>Escribe tu leyenda.</em></h1><p>Una ficha de personaje para toda tu aventura: recursos, atributos, experiencia y progreso sincronizados.</p><div className="ornament">✦ — ✦ — ✦</div></div></div>
    <div className="auth-panel"><div className="auth-mobile-brand"><Brand /></div><div className="auth-form-wrap"><span className="overline">BIENVENIDO, AVENTURERO</span><h2>{mode==='login'?'Entra a tu campaña':mode==='register'?'Crea tu cuenta':'Recupera tu acceso'}</h2><p className="muted">{mode==='login'?'Continúa la historia donde la dejaste.':mode==='register'?'Todos empiezan como jugadores. Los roles administrativos se asignan de forma segura.':'Te enviaremos un enlace de recuperación.'}</p>
      <form onSubmit={submit} className="auth-form">
        {mode==='register' && <label>Nombre visible<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre de aventurero"/></label>}
        <label>Correo electrónico<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@ejemplo.com" autoComplete="email"/></label>
        {mode!=='reset' && <label>Contraseña<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete={mode==='register'?'new-password':'current-password'}/></label>}
        <Button disabled={busy} type="submit">{busy?'Procesando…':mode==='login'?'Iniciar sesión':mode==='register'?'Crear cuenta':'Enviar enlace'} <ArrowRight size={17}/></Button>
      </form>
      {mode!=='reset' && <><div className="auth-divider"><span>o continúa con</span></div><Button variant="outline" className="google-btn" onClick={google} disabled={busy || !googleAuthEnabled} title={!googleAuthEnabled?'Google todavía no está configurado en Supabase':undefined}><span className="google-g">G</span> {googleAuthEnabled?'Iniciar sesión con Google':'Google · Próximamente'}</Button>{!googleAuthEnabled&&<p className="hint" role="status">El acceso con Google estará disponible después de configurarlo. Por ahora, utiliza el correo electrónico y tu contraseña.</p>}</>}
      {notice && <div className="notice notice-success"><Check size={18}/>{notice}</div>}
      <div className="auth-links">
        {mode==='login'?<><button onClick={()=>setMode('register')}>Crear una cuenta</button><button onClick={()=>setMode('reset')}>Olvidé mi contraseña</button></>:<button onClick={()=>setMode('login')}>← Volver al inicio de sesión</button>}
      </div>
    </div></div>
  </div>
}

function PasswordRecoveryView({ onDone, onError }: { onDone: () => void; onError: (msg: string) => void }) {
  const [password,setPassword]=useState('')
  const [busy,setBusy]=useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault();setBusy(true)
    const {error}=await supabase.auth.updateUser({password})
    setBusy(false)
    if(error){onError(error.message);return}
    onDone()
  }
  return <div className="setup-view"><Brand/><Card><div className="circle-icon"><LockKeyhole size={23}/></div><h2>Crear una nueva contraseña</h2><p className="muted">Elegiste recuperar tu cuenta. Ingresa la contraseña nueva.</p><form className="auth-form" onSubmit={submit} style={{marginTop:18}}><label>Nueva contraseña<input autoComplete="new-password" type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></label><Button type="submit" disabled={busy}>Guardar contraseña</Button></form></Card></div>
}

type CharacterDraft = {name:string;class_name:string;species:string;backstory:string;portrait_key:string}
function CharacterCreate({ onCreate, busy, onClose, first }: { onCreate: (draft: CharacterDraft) => Promise<boolean>; busy: boolean;onClose?:()=>void;first:boolean }) {
  const [name, setName] = useState(''); const [className, setClassName] = useState('')
  const [species, setSpecies] = useState('Humano'); const [backstory, setBackstory] = useState('')
  const [portrait, setPortrait] = useState('guerrero')
  const SelectedIcon = portraitOptions.find(x=>x.id===portrait)?.Icon || UserRound
  async function submit(e:FormEvent){e.preventDefault();const success=await onCreate({name, class_name:className, species, backstory, portrait_key:portrait}); if(success)onClose?.()}
  return <Card className="new-character">
    <div className="creator-title"><div className="circle-icon"><UserRound size={23}/></div>{onClose&&<button className="icon-close" type="button" onClick={onClose} aria-label="Cerrar"><X size={20}/></button>}</div>
    <span className="overline">PERSONAJES · NUEVA AVENTURA</span><h2>{first?'Crea tu primer personaje':'Nuevo personaje'}</h2>
    <p className="muted">Elige su identidad. El DM podrá ajustar sus estadísticas y recompensas.</p>
    <form onSubmit={submit}>
      <div className="creator-fields"><label>Nombre del personaje<input required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Kael el Errante"/></label>
      <div className="two-fields"><label>Especie<input required minLength={1} maxLength={60} value={species} onChange={e=>setSpecies(e.target.value)} placeholder="Ej. Elfo"/></label><label>Clase principal<select required value={className} onChange={e=>setClassName(e.target.value)}><option value="">Escoge una clase</option>{campaignClasses.map(c=><option key={c} value={c}>{c}</option>)}</select></label></div></div>
      <div className="portrait-pick"><span>Avatar inicial</span><div className="portrait-options">{portraitOptions.map(o=>{const Icon=o.Icon;return <button key={o.id} type="button" className={portrait===o.id?'selected':''} aria-pressed={portrait===o.id} onClick={()=>setPortrait(o.id)} title={o.label}><Icon size={21}/><small>{o.label}</small></button>})}</div><div className="portrait-preview"><SelectedIcon size={20}/> {name.trim()||'Tu aventurero'} · {species.trim()||'Especie'}</div></div>
      <label>Historia breve <span className="optional">(opcional)</span><textarea maxLength={1200} rows={3} value={backstory} onChange={e=>setBackstory(e.target.value)} placeholder="¿De dónde viene? ¿Cuál es su objetivo?"/></label>
      <div className="creator-info"><Sparkles size={17}/><span>Comienzas en nivel 1 con Vida 1/1, Maná 1/1 y los seis atributos en 1. El DM registrará los dados físicos; después podrás elegir tus competencias. La segunda clase es opcional desde nivel 4. NEM y Éter se desbloquean más adelante.</span></div>
      <Button type="submit" disabled={busy||name.trim().length<2||!species.trim()||!className.trim()}>{busy?'Creando…':'Crear personaje'} <ArrowRight size={17}/></Button>
    </form>
  </Card>
}

function Overview({ character, levels, resources, activity, busy, goTo, skills, learned, appearances, onUse, items, owned, effective, wallet, achievementDefinitions, characterAchievements,proficiency,attributes,onDie,onPortraitSaved,onError,editable }: { character: Character; levels: Threshold[]; resources: Resource[]; activity: ActivityEvent[]; onResource: (id: string, delta: number) => Promise<void>; busy: boolean; goTo: (tab: Tab) => void; skills: Skill[]; learned: CharacterSkill[]; appearances: CharacterSkillAppearance[]; onUse: (id:string)=>Promise<boolean>;items:ItemDefinition[];owned:CharacterItem[];effective:EffectiveAttribute[];wallet:CharacterWallet|null;achievementDefinitions:AchievementDefinition[];characterAchievements:CharacterAchievement[];proficiency:CharacterProficiency|null;attributes:Attribute[];onDie:(die:number)=>Promise<boolean>;onPortraitSaved:(path:string)=>Promise<void>;onError:(msg:string)=>void;editable:boolean }) {
  const [quickOpen,setQuickOpen]=useState(false)
  const [quickSearch,setQuickSearch]=useState('')
  const [usingId,setUsingId]=useState<string|null>(null)
  useEffect(()=>{setQuickOpen(false);setQuickSearch('')},[character.id])
  useEffect(()=>{
    if(!quickOpen)return
    const handle=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy)setQuickOpen(false)}
    window.addEventListener('keydown',handle);return ()=>window.removeEventListener('keydown',handle)
  },[quickOpen,busy])
  const activeSkills=useMemo(()=>learned.map(cs=>{
    const skill=skills.find(s=>s.id===cs.skill_id)
    if(!skill)return null
    const individual=appearances.find(x=>x.skill_id===skill.id)
    const cost=individual?.resource_cost??skill.resource_cost
    const resourceName=individual?.resource_name??skill.resource_name
    const enough=cost<=0||resources.some(r=>r.name.toLowerCase()===resourceName?.toLowerCase()&&r.current_value>=cost)
    return {skill,rank:cs.rank,name:individual?.name||skill.name,description:individual?.description??skill.description,cost,resourceName,enough}
  }).filter((x):x is NonNullable<typeof x>=>x!==null),[learned,skills,appearances,resources])
  const inventoryPassives=owned.flatMap(ci=>{
    const item=items.find(i=>i.id===ci.item_id)
    if(!item||!item.is_active||!item.passive_text||!(ci.equipped||(item.category==='clave'&&ci.quantity>0)))return []
    return [{name:item.name,description:item.passive_text,source:item.category==='clave'?'Objeto clave':'Equipo'}]
  })
  const skillPassives=activeSkills.filter(x=>x.skill.kind==='pasiva').map(x=>({name:x.name,description:x.description,source:'Habilidad'}))
  const achievementPassives=characterAchievements.flatMap(ca=>{
    const d=achievementDefinitions.find(x=>x.id===ca.achievement_id)
    if(!d||!d.is_active||!d.passive_text||(d.category==='titulo'&&!ca.active_title))return []
    return [{name:d.name,description:d.passive_text,source:d.category==='titulo'?'Título':'Logro'}]
  })
  const allPassives=[...skillPassives,...inventoryPassives,...achievementPassives]
  const equipmentBonuses=effective.filter(a=>a.equipment_bonus!==0||a.achievement_bonus!==0)
  const visibleSkills=activeSkills.filter(x=>x.name.toLocaleLowerCase('es').includes(quickSearch.trim().toLocaleLowerCase('es')))
  async function quickUse(id:string){setUsingId(id);try{const ok=await onUse(id);if(ok){setQuickOpen(false);setQuickSearch('')}}finally{setUsingId(null)}}
  const level=levelFor(character.xp,levels)
  const target=levels.find(t=>t.level===level+1)
  const xpCap=33750
  const goal=target?.min_xp??xpCap
  const levelCapped=level===20 && character.xp>=xpCap
  return <div className="stack"><div className="page-heading"><div><span className="overline">HOJA DE PERSONAJE</span><h1>{character.name}</h1><p>{character.species ? `${character.species} · ` : ''}{character.class_name}{proficiency?.secondary_class?` / ${proficiency.secondary_class}`:''} · Aventurero de nivel {level}</p></div><div className="level-medal level-medal-compact"><Crown size={20}/><div><small>NIVEL ACTUAL</small><strong>{level}</strong></div><div className="level-next"><small>{target?`PARA NIVEL ${level+1}`:'TOPE NIVEL 20'}</small><b>{levelCapped?'Completado':`${formatNum(Math.max(0,goal-character.xp))} XP`}</b><small>{levelCapped?'máximo alcanzado':'restantes'}</small></div></div></div>
    <CharacterSheet character={character} items={items} owned={owned} attributes={attributes} effective={effective} proficiency={proficiency} resources={resources} editable={editable} onDie={onDie} onPortraitSaved={onPortraitSaved} onError={onError} onCombat={()=>goTo('partida')} onInventory={()=>goTo('inventario')}/>
    <details className="card inv-home-fold" open={allPassives.length>0}><summary className="inv-home-heading"><span><Sparkles size={20}/><strong>Efectos pasivos y equipo</strong><small>{allPassives.length} pasivas · {equipmentBonuses.length} atributos afectados</small></span><ChevronDown size={20}/></summary><div className="inv-home-body">
      {allPassives.length===0?<p className="hint">Todavía no tienes efectos pasivos. Aparecerán aquí al equipar una armadura o arma con propiedades, conseguir un objeto clave especial o aprender una habilidad pasiva.</p>:<div className="inv-passives-list">{allPassives.map((p,i)=><div key={`${p.source}-${p.name}-${i}`}><span className="inv-passive-source">{p.source}</span><strong>{p.name}</strong><p>{p.description}</p></div>)}</div>}
      {equipmentBonuses.length>0&&<div className="inv-effect-bonuses"><b>Atributos con equipo</b><div>{equipmentBonuses.map(a=><span key={a.attribute_key}>{a.attribute_key}: <strong>{a.total_score}</strong> <small>({a.equipment_bonus>0?'+':''}{a.equipment_bonus} equipo · {a.achievement_bonus>0?'+':''}{a.achievement_bonus} logros)</small></span>)}</div></div>}
      <p className="hint">Monedas: {formatMoney(wallet?.copper||0)}. Los valores base no se alteran.</p>
      <button type="button" className="button button-outline" onClick={()=>goTo('inventario')}><Package size={17}/> Abrir inventario <ArrowRight size={15}/></button>
    </div></details>
    <div className="quick-grid"><button onClick={()=>goTo('atributos')}><TrendingUp size={20}/><span><b>Mejorar atributos</b><small>Invierte puntos de combate</small></span><ArrowRight size={16}/></button><button onClick={()=>setQuickOpen(true)}><Zap size={20}/><span><b>Usar habilidad</b><small>Acceso rápido durante la partida</small></span><ArrowRight size={16}/></button><button onClick={()=>goTo('habilidades')}><Swords size={20}/><span><b>Gestionar habilidades</b><small>Aprendizaje y uso</small></span><ArrowRight size={16}/></button><button onClick={()=>goTo('inventario')}><Package size={20}/><span><b>Inventario y equipo</b><small>Armas, armaduras, objetos y monedas</small></span><ArrowRight size={16}/></button><button onClick={()=>goTo('misiones')}><ScrollText size={20}/><span><b>Misiones y bitácora</b><small>Objetivos y entregas al DM</small></span><ArrowRight size={16}/></button><button onClick={()=>goTo('titulos')}><Award size={20}/><span><b>Títulos y logros</b><small>Conquistas, pasivas y mejoras</small></span><ArrowRight size={16}/></button><button onClick={()=>goTo('conocimientos')}><BookOpen size={20}/><span><b>Conocimientos</b><small>Descubrimientos y experiencias personales</small></span><ArrowRight size={16}/></button></div>
    {quickOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setQuickOpen(false)}}><section className="card quick-skills-modal" role="dialog" aria-modal="true" aria-labelledby="quick-skills-title">
      <div className="card-header"><div><span className="overline">DURANTE LA PARTIDA</span><h3 id="quick-skills-title">Usar mis habilidades</h3><p className="muted quick-modal-note">Selecciona una habilidad para consumir su recurso y regresar a la partida.</p></div><button className="skill-icon-button" type="button" aria-label="Cerrar habilidades" disabled={busy} onClick={()=>setQuickOpen(false)}><X size={19}/></button></div>
      <label className="quick-skill-search"><Search size={18}/><input aria-label="Buscar habilidades de mi personaje" value={quickSearch} onChange={e=>setQuickSearch(e.target.value)} placeholder="Buscar habilidades…" autoFocus/></label>
      <div className="quick-skill-list">{visibleSkills.length===0?<p className="empty">{activeSkills.length===0?'Aún no tienes habilidades asignadas. Pídeselas al DM.':'No se encontraron habilidades.'}</p>:visibleSkills.map(({skill,name,description,cost,resourceName,enough})=><article key={skill.id} className="quick-skill-row"><div className="quick-skill-icon"><FantasyIcon name={name} description={description} category={skill.kind} size={20}/></div><div className="quick-skill-detail"><b>{name}</b><p>{description||'Sin descripción'}</p><small>{skill.kind==='pasiva'?'Efecto pasivo':cost>0?`${cost} ${resourceName} por uso`:'Sin consumo'}</small></div>{skill.kind==='activa'?<button type="button" className="skill-primary" disabled={busy||!skill.is_active||!skill.is_usable||!enough} onClick={()=>void quickUse(skill.id)}>{usingId===skill.id?'Usando…':!enough?'Sin recurso':'Usar'}</button>:<span className="quick-passive-tag">Pasiva</span>}</article>)}</div>
      <div className="quick-skill-footer"><button type="button" className="skill-secondary" onClick={()=>{setQuickOpen(false);goTo('habilidades')}}>Ver todas las habilidades <ArrowRight size={15}/></button><button type="button" className="skill-secondary" onClick={()=>setQuickOpen(false)}>Volver a la partida</button></div>
    </section></div>}
    <Card><div className="card-header"><div><span className="overline">HISTORIAL</span><h3>Últimos movimientos visibles</h3></div><Activity size={19} className="muted"/></div>{activity.length===0?<p className="empty">Todavía no hay movimientos visibles para este personaje.</p>:<div className="activity-list">{activity.slice(0,6).map(a=><div key={a.id} className="activity-row"><span className="activity-dot"/><div><strong>{readableAction(a.action)}</strong><small>{new Date(a.created_at).toLocaleString('es-CL')}</small></div></div>)}</div>}</Card>
  </div>
}

function AttributesView({ character, attributes, costs, effective, onUpgrade, busy,proficiency,levels,statsReady,onChoose,onComplete,onPrimaryClass,onSecondaryClass }: { character: Character; attributes: Attribute[]; costs: AttributeCost[]; effective:EffectiveAttribute[]; onUpgrade: (key: string) => Promise<void>; busy: boolean; proficiency:CharacterProficiency|null;levels:Threshold[];statsReady:boolean;onChoose:(attr:string,skills:string[])=>Promise<boolean>;onComplete:(skills:string[])=>Promise<boolean>;onPrimaryClass:(name:string)=>Promise<boolean>;onSecondaryClass:(name:string)=>Promise<boolean> }) {
  return <div className="stack"><div className="skill-warning-banner"><LockKeyhole size={20}/><strong>UNA VEZ QUE TOMAS UNA DECISIÓN, NO TE PUEDES ARREPENTIR.</strong><span>Los PC invertidos en atributos no se pueden retirar ni recuperar.</span></div>
    <div className="page-heading"><div><span className="overline">PROGRESIÓN</span><h1>Atributos</h1><p>Dos avances internos elevan un punto del atributo.</p></div><div className="pc-pill"><Sparkles size={18}/> {formatNum(character.pc)} PC</div></div>
    <div className="attribute-grid">{attributes.map(a=>{ const cost=costs.find(c=>c.attribute_key===a.attribute_key)?.cost_pc||0;return <Card key={a.attribute_key} className="attribute-card"><span>{a.attribute_key}</span><strong>{effective.find(x=>x.attribute_key===a.attribute_key)?.total_score??a.base_score}</strong>{((effective.find(x=>x.attribute_key===a.attribute_key)?.equipment_bonus||0)!==0||(effective.find(x=>x.attribute_key===a.attribute_key)?.achievement_bonus||0)!==0)&&<div className="inv-attribute-effect"><b>Base {a.base_score}</b><small>{(effective.find(x=>x.attribute_key===a.attribute_key)?.equipment_bonus||0)>0?'+':''}{effective.find(x=>x.attribute_key===a.attribute_key)?.equipment_bonus||0} equipo · {(effective.find(x=>x.attribute_key===a.attribute_key)?.achievement_bonus||0)>0?'+':''}{effective.find(x=>x.attribute_key===a.attribute_key)?.achievement_bonus||0} logros</small></div>}<div className="progress-pips"><i className={a.progress>0?'filled':''}/><i className={a.progress>1?'filled':''}/></div><small>Progreso {a.progress}/2 · {cost} PC por avance</small><Button variant="outline" disabled={busy||cost===0||character.pc<cost} onClick={()=>void onUpgrade(a.attribute_key)}><Plus size={16}/> Mejorar</Button></Card> })}</div>
    <CompetenceView character={character} proficiency={proficiency} attributes={attributes} effective={effective} levels={levels} statsReady={statsReady} busy={busy} onChoose={onChoose} onComplete={onComplete} onPrimaryClass={onPrimaryClass} onSecondaryClass={onSecondaryClass}/><div className="info-strip"><ShieldCheck size={20}/><p>Los costes son fijos y los establece el Dungeon Master. Las mejoras consumen PC y se registran automáticamente.</p></div>
  </div>
}

function Placeholder({ tab }: { tab: Tab }) {
  const meta: Record<string,{Icon:typeof Heart;title:string;desc:string;features:string[]}>={
    habilidades:{Icon:Swords,title:'Habilidades',desc:'Habilidades otorgadas por el DM, con consumo y efectos.',features:['Fichas y descripción de habilidades','Aprendizaje con aprobación del DM','Consumo de recursos durante la partida']},
    inventario:{Icon:Package,title:'Inventario',desc:'Objetos ilimitados, equipamiento configurable y monedas.',features:['Objetos normales y especiales','Equipar y utilizar consumibles','Oro, plata y cobre con conversiones']},
    misiones:{Icon:ScrollText,title:'Misiones',desc:'Misiones individuales y grupales con seguimiento y validación del DM.',features:['Objetivos y bitácora','Propuestas de jugadores','Recompensas individuales y grupales']},
    titulos:{Icon:Award,title:'Títulos y logros',desc:'Títulos pasivos siempre activos y un único título activo por personaje.',features:['Bonificaciones de títulos','Progresión configurable','Logros manuales y automáticos']},
    conocimientos:{Icon:BookOpen,title:'Conocimientos',desc:'Descubrimientos y conocimientos individuales, aprobados por el DM.',features:['Crear propuestas','Revisión del DM','Sumar un punto a la vez']},
  }
  const item=meta[tab]; if(!item)return null
  const Icon=item.Icon
  return <div className="stack"><div className="page-heading"><div><span className="overline">CRÓNICAS RPG</span><h1>{item.title}</h1><p>{item.desc}</p></div></div><Card className="coming-soon"><div className="big-icon"><Icon size={35}/></div><span className="overline">SIGUIENTE ETAPA</span><h2>Módulo preparado para construir</h2><p className="muted">La estructura y las reglas están definidas. Este módulo aún no guarda datos; lo añadiremos sin afectar a los personajes existentes.</p><div className="feature-list">{item.features.map(f=><span key={f}><Check size={16}/>{f}</span>)}</div></Card></div>
}

const diceStatNames = ['Fuerza','Destreza','Constitución','Inteligencia','Sabiduría','Carisma'] as const

function AdminView({ characters, profiles, selectedCharacter, levels, costs, resources, attributes, proficiency, onSetProficiencyBonus, campaignUnlocks, privateAudit, onSaveDiceStats, onUnlockResource, skillRequests, skills, onResolveRequest, onOpenSkills, onOpenMissions, onOpenInventory, onOpenAchievements, onOpenKnowledge, onOpenInbox, knowledgePendingCount, missionPendingCount, onAward, onAwardBulk, onCost, onThreshold, onMax, onNewResource, busy, role,onSelectCharacter }: {
  characters: Character[]; profiles: Profile[]; selectedCharacter: Character|null; levels: Threshold[]; costs: AttributeCost[]; resources: Resource[]; attributes: Attribute[]; proficiency:CharacterProficiency|null;onSetProficiencyBonus:(bonus:number)=>Promise<boolean>; campaignUnlocks: CampaignUnlock[]; privateAudit: PrivateActivity[];
  onSaveDiceStats:(values: Record<string, number>)=>Promise<void>; onUnlockResource:(name:string)=>Promise<void>;
  skillRequests:SkillRequest[]; skills:Skill[]; onResolveRequest:(requestId:string,approve:boolean)=>Promise<void>;onCompleteReview:(requestId:string)=>Promise<void>;onOpenSkills:()=>void;onOpenMissions:()=>void;onOpenInventory:()=>void;onOpenAchievements:()=>void;onOpenKnowledge:()=>void;onOpenInbox:()=>void;knowledgePendingCount:number;missionPendingCount:number;
  onAward:(xp:number,pc:number,reason:string)=>Promise<void>; onAwardBulk:(ids:string[],reward:{xp:number;pc:number;gold:number;silver:number;copper:number},reason:string)=>Promise<boolean>; onCost:(a:string,c:number)=>Promise<void>;
  onThreshold:(lvl:number,xp:number)=>Promise<void>; onMax:(id:string,max:number)=>Promise<void>;
  onNewResource:(name:string,max:number,current:number)=>Promise<void>; busy:boolean; role:Profile['role'];
  onSelectCharacter:(id:string)=>void
}) {
  const [xp,setXp]=useState('200');const [pc,setPc]=useState('0');const [reason,setReason]=useState('Recompensa de partida')
  const [editedCosts,setEditedCosts]=useState<Record<string,string>>({});const [editedLevels,setEditedLevels]=useState<Record<number,string>>({})
  const [nextXP,setNextXP]=useState(''); const [newName,setNewName]=useState(''); const [newMax,setNewMax]=useState('100')
  const [maxDraft,setMaxDraft]=useState<Record<string,string>>({})
  const [diceDraft,setDiceDraft]=useState<Record<string,string>>({})
  const [proficiencyDraft,setProficiencyDraft]=useState('1')
  useEffect(()=>setProficiencyDraft(String(proficiency?.proficiency_bonus??1)),[selectedCharacter?.id,proficiency?.proficiency_bonus])
  useEffect(()=>{
    if(!selectedCharacter){setDiceDraft({});return}
    const next:Record<string,string>={}
    for(const r of resources)if(r.character_id===selectedCharacter.id&&(r.name==='Vida'||r.name==='Maná'))next[r.name]=String(r.max_value)
    for(const a of attributes)if(a.character_id===selectedCharacter.id)next[a.attribute_key]=String(a.base_score)
    setDiceDraft(next)
  },[selectedCharacter?.id,resources,attributes])
  const diceFields = ['Vida','Maná',...diceStatNames]
  const diceReady = !!selectedCharacter && resources.filter(r=>r.character_id===selectedCharacter.id&&['Vida','Maná'].includes(r.name)).length===2 && attributes.filter(a=>a.character_id===selectedCharacter.id).length===6
  const diceValid = diceReady && diceFields.every(name=>{const value=diceDraft[name];const base=name!=='Vida'&&name!=='Maná';return value!==undefined&&(base?/^-?\d+$/:/^\d+$/).test(value)&&Number.isSafeInteger(Number(value))&&Number(value)>=(base?-10000000:1)&&Number(value)<=10000000})
  const selectedOwner=profiles.find(p=>p.id===selectedCharacter?.owner_id)
  const pending=skillRequests.filter(r=>r.status==='pendiente'&&r.request_type==='aprender')
  const labelFor=(id:string)=>{
    const character=characters.find(c=>c.id===id)
    const owner=profiles.find(p=>p.id===character?.owner_id)
    return character?`${character.name} · ${owner?.display_name||'Jugador'}`:'Personaje'
  }
  const requestName=(id:string)=>skills.find(x=>x.id===id)?.name||'Habilidad'
  return <div className="stack"><div className="page-heading"><div><span className="overline">ADMINISTRACIÓN</span><h1>{role==='adminInformatico'?'Panel informático':'Dungeon Master'}</h1><p>Gestión de personajes y reglas de progresión.</p></div><div className="admin-shield"><ShieldCheck size={23}/></div></div>
    <Card className="admin-character-picker"><div className="card-header"><div><span className="overline">PERSONAJE SELECCIONADO</span><h3>¿A quién estás administrando?</h3></div><UserRound size={20}/></div><label>Jugador / personaje<select value={selectedCharacter?.id||''} onChange={e=>onSelectCharacter(e.target.value)}>{characters.map(c=><option key={c.id} value={c.id}>{c.name} · {profiles.find(p=>p.id===c.owner_id)?.display_name||'Jugador'}</option>)}</select></label><p className="hint">Selecciona otro personaje para asignar recompensas, modificar recursos o administrar sus habilidades.</p></Card>
    <button type="button" className="admin-inbox-shortcut" onClick={onOpenInbox}><span><ClipboardCheck size={22}/><b>Bandeja de solicitudes</b><small>Habilidades, misiones y conocimientos en un solo lugar</small></span><span className="admin-inbox-pill">Abrir bandeja <ArrowRight size={17}/></span></button>
    <div className="admin-metrics"><div><Users size={19}/><strong>{characters.length}</strong><span>Personajes</span></div><div><Crown size={19}/><strong>{levels.length}</strong><span>Niveles configurados</span></div><div><Settings2 size={19}/><strong>6</strong><span>Atributos</span></div></div>
    <DMBulkRewards characters={characters} profiles={profiles} busy={busy} onDistribute={onAwardBulk}/>
    <details className="card admin-fold"><summary className="admin-fold-title"><div><span className="overline">REGLAS DE COMPETENCIA</span><h3>Bonificación de competencia por personaje</h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body">{selectedCharacter?<><p className="hint">Solo el DM puede cambiar este valor. Las habilidades seleccionadas se recalculan automáticamente y la elección principal del jugador permanece bloqueada.</p><div className="selected-character"><b>{selectedCharacter.name}</b><small>{proficiency?.primary_attribute?`Atributo principal: ${proficiency.primary_attribute}`:'Atributo principal aún sin elegir'} · Competencia actual: +{proficiency?.proficiency_bonus??1}</small></div><form className="admin-form" onSubmit={e=>{e.preventDefault();void onSetProficiencyBonus(Number(proficiencyDraft))}}><div className="campaign-inline-form"><label>Bonificación de competencia<input type="number" min={1} max={100} step={1} value={proficiencyDraft} onChange={e=>setProficiencyDraft(e.target.value)} /></label><Button type="submit" disabled={busy||!/^\d+$/.test(proficiencyDraft)||Number(proficiencyDraft)<1||Number(proficiencyDraft)>100||Number(proficiencyDraft)===(proficiency?.proficiency_bonus??1)}><Check size={17}/> Guardar</Button></div></form></>:<p className="hint">Selecciona un personaje de jugador para configurar su competencia.</p>}</div></details>
    <details className="card admin-fold" open>
      <summary className="admin-fold-title"><div><span className="overline">INICIO DE CAMPAÑA · DADOS FÍSICOS</span><h3>Registrar valores del personaje</h3></div><ChevronDown size={20}/></summary>
      <div className="admin-fold-body">
        {selectedCharacter?<>
          <p className="hint">Escribe los resultados de los dados de <b>{selectedCharacter.name}</b> y guarda todo de una vez. Vida y Maná deben ser al menos 1; los demás atributos pueden ser negativos (por ejemplo, −20 Sabiduría). No se gastan PC.</p>
          <form className="admin-form" onSubmit={e=>{e.preventDefault();if(diceValid)void onSaveDiceStats(Object.fromEntries(diceFields.map(k=>[k,Number(diceDraft[k])])))}}>
            <span className="overline">RECURSOS INICIALES</span>
            <div className="dice-setup-grid">{['Vida','Maná'].map(name=><label key={name}>{name}<input type="number" inputMode="numeric" min={1} max={10000000} step={1} required aria-label={`Puntos iniciales de ${name}`} value={diceDraft[name]??''} onChange={e=>setDiceDraft(prev=>({...prev,[name]:e.target.value}))}/></label>)}</div>
            <span className="overline">ATRIBUTOS BASE</span>
            <div className="dice-setup-grid">{diceStatNames.map(name=><label key={name}>{name}<input type="number" inputMode="numeric" min={-10000000} max={10000000} step={1} required aria-label={`Valor inicial de ${name}`} value={diceDraft[name]??''} onChange={e=>setDiceDraft(prev=>({...prev,[name]:e.target.value}))}/></label>)}</div>
            <Button type="submit" disabled={busy||!diceValid}><Check size={17}/> Guardar resultados de los dados</Button>
            <p className="hint">Este formulario actualiza valores base, no bonificaciones del equipo ni logros. Puedes corregir los números más adelante.</p>
          </form>
        </>:<p className="hint">Cuando se cree el primer personaje podrás introducir aquí sus resultados.</p>}
      </div>
    </details>
    <details className="card admin-fold"><summary className="admin-fold-title"><div><span className="overline">DESBLOQUEOS GLOBALES</span><h3>NEM y Éter · para toda la campaña</h3></div><ChevronDown size={20}/></summary>
      <div className="admin-fold-body"><p className="hint">Actualmente los personajes comienzan solo con Vida y Maná. Cuando la historia lo indique, podrás activar NEM o Éter para todos los personajes existentes y los nuevos. Cada recurso aparecerá inicialmente con 1/1. El desbloqueo es permanente.</p>
        <div className="dice-unlock-list">{(['NEM','Éter'] as const).map(name=>{const unlocked=campaignUnlocks.find(r=>r.resource_name===name)?.unlocked===true;return <div className="dice-unlock-row" key={name}><div><strong>{name}</strong><small>{unlocked?'Desbloqueado para toda la campaña':'Bloqueado · no aparece en personajes'}</small></div><Button variant={unlocked?'outline':'primary'} type="button" disabled={busy||unlocked} onClick={()=>{if(window.confirm(`¿Desbloquear ${name} para todos los personajes? No se puede revertir.`))void onUnlockResource(name)}}>{unlocked?<><Check size={16}/> Activo</>:<><LockKeyhole size={16}/> Desbloquear</>}</Button></div>})}</div>
      </div>
    </details>
    <details className="card admin-fold" open={pending.length>0} key={`pending-${pending.length>0}`}>
      <summary className="admin-fold-title"><div><span className="overline">HABILIDADES · SOLICITUDES</span><h3>Solicitudes pendientes <span className="admin-request-count">{pending.length}</span></h3></div><ChevronDown size={20}/></summary>
      <div className="admin-fold-body">
        <p className="hint">APRENDER solicita una habilidad nueva. El DM decide si la asigna.</p>
        {pending.length===0?<div className="admin-empty-requests"><BookOpen size={23}/><div><strong>No hay solicitudes pendientes.</strong><p>Las solicitudes de aprendizaje llegan desde el Catálogo. Las habilidades no suben de rango ni requieren entrenamiento.</p></div></div>
        :<div className="skill-requests-list">{pending.map(req=><div className="skill-request-row" key={req.id}>
          <div><div className="request-title"><span className={`request-kind ${'request-learning'}`}>{'APRENDER'}</span><b>{requestName(req.skill_id)}</b></div><small>{labelFor(req.character_id)}</small></div>
          <div className="skill-request-actions">
            <button type="button" className="skill-secondary" onClick={()=>{onSelectCharacter(req.character_id);onOpenSkills()}}>Ver ficha</button>
            <button type="button" className="skill-secondary" disabled={busy} onClick={()=>void onResolveRequest(req.id,false)}>Rechazar</button>
            <button type="button" className="skill-primary" disabled={busy} onClick={()=>void onResolveRequest(req.id,true)}><Check size={15}/> Asignar habilidad</button>
</div>
        </div>)}</div>}
        <button type="button" className="skill-secondary" onClick={onOpenSkills}><Swords size={17}/> Administrar habilidades del personaje</button>
      </div>
    </details>
    <details className="card admin-fold" open={missionPendingCount>0} key={`mission-pending-${missionPendingCount>0}`}><summary className="admin-fold-title"><div><span className="overline">GESTIÓN DE CAMPAÑA</span><h3>Misiones y recompensas {missionPendingCount>0&&<span className="admin-request-count">{missionPendingCount}</span>}</h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body"><p className="hint">Asigna misiones a varios personajes, valida sus objetivos y cierra aventuras con recompensas individuales desde el módulo de Misiones.</p><button type="button" className="button button-outline" onClick={onOpenMissions}><ScrollText size={17}/> Abrir gestión de misiones <ArrowRight size={16}/></button></div></details>
    <details className="card admin-fold"><summary className="admin-fold-title"><div><span className="overline">LOGROS Y TÍTULOS</span><h3>Reconocimientos y mejoras</h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body"><p className="hint">Crea logros y títulos, entrega a varios jugadores, configura PC para mejorarlos, bonificaciones y habilidades especiales.</p><button type="button" className="button button-outline" onClick={onOpenAchievements}><Award size={17}/> Gestionar logros y títulos <ArrowRight size={16}/></button></div></details>
    <details className="card admin-fold"><summary className="admin-fold-title"><div><span className="overline">OBJETOS Y ECONOMÍA</span><h3>Inventario y monedas de personajes</h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body"><p className="hint">Crea armas, armaduras, objetos y reliquias. Equipa, retira, modifica atributos y entrega monedas al personaje seleccionado.</p><button className="button button-outline" type="button" onClick={onOpenInventory}><Package size={17}/> Abrir inventario del personaje <ArrowRight size={16}/></button></div></details>
    <details className="card admin-fold" open={knowledgePendingCount>0} key={`knowledge-count-${knowledgePendingCount>0}`}><summary className="admin-fold-title"><div><span className="overline">CONOCIMIENTOS DEL MUNDO</span><h3>Solicitudes de conocimiento {knowledgePendingCount>0&&<span className="admin-request-count">{knowledgePendingCount}</span>}</h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body"><p className="hint">Revisa los descubrimientos escritos por los jugadores. Al aprobar una propuesta, empieza inmediatamente con 1 punto y el jugador podrá continuar aumentándolo por su cuenta, sin gastar PC.</p><button type="button" className="button button-outline" onClick={onOpenKnowledge}><BookOpen size={17}/> Revisar conocimientos <ArrowRight size={16}/></button></div></details>
    <details className="card admin-fold" open><summary className="admin-fold-title"><div><span className="overline">AJUSTES INDIVIDUALES</span><h3>Corregir XP y PC de un personaje</h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body">{selectedCharacter?<><div className="selected-character"><b>{selectedCharacter.name}</b><small>{selectedOwner?.display_name||'Jugador'} · XP: {formatNum(selectedCharacter.xp)} · PC: {formatNum(selectedCharacter.pc)}</small></div><form className="admin-form" onSubmit={e=>{e.preventDefault();void onAward(Number(xp),Number(pc),reason)}}><div className="two-fields"><label>Variación de XP<input type="number" value={xp} onChange={e=>setXp(e.target.value)}/></label><label>Variación de PC<input type="number" value={pc} onChange={e=>setPc(e.target.value)}/></label></div><label>Motivo<input maxLength={240} value={reason} onChange={e=>setReason(e.target.value)}/></label><Button type="submit" disabled={busy||(!Number(xp)&&!Number(pc))||!Number.isSafeInteger(Number(xp))||!Number.isSafeInteger(Number(pc))}>Aplicar al personaje <ArrowRight size={17}/></Button><p className="hint">Puedes utilizar valores negativos para realizar correcciones sin generar saldos negativos. El nivel se calcula automáticamente.</p></form></>:<p className="empty">Selecciona un personaje en el selector de arriba.</p>}</div></details>
    <details className="card admin-fold"><summary className="admin-fold-title"><div><span className="overline">CONFIGURACIÓN</span><h3>Costes fijos de atributos</h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body"><div className="admin-edit-list">{costs.map(c=><div key={c.attribute_key}><b>{c.attribute_key}</b><div><input aria-label={`Coste ${c.attribute_key}`} type="number" min={1} value={editedCosts[c.attribute_key]??String(c.cost_pc)} onChange={e=>setEditedCosts(o=>({...o,[c.attribute_key]:e.target.value}))}/><span>PC</span><Button variant="outline" disabled={busy||!Number.isInteger(Number(editedCosts[c.attribute_key]??c.cost_pc))||Number(editedCosts[c.attribute_key]??c.cost_pc)<1} onClick={()=>void onCost(c.attribute_key,Number(editedCosts[c.attribute_key]??c.cost_pc))}>Guardar</Button></div></div>)}</div></div></details>
    <details className="card admin-fold"><summary className="admin-fold-title"><div><span className="overline">NIVELES</span><h3>Umbrales de experiencia</h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body"><div className="admin-edit-list">{levels.map(t=><div key={t.level}><b>Nivel {t.level}</b><div><input aria-label={`XP nivel ${t.level}`} type="number" min={0} disabled={t.level===1} value={editedLevels[t.level]??String(t.min_xp)} onChange={e=>setEditedLevels(o=>({...o,[t.level]:e.target.value}))}/><span>XP</span><Button variant="outline" disabled={busy||t.level===1||!Number.isInteger(Number(editedLevels[t.level]??t.min_xp))} onClick={()=>void onThreshold(t.level,Number(editedLevels[t.level]??t.min_xp))}>Guardar</Button></div></div>)}</div>{levels.length<20&&<form className="inline-add" onSubmit={e=>{e.preventDefault();void onThreshold(Math.max(...levels.map(l=>l.level),0)+1,Number(nextXP))}}><input aria-label="XP para próximo nivel" type="number" min={1} max={33749} required value={nextXP} onChange={e=>setNextXP(e.target.value)} placeholder={`XP para nivel ${levels.length+1}`}/><Button variant="outline" type="submit" disabled={busy||!nextXP}><Plus size={17}/> Añadir nivel</Button></form>}<p className="hint">20 niveles para todos. Nivel 1: 0 XP; nivel 20: 29.750 XP. Tope de experiencia: 33.750 XP.</p></div></details>
    {selectedCharacter&&<details className="card admin-fold"><summary className="admin-fold-title"><div><span className="overline">RECURSOS DEL PERSONAJE</span><h3>Máximos y recursos nuevos</h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body"><div className="admin-edit-list">{resources.map(r=><div key={r.id}><b>{r.name} <small>actual {r.current_value}</small></b><div><input aria-label={`Máximo ${r.name}`} type="number" min={1} value={maxDraft[r.id]??String(r.max_value)} onChange={e=>setMaxDraft(o=>({...o,[r.id]:e.target.value}))}/><span>máx.</span><Button variant="outline" disabled={busy} onClick={()=>void onMax(r.id,Number(maxDraft[r.id]??r.max_value))}>Guardar</Button></div></div>)}</div><form className="inline-add resource-add" onSubmit={e=>{e.preventDefault();void onNewResource(newName,Number(newMax),0);setNewName('')}}><input value={newName} onChange={e=>setNewName(e.target.value)} required maxLength={40} placeholder="Nombre nuevo recurso"/><input value={newMax} onChange={e=>setNewMax(e.target.value)} type="number" min="1" max="10000000" required aria-label="Máximo inicial"/><Button variant="outline" type="submit" disabled={busy||!newName.trim()}><Plus size={17}/> Añadir</Button></form><p className="hint">Si aumentas un máximo, el valor actual no cambia. Para reducirlo por debajo del actual, ajusta primero el valor actual.</p></div></details>}
    {role==='adminInformatico'&&<details className="card admin-fold"><summary className="admin-fold-title"><div><span className="overline">SOLO ADMIN INFORMÁTICO</span><h3>Auditoría técnica privada</h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body"><p className="hint">Estas operaciones no aparecen en el historial visible para el Dungeon Master.</p><div className="activity-list">{privateAudit.length===0?<p className="empty">Aún no hay eventos.</p>:privateAudit.slice(0,15).map((e,i)=><div className="activity-row" key={i}><span className="activity-dot"/><div><strong>{readableAction(e.action)}</strong><small>{e.actor_role} · {new Date(e.created_at).toLocaleString('es-CL')}</small></div></div>)}</div></div></details>}
  </div>
}

export default function App() {
  const [user,setUser]=useState<User|null>(null)
  const [booting,setBooting]=useState(true)
  const [recovering,setRecovering]=useState(false)
  const [profile,setProfile]=useState<Profile|null>(null)
  const [profiles,setProfiles]=useState<Profile[]>([])
  const [characters,setCharacters]=useState<Character[]>([])
  const [levels,setLevels]=useState<Threshold[]>([])
  const [costs,setCosts]=useState<AttributeCost[]>([])
  const [resources,setResources]=useState<Resource[]>([])
  const [attributes,setAttributes]=useState<Attribute[]>([])
  const [proficiency,setProficiency]=useState<CharacterProficiency|null>(null)
  const [statsReady,setStatsReady]=useState(false)
  const [campaignUnlocks,setCampaignUnlocks]=useState<CampaignUnlock[]>([])
  const [skills,setSkills]=useState<Skill[]>([])
  const [learnedSkills,setLearnedSkills]=useState<CharacterSkill[]>([])
  const [skillAppearances,setSkillAppearances]=useState<CharacterSkillAppearance[]>([])
  const [dmSkillProgress,setDmSkillProgress]=useState<DMSkillProgress[]>([])
  const [skillRequests,setSkillRequests]=useState<SkillRequest[]>([])
  const [personalProposals,setPersonalProposals]=useState<PersonalSkillProposal[]>([])
  const [itemDefinitions,setItemDefinitions]=useState<ItemDefinition[]>([])
  const [characterInventory,setCharacterInventory]=useState<CharacterItem[]>([])
  const [characterWallet,setCharacterWallet]=useState<CharacterWallet|null>(null)
  const [effectiveAttributes,setEffectiveAttributes]=useState<EffectiveAttribute[]>([])
  const [missionLoot,setMissionLoot]=useState<MissionLoot[]>([])
  const [achievementDefinitions,setAchievementDefinitions]=useState<AchievementDefinition[]>([])
  const [characterAchievements,setCharacterAchievements]=useState<CharacterAchievement[]>([])
  const [missionAchievementRewards,setMissionAchievementRewards]=useState<MissionAchievementReward[]>([])
  const [knowledge,setKnowledge]=useState<KnowledgeEntry[]>([])
  const [missions,setMissions]=useState<Mission[]>([])
  const [missionPeople,setMissionPeople]=useState<MissionParticipant[]>([])
  const [missionGoals,setMissionGoals]=useState<MissionObjective[]>([])
  const [missionJournal,setMissionJournal]=useState<MissionJournalEntry[]>([])
  const [missionRequests,setMissionRequests]=useState<MissionCompletionRequest[]>([])
  const [activity,setActivity]=useState<ActivityEvent[]>([])
  const [privateAudit,setPrivateAudit]=useState<PrivateActivity[]>([])
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [tab,setTab]=useState<Tab>('inicio')
  const [navStack,setNavStack]=useState<Tab[]>([])
  const navigate=useCallback((next:Tab)=>{if(tab!==next){setNavStack(stack=>[...stack.slice(-9),tab]);setTab(next)}setMenuOpen(false);window.scrollTo({top:0,behavior:'instant'})},[tab])
  const goBack=useCallback(()=>{setTab(navStack.at(-1)||(profile?.role==='jugador'?'inicio':'admin'));setNavStack(stack=>stack.slice(0,-1));setMenuOpen(false);window.scrollTo({top:0,behavior:'instant'})},[navStack,profile?.role])
  const goHome=useCallback(()=>{setTab(profile?.role==='jugador'?'inicio':'admin');setNavStack([]);setMenuOpen(false);window.scrollTo({top:0,behavior:'instant'})},[profile?.role])
  const [busy,setBusy]=useState(false)
  // Guardas inmediatas para evitar dobles pulsaciones de operaciones RPC.
  const actionInProgress=useRef(false)
  const characterRequestId=useRef(0)
  const [loading,setLoading]=useState(false)
  const [notice,setNotice]=useState('')
  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 1800)
    return () => window.clearTimeout(timeout)
  }, [notice])
  const [menuOpen,setMenuOpen]=useState(false)
  const [creatorOpen,setCreatorOpen]=useState(false)
  const [theme,setThemeState]=useState<Theme>(()=>{
    try {return validTheme(window.localStorage.getItem('cronicas-theme'))}catch{return 'chaos'}
  })
  const setTheme=useCallback((value:Theme)=>{setThemeState(value)},[])
  useEffect(()=>{
    document.documentElement.dataset.theme=theme
    try{window.localStorage.setItem('cronicas-theme',theme)}catch{/* Navegador sin almacenamiento local */}
  },[theme])
  const isStaff=profile?.role==='dungeonMaster'||profile?.role==='adminInformatico'
  const playerCharacters=useMemo(()=>characters.filter(c=>profiles.some(p=>p.id===c.owner_id&&p.role==='jugador')),[characters,profiles])
  useEffect(()=>{if(isStaff&&(tab==='inicio'||tab==='partida'||tab==='atributos')){setTab('admin');setNavStack([])}},[isStaff,tab])
  const selected=useMemo(()=>characters.find(c=>c.id===selectedId)||null,[characters,selectedId])
  const showError=useCallback((msg:string)=>{setNotice(msg)},[])

  useEffect(()=>{
    if(!configured){setBooting(false);return}
    let active=true
    void supabase.auth.getSession().then(({data,error})=>{if(!active)return;if(error)setNotice(error.message);setUser(data.session?.user||null);setBooting(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{if(active){if(event==='PASSWORD_RECOVERY')setRecovering(true);setUser(session?.user||null);setBooting(false)}})
    return ()=>{active=false;subscription.unsubscribe()}
  },[])

  const loadMain=useCallback(async()=>{
    if(!user)return
    setLoading(true)
    try {
      const [p,c,l,a,pList,sk,req,personalProposalsQuery,missionsQuery,peopleQuery,goalsQuery,journalQuery,requestsQuery,itemQuery,missionLootQuery,achievementQuery,missionAchievementsQuery,knowledgeQuery,unlocksQuery]=await Promise.all([
        supabase.from('profiles').select('id,display_name,role').eq('id',user.id).single(),
        supabase.from('characters').select('*').order('created_at',{ascending:false}),
        supabase.from('level_thresholds').select('*').order('level'),
        supabase.from('attribute_costs').select('*').order('attribute_key'),
        supabase.from('profiles').select('id,display_name,role'),
        supabase.rpc('list_skills'),
        supabase.from('skill_requests').select('*').order('requested_at',{ascending:false}),
        supabase.from('personal_skill_proposals').select('id,character_id,name,description,kind,resource_name,resource_cost,status,approved_skill_id,created_at,resolved_at').order('created_at',{ascending:false}).limit(300),
        supabase.from('missions').select('*').order('created_at',{ascending:false}),
        supabase.from('mission_participants').select('*'),
        supabase.from('mission_objectives').select('*').order('sort_order').order('created_at'),
        supabase.from('mission_journal').select('*').order('created_at',{ascending:false}).limit(500),
        supabase.from('mission_completion_requests').select('*').order('created_at',{ascending:false}),
        supabase.from('item_definitions').select('*').order('name'),
        supabase.from('mission_item_rewards').select('*'),
        supabase.from('achievement_definitions').select('*').order('name'),
        supabase.from('mission_achievement_rewards').select('*'),
        supabase.from('character_knowledge').select('*').order('created_at',{ascending:false}),
        supabase.from('campaign_resource_unlocks').select('resource_name,unlocked').order('resource_name'),
      ])
      for(const item of [p,c,l,a,pList,sk,req,personalProposalsQuery,missionsQuery,peopleQuery,goalsQuery,journalQuery,requestsQuery,itemQuery,missionLootQuery,achievementQuery,missionAchievementsQuery,knowledgeQuery,unlocksQuery])if(item.error)throw item.error
      setProfile(p.data as Profile);setProfiles((pList.data||[]) as Profile[]);setCharacters((c.data||[]) as Character[])
      setLevels((l.data||[]) as Threshold[]);setCosts((a.data||[]) as AttributeCost[]);setSkills((sk.data||[]) as Skill[]);setSkillRequests((req.data||[]) as SkillRequest[])
      if(p.data?.role==='dungeonMaster'||p.data?.role==='adminInformatico'){
        const dmProposals=await supabase.rpc('dm_list_personal_skill_proposals')
        if(dmProposals.error)throw dmProposals.error
        setPersonalProposals((dmProposals.data||[]) as PersonalSkillProposal[])
      }else setPersonalProposals((personalProposalsQuery.data||[]) as PersonalSkillProposal[])
      setMissions((missionsQuery.data||[]) as Mission[]);setMissionPeople((peopleQuery.data||[]) as MissionParticipant[])
      setMissionGoals((goalsQuery.data||[]) as MissionObjective[]);setMissionJournal((journalQuery.data||[]) as MissionJournalEntry[])
      setMissionRequests((requestsQuery.data||[]) as MissionCompletionRequest[])
      setItemDefinitions((itemQuery.data||[]) as ItemDefinition[])
      setMissionLoot((missionLootQuery.data||[]) as MissionLoot[])
      setAchievementDefinitions((achievementQuery.data||[]) as AchievementDefinition[])
      setMissionAchievementRewards((missionAchievementsQuery.data||[]) as MissionAchievementReward[])
      setKnowledge((knowledgeQuery.data||[]) as KnowledgeEntry[])
      setCampaignUnlocks((unlocksQuery.data||[]) as CampaignUnlock[])
      const staffView=p.data?.role==='dungeonMaster'||p.data?.role==='adminInformatico'
      const selectable=staffView?(c.data||[]).filter(x=>(pList.data||[]).some(pr=>pr.id===x.owner_id&&pr.role==='jugador')):(c.data||[])
      setSelectedId(id=>selectable.some(x=>x.id===id)?id:(selectable[0]?.id||null))
    } catch(err){showError('No se pudo cargar el proyecto: '+errText(err))}
    finally{setLoading(false)}
  },[user,showError])

  const loadCharacter=useCallback(async()=>{
    const requestId=++characterRequestId.current
    if(!selectedId)return
    try {
      const [r,a,h,sk,appears,secret,inventoryData,walletData,effectiveData,characterAchievementsQuery,proficiencyQuery,diceReadyQuery]=await Promise.all([
        supabase.from('character_resources').select('*').eq('character_id',selectedId).order('sort_order').order('name'),
        supabase.from('character_attributes').select('*').eq('character_id',selectedId).order('attribute_key'),
        supabase.from('activity_logs').select('*').eq('character_id',selectedId).order('created_at',{ascending:false}).limit(15),
        supabase.from('character_skills').select('character_id,skill_id,rank,acquired_at,updated_at').eq('character_id',selectedId),
        supabase.rpc('character_skill_appearance',{p_character_id:selectedId}),
        profile?.role==='dungeonMaster'||profile?.role==='adminInformatico'
          ?supabase.rpc('dm_character_skill_info',{p_character_id:selectedId}):Promise.resolve({data:[],error:null}),
        supabase.from('character_inventory').select('*').eq('character_id',selectedId),
        supabase.from('character_wallets').select('*').eq('character_id',selectedId).maybeSingle(),
        supabase.rpc('effective_character_attributes',{p_character_id:selectedId}),
        supabase.from('character_achievements').select('*').eq('character_id',selectedId),
        supabase.from('character_proficiencies').select('*').eq('character_id',selectedId).maybeSingle(),
        supabase.from('activity_logs').select('id').eq('character_id',selectedId).eq('action','character_dice_stats_set').limit(1),
      ])
      // Descarta respuestas tardías de un personaje que ya no está seleccionado.
      if(requestId!==characterRequestId.current)return
      for(const item of [r,a,h,sk,appears,secret,inventoryData,walletData,effectiveData,characterAchievementsQuery,proficiencyQuery,diceReadyQuery])if(item.error)throw item.error
      setResources((r.data||[]) as Resource[]);setAttributes((a.data||[]) as Attribute[])
      setActivity((h.data||[]) as ActivityEvent[]);setLearnedSkills((sk.data||[]) as CharacterSkill[]);setSkillAppearances((appears.data||[]) as CharacterSkillAppearance[]);setDmSkillProgress((secret.data||[]) as DMSkillProgress[])
      setCharacterInventory((inventoryData.data||[]) as CharacterItem[])
      setCharacterWallet((walletData.data||null) as CharacterWallet|null)
      setEffectiveAttributes((effectiveData.data||[]) as EffectiveAttribute[])
      setCharacterAchievements((characterAchievementsQuery.data||[]) as CharacterAchievement[])
      setProficiency((proficiencyQuery.data||null) as CharacterProficiency|null)
      setStatsReady((diceReadyQuery.data||[]).length>0)
    }catch(err){if(requestId===characterRequestId.current)showError('No se pudo cargar la ficha: '+errText(err))}
  },[selectedId,profile?.role,showError])

  const loadAudit=useCallback(async()=>{
    if(profile?.role!=='adminInformatico')return
    const {data,error}=await supabase.rpc('read_private_audit',{p_limit:30})
    if(error){showError(error.message);return}
    setPrivateAudit((data||[]) as PrivateActivity[])
  },[profile?.role,showError])

  useEffect(()=>{if(user){void loadMain()}else{setProfile(null);setCharacters([]);setSelectedId(null);setResources([]);setAttributes([]);setProficiency(null);setStatsReady(false);setCampaignUnlocks([]);setSkills([]);setLearnedSkills([]);setSkillAppearances([]);setDmSkillProgress([]);setSkillRequests([]);setPersonalProposals([]);setMissions([]);setItemDefinitions([]);setCharacterInventory([]);setCharacterWallet(null);setEffectiveAttributes([]);setMissionLoot([]);setAchievementDefinitions([]);setCharacterAchievements([]);setMissionAchievementRewards([]);setKnowledge([]);setMissionPeople([]);setMissionGoals([]);setMissionJournal([]);setMissionRequests([]);setPrivateAudit([])}},[user,loadMain])
  useEffect(()=>{void loadCharacter()},[loadCharacter])
  useEffect(()=>{void loadAudit()},[loadAudit])

  async function doAction(fn:()=>Promise<void>,success='Cambios guardados correctamente.',refresh:'all'|'character'|'none'='all'){
    if(actionInProgress.current)return false
    actionInProgress.current=true
    setBusy(true);setNotice('')
    try {await fn();setNotice(success);if(refresh==='all'){await loadMain();await loadCharacter();if(profile?.role==='adminInformatico')await loadAudit()}else if(refresh==='character'){await loadCharacter()}return true}
    catch(err){showError(errText(err));return false}
    finally{actionInProgress.current=false;setBusy(false)}
  }
  async function saveCharacterDamageDie(die:number){
    if(!selected||selected.owner_id!==user?.id)return false
    const oldDie=selected.base_damage_die||8
    setCharacters(chars=>chars.map(c=>c.id===selected.id?{...c,base_damage_die:die}:c))
    const {error}=await supabase.rpc('save_my_damage_die',{p_character_id:selected.id,p_die:die})
    if(error){setCharacters(chars=>chars.map(c=>c.id===selected.id?{...c,base_damage_die:oldDie}:c));showError('No se pudo guardar el dado: '+errText(error));return false}
    return true
  }
  async function portraitSaved(path:string){
    if(!selected)return
    setCharacters(chars=>chars.map(c=>c.id===selected.id?{...c,portrait_path:path}:c))
  }
  async function createCharacter(draft:CharacterDraft){return await doAction(async()=>{
    if(!user)throw new Error('Sesión no disponible')
    const {data,error}=await supabase.from('characters').insert({owner_id:user.id,name:draft.name.trim(),class_name:draft.class_name.trim(),species:draft.species.trim(),backstory:draft.backstory.trim(),portrait_key:draft.portrait_key}).select().single()
    if(error)throw error
    setSelectedId(data.id)
  },'Personaje creado. ¡Comienza tu aventura!')}
  async function setDiceStats(values:Record<string,number>){if(!selected)return;await doAction(async()=>{
    const {error}=await supabase.rpc('dm_set_character_dice_stats',{
      p_character_id:selected.id,p_vida:values['Vida'],p_mana:values['Maná'],
      p_carisma:values['Carisma'],p_constitucion:values['Constitución'],p_agilidad:values['Sabiduría'],
      p_fuerza:values['Fuerza'],p_destreza:values['Destreza'],p_inteligencia:values['Inteligencia']
    });if(error)throw error
  },'Resultados de los dados guardados en la ficha.','character')}
  async function chooseCompetence(attribute:string,skills:string[]){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('choose_character_proficiency',{p_character_id:selected.id,p_attribute:attribute,p_skills:skills})
    if(error)throw error
  },'Atributo principal y habilidades elegidos para siempre.','character')}
  async function chooseLegacyClass(name:string){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('choose_legacy_primary_class',{p_character_id:selected.id,p_class:name})
    if(error)throw error
  },'Clase principal confirmada.')}
  async function chooseSecondaryClass(name:string){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('choose_secondary_class',{p_character_id:selected.id,p_class:name})
    if(error)throw error
  },'Segunda clase registrada; no se puede cambiar.')}
  async function completeCompetence(skills:string[]){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('complete_character_proficiencies',{p_character_id:selected.id,p_skills:skills});if(error)throw error
  },'Tus dos habilidades quedaron confirmadas permanentemente.','character')}
  async function changeProficiencyBonus(value:number){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('dm_set_proficiency_bonus',{p_character_id:selected.id,p_bonus:value})
    if(error)throw error
  },'Bonificación de competencia actualizada.','character')}
  async function unlockCampaignResource(name:string){await doAction(async()=>{
    const {error}=await supabase.rpc('dm_unlock_campaign_resource',{p_resource_name:name});if(error)throw error
  },`${name} desbloqueado para todos los personajes.`)}
  async function changeResource(id:string,delta:number){await doAction(async()=>{
    const {error}=await supabase.rpc('change_resource',{p_resource_id:id,p_delta:delta});if(error)throw error
    const {data, error:readError}=await supabase.from('character_resources').select('*').eq('id',id).single()
    if(readError)throw readError
    setResources(rows=>rows.map(r=>r.id===id?(data as Resource):r))
  },'Recurso actualizado.','none')}
  async function restoreAllResources(){if(!selected)return;await doAction(async()=>{
    const {data,error}=await supabase.rpc('restore_character_resources',{p_character_id:selected.id});if(error)throw error
    setResources((data??[]) as Resource[])
  },'Todos los recursos recuperados al máximo.','none')}
  async function upgradeAttribute(key:string){if(!selected)return;await doAction(async()=>{
    const {error}=await supabase.rpc('upgrade_attribute',{p_character_id:selected.id,p_attribute:key});if(error)throw error
  },'Atributo mejorado y PC descontados.')}
  async function award(xp:number,pc:number,reason:string){if(!selected)return;await doAction(async()=>{
    const {error}=await supabase.rpc('award_character',{p_character_id:selected.id,p_xp:xp,p_pc:pc,p_reason:reason});if(error)throw error
  },'Recompensa aplicada al personaje.')}
  async function awardBulk(ids:string[],reward:{xp:number;pc:number;gold:number;silver:number;copper:number},reason:string){return doAction(async()=>{
    const {data,error}=await supabase.rpc('dm_award_campaign_group',{
      p_character_ids:ids,p_xp:reward.xp,p_pc:reward.pc,p_gold:reward.gold,
      p_silver:reward.silver,p_copper:reward.copper,p_reason:reason
    })
    if(error)throw error
    if(data!==ids.length)throw new Error('No se entregaron todas las recompensas.')
  },`Recompensa entregada a ${ids.length} ${ids.length===1?'personaje':'personajes'}.`)}
  async function saveCost(attribute:string,cost:number){await doAction(async()=>{
    const {error}=await supabase.rpc('set_attribute_cost',{p_attribute:attribute,p_cost:cost});if(error)throw error
  })}
  async function saveThreshold(level:number,xp:number){await doAction(async()=>{
    const {error}=await supabase.rpc('upsert_level_threshold',{p_level:level,p_xp:xp});if(error)throw error
  })}
  async function saveMax(id:string,max:number){await doAction(async()=>{
    const {error}=await supabase.rpc('set_resource_max',{p_resource_id:id,p_new_max:max});if(error)throw error
  })}
  async function addResource(name:string,max:number,current:number){if(!selected)return;await doAction(async()=>{
    const {error}=await supabase.rpc('add_resource',{p_character_id:selected.id,p_name:name,p_max:max,p_current:current});if(error)throw error
  })}

  async function requestSkill(skillId:string){if(!selected)return;await doAction(async()=>{
    const {error}=await supabase.rpc('request_skill',{p_character_id:selected.id,p_skill_id:skillId,p_note:''});if(error)throw error
  },'Solicitud para aprender enviada al Dungeon Master.')}
  async function requestSkillUpgrade(skillId:string){if(!selected)return;await doAction(async()=>{
    const {error}=await supabase.rpc('request_skill_upgrade',{p_character_id:selected.id,p_skill_id:skillId});if(error)throw error
  },'Solicitud de mejora enviada al Dungeon Master.')}
  async function investSkill(skillId:string,amount:number){if(!selected)return false;return await doAction(async()=>{
    const {error}=await supabase.rpc('invest_skill_pc',{p_character_id:selected.id,p_skill_id:skillId,p_amount:amount});if(error)throw error
  },'Inversión registrada: todos los PC elegidos se descontaron, incluidos los excedentes. El DM revisará la mejora.')}
  async function assignSkill(skillId:string){if(!selected)return;await doAction(async()=>{
    const {error}=await supabase.rpc('dm_assign_skill',{p_character_id:selected.id,p_skill_id:skillId});if(error)throw error
  },'Habilidad asignada únicamente al personaje seleccionado.')}
  async function completeSkillReview(requestId:string){await doAction(async()=>{
    const {error}=await supabase.rpc('dm_complete_skill_review',{p_request_id:requestId});if(error)throw error
  },'La revisión quedó resuelta y el entrenamiento reiniciado.')}
  async function resolveRequest(requestId:string,approve:boolean){await doAction(async()=>{
    const {error}=await supabase.rpc('dm_resolve_skill_request',{p_request_id:requestId,p_approve:approve});if(error)throw error
  },approve?'Solicitud aprobada por el DM.':'Solicitud rechazada.')}
  async function configureCharacterSkill(skillId:string,draft:CharacterSkillConfig){if(!selected)return false;return await doAction(async()=>{
    const {error}=await supabase.rpc('dm_edit_character_skill_effect',{
      p_character_id:selected.id,p_skill_id:skillId,p_name:draft.name,
      p_description:draft.description,p_resource_name:draft.resource_name,p_resource_cost:draft.resource_cost
    });if(error)throw error
  },'Habilidad personalizada para este personaje.')}
  async function removeCharacterSkill(skillId:string){if(!selected)return;await doAction(async()=>{
    const {error}=await supabase.rpc('dm_remove_character_skill',{p_character_id:selected.id,p_skill_id:skillId});if(error)throw error
  },'Asignación de habilidad retirada.')}
  async function useSkill(skillId:string){if(!selected)return false;return await doAction(async()=>{
    const {error}=await supabase.rpc('use_skill',{p_character_id:selected.id,p_skill_id:skillId});if(error)throw error
  },'Habilidad utilizada. Recurso consumido y acción registrada.','character')}
  async function saveSkill(draft:SkillDraft,id:string|null){return await doAction(async()=>{
    const params={p_name:draft.name,p_description:draft.description,p_kind:draft.kind,
      p_purchase_pc:draft.purchase_pc,p_upgrade_pc:draft.upgrade_pc,p_max_rank:draft.max_rank,
      p_min_level:draft.min_level,p_resource_name:draft.resource_name,p_resource_cost:draft.resource_cost}
    const {data,error}=id?await supabase.rpc('update_skill',{...params,p_skill_id:id,p_is_active:draft.is_active})
      :await supabase.rpc('create_skill',params)
    if(error)throw error
    const skillId=id||(data as {id?:string}|null)?.id
    if(!skillId)throw new Error('No se pudo identificar la habilidad creada')
    const {error:accessError}=await supabase.rpc('dm_set_skill_access',{p_skill_id:skillId,p_is_visible:draft.is_visible,p_is_requestable:draft.is_requestable,p_is_usable:draft.is_usable})
    if(accessError)throw accessError
  },id?'Habilidad actualizada.':'Habilidad creada. Ya aparece en el catálogo.')}


  async function proposePersonalSkill(draft:SkillDraft){if(!selected)return false;return await doAction(async()=>{
    const {error}=await supabase.rpc('propose_personal_skill_simple',{
      p_character_id:selected.id,p_name:draft.name,p_description:draft.description,
      p_kind:draft.kind,p_resource_name:draft.resource_name,p_resource_cost:draft.resource_cost
    });if(error)throw error
  },'Tu habilidad fue enviada al DM. Se asignará solamente a tu personaje cuando la apruebe.')}
  async function reviewPersonalSkill(id:string,approve:boolean){await doAction(async()=>{
    const {error}=await supabase.rpc('dm_review_personal_skill_simple',{p_proposal_id:id,p_approve:approve});if(error)throw error
  },approve?'Habilidad confirmada y asignada únicamente a ese personaje.':'Propuesta rechazada. No se asignó ninguna habilidad.')}

  // Inventario: escritura solamente vía funciones SQL con autorización de rol/propiedad.
  async function saveItem(draft:ItemDraft,id:string|null){return doAction(async()=>{
    const {error}=await supabase.rpc('dm_save_item_combat',{
      p_id:id,p_name:draft.name,p_description:draft.description,p_category:draft.category,
      p_rarity:draft.rarity,p_bonuses:draft.bonuses,p_passive_text:draft.passive_text,
      p_use_resource:draft.use_resource,p_restore_amount:draft.restore_amount,
      p_public:draft.is_public,p_active:draft.is_active,
      p_damage_bonus:draft.damage_bonus,p_damage_dice_count:draft.damage_dice_count,
      p_damage_die_sides:draft.damage_dice_count?draft.damage_die_sides:null,p_equip_slot:draft.equip_slot,
    });if(error)throw error
  },'Objeto guardado en el catálogo.')}
  async function grantItem(itemId:string,delta:number){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('dm_grant_item',{p_character_id:selected.id,p_item_id:itemId,p_delta:delta});if(error)throw error
  },delta>0?'Objeto entregado al personaje.':'Objeto retirado del inventario.')}
  async function grantItemBulk(itemId:string,ids:string[],quantity:number){return doAction(async()=>{
    const {data,error}=await supabase.rpc('dm_grant_item_bulk',{p_item_id:itemId,p_character_ids:ids,p_quantity:quantity});
    if(error)throw error; if(data!==ids.length)throw new Error('No se completó la entrega a todos los destinatarios')
  },`Objeto entregado a ${ids.length} ${ids.length===1?'personaje':'personajes'}.`)}
  async function adjustMoney(delta:number,reason:string){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('dm_change_money',{p_character_id:selected.id,p_delta:delta,p_reason:reason});if(error)throw error
  },'Bolsa de monedas actualizada.')}
  async function equipItem(itemId:string,equip:boolean){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('equip_inventory_item',{p_character_id:selected.id,p_item_id:itemId,p_equip:equip});if(error)throw error
  },equip?'Objeto equipado. Bonificaciones aplicadas.':'Objeto desequipado. Bonificaciones retiradas.','character')}
  async function useItem(itemId:string){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('use_inventory_item',{p_character_id:selected.id,p_item_id:itemId});if(error)throw error
  },'Objeto utilizado. Inventario y recursos actualizados.','character')}
  async function saveAchievement(draft:AchievementDraft,id:string|null){return doAction(async()=>{
    const {error}=await supabase.rpc('dm_save_achievement',{
      p_id:id,p_name:draft.name,p_description:draft.description,p_category:draft.category,p_rarity:draft.rarity,
      p_bonuses:draft.bonuses,p_per_rank_bonuses:draft.per_rank_bonuses,p_passive_text:draft.passive_text,
      p_skill_id:draft.skill_id,p_upgradeable:draft.upgradeable,p_upgrade_pc:draft.upgrade_pc,p_max_rank:draft.max_rank,
      p_public:draft.is_public,p_active:draft.is_active,
    });if(error)throw error
  },'Logro o título guardado correctamente.')}
  async function grantAchievement(id:string,characterIds:string[],grant:boolean){return doAction(async()=>{
    const {error}=await supabase.rpc('dm_grant_achievement_many',{p_character_ids:characterIds,p_achievement_id:id,p_grant:grant});if(error)throw error
  },grant?'Logro entregado a los personajes seleccionados.':'Logro retirado al personaje. Las habilidades desbloqueadas permanecen.')}
  async function upgradeAchievement(id:string){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('upgrade_character_achievement',{p_character_id:selected.id,p_achievement_id:id});if(error)throw error
  },'Logro mejorado y PC descontados definitivamente.')}
  async function selectTitle(id:string|null){if(!selected)return false;return doAction(async()=>{
    const {error}=await supabase.rpc('select_character_title',{p_character_id:selected.id,p_achievement_id:id});if(error)throw error
  },id?'Título activado y atributos recalculados.':'Título desactivado.')}
  async function proposeKnowledge(title:string,description:string,category:KnowledgeCategory){
    if(!selected)return false
    return await doAction(async()=>{
      const {error}=await supabase.rpc('propose_knowledge',{p_character_id:selected.id,p_title:title,p_description:description,p_category:category})
      if(error)throw error
    },'Conocimiento enviado al Dungeon Master. Empieza con 0 puntos.')
  }
  async function reviewKnowledge(id:string,approve:boolean,note:string){
    return await doAction(async()=>{
      const {error}=await supabase.rpc('review_knowledge',{p_knowledge_id:id,p_approve:approve,p_dm_note:note})
      if(error)throw error
    },approve?'Conocimiento aprobado. El personaje ha recibido su primer punto.':'Conocimiento rechazado; el jugador podrá ver la observación.')
  }
  async function increaseKnowledge(id:string){
    return await doAction(async()=>{
      const {error}=await supabase.rpc('increase_knowledge',{p_knowledge_id:id})
      if(error)throw error
    },'Se ha añadido 1 punto de conocimiento.')
  }
  async function setMissionAchievement(missionId:string,characterId:string,achievementId:string,grant:boolean){return missionRpc('dm_set_mission_achievement',{p_mission_id:missionId,p_character_id:characterId,p_achievement_id:achievementId,p_grant:grant},'Logro de misión configurado.')}
  async function setMissionMoney(missionId:string,characterId:string,copper:number){return missionRpc('dm_set_mission_money',{p_mission_id:missionId,p_character_id:characterId,p_copper:copper},'Monedas de la misión configuradas.')}
  async function setMissionItem(missionId:string,characterId:string,itemId:string,quantity:number){return missionRpc('dm_set_mission_item',{p_mission_id:missionId,p_character_id:characterId,p_item_id:itemId,p_quantity:quantity},'Botín de misión actualizado.')}

  // Misiones: toda escritura pasa por RPC con validación de propiedad/rol y RLS en el servidor.
  async function missionRpc(rpc:string,args:Record<string,unknown>,success:string){return await doAction(async()=>{
    const {error}=await supabase.rpc(rpc,args);if(error)throw error
  },success)}
  async function createMission(title:string,description:string,visibility:MissionVisibility,assignees:string[]){
    if(!selected)return false
    return missionRpc('create_mission',{p_character_id:selected.id,p_title:title,p_description:description,p_visibility:visibility,p_assignees:assignees},
      isStaff?'Misión creada y asignada.':'Propuesta de misión enviada al DM.')
  }
  async function reviewMissionProposal(id:string,approved:boolean){return missionRpc('dm_review_mission_proposal',{p_mission_id:id,p_approve:approved},approved?'Propuesta aprobada.':'Propuesta rechazada.')}
  async function editMission(id:string,title:string,description:string,visibility:MissionVisibility){return missionRpc('dm_edit_mission',{p_mission_id:id,p_title:title,p_description:description,p_visibility:visibility},'Misión actualizada.')}
  async function assignMission(id:string,characterId:string){return missionRpc('dm_assign_mission',{p_mission_id:id,p_character_id:characterId},'Personaje asignado a la misión.')}
  async function setMissionReward(id:string,characterId:string,xp:number,pc:number,extra:string){return missionRpc('dm_set_mission_reward',{p_mission_id:id,p_character_id:characterId,p_xp:xp,p_pc:pc,p_extra:extra},'Recompensa configurada para el personaje.')}
  async function saveMissionObjective(id:string,objectiveId:string|null,title:string,targetId:string|null){return missionRpc('dm_upsert_mission_objective',{p_mission_id:id,p_objective_id:objectiveId,p_title:title,p_target_character_id:targetId},'Objetivo guardado.')}
  async function deleteMissionObjective(id:string){return missionRpc('dm_delete_mission_objective',{p_objective_id:id},'Objetivo eliminado.')}
  async function claimMissionObjective(id:string,characterId:string){return missionRpc('claim_mission_objective',{p_objective_id:id,p_character_id:characterId},'Objetivo enviado al DM para revisión.')}
  async function reviewMissionObjective(id:string,approved:boolean){return missionRpc('dm_review_mission_objective',{p_objective_id:id,p_approve:approved},approved?'Objetivo validado.':'Avance rechazado; el jugador podrá intentarlo de nuevo.')}
  async function addMissionJournal(id:string,characterId:string|null,note:string){return missionRpc('add_mission_journal',{p_mission_id:id,p_character_id:characterId,p_note:note},'Anotación registrada en la bitácora.')}
  async function requestMissionCompletion(id:string,characterId:string,note:string){return missionRpc('request_mission_completion',{p_mission_id:id,p_character_id:characterId,p_note:note},'Solicitud de finalización enviada al DM.')}
  async function reviewMissionCompletion(id:string,approved:boolean,note:string){return missionRpc('dm_review_mission_completion',{p_request_id:id,p_approve:approved,p_note:note},approved?'Misión finalizada y recompensas acreditadas.':'Solicitud de finalización rechazada.')}
  async function closeMission(id:string,note:string){return missionRpc('dm_close_mission',{p_mission_id:id,p_note:note},'Misión completada. Se acreditaron las recompensas de todos los participantes.')}

  const dmPendingCount=skillRequests.filter(r=>r.status==='pendiente'&&r.request_type==='aprender').length+personalProposals.filter(r=>r.status==='pendiente').length+missions.filter(m=>m.status==='propuesta').length+missionGoals.filter(o=>o.claimed_at&&!o.completed).length+missionRequests.filter(r=>r.status==='pendiente').length+knowledge.filter(k=>k.status==='pendiente').length
  function openFromInbox(destination:Tab,characterId?:string){if(characterId)setSelectedId(characterId);navigate(destination)}
  if(!configured)return <div className="setup-view"><Brand/><Card><div className="circle-icon"><Settings2 size={26}/></div><h1>Configura Supabase</h1><p className="muted">Esta primera versión está lista para conectarse. Crea el archivo <code>.env</code> a partir de <code>.env.example</code> y ejecuta el SQL de <code>supabase/001_inicial.sql</code>.</p><div className="code-panel">VITE_SUPABASE_URL=...<br/>VITE_SUPABASE_ANON_KEY=...</div><p className="hint">Consulta el README para los pasos exactos. No coloques una clave service_role en la web.</p></Card></div>
  if(booting)return <div className="loading-screen"><Brand/><p>Abriendo tu aventura…</p></div>
  if(recovering&&user)return <PasswordRecoveryView onDone={()=>{setRecovering(false);setNotice('Contraseña actualizada.')}} onError={showError}/>
  if(!user)return <><AuthView onError={showError} theme={theme} setTheme={setTheme}/>{notice&&<div className="toast" role="alert"><CircleAlert size={19}/>{notice}<button onClick={()=>setNotice('')}><X size={16}/></button></div>}</>
  if(loading&&!profile)return <div className="loading-screen"><Brand/><p>Cargando tu campaña…</p></div>
  return <div className="app-layout">
    <aside className={`sidebar ${menuOpen?'sidebar-open':''}`}><div className="sidebar-header"><button type="button" className="brand-link" title="Volver al inicio" onClick={goHome}><Brand/></button><button className="mobile-close" onClick={()=>setMenuOpen(false)} aria-label="Cerrar menú"><X size={20}/></button></div><div className="sidebar-section-label">NAVEGACIÓN</div><nav aria-label="Navegación principal">{(isStaff?dmNav:nav).map(({tab:dest,title,Icon})=><button key={dest} className={`nav-item ${tab===dest?'active':''}`} onClick={()=>navigate(dest)}><Icon size={19}/><span>{title}</span>{dest==='bandeja'&&dmPendingCount>0&&<b className="more-pending">{dmPendingCount}</b>}</button>)}</nav><div className="sidebar-foot"><div className="sidebar-user"><div className="avatar"><UserRound size={20}/></div><div><strong>{profile?.display_name||'Aventurero'}</strong><small>{profile?.role==='adminInformatico'?'Admin informático':isStaff?'Dungeon Master':'Jugador'}</small></div></div><button className="logout" onClick={()=>void supabase.auth.signOut()}><LogOut size={17}/> Cerrar sesión</button></div></aside>
    {menuOpen&&<button className="menu-backdrop" onClick={()=>setMenuOpen(false)} aria-label="Cerrar menú"/>}
    <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={()=>setMenuOpen(true)} aria-label="Abrir menú"><Menu size={23}/></button>{tab!=='inicio'&&<button type="button" className="top-back" title="Volver a la página anterior" onClick={goBack}><ArrowLeft size={17}/><span>Volver</span></button>}<button type="button" className="top-home" onClick={goHome} title={isStaff?"Ir al Panel DM":"Ir a Mi personaje"}><Crown size={17}/><span>CRÓNICAS RPG</span></button><span className="breadcrumb-current">/ {(isStaff?dmNav:nav).find(n=>n.tab===tab)?.title||'Administración'}</span></div><div className="topbar-right"><ThemeSwitcher theme={theme} setTheme={setTheme} compact/>{!isStaff&&characters.length>0&&<label className="character-select"><UserRound size={16}/><select value={selectedId||''} onChange={e=>setSelectedId(e.target.value)} aria-label="Seleccionar personaje">{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown size={15}/></label>}{!isStaff&&<button className="add-character-top" onClick={()=>setCreatorOpen(true)} title="Crear personaje" aria-label="Crear otro personaje"><Plus size={17}/></button>}<span className="role-chip">{isStaff?<ShieldCheck size={15}/>:<UserRound size={15}/>} {profile?.role==='adminInformatico'?'Admin informático':isStaff?'DM':'Jugador'}</span></div></header>
      <main className="content"><Suspense fallback={<div className="card route-loading"><Sparkles size={22}/><p>Abriendo módulo…</p></div>}>{!selected&&!isStaff&&!['admin','mas','bandeja','misiones'].includes(tab)?<CharacterCreate onCreate={createCharacter} busy={busy} first/>:tab==='partida'&&selected?<PlayView character={selected} resources={resources} skills={skills} learned={learnedSkills} appearances={skillAppearances} items={itemDefinitions} owned={characterInventory} effective={effectiveAttributes} proficiency={proficiency} attributes={attributes} achievements={achievementDefinitions} earned={characterAchievements} busy={busy} onResource={changeResource} onRestoreAll={restoreAllResources} onUseSkill={useSkill} onUseItem={useItem} onNavigate={navigate}/>:tab==='mas'?<MoreView onNavigate={navigate} isStaff={!!isStaff} profile={profile} dmPending={dmPendingCount}/>:tab==='bandeja'&&isStaff?<DMInboxView characters={characters} profiles={profiles} skills={skills} skillRequests={skillRequests} personalProposals={personalProposals} onReviewPersonal={reviewPersonalSkill} missions={missions} objectives={missionGoals} completionRequests={missionRequests} knowledge={knowledge} busy={busy} onResolveSkill={resolveRequest} onReviewKnowledge={reviewKnowledge} onReviewProposal={reviewMissionProposal} onReviewObjective={reviewMissionObjective} onOpen={openFromInbox}/>:tab==='inicio'&&selected?<Overview character={selected} resources={resources} levels={levels} activity={activity} onResource={changeResource} busy={busy} goTo={navigate} skills={skills} learned={learnedSkills} appearances={skillAppearances} onUse={useSkill} items={itemDefinitions} owned={characterInventory} effective={effectiveAttributes} wallet={characterWallet} achievementDefinitions={achievementDefinitions} characterAchievements={characterAchievements} proficiency={proficiency} attributes={attributes} onDie={saveCharacterDamageDie} onPortraitSaved={portraitSaved} onError={showError} editable={selected.owner_id===user.id}/>:tab==='atributos'&&selected?<AttributesView character={selected} attributes={attributes} costs={costs} effective={effectiveAttributes} onUpgrade={upgradeAttribute} busy={busy} proficiency={proficiency} levels={levels} statsReady={statsReady} onChoose={chooseCompetence} onComplete={completeCompetence} onPrimaryClass={chooseLegacyClass} onSecondaryClass={chooseSecondaryClass}/>:tab==='habilidades'&&selected?<SkillsView character={selected} characters={characters} profiles={profiles} levels={levels} resources={resources} skills={skills} learned={learnedSkills} appearances={skillAppearances} dmProgress={dmSkillProgress} requests={skillRequests} personalProposals={personalProposals} isStaff={!!isStaff} busy={busy} onSelectCharacter={setSelectedId} onRequest={requestSkill} onRequestUpgrade={requestSkillUpgrade} onInvest={investSkill} onUse={useSkill} onSave={saveSkill} onProposePersonal={proposePersonalSkill} onAssign={assignSkill} onResolve={resolveRequest} onCompleteReview={completeSkillReview} onConfigure={configureCharacterSkill} onRemove={removeCharacterSkill}/>:tab==='inventario'&&isStaff?<DMInventoryView characters={playerCharacters} profiles={profiles} selectedCharacter={selected} busy={busy} items={itemDefinitions} owned={characterInventory} wallet={characterWallet} onSelectCharacter={setSelectedId} onSave={saveItem} onBulkGrant={grantItemBulk} onGrant={grantItem} onAdjustMoney={adjustMoney} onEquip={equipItem} onUse={useItem}/>:tab==='inventario'&&selected?<InventoryView character={selected} characters={characters} isStaff={!!isStaff} busy={busy} items={itemDefinitions} owned={characterInventory} wallet={characterWallet} onSelectCharacter={setSelectedId} onSave={saveItem} onGrant={grantItem} onAdjustMoney={adjustMoney} onEquip={equipItem} onUse={useItem}/>:tab==='titulos'&&selected?<AchievementsView character={selected} characters={characters} definitions={achievementDefinitions} earned={characterAchievements} skills={skills} isStaff={!!isStaff} busy={busy} onSelectCharacter={setSelectedId} onSave={saveAchievement} onGrant={grantAchievement} onUpgrade={upgradeAchievement} onSetTitle={selectTitle}/>:tab==='conocimientos'&&selected?<KnowledgeView character={selected} characters={characters} profiles={profiles} knowledge={knowledge} isStaff={!!isStaff} canCreate={selected.owner_id===user.id} busy={busy} onSelectCharacter={setSelectedId} onPropose={proposeKnowledge} onReview={reviewKnowledge} onIncrease={increaseKnowledge}/>:tab==='misiones'?<MissionsView character={selected} characters={characters} profiles={profiles} isStaff={!!isStaff} busy={busy} missions={missions} participants={missionPeople} objectives={missionGoals} journal={missionJournal} completionRequests={missionRequests} itemCatalog={itemDefinitions} missionLoot={missionLoot} achievementCatalog={achievementDefinitions} missionAchievements={missionAchievementRewards} onAchievementReward={setMissionAchievement} onMoneyReward={setMissionMoney} onItemReward={setMissionItem} onSelectCharacter={setSelectedId} onCreate={createMission} onReviewProposal={reviewMissionProposal} onEdit={editMission} onAssign={assignMission} onReward={setMissionReward} onObjective={saveMissionObjective} onDeleteObjective={deleteMissionObjective} onClaimObjective={claimMissionObjective} onReviewObjective={reviewMissionObjective} onJournal={addMissionJournal} onRequestCompletion={requestMissionCompletion} onReviewCompletion={reviewMissionCompletion} onClose={closeMission}/>:tab==='admin'&&isStaff?<AdminView characters={playerCharacters} profiles={profiles} selectedCharacter={selected} levels={levels} costs={costs} resources={resources} attributes={attributes} proficiency={proficiency} onSetProficiencyBonus={changeProficiencyBonus} campaignUnlocks={campaignUnlocks} onSaveDiceStats={setDiceStats} onUnlockResource={unlockCampaignResource} privateAudit={privateAudit} skillRequests={skillRequests} skills={skills} onResolveRequest={resolveRequest} onCompleteReview={completeSkillReview} onOpenSkills={()=>navigate('habilidades')} onOpenMissions={()=>navigate('misiones')} onOpenInventory={()=>navigate('inventario')} onOpenAchievements={()=>navigate('titulos')} onOpenKnowledge={()=>navigate('conocimientos')} onOpenInbox={()=>navigate('bandeja')} knowledgePendingCount={knowledge.filter(k=>k.status==='pendiente').length} missionPendingCount={missions.filter(m=>m.status==='propuesta').length+missionGoals.filter(o=>o.claimed_at&&!o.completed).length+missionRequests.filter(r=>r.status==='pendiente').length} onAward={award} onAwardBulk={awardBulk} onCost={saveCost} onThreshold={saveThreshold} onMax={saveMax} onNewResource={addResource} busy={busy} role={profile!.role} onSelectCharacter={setSelectedId}/>:tab==='admin'?<div>Acceso denegado.</div>:isStaff?<div className="card dm-empty"><Users size={28}/><h2>Aún no hay personajes de jugadores</h2><p>Cuando los jugadores creen sus personajes podrás administrarlos desde aquí. Mientras tanto, puedes crear objetos y misiones.</p><Button onClick={()=>navigate('inventario')}><Package size={16}/> Abrir catálogo de objetos</Button></div>:<Placeholder tab={tab}/>}</Suspense></main>
      <footer className="footer">Crónicas RPG · Versión 1.3.3 · Tu aventura, tus reglas.</footer>
      <nav className="mobile-bottom-nav" aria-label="Navegación móvil principal">{(isStaff?[
        {id:'admin' as Tab,title:'Panel',Icon:ShieldCheck},
        {id:'inventario' as Tab,title:'Objetos',Icon:Package},
        {id:'misiones' as Tab,title:'Misiones',Icon:ScrollText},
        {id:'bandeja' as Tab,title:'Solicitudes',Icon:ClipboardCheck},
        {id:'mas' as Tab,title:'Más',Icon:Menu},
      ]:[
        {id:'inicio' as Tab,title:'Personaje',Icon:UserRound},
        {id:'partida' as Tab,title:'Partida',Icon:Dices},
        {id:'misiones' as Tab,title:'Misiones',Icon:ScrollText},
        {id:'mas' as Tab,title:'Más',Icon:Menu},
      ]).map(({id,title,Icon})=><button key={id} type="button" aria-current={tab===id?'page':undefined} className={tab===id||(id==='mas'&&(isStaff?['habilidades','titulos','conocimientos']:['atributos','habilidades','inventario','titulos','conocimientos']).includes(tab))?'active':''} onClick={()=>navigate(id)}><Icon size={22}/><span>{title}</span>{id==='bandeja'&&isStaff&&dmPendingCount>0&&<i className="mobile-nav-badge" aria-label={`${dmPendingCount} solicitudes pendientes`}>{dmPendingCount}</i>}</button>)}</nav>
    </div>
    {creatorOpen&&<div className="modal-backdrop" role="presentation"><div className="modal-panel" role="dialog" aria-modal="true" aria-label="Crear personaje"><CharacterCreate onCreate={createCharacter} busy={busy} first={false} onClose={()=>setCreatorOpen(false)}/></div></div>}
    {notice&&<div className="toast" role="status"><CircleAlert size={18}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Cerrar aviso"><X size={16}/></button></div>}
  </div>
}
