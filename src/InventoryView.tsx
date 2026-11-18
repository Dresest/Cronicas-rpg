import { useMemo, useState, type FormEvent } from 'react'
import { Archive, ArrowRight, Check, ChevronDown, Coins, Crown, Edit3, FlaskConical, Gem, KeyRound, LockKeyhole, Package, Plus, Search, Shield, Sparkles, Sword, Wallet, X } from 'lucide-react'
import {FantasyIcon} from './lib/fantasyIcon'
import type { Character, CharacterItem, CharacterWallet, ItemDefinition, ItemDraft, ItemCategory } from './types'

const groups:{id:ItemCategory,title:string,description:string,Icon:typeof Package}[]=[
  {id:'arma',title:'Armas',description:'Una equipada a la vez',Icon:Sword},
  {id:'armadura',title:'Armaduras',description:'Una equipada a la vez',Icon:Shield},
  {id:'objeto',title:'Objetos',description:'Consumibles y artículos comunes',Icon:FlaskConical},
  {id:'clave',title:'Objetos clave',description:'Reliquias y piezas de historia',Icon:KeyRound},
]
const attributes=['Sabiduría','Carisma','Constitución','Destreza','Fuerza','Inteligencia'] as const
const rarities:{id:ItemDefinition['rarity'];label:string}[]=[{id:'comun',label:'Común'},{id:'poco_comun',label:'Poco común'},{id:'raro',label:'Raro'},{id:'epico',label:'Épico'},{id:'legendario',label:'Legendario'}]
const fmt=(n:number)=>new Intl.NumberFormat('es-CL').format(n)
export const formatMoney=(copper:number)=>{const gold=Math.floor(copper/100),silver=Math.floor((copper%100)/10),rest=copper%10;return `${fmt(gold)} oro · ${fmt(silver)} plata · ${fmt(rest)} cobre`}
export const splitMoney=(copper:number)=>({gold:Math.floor(copper/100),silver:Math.floor((copper%100)/10),copper:copper%10})
const baseDraft:ItemDraft={name:'',description:'',category:'objeto',rarity:'comun',bonuses:{},passive_text:'',use_resource:null,restore_amount:0,is_public:true,is_active:true}
export type InventoryProps={
 character:Character;characters:Character[];isStaff:boolean;busy:boolean;
 items:ItemDefinition[];owned:CharacterItem[];wallet:CharacterWallet|null;
 onSelectCharacter:(id:string)=>void;
 onSave:(draft:ItemDraft,id:string|null)=>Promise<boolean>;
 onGrant:(id:string,amount:number)=>Promise<boolean>;
 onAdjustMoney:(delta:number,reason:string)=>Promise<boolean>;
 onEquip:(id:string,equip:boolean)=>Promise<boolean>;
 onUse:(id:string)=>Promise<boolean>;
 compactStaff?:boolean;
}

