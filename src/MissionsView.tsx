import {useMemo,useState,type FormEvent} from 'react'
import {
  ArrowRight, Check, CheckCircle2, ChevronDown, ClipboardCheck,
  Coins, Crown, Flag, LockKeyhole, NotebookPen, Package, Plus, Search,
  ScrollText, Send, ShieldCheck, Trash2, UserRound, Users, X,
} from 'lucide-react'
import { splitMoney, formatMoney } from './InventoryView'
import type {
  Character, Mission, MissionCompletionRequest, MissionJournalEntry,
  MissionObjective, MissionParticipant, MissionVisibility, Profile, ItemDefinition, MissionLoot, AchievementDefinition, MissionAchievementReward,
} from './types'

const visibilityOptions: {value:MissionVisibility;label:string;hint:string}[]=[
  {value:'individual',label:'Individual',hint:'Solo el personaje asignado y el DM'},
  {value:'grupal',label:'Grupal',hint:'Personajes seleccionados y el DM'},
  {value:'publica',label:'Pública',hint:'Todos pueden verla; solo los asignados participan'},
  {value:'secreta',label:'Secreta',hint:'Solo los destinatarios y el DM'},
]
const visibilityText=(v:MissionVisibility)=>visibilityOptions.find(x=>x.value===v)?.label||v
const statusLabels: Record<Mission['status'],string>={
  propuesta:'Propuesta',activa:'En curso',rechazada:'No aprobada',completada:'Completada',archivada:'Archivada',
}
type RewardForm={xp:string;pc:string;extra:string}
type Props={
  character:Character|null;characters:Character[];profiles:Profile[];isStaff:boolean;busy:boolean;
  missions:Mission[];participants:MissionParticipant[];objectives:MissionObjective[];
  journal:MissionJournalEntry[];completionRequests:MissionCompletionRequest[];
  itemCatalog:ItemDefinition[];missionLoot:MissionLoot[];achievementCatalog:AchievementDefinition[];missionAchievements:MissionAchievementReward[];
  onAchievementReward:(missionId:string,characterId:string,achievementId:string,grant:boolean)=>Promise<boolean>;
  onMoneyReward:(missionId:string,characterId:string,copper:number)=>Promise<boolean>;
  onItemReward:(missionId:string,characterId:string,itemId:string,qty:number)=>Promise<boolean>;
  onSelectCharacter:(id:string)=>void;
  onCreate:(name:string,description:string,visibility:MissionVisibility,assignees:string[])=>Promise<boolean>;
  onReviewProposal:(id:string,approve:boolean)=>Promise<boolean>;
  onEdit:(id:string,title:string,description:string,visibility:MissionVisibility)=>Promise<boolean>;
  onAssign:(missionId:string,characterId:string)=>Promise<boolean>;
  onReward:(missionId:string,characterId:string,xp:number,pc:number,extra:string)=>Promise<boolean>;
  onObjective:(missionId:string,objectiveId:string|null,title:string,targetId:string|null)=>Promise<boolean>;
  onDeleteObjective:(id:string)=>Promise<boolean>;
  onClaimObjective:(id:string,characterId:string)=>Promise<boolean>;
  onReviewObjective:(id:string,approve:boolean)=>Promise<boolean>;
  onJournal:(missionId:string,characterId:string|null,note:string)=>Promise<boolean>;
  onRequestCompletion:(missionId:string,characterId:string,note:string)=>Promise<boolean>;
  onReviewCompletion:(requestId:string,approve:boolean,note:string)=>Promise<boolean>;
  onClose:(missionId:string,note:string)=>Promise<boolean>;
}

