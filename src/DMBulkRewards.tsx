import { useMemo, useState, type FormEvent } from 'react'
import { Check, CheckCheck, Coins, Gift, Users, X } from 'lucide-react'
import type { Character, Profile } from './types'

type Reward = { xp: number; pc: number; gold: number; silver: number; copper: number }
type Field = keyof Reward
interface Props {
  characters: Character[]
  profiles: Profile[]
  busy: boolean
  onDistribute: (ids:string[],reward:Reward,reason:string)=>Promise<boolean>
}
const formatter = new Intl.NumberFormat('es-CL')
const defaults:Record<Field,string> = {xp:'0',pc:'0',gold:'0',silver:'0',copper:'0'}
const fields: {key:Field;label:string;max:number}[] = [
  {key:'xp',label:'Experiencia (XP)',max:10000000},
  {key:'gold',label:'Oro',max:1000000},
  {key:'silver',label:'Plata',max:1000000},
  {key:'copper',label:'Cobre',max:1000000},
  {key:'pc',label:'Puntos de combate (PC)',max:10000000},
]

export function DMBulkRewards({characters,profiles,busy,onDistribute}:Props){
  const players = useMemo(()=>characters.filter(c=>profiles.some(p=>p.id===c.owner_id&&p.role==='jugador')),[characters,profiles])
  const [ids,setIds]=useState<string[]>([])
  const [draft,setDraft]=useState<Record<Field,string>>({...defaults})
  const [reason,setReason]=useState('Recompensa de partida')
  const [confirm,setConfirm]=useState(false)
  const [sending,setSending]=useState(false)
  const selected=players.filter(p=>ids.includes(p.id))
  const values=Object.fromEntries(fields.map(({key})=>[key,Number(draft[key]||0)])) as Reward
  const numbersValid=fields.every(({key,max})=>/^\d*$/.test(draft[key])&&Number.isSafeInteger(values[key])&&values[key]>=0&&values[key]<=max)
  const anyValue=Object.values(values).some(v=>v>0)
  const valid=numbersValid&&anyValue&&selected.length>0&&reason.trim().length>=1&&reason.trim().length<=200
  const moneyCopper=values.gold*100+values.silver*10+values.copper
  const perPerson=[
    values.xp>0?`${formatter.format(values.xp)} XP`:'',
    values.pc>0?`${formatter.format(values.pc)} PC`:'',
    moneyCopper>0?`${formatter.format(values.gold)} oro · ${formatter.format(values.silver)} plata · ${formatter.format(values.copper)} cobre`:'',
  ].filter(Boolean).join(' + ')
  function toggle(id:string){setIds(prev=>prev.includes(id)?prev.filter(p=>p!==id):[...prev,id])}
  function start(e:FormEvent<HTMLFormElement>){e.preventDefault();if(valid&&!busy&&!sending)setConfirm(true)}
  async function distribute(){
    if(!valid||busy||sending)return
    setSending(true)
    try{
      const ok=await onDistribute(selected.map(x=>x.id),values,reason.trim())
      if(ok){setConfirm(false);setIds([]);setDraft({...defaults});setReason('Recompensa de partida')}
    }finally{setSending(false)}
  }
  return <>
    <section className="card dm-reward-panel" aria-labelledby="dm-reward-title">
      <header className="dm-reward-header">
        <div className="dm-reward-icon"><Gift size={23}/></div>
        <div><span className="overline">ENTREGA RÁPIDA · SIN CREAR MISIÓN</span><h3 id="dm-reward-title">Recompensas a jugadores</h3><p className="hint">Entrega experiencia, oro o PC a un jugador, a varios o a todos de una sola vez.</p></div>
      </header>
      <form onSubmit={start} className="dm-reward-form">
        <div className="dm-reward-subhead"><strong>1. ¿Quiénes recibirán la recompensa?</strong><button type="button" className="dm-select-all" disabled={!players.length||busy||sending} onClick={()=>setIds(selected.length===players.length?[]:players.map(p=>p.id))}>{selected.length===players.length&&players.length?'Desmarcar todos':'Seleccionar todos'}</button></div>
        <div className="dm-reward-recipients">
          {players.length===0?<p className="hint">Todavía no hay personajes de jugadores. Aparecerán aquí cuando los creen.</p>:players.map(c=>{
            const owner=profiles.find(p=>p.id===c.owner_id)
            const checked=ids.includes(c.id)
            return <label key={c.id} className={`dm-recipient ${checked?'checked':''}`}>
              <input type="checkbox" checked={checked} disabled={busy||sending} onChange={()=>toggle(c.id)} />
              <span><strong>{c.name}</strong><small>{owner?.display_name||'Jugador'} · Nivel y XP actuales: {formatter.format(c.xp)} XP</small></span>
              {checked&&<Check size={18} aria-hidden="true"/>}
            </label>
          })}
        </div>
        <div className="dm-reward-subhead"><strong>2. ¿Cuánto recibe cada uno?</strong><small>La misma cantidad para todos los seleccionados</small></div>
        <div className="dm-reward-fields">
          {fields.map(({key,label,max})=><label key={key} className={key==='xp'?'dm-reward-main-input':''}>{label}
            <input aria-label={label} type="number" inputMode="numeric" min={0} max={max} step={1} value={draft[key]} onChange={e=>setDraft(prev=>({...prev,[key]:e.target.value}))} disabled={busy||sending}/>
          </label>)}
        </div>
        <small className="dm-reward-exchange"><Coins size={14}/> 1 oro = 10 plata = 100 cobre. Puedes dejar en 0 lo que no quieras entregar.</small>
        <label className="dm-reward-reason">Motivo de la recompensa
          <input value={reason} maxLength={200} required onChange={e=>setReason(e.target.value)} placeholder="Por ejemplo: victoria contra el jefe" disabled={busy||sending}/>
        </label>
        <div className="dm-reward-footer"><div><strong>{selected.length} {selected.length===1?'jugador seleccionado':'jugadores seleccionados'}</strong><small>{perPerson||'Escribe XP, monedas o PC para entregar.'}</small></div><button className="button button-primary" type="submit" disabled={!valid||busy||sending}><Users size={17}/> Revisar reparto</button></div>
        {selected.length===0&&<p className="hint">Selecciona uno o más destinatarios antes de continuar.</p>}
      </form>
    </section>
    {confirm&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy&&!sending)setConfirm(false)}}>
      <section className="card dm-reward-confirm" role="dialog" aria-modal="true" aria-labelledby="dm-reward-confirm-title">
        <header><div><span className="overline">CONFIRMAR RECOMPENSA</span><h2 id="dm-reward-confirm-title">¿Entregar a {selected.length} {selected.length===1?'jugador':'jugadores'}?</h2></div><button type="button" className="inv-icon" onClick={()=>setConfirm(false)} disabled={busy||sending} aria-label="Cerrar"><X size={20}/></button></header>
        <p className="hint">Cada personaje recibirá:</p>
        <p className="dm-reward-confirm-amount">{perPerson}</p>
        <p className="hint">Motivo: {reason.trim()}</p>
        <div className="dm-reward-confirm-list">{selected.map(c=><div key={c.id}><Check size={15}/>{c.name}<small>· {profiles.find(p=>p.id===c.owner_id)?.display_name||'Jugador'}</small></div>)}</div>
        <p className="dm-reward-warning">La recompensa se enviará en una sola operación. Si algún destinatario falla, nadie recibirá el premio. La XP no sobrepasará el tope de 33.750.</p>
        <div className="dm-give-buttons"><button type="button" className="button button-outline" onClick={()=>setConfirm(false)} disabled={busy||sending}>Volver</button><button type="button" className="button button-primary" disabled={!valid||busy||sending} onClick={()=>void distribute()}>{busy||sending?'Entregando…':<><CheckCheck size={17}/> Confirmar entrega</>}</button></div>
      </section>
    </div>}
  </>
}