export function ItemEditor({existing,onClose,onSave,busy}: {existing:ItemDefinition|null;onClose:()=>void;onSave:InventoryProps['onSave'];busy:boolean}){
 const [draft,setDraft]=useState<ItemDraft>(existing?{
  name:existing.name,description:existing.description,category:existing.category,rarity:existing.rarity,bonuses:existing.bonuses||{},
  passive_text:existing.passive_text,use_resource:existing.use_resource,restore_amount:existing.restore_amount,is_public:existing.is_public,is_active:existing.is_active
 }:baseDraft)
 async function save(e:FormEvent){e.preventDefault();if(await onSave({...draft,name:draft.name.trim()},existing?.id||null))onClose()}
 return <div className="modal-backdrop inventory-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
  <section className="card inventory-editor" role="dialog" aria-modal="true" aria-label="Editar objeto del inventario">
   <div className="card-header"><div><span className="overline">CATÁLOGO · DUNGEON MASTER</span><h3>{existing?'Editar objeto':'Crear objeto'}</h3></div><button className="inv-icon" type="button" onClick={onClose} aria-label="Cerrar"><X size={20}/></button></div>
   <form onSubmit={e=>void save(e)} className="inventory-editor-form">
    <label>Nombre<input required minLength={2} maxLength={90} placeholder="Ej.: Armadura del viento" value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></label>
    <label>Descripción<textarea rows={3} maxLength={2000} value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} placeholder="Historia, función o condiciones del objeto…"/></label>
    <div className="inv-fields-2"><label>Categoría<select value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value as ItemCategory,restore_amount:e.target.value==='objeto'?d.restore_amount:0}))}>{groups.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label><label>Rareza<select value={draft.rarity} onChange={e=>setDraft(d=>({...d,rarity:e.target.value as ItemDefinition['rarity']}))}>{rarities.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></label></div>
    <details className="inv-edit-fold" open><summary>Bonificaciones de atributos <ChevronDown size={18}/></summary><p className="hint">Las armas y armaduras suman sus valores al equiparse. Los objetos clave tienen su efecto mientras se posean. Introduce valores negativos para penalizaciones.</p>
     <div className="inv-bonus-grid">{attributes.map(a=><label key={a}>{a}<input type="number" min={-1000} max={1000} value={draft.bonuses[a]??0} onChange={e=>setDraft(d=>{const bonuses={...d.bonuses};const value=Number(e.target.value);if(value===0)delete bonuses[a];else bonuses[a]=value;return {...d,bonuses}})}/></label>)}</div>
    </details>
    <label>Efecto pasivo / propiedad especial<textarea rows={2} maxLength={1200} value={draft.passive_text} onChange={e=>setDraft(d=>({...d,passive_text:e.target.value}))} placeholder="Ej.: Permite respirar bajo el agua mientras esté equipada."/></label>
    {draft.category==='objeto'&&<details className="inv-edit-fold"><summary>Consumible (opcional) <ChevronDown size={18}/></summary><div className="inv-fields-2"><label>Recurso a recuperar<select value={draft.use_resource||''} onChange={e=>setDraft(d=>({...d,use_resource:e.target.value||null,restore_amount:e.target.value?d.restore_amount:0}))}><option value="">Sin efecto automático</option>{['Vida','Maná','NEM','Éter'].map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>Puntos que recupera<input type="number" min={0} max={1000000} value={draft.restore_amount} onChange={e=>setDraft(d=>({...d,restore_amount:Number(e.target.value)}))}/></label></div><p className="hint">Al utilizarlo se consume una unidad del inventario. Si recupera un recurso, no puede utilizarse cuando ese recurso está al máximo.</p></details>}
    <div className="inv-toggles"><label><input type="checkbox" checked={draft.is_public} onChange={e=>setDraft(d=>({...d,is_public:e.target.checked}))}/> Visible en el catálogo</label><label><input type="checkbox" checked={draft.is_active} onChange={e=>setDraft(d=>({...d,is_active:e.target.checked}))}/> Disponible para utilizar / equipar</label></div>
    <div className="inv-actions"><button type="button" className="inv-button subtle" onClick={onClose}>Cancelar</button><button type="submit" className="inv-button primary" disabled={busy||draft.name.trim().length<2}>{busy?'Guardando…':'Guardar objeto'}<Check size={16}/></button></div>
   </form>
  </section>
 </div>
}

function InventoryItem({item,owned,busy,isStaff,onEquip,onUse,onGrant,onEdit,hideDirectGive=false}: {
 item:ItemDefinition;owned:CharacterItem|null;busy:boolean;isStaff:boolean;
 onEquip:InventoryProps['onEquip'];onUse:InventoryProps['onUse'];onGrant:InventoryProps['onGrant'];onEdit:()=>void;hideDirectGive?:boolean;
}){
 const [quantity,setQuantity]=useState('1')
 const bonusText=Object.entries(item.bonuses||{}).filter(([,v])=>v!==0).map(([k,v])=>`${v>0?'+':''}${v} ${k}`)
 const equipable=item.category==='arma'||item.category==='armadura'
 const canUse=item.category==='objeto'&&item.is_active&&item.restore_amount>0&&!!item.use_resource
 const amount=Number(quantity)
 const valid=Number.isSafeInteger(amount)&&amount>=1&&amount<=100000
 return <article className={`inv-item ${owned?.equipped?'inv-item-equipped':''}`}>
  <div className="inv-item-title"><div className="inv-item-emblem"><FantasyIcon name={item.name} description={item.description} category={item.category} size={20}/></div><div className="inv-item-heading"><strong>{item.name}</strong><small>{rarities.find(x=>x.id===item.rarity)?.label} {owned?`· Cantidad: ${fmt(owned.quantity)}`:''}</small></div>{owned?.equipped&&<span className="inv-equipped-tag"><Check size={13}/> Equipado</span>}{isStaff&&<button className="inv-icon" onClick={onEdit} type="button" title="Editar definición"><Edit3 size={17}/></button>}</div>
  {item.description&&<p className="inv-item-description">{item.description}</p>}
  {bonusText.length>0&&<div className="inv-bonus-tags">{bonusText.map(x=><span key={x}><Sparkles size={13}/>{x}</span>)}</div>}
  {item.passive_text&&<p className="inv-item-passive"><Sparkles size={15}/><span>{item.passive_text}</span></p>}
  {item.category==='clave'&&<small className="inv-helper">Las bonificaciones y pasivas de objetos clave se activan al poseerlos.</small>}
  {canUse&&item.restore_amount>0&&<small className="inv-helper">Recupera {fmt(item.restore_amount)} de {item.use_resource}.</small>}
  <div className="inv-actions inv-item-actions">
   {owned&&equipable&&<button className={`inv-button ${owned.equipped?'subtle':'primary'}`} disabled={busy||(!owned.equipped&&!item.is_active)} onClick={()=>void onEquip(item.id,!owned.equipped)}>{owned.equipped?'Desequipar':'Equipar'}</button>}
   {owned&&canUse&&<button className="inv-button primary" disabled={busy} onClick={()=>void onUse(item.id)}>Usar uno <ArrowRight size={15}/></button>}
   {isStaff&&<div className="inv-admin-transfer"><input aria-label={`Cantidad de ${item.name} para entregar o retirar`} type="number" min={1} max={100000} value={quantity} onChange={e=>setQuantity(e.target.value)}/>{!hideDirectGive&&<button type="button" className="inv-button subtle" disabled={busy||!valid} onClick={()=>void onGrant(item.id,amount)}>+ Dar</button>}<button type="button" className="inv-button subtle" disabled={busy||!valid||!owned||owned.quantity<amount} onClick={()=>void onGrant(item.id,-amount)}>− Quitar</button></div>}
  </div>
 </article>
}

export function InventoryView({character,characters,isStaff,busy,items,owned,wallet,onSelectCharacter,onSave,onGrant,onAdjustMoney,onEquip,onUse,compactStaff=false}:InventoryProps){
 const [search,setSearch]=useState('')
 const [editor,setEditor]=useState<ItemDefinition|null|undefined>(undefined)
 const [showCatalog,setShowCatalog]=useState(false)
 const [gold,setGold]=useState('0'),[silver,setSilver]=useState('0'),[copper,setCopper]=useState('0')
 const [reason,setReason]=useState('Recompensa de partida')
 const [moneyOperation,setMoneyOperation]=useState<'dar'|'retirar'>('dar')
 const money=Number(gold)*100+Number(silver)*10+Number(copper)
 const validMoney=[gold,silver,copper].every(v=>/^\d+$/.test(v))&&Number.isSafeInteger(money)&&money>0&&money<=1000000000000
 const funds=splitMoney(wallet?.copper||0)
 const ownedItems=useMemo(()=>items.filter(i=>owned.some(o=>o.item_id===i.id)),[items,owned])
 const filtering=(rows:ItemDefinition[])=>rows.filter(i=>(i.name+' '+i.description).toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
 async function moneySubmit(e:FormEvent){e.preventDefault();if(!validMoney)return;await onAdjustMoney(money*(moneyOperation==='dar'?1:-1),reason)}
 return <div className="stack inv-page">
  {!compactStaff&&<div className="page-heading inv-heading"><div><span className="overline">PERTENENCIAS DEL AVENTURERO</span><h1>Inventario</h1><p>Equipo, objetos, tesoros y dinero de tu personaje.</p></div>{isStaff&&<button className="inv-button primary" type="button" onClick={()=>setEditor(null)}><Plus size={17}/> Crear objeto</button>}</div>}
  {isStaff&&!compactStaff&&<div className="card inv-character-bar"><label><span>Personaje administrado</span><select value={character.id} onChange={e=>onSelectCharacter(e.target.value)}>{characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><span className="hint">Puedes asignar o retirar objetos individualmente; el jugador no puede editar cantidades ni dinero.</span></div>}
  <div className="inv-overview"><div><Package size={21}/><span><strong>{fmt(ownedItems.length)}</strong><small>Tipos de objetos</small></span></div><div><Shield size={21}/><span><strong>{owned.filter(o=>o.equipped).length}/2</strong><small>Piezas equipadas</small></span></div><div><Coins size={21}/><span><strong>{fmt(funds.gold)} oro</strong><small>{fmt(funds.silver)} plata · {fmt(funds.copper)} cobre</small></span></div></div>
  <details className="card inv-fold" open><summary><span><Wallet size={21}/><strong>Bolsa de monedas</strong><small>Oro, plata y cobre</small></span><ChevronDown size={21}/></summary><div className="inv-fold-body"><div className="inv-money-grid"><div><Crown size={20}/><strong>{fmt(funds.gold)}</strong><small>Oro</small></div><div><Gem size={20}/><strong>{fmt(funds.silver)}</strong><small>Plata</small></div><div><Coins size={20}/><strong>{fmt(funds.copper)}</strong><small>Cobre</small></div></div><p className="hint">Equivalencia: 1 oro = 10 plata = 100 cobre; 1 plata = 10 cobre. El dinero pertenece al personaje.</p>
   {isStaff&&<form className="inv-money-editor" onSubmit={e=>void moneySubmit(e)}><div className="inv-fields-3"><label>Oro<input type="number" min={0} value={gold} onChange={e=>setGold(e.target.value)}/></label><label>Plata<input type="number" min={0} value={silver} onChange={e=>setSilver(e.target.value)}/></label><label>Cobre<input type="number" min={0} value={copper} onChange={e=>setCopper(e.target.value)}/></label></div><div className="inv-fields-2"><label>Movimiento<select value={moneyOperation} onChange={e=>setMoneyOperation(e.target.value as 'dar'|'retirar')}><option value="dar">Añadir</option><option value="retirar">Retirar</option></select></label><label>Motivo<input maxLength={200} value={reason} onChange={e=>setReason(e.target.value)}/></label></div><button className="inv-button primary" disabled={busy||!validMoney}>{moneyOperation==='dar'?'Entregar monedas':'Retirar monedas'}</button></form>}
  </div></details>
  <label className="inv-search"><Search size={18}/><input aria-label="Buscar en inventario" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar objeto, arma o armadura…"/></label>
  {groups.map((g,idx)=>{const groupItems=filtering(ownedItems.filter(i=>i.category===g.id));return <details key={g.id} className="card inv-fold" open={undefined} /* navegador conserva el estado desplegado */>
   <summary><span><g.Icon size={21}/><strong>{g.title} <em>{groupItems.length}</em></strong><small>{g.description}</small></span><ChevronDown size={21}/></summary>
   <div className="inv-fold-body">{groupItems.length===0?<p className="empty">{search?'No hay coincidencias.':'Tu personaje todavía no tiene objetos de esta categoría.'}</p>:<div className="inv-item-grid">{groupItems.map(i=><InventoryItem key={i.id} item={i} owned={owned.find(x=>x.item_id===i.id)||null} busy={busy} isStaff={isStaff} onEquip={onEquip} onUse={onUse} onGrant={onGrant} hideDirectGive={compactStaff} onEdit={()=>setEditor(i)}/>)}</div>}{idx===0&&<p className="hint">Las bonificaciones de las piezas equipadas se aplican automáticamente a los atributos.</p>}</div>
  </details>})}
  {isStaff&&!compactStaff&&<details className="card inv-fold" open={showCatalog} onToggle={e=>setShowCatalog(e.currentTarget.open)}><summary><span><Archive size={21}/><strong>Catálogo y asignación del DM <em>{items.length}</em></strong><small>Entrega cualquier objeto a este personaje</small></span><ChevronDown size={21}/></summary><div className="inv-fold-body"><p className="hint">Puedes entregar artículos del catálogo aunque sean secretos. Solo sus propietarios podrán verlos.</p><div className="inv-item-grid">{filtering(items).length===0?<p className="empty">No se encontraron objetos.</p>:filtering(items).map(i=><InventoryItem key={i.id} item={i} owned={owned.find(x=>x.item_id===i.id)||null} busy={busy} isStaff={isStaff} onEquip={onEquip} onUse={onUse} onGrant={onGrant} hideDirectGive={compactStaff} onEdit={()=>setEditor(i)}/>)}</div></div></details>}
  <div className="inv-info"><LockKeyhole size={18}/><span>Los objetos y el dinero se otorgan por el DM o como recompensas de misiones. Equipar o desequipar no modifica los atributos base ni consume PC.</span></div>
  {editor!==undefined&&<ItemEditor key={editor?.id||'new'} existing={editor} busy={busy} onSave={onSave} onClose={()=>setEditor(undefined)}/>}
 </div>
}