function MissionEditor({staff,characters,onClose,onSave,busy,initial}: {
  staff:boolean;characters:Character[];onClose:()=>void;
  onSave:(title:string,description:string,visibility:MissionVisibility,assignees:string[])=>Promise<boolean>;
  busy:boolean;initial?:Mission;
}) {
  const [title,setTitle]=useState(initial?.title||'')
  const [description,setDescription]=useState(initial?.description||'')
  const [visibility,setVisibility]=useState<MissionVisibility>(initial?.visibility||'individual')
  const [assignees,setAssignees]=useState<string[]>([])
  const [search,setSearch]=useState('')
  const visible=characters.filter(c=>c.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))
  function toggle(id:string){setAssignees(prev=>{
    const next=prev.includes(id)?prev.filter(v=>v!==id):[...prev,id]
    if(next.length>1&&visibility==='individual')setVisibility('grupal')
    return next
  })}
  async function submit(e:FormEvent){e.preventDefault();if(await onSave(title.trim(),description.trim(),visibility,assignees))onClose()}
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
    <section className="card mission-modal" role="dialog" aria-modal="true" aria-labelledby="mission-edit-title">
      <div className="mission-modal-header"><div><span className="overline">{initial?'EDITAR MISIÓN':staff?'DUNGEON MASTER':'PROPUESTA DE JUGADOR'}</span><h3 id="mission-edit-title">{initial?'Editar misión':staff?'Crear misión':'Escribir una misión'}</h3></div><button type="button" className="mission-icon" aria-label="Cerrar" onClick={onClose}><X size={18}/></button></div>
      <form className="mission-form" onSubmit={e=>void submit(e)}>
        <label>Nombre de la misión<input autoFocus required minLength={3} maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej.: Los secretos del bosque antiguo"/></label>
        <label>Descripción<textarea rows={4} maxLength={3000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe qué debe conseguir el personaje y por qué es importante."/></label>
        {staff&&<>
          <label>Visibilidad<select value={visibility} onChange={e=>setVisibility(e.target.value as MissionVisibility)}>{visibilityOptions.map(v=><option key={v.value} value={v.value}>{v.label}</option>)}</select></label>
          <p className="hint">{visibilityOptions.find(v=>v.value===visibility)?.hint}</p>
          {!initial&&<div className="mission-assignees"><div className="mission-subheading"><strong>Asignar a personajes</strong><small>{assignees.length} seleccionados</small></div>
            <label className="mission-inline-search"><Search size={17}/><input aria-label="Buscar personajes" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar personajes…"/></label>
            <div className="mission-character-choices">{visible.map(c=><label key={c.id} className="mission-person-choice"><input type="checkbox" checked={assignees.includes(c.id)} disabled={visibility==='individual'&&!assignees.includes(c.id)&&assignees.length>=1} onChange={()=>toggle(c.id)}/><span>{c.name}</span></label>)}</div>
            {visibility==='individual'&&<small>Para elegir más de un personaje selecciona visibilidad Grupal, Pública o Secreta.</small>}
          </div>}
        </>}
        {!staff&&<div className="mission-info"><LockKeyhole size={17}/><span>Tu propuesta será privada hasta que el DM la apruebe. Después podrá añadir objetivos y recompensas.</span></div>}
        <div className="mission-modal-actions"><button type="button" className="mission-button ghost" onClick={onClose} disabled={busy}>Cancelar</button><button type="submit" className="mission-button solid" disabled={busy||title.trim().length<3}>{busy?'Guardando…':initial?'Guardar cambios':staff?'Crear y asignar':'Enviar propuesta'}<ArrowRight size={16}/></button></div>
      </form>
    </section>
  </div>
}

function CloseMissionModal({mission,people,characters,request,editReward,itemCatalog,missionLoot,achievementCatalog,missionAchievements,onAchievementReward,onMoneyReward,onItemReward,onClose,onPay,busy}: {
  mission:Mission;people:MissionParticipant[];characters:Character[];request:MissionCompletionRequest|null;
  editReward:Props['onReward'];itemCatalog:ItemDefinition[];missionLoot:MissionLoot[];achievementCatalog:AchievementDefinition[];missionAchievements:MissionAchievementReward[];onAchievementReward:Props['onAchievementReward'];
  onMoneyReward:Props['onMoneyReward'];onItemReward:Props['onItemReward'];
  onClose:()=>void;onPay:(note:string)=>Promise<boolean>;busy:boolean
}) {
  const [rewards,setRewards]=useState<Record<string,RewardForm>>(()=>Object.fromEntries(people.map(p=>[p.character_id,{
    xp:String(p.reward_xp),pc:String(p.reward_pc),extra:p.reward_extra,
  }])))
  const [moneyDraft,setMoneyDraft]=useState<Record<string,{gold:string;silver:string;copper:string}>>(()=>Object.fromEntries(people.map(p=>{const m=splitMoney(p.reward_copper||0);return [p.character_id,{gold:String(m.gold),silver:String(m.silver),copper:String(m.copper)}]})))
  const [lootDraft,setLootDraft]=useState<Record<string,Record<string,string>>>(()=>Object.fromEntries(people.map(p=>[p.character_id,Object.fromEntries(missionLoot.filter(x=>x.mission_id===mission.id&&x.character_id===p.character_id).map(x=>[x.item_id,String(x.quantity)]))])))
  const [lootChoice,setLootChoice]=useState<Record<string,string>>({})
  const [achievementDraft,setAchievementDraft]=useState<Record<string,string[]>>(()=>Object.fromEntries(people.map(p=>[p.character_id,missionAchievements.filter(r=>r.mission_id===mission.id&&r.character_id===p.character_id).map(r=>r.achievement_id)])))
  const [achievementChoice,setAchievementChoice]=useState<Record<string,string>>({})
  const addAchievement=(characterId:string)=>{const id=achievementChoice[characterId];if(!id)return;setAchievementDraft(d=>({...d,[characterId]:[...new Set([...(d[characterId]||[]),id])]}));setAchievementChoice(d=>({...d,[characterId]:''}))}
  const moneyTotal=(characterId:string)=>{const m=moneyDraft[characterId];return m?Number(m.gold)*100+Number(m.silver)*10+Number(m.copper):0}
  const moneyValid=(characterId:string)=>{const m=moneyDraft[characterId];return !!m&&[m.gold,m.silver,m.copper].every(x=>/^\d+$/.test(x))&&Number.isSafeInteger(moneyTotal(characterId))&&moneyTotal(characterId)>=0&&moneyTotal(characterId)<=1000000000000}
  const addLoot=(characterId:string)=>{const id=lootChoice[characterId];if(!id||lootDraft[characterId]?.[id]!==undefined)return;setLootDraft(prev=>({...prev,[characterId]:{...prev[characterId],[id]:'1'}}))}
  const [note,setNote]=useState('')
  const [saving,setSaving]=useState(false)
  async function finish(e:FormEvent){e.preventDefault();setSaving(true)
    try {
      for(const p of people){const next=rewards[p.character_id];if(!next)continue
        const xp=Number(next.xp),pc=Number(next.pc)
        if(!Number.isSafeInteger(xp)||!Number.isSafeInteger(pc)||xp<0||pc<0||xp>1000000||pc>1000000)return
        if(xp!==p.reward_xp||pc!==p.reward_pc||next.extra!==p.reward_extra){
          if(!await editReward(mission.id,p.character_id,xp,pc,next.extra))return
        }
      }
      for(const p of people){
        if(!moneyValid(p.character_id))return
        const amount=moneyTotal(p.character_id)
        if(amount!==(p.reward_copper||0)&&!await onMoneyReward(mission.id,p.character_id,amount))return
        const edits=lootDraft[p.character_id]||{}
        const baseline=missionLoot.filter(x=>x.mission_id===mission.id&&x.character_id===p.character_id)
        const allIds=new Set([...baseline.map(x=>x.item_id),...Object.keys(edits)])
        for(const itemId of allIds){
          const next=Number(edits[itemId]||0),previous=baseline.find(x=>x.item_id===itemId)?.quantity||0
          if(!Number.isSafeInteger(next)||next<0||next>100000)return
          if(next!==previous&&!await onItemReward(mission.id,p.character_id,itemId,next))return
        }
      }
      for(const p of people){
        const previous=new Set(missionAchievements.filter(r=>r.mission_id===mission.id&&r.character_id===p.character_id).map(r=>r.achievement_id))
        const next=new Set(achievementDraft[p.character_id]||[])
        for(const id of new Set([...previous,...next])){
          if(previous.has(id)!==next.has(id) && !await onAchievementReward(mission.id,p.character_id,id,next.has(id)))return
        }
      }
      if(await onPay(note))onClose()
    }finally{setSaving(false)}
  }
  const invalid=people.some(p=>{const r=rewards[p.character_id];return !r||![r.xp,r.pc].every(x=>/^\d+$/.test(x)&&Number(x)<=1000000)||!moneyValid(p.character_id)||Object.values(lootDraft[p.character_id]||{}).some(v=>!/^\d+$/.test(v)||Number(v)>100000)})
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy&&!saving)onClose()}}><section className="card mission-modal" role="dialog" aria-modal="true" aria-labelledby="mission-close-title">
    <div className="mission-modal-header"><div><span className="overline">RECOMPENSAS FINALES</span><h3 id="mission-close-title">Cerrar «{mission.title}»</h3></div><button type="button" className="mission-icon" onClick={onClose} aria-label="Cerrar"><X size={18}/></button></div>
    <div className="mission-info"><ShieldCheck size={18}/><span>Al confirmar, la misión se completa para todos los participantes y los premios de XP, PC, monedas, objetos y logros se acreditan una sola vez, en una única operación. Los premios narrativos adicionales se registran para entrega manual.</span></div>
    {request&&<p className="hint">Entrega de {characters.find(c=>c.id===request.character_id)?.name||'un participante'}: {request.note||'Sin comentario'}</p>}
    <form className="mission-form" onSubmit={e=>void finish(e)}>
      {people.length===0&&<p className="mission-empty">Esta misión todavía no tiene personajes asignados. No habrá destinatarios para las recompensas.</p>}
      {people.map(person=>{const r=rewards[person.character_id];return <div className="mission-reward-editor" key={person.character_id}><strong>{characters.find(c=>c.id===person.character_id)?.name||'Personaje'}</strong><div className="mission-two-fields"><label>XP<input type="number" min={0} max={1000000} required value={r?.xp||'0'} onChange={e=>setRewards(x=>({...x,[person.character_id]:{...x[person.character_id],xp:e.target.value}}))}/></label><label>PC<input type="number" min={0} max={1000000} required value={r?.pc||'0'} onChange={e=>setRewards(x=>({...x,[person.character_id]:{...x[person.character_id],pc:e.target.value}}))}/></label></div><div className="inv-mission-prize"><strong><Coins size={16}/> Monedas para el personaje</strong><div className="inv-fields-3">{(['gold','silver','copper'] as const).map((coin)=><label key={coin}>{coin==='gold'?'Oro':coin==='silver'?'Plata':'Cobre'}<input aria-label={`Recompensa ${coin} para ${person.character_id}`} type="number" min={0} value={moneyDraft[person.character_id]?.[coin]||'0'} onChange={e=>setMoneyDraft(old=>({...old,[person.character_id]:{...old[person.character_id],[coin]:e.target.value}}))}/></label>)}</div></div>
      <div className="inv-mission-prize"><strong><Package size={16}/> Objetos para entregar</strong>
        {Object.entries(lootDraft[person.character_id]||{}).map(([itemId,q])=><div className="inv-mission-loot-row" key={itemId}><span>{itemCatalog.find(i=>i.id===itemId)?.name||'Objeto'}</span><input aria-label="Cantidad de recompensa" type="number" min={0} max={100000} value={q} onChange={e=>setLootDraft(old=>({...old,[person.character_id]:{...old[person.character_id],[itemId]:e.target.value}}))}/><button type="button" className="mission-button small ghost" onClick={()=>setLootDraft(old=>({...old,[person.character_id]:{...old[person.character_id],[itemId]:'0'}}))}>Quitar</button></div>)}
        <div className="inv-mission-add"><select aria-label="Elegir objeto como recompensa" value={lootChoice[person.character_id]||''} onChange={e=>setLootChoice(prev=>({...prev,[person.character_id]:e.target.value}))}><option value="">Elegir objeto del catálogo</option>{itemCatalog.filter(i=>lootDraft[person.character_id]?.[i.id]===undefined).map(i=><option value={i.id} key={i.id}>{i.name}</option>)}</select><button className="mission-button outline" type="button" onClick={()=>addLoot(person.character_id)} disabled={!lootChoice[person.character_id]}>+ Añadir</button></div>
      </div>
      <div className="inv-mission-prize"><strong><Crown size={16}/> Logros o títulos por completar la misión</strong>
       {(achievementDraft[person.character_id]||[]).map(id=><div className="inv-mission-loot-row" key={id}><span>{achievementCatalog.find(a=>a.id===id)?.name||'Logro'}</span><button type="button" className="mission-button small ghost" onClick={()=>setAchievementDraft(d=>({...d,[person.character_id]:(d[person.character_id]||[]).filter(x=>x!==id)}))}>Quitar</button></div>)}
       <div className="inv-mission-add"><select aria-label="Elegir logro para entregar" value={achievementChoice[person.character_id]||''} onChange={e=>setAchievementChoice(d=>({...d,[person.character_id]:e.target.value}))}><option value="">Elegir logro o título</option>{achievementCatalog.filter(a=>!(achievementDraft[person.character_id]||[]).includes(a.id)).map(a=><option value={a.id} key={a.id}>{a.name} · {a.category==='titulo'?'Título':'Logro'}</option>)}</select><button type="button" className="mission-button outline" disabled={!achievementChoice[person.character_id]} onClick={()=>addAchievement(person.character_id)}>+ Añadir</button></div>
      </div>
      <label>Premios narrativos adicionales (opcional)<input maxLength={800} value={r?.extra||''} onChange={e=>setRewards(x=>({...x,[person.character_id]:{...x[person.character_id],extra:e.target.value}}))} placeholder="Ej.: reconocimiento, pista especial, favor de un gremio…"/></label></div>})}
      <label>Comentario del DM (opcional)<textarea rows={2} maxLength={800} value={note} onChange={e=>setNote(e.target.value)} placeholder="Narración del cierre o motivo de la recompensa"/></label>
      <div className="mission-modal-actions"><button className="mission-button ghost" type="button" disabled={busy||saving} onClick={onClose}>Volver</button><button className="mission-button solid" type="submit" disabled={busy||saving||invalid||people.length===0}>{saving?'Aplicando…':<>Cerrar misión y acreditar <Check size={16}/></>}</button></div>
    </form>
  </section></div>
}

export function MissionsView(props:Props){
  const {character,characters,profiles,isStaff,busy,missions,participants,objectives,journal,completionRequests}=props
  const [filter,setFilter]=useState<'mias'|'todas'|'solicitudes'>(isStaff?'todas':'mias')
  const [search,setSearch]=useState('')
  const [editor,setEditor]=useState<Mission|null|undefined>(undefined)
  const [closeId,setCloseId]=useState<string|null>(null)
  const [activeReq,setActiveReq]=useState<string|null>(null)
  const [objectiveTitle,setObjectiveTitle]=useState<Record<string,string>>({})
  const [objectiveTarget,setObjectiveTarget]=useState<Record<string,string>>({})
  const [objectiveEdit,setObjectiveEdit]=useState<Record<string,string|null>>({})
  const [notes,setNotes]=useState<Record<string,string>>({})
  const [completionNotes,setCompletionNotes]=useState<Record<string,string>>({})
  const [assignDraft,setAssignDraft]=useState<Record<string,string>>({})
  const [rejectNote,setRejectNote]=useState<Record<string,string>>({})
  const label=(id:string)=>characters.find(c=>c.id===id)?.name||'Personaje'
  const ownerName=(id:string)=>profiles.find(p=>p.id===characters.find(c=>c.id===id)?.owner_id)?.display_name||'Jugador'
  const pendingProposals=missions.filter(m=>m.status==='propuesta')
  const pendingChecks=objectives.filter(o=>o.claimed_at&&!o.completed)
  const pendingCompletions=completionRequests.filter(r=>r.status==='pendiente')
  const reqCount=pendingProposals.length+pendingChecks.length+pendingCompletions.length
  const mineIds=useMemo(()=>new Set(participants.filter(p=>p.character_id===character?.id).map(p=>p.mission_id)),[participants,character?.id])
  const visible=missions.filter(m=>{
    if(!m.title.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))&&!m.description.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))return false
    if(isStaff)return filter==='solicitudes'?false:filter==='todas'?true:mineIds.has(m.id)
    const mine=mineIds.has(m.id)||(m.status==='propuesta'&&m.creator_character_id===character?.id)||(m.status==='rechazada'&&m.creator_character_id===character?.id)
    return filter==='mias'?mine:!mine&&m.visibility==='publica'&&m.status!=='propuesta'
  }).sort((a,b)=>a.status==='activa'&&b.status!=='activa'?-1:b.status==='activa'&&a.status!=='activa'?1:b.created_at.localeCompare(a.created_at))
  async function addNote(id:string){const value=(notes[id]||'').trim();if(value.length<2)return;if(await props.onJournal(id,isStaff?null:character?.id||null,value))setNotes(s=>({...s,[id]:''}))}
  async function saveObjective(id:string){const value=(objectiveTitle[id]||'').trim();if(value.length<2)return
    const ok=await props.onObjective(id,objectiveEdit[id]||null,value,objectiveTarget[id]||null)
    if(ok){setObjectiveTitle(s=>({...s,[id]:''}));setObjectiveTarget(s=>({...s,[id]:''}));setObjectiveEdit(s=>({...s,[id]:null}))}
  }
  const closing=missions.find(m=>m.id===closeId)
  const closeRequest=completionRequests.find(r=>r.id===activeReq)||null
  return <div className="stack mission-page">
    <div className="page-heading mission-heading"><div><span className="overline">CUADERNO DE AVENTURAS</span><h1>Misiones</h1><p>Cada aventura tiene sus objetivos, bitácora y recompensa. El DM valida los avances.</p></div><button type="button" className="mission-button solid" onClick={()=>setEditor(null)}><Plus size={18}/>{isStaff?'Nueva misión':'Proponer misión'}</button></div>
    <div className="mission-overview"><div><ScrollText size={20}/><strong>{missions.filter(m=>m.status==='activa').length}</strong><small>Activas</small></div><div><CheckCircle2 size={20}/><strong>{missions.filter(m=>m.status==='completada').length}</strong><small>Completadas</small></div><div><ShieldCheck size={20}/><strong>{isStaff?reqCount:completionRequests.filter(r=>r.status==='pendiente').length}</strong><small>{isStaff?'Por revisar':'Entregas pendientes'}</small></div></div>
    {isStaff&&<details className="card admin-fold mission-requests" open={reqCount>0} key={`mission-requests-${reqCount>0}`}><summary className="admin-fold-title"><div><span className="overline">BANDEJA DEL DUNGEON MASTER</span><h3>Solicitudes y avances <span className="admin-request-count">{reqCount}</span></h3></div><ChevronDown size={20}/></summary><div className="admin-fold-body mission-review-list">
      {reqCount===0?<p className="mission-empty">Sin solicitudes pendientes. Las propuestas, los objetivos por validar y las entregas aparecerán aquí.</p>:<>
        {pendingProposals.map(m=><div key={m.id} className="mission-review-row"><span className="mission-review-symbol"><NotebookPen size={19}/></span><div><strong>{m.title}</strong><small>PROPUESTA DE JUGADOR · {m.creator_character_id?label(m.creator_character_id):'Jugador'}</small><p>{m.description}</p></div><div className="mission-row-actions"><button type="button" className="mission-button ghost" disabled={busy} onClick={()=>void props.onReviewProposal(m.id,false)}>Rechazar</button><button type="button" className="mission-button solid" disabled={busy} onClick={()=>void props.onReviewProposal(m.id,true)}>Aprobar propuesta</button></div></div>)}
        {pendingChecks.map(o=><div key={o.id} className="mission-review-row"><span className="mission-review-symbol"><ClipboardCheck size={19}/></span><div><strong>{o.title}</strong><small>VALIDAR OBJETIVO · {label(o.claimed_by_character_id||'')} · {missions.find(m=>m.id===o.mission_id)?.title||'Misión'}</small></div><div className="mission-row-actions"><button type="button" className="mission-button ghost" disabled={busy} onClick={()=>void props.onReviewObjective(o.id,false)}>Rechazar</button><button type="button" className="mission-button solid" disabled={busy} onClick={()=>void props.onReviewObjective(o.id,true)}>Validar objetivo</button></div></div>)}
        {pendingCompletions.map(req=><div key={req.id} className="mission-review-row"><span className="mission-review-symbol"><Flag size={19}/></span><div><strong>{missions.find(m=>m.id===req.mission_id)?.title||'Misión'}</strong><small>FINALIZAR MISIÓN · {label(req.character_id)} · {ownerName(req.character_id)}</small><p>{req.note||'Sin comentario del jugador'}</p><label className="mission-compact-label">Respuesta (opcional)<input maxLength={800} value={rejectNote[req.id]||''} onChange={e=>setRejectNote(s=>({...s,[req.id]:e.target.value}))} placeholder="Mensaje para el jugador si rechazas"/></label></div><div className="mission-row-actions"><button type="button" className="mission-button ghost" disabled={busy} onClick={()=>void props.onReviewCompletion(req.id,false,rejectNote[req.id]||'')}>Rechazar entrega</button><button type="button" className="mission-button solid" disabled={busy} onClick={()=>{setCloseId(req.mission_id);setActiveReq(req.id)}}>Revisar recompensas <ArrowRight size={15}/></button></div></div>)}
      </>}
    </div></details>}
    <div className="mission-toolbar"><div className="skill-tabs" role="group" aria-label="Filtrar misiones"><button className={filter==='mias'?'current':''} onClick={()=>setFilter('mias')}> {isStaff?'Mi personaje':'Mis misiones'}</button><button className={filter==='todas'?'current':''} onClick={()=>setFilter('todas')}>{isStaff?'Todas':'Explorar públicas'}</button>{isStaff&&<button className={filter==='solicitudes'?'current':''} onClick={()=>setFilter('solicitudes')}>Solicitudes <span>{reqCount}</span></button>}</div><label className="skill-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar misiones…" aria-label="Buscar misiones"/></label></div>
    {filter==='solicitudes'&&isStaff?<div className="mission-info"><Flag size={18}/><span>Las solicitudes están en la bandeja desplegable de arriba. Puedes revisar las misiones completas desde «Todas».</span></div>:
    visible.length===0?<section className="card mission-empty-card"><ScrollText size={33}/><h3>Aún no hay misiones en esta sección</h3><p>{isStaff?'Crea una misión o abre «Todas» para administrar las misiones de tus jugadores.':'Puedes escribir una propuesta o esperar a que el DM te asigne una misión.'}</p><button type="button" className="mission-button solid" onClick={()=>setEditor(null)}><Plus size={16}/>{isStaff?'Crear misión':'Proponer misión'}</button></section>:
    <div className="mission-card-list">{visible.map(m=>{
      const people=participants.filter(p=>p.mission_id===m.id)
      const mine=people.find(p=>p.character_id===character?.id)
      const goals=objectives.filter(o=>o.mission_id===m.id&&(isStaff||!o.target_character_id||o.target_character_id===character?.id))
      const checked=goals.filter(o=>o.completed).length
      const total=goals.length
      const pending=completionRequests.find(req=>req.mission_id===m.id&&req.status==='pendiente')
      const noteList=journal.filter(n=>n.mission_id===m.id)
      const open=m.status==='activa',editingMission=isStaff&&open
      const canParticipate=open&&!!mine
      const unassigned=characters.filter(c=>!people.some(p=>p.character_id===c.id))
      const rewards=people.find(p=>p.character_id===character?.id)
      return <details className={`card mission-card mission-status-${m.status}`} key={m.id}>
        <summary className="mission-card-summary"><span className="mission-icon"><ScrollText size={22}/></span><span className="mission-card-main"><strong>{m.title}</strong><span className="mission-card-meta"><span className={`mission-tag ${m.status}`}>{statusLabels[m.status]}</span><span className="mission-tag subtle">{visibilityText(m.visibility)}</span>{m.origin==='jugador'&&<span className="mission-tag soft">Jugador</span>}{total>0&&<span className="mission-progress-small"><CheckCircle2 size={14}/>{checked}/{total} objetivos</span>}{isStaff&&<span className="mission-progress-small"><Users size={14}/>{people.length} personajes</span>}{pending&&<span className="mission-tag pending">Entrega pendiente</span>}</span></span><ChevronDown size={21} className="mission-summary-chevron"/></summary>
        <div className="mission-card-detail">
          <p className="mission-description">{m.description||'Sin descripción adicional.'}</p>
          {m.status==='propuesta'&&<div className="mission-info"><LockKeyhole size={16}/>Propuesta privada. Solo su autor y el DM pueden verla mientras se revisa.</div>}
          {m.status==='rechazada'&&<div className="mission-info">El DM decidió no activar esta propuesta. Puedes escribir una nueva misión con los ajustes necesarios.</div>}
          {m.status==='completada'&&<div className="mission-info complete"><Crown size={17}/>Misión finalizada. {m.closing_note||'El DM cerró esta aventura.'}</div>}
          {(canParticipate||isStaff)&&m.status==='completada'&&<div className="mission-reward-view"><Coins size={18}/><div>{isStaff?people.map(p=><p key={p.character_id}><strong>{label(p.character_id)}:</strong> {p.reward_xp} XP · {p.reward_pc} PC · {formatMoney(p.reward_copper||0)}{props.missionLoot.filter(x=>x.mission_id===m.id&&x.character_id===p.character_id).map(x=>` · ${x.quantity}× ${props.itemCatalog.find(i=>i.id===x.item_id)?.name||'Objeto'}`).join('')}{props.missionAchievements.filter(r=>r.mission_id===m.id&&r.character_id===p.character_id).map(r=>` · Logro: ${props.achievementCatalog.find(a=>a.id===r.achievement_id)?.name||'Reconocimiento'}`).join('')}{p.reward_extra&&` · Otros: ${p.reward_extra}`}</p>):rewards?<p><strong>Tu recompensa:</strong> {rewards.reward_xp} XP · {rewards.reward_pc} PC · {formatMoney(rewards.reward_copper||0)}{props.missionLoot.filter(x=>x.mission_id===m.id&&x.character_id===rewards.character_id).map(x=>` · ${x.quantity}× ${props.itemCatalog.find(i=>i.id===x.item_id)?.name||'Objeto'}`).join('')}{props.missionAchievements.filter(r=>r.mission_id===m.id&&r.character_id===rewards.character_id).map(r=>` · Logro: ${props.achievementCatalog.find(a=>a.id===r.achievement_id)?.name||'Reconocimiento'}`).join('')}{rewards.reward_extra&&` · Otros: ${rewards.reward_extra}`}</p>:null}</div></div>}
          {(open||m.status==='completada')&&<>
            <div className="mission-section"><div className="mission-subheading"><div><strong><ClipboardCheck size={18}/> Objetivos</strong><small>{checked} de {total} validados por el DM</small></div></div>
              {total===0?<p className="hint">El DM todavía no ha añadido objetivos a esta misión.</p>:<div className="mission-checklist">{goals.map(o=><div key={o.id} className={`mission-check ${o.completed?'done':''}`}><span className="mission-check-status">{o.completed?<CheckCircle2 size={21}/>:o.claimed_at?<ShieldCheck size={21}/>:<span className="mission-check-circle"/>}</span><div><strong>{o.title}</strong><small>{o.target_character_id?`Objetivo de ${label(o.target_character_id)}`:'Objetivo compartido'}{o.completed?' · Validado':o.claimed_at?' · El DM está revisando':''}</small></div>{canParticipate&&!isStaff&&!o.completed&&!o.claimed_at&&<button type="button" className="mission-button outline small" disabled={busy} onClick={()=>void props.onClaimObjective(o.id,character!.id)}>Solicitar validación</button>}{isStaff&&editingMission&&!o.completed&&<div className="mission-row-actions"><button type="button" className="mission-button outline small" disabled={busy} onClick={()=>{setObjectiveEdit(s=>({...s,[m.id]:o.id}));setObjectiveTitle(s=>({...s,[m.id]:o.title}));setObjectiveTarget(s=>({...s,[m.id]:o.target_character_id||''}))}}>Editar</button><button type="button" className="mission-button outline small" disabled={busy} onClick={()=>void props.onReviewObjective(o.id,true)}>Validar</button><button type="button" className="mission-icon" disabled={busy} title="Eliminar objetivo" onClick={()=>void props.onDeleteObjective(o.id)}><Trash2 size={15}/></button></div>}</div>)}</div>}
              {editingMission&&<details className="mission-subfold"><summary><Plus size={16}/> {objectiveEdit[m.id]?'Editar objetivo':'Añadir objetivo'} <ChevronDown size={16}/></summary><div className="mission-subfold-body"><label>Objetivo<input maxLength={240} value={objectiveTitle[m.id]||''} onChange={e=>setObjectiveTitle(s=>({...s,[m.id]:e.target.value}))} placeholder="Ej.: Encontrar las cuatro runas"/></label><label>Responsable<select value={objectiveTarget[m.id]||''} onChange={e=>setObjectiveTarget(s=>({...s,[m.id]:e.target.value}))}><option value="">Objetivo compartido</option>{people.map(p=><option key={p.character_id} value={p.character_id}>{label(p.character_id)}</option>)}</select></label><div className="mission-row-actions"><button className="mission-button solid small" type="button" disabled={busy||!(objectiveTitle[m.id]||'').trim()} onClick={()=>void saveObjective(m.id)}><Check size={15}/> Guardar objetivo</button>{objectiveEdit[m.id]&&<button className="mission-button ghost small" onClick={()=>{setObjectiveEdit(s=>({...s,[m.id]:null}));setObjectiveTitle(s=>({...s,[m.id]:''}))}}>Cancelar edición</button>}</div></div></details>}
            </div>
            <details className="mission-subfold mission-journal-fold"><summary><NotebookPen size={18}/> Bitácora <span>{noteList.length} entradas</span><ChevronDown size={17}/></summary><div className="mission-subfold-body"><div className="mission-journal-list">{noteList.length===0?<p className="hint">Todavía no se han anotado avances en esta misión.</p>:noteList.map(n=><div className="mission-journal-entry" key={n.id}><div><b>{n.character_id?label(n.character_id):'Dirección de juego'}</b><small>{new Date(n.created_at).toLocaleString('es-CL')}</small></div><p>{n.note}</p></div>)}</div>{open&&(canParticipate||isStaff)&&<form onSubmit={e=>{e.preventDefault();void addNote(m.id)}} className="mission-journal-form"><label>Nueva anotación<textarea rows={2} maxLength={2000} required minLength={2} value={notes[m.id]||''} onChange={e=>setNotes(s=>({...s,[m.id]:e.target.value}))} placeholder="¿Qué sucedió? ¿Qué pistas o avances encontraron?"/></label><button className="mission-button outline" type="submit" disabled={busy||(notes[m.id]||'').trim().length<2}><Send size={16}/> Añadir a bitácora</button></form>}</div></details>
            {canParticipate&&!isStaff&&<details className="mission-subfold mission-finish-fold"><summary><Flag size={18}/> Solicitar finalización <ChevronDown size={17}/></summary><div className="mission-subfold-body">{pending?<p className="mission-info"><ShieldCheck size={16}/>Ya hay una solicitud pendiente. El DM decidirá cuándo cerrar esta misión para todos.</p>:<form onSubmit={e=>{e.preventDefault();void props.onRequestCompletion(m.id,character!.id,completionNotes[m.id]||'')}}><label>Comentario para el DM (opcional)<textarea rows={2} maxLength={800} value={completionNotes[m.id]||''} onChange={e=>setCompletionNotes(s=>({...s,[m.id]:e.target.value}))} placeholder="Explica por qué consideras que la misión está terminada"/></label><p className="hint">El DM revisará los objetivos y decidirá si corresponde completar la misión. En misiones grupales se cierra para todos.</p><button className="mission-button solid" disabled={busy}><Send size={16}/> Enviar solicitud al DM</button></form>}</div></details>}
          </>}
          {isStaff&&m.status!=='completada'&&m.status!=='rechazada'&&<details className="mission-subfold mission-admin-fold"><summary><ShieldCheck size={18}/> Herramientas del DM <ChevronDown size={17}/></summary><div className="mission-subfold-body">
            {m.status==='propuesta'?<div className="mission-row-actions"><button className="mission-button solid" disabled={busy} onClick={()=>void props.onReviewProposal(m.id,true)}>Aprobar propuesta</button><button className="mission-button ghost" disabled={busy} onClick={()=>void props.onReviewProposal(m.id,false)}>Rechazar</button></div>:<>
              <div className="mission-row-actions"><button className="mission-button outline" onClick={()=>setEditor(m)}><NotebookPen size={16}/> Editar misión</button><button className="mission-button solid" onClick={()=>{setCloseId(m.id);setActiveReq(null)}}><Crown size={16}/> Completar y recompensar</button></div>
              <div className="mission-assignee-panel"><strong>Personajes asignados ({people.length})</strong><div className="mission-assignee-tags">{people.map(p=><span key={p.character_id}><UserRound size={13}/>{label(p.character_id)}</span>)}</div>{unassigned.length>0&&<div className="mission-row-actions"><select aria-label="Añadir personaje a misión" value={assignDraft[m.id]||''} onChange={e=>setAssignDraft(s=>({...s,[m.id]:e.target.value}))}><option value="">Selecciona personaje…</option>{unassigned.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="mission-button outline" disabled={busy||!assignDraft[m.id]} onClick={()=>void props.onAssign(m.id,assignDraft[m.id])}><Plus size={15}/> Asignar</button></div>}</div>
              <div className="mission-info"><Coins size={16}/><span>Las recompensas por personaje se configuran al pulsar «Completar y recompensar». También puedes cerrar una misión sin solicitud previa.</span></div>
            </>}
          </div></details>}
          {!isStaff&&!mine&&m.status==='activa'&&<p className="hint">Misión pública disponible para consultar. Pide al DM que la asigne a tu personaje para participar.</p>}
        </div>
      </details>
    })}</div>}
    {editor!==undefined&&<MissionEditor key={editor?.id||'new'} staff={isStaff} characters={characters} initial={editor||undefined} onClose={()=>setEditor(undefined)} busy={busy} onSave={(title,description,visibility,assignees)=>editor?props.onEdit(editor.id,title,description,visibility):props.onCreate(title,description,visibility,assignees)}/>}
    {closing&&<CloseMissionModal key={closing.id+':'+activeReq} mission={closing} people={participants.filter(p=>p.mission_id===closing.id)} characters={characters} request={closeRequest} editReward={props.onReward} itemCatalog={props.itemCatalog} missionLoot={props.missionLoot} achievementCatalog={props.achievementCatalog} missionAchievements={props.missionAchievements} onAchievementReward={props.onAchievementReward} onMoneyReward={props.onMoneyReward} onItemReward={props.onItemReward} busy={busy} onClose={()=>{setCloseId(null);setActiveReq(null)}} onPay={note=>activeReq?props.onReviewCompletion(activeReq,true,note):props.onClose(closing.id,note)}/>}
  </div>
}
