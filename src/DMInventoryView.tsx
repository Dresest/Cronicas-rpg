import { useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Archive, Check, CheckCheck, ChevronDown, Edit3, Package, Plus, Search, ShieldCheck, Users, WandSparkles, X } from 'lucide-react'
import { FantasyIcon } from './lib/fantasyIcon'
import { ItemEditor, InventoryView } from './InventoryView'
import {AIGeneratorDialog} from './AIGeneratorDialog'
import type { Character, CharacterItem, CharacterWallet, ItemDefinition, ItemDraft, Profile } from './types'

const categories = [
 {id:'vida',label:'Vida',matches:(i:ItemDefinition)=>i.use_resource==='Vida'&&i.restore_amount>0},
 {id:'mana',label:'Maná',matches:(i:ItemDefinition)=>i.use_resource==='Maná'&&i.restore_amount>0},
 {id:'nem',label:'NEM',matches:(i:ItemDefinition)=>i.use_resource==='NEM'&&i.restore_amount>0},
 {id:'eter',label:'Éter',matches:(i:ItemDefinition)=>i.use_resource==='Éter'&&i.restore_amount>0},
 {id:'cuerdas',label:'Cuerdas',matches:(i:ItemDefinition)=>i.category==='objeto'&&/\bcuerda\b/i.test(i.name)},
 {id:'armas',label:'Armas',matches:(i:ItemDefinition)=>i.category==='arma'},
 {id:'armaduras',label:'Armaduras',matches:(i:ItemDefinition)=>i.category==='armadura'&&i.name!=='Ropaje Común'},
 {id:'ropaje',label:'Ropaje inicial',matches:(i:ItemDefinition)=>i.name==='Ropaje Común'},
 {id:'otros',label:'Otros objetos',matches:(i:ItemDefinition)=>i.category==='objeto'&&i.restore_amount<=0&&!/\bcuerda\b/i.test(i.name)},
 {id:'clave',label:'Objetos clave',matches:(i:ItemDefinition)=>i.category==='clave'},
] as const
const aiUiEnabled=import.meta.env.VITE_AI_GENERATION_ENABLED==='true'
const rarityLabels:Record<ItemDefinition['rarity'],string>={comun:'Común',poco_comun:'Poco común',raro:'Raro',epico:'Épico',legendario:'Legendario'}

type Props={
 characters:Character[]; profiles:Profile[]; selectedCharacter:Character|null;
 items:ItemDefinition[]; owned:CharacterItem[];wallet:CharacterWallet|null;
 busy:boolean; onSelectCharacter:(id:string)=>void;
 onSave:(draft:ItemDraft,id:string|null)=>Promise<boolean>;
 onBulkGrant:(itemId:string,ids:string[],quantity:number)=>Promise<boolean>;
 onGrant:(itemId:string,quantity:number)=>Promise<boolean>;
 onAdjustMoney:(delta:number,reason:string)=>Promise<boolean>;
 onEquip:(id:string,equip:boolean)=>Promise<boolean>;
 onUse:(id:string)=>Promise<boolean>;
}

export function DMInventoryView({characters,profiles,selectedCharacter,items,owned,wallet,busy,onSelectCharacter,onSave,onBulkGrant,onGrant,onAdjustMoney,onEquip,onUse}:Props){
 const [search,setSearch]=useState('')
 const [category,setCategory]=useState('vida')
 const [editor,setEditor]=useState<ItemDefinition|null|undefined>(undefined)
 const [aiOpen,setAiOpen]=useState(false)
 const [aiItem,setAiItem]=useState<Partial<ItemDraft>|null>(null)
 const [toGive,setToGive]=useState<ItemDefinition|null>(null)
 const [recipients,setRecipients]=useState<string[]>([])
 const [quantity,setQuantity]=useState('1')
 const [showInventory,setShowInventory]=useState(false)
 const players=useMemo(()=>characters.filter(c=>profiles.some(p=>p.id===c.owner_id&&p.role==='jugador')),[characters,profiles])
 const availableGroups=useMemo(()=>categories.map(g=>({...g,items:items.filter(g.matches)})).filter(g=>g.items.length>0),[items])
 const normalized=search.trim().toLocaleLowerCase('es')
 const matches=(i:ItemDefinition)=>(i.name+' '+i.description+' '+rarityLabels[i.rarity]+' '+i.use_resource).toLocaleLowerCase('es').includes(normalized)
 const matchesCategory=(i:ItemDefinition)=>(category==='all'||(availableGroups.find(g=>g.id===category)?.matches(i)??false))&&matches(i)
 const listed=items.filter(matchesCategory)
 const amount=Number(quantity)
 const validAmount=/^\d+$/.test(quantity)&&Number.isSafeInteger(amount)&&amount>=1&&amount<=100000
 const selectedRecipients=players.filter(c=>recipients.includes(c.id))
 const groupFor=(item:ItemDefinition)=>availableGroups.find(g=>g.matches(item))?.label??'Objeto'
 const closeGive=()=>{if(!busy){setToGive(null);setRecipients([]);setQuantity('1')}}
 const openGive=(item:ItemDefinition)=>{setToGive(item);setRecipients([]);setQuantity('1')}
 const toggleRecipient=(id:string)=>setRecipients(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])
 async function give(e:FormEvent){e.preventDefault();if(!toGive||!validAmount||selectedRecipients.length===0||busy)return;
  if(await onBulkGrant(toGive.id,selectedRecipients.map(x=>x.id),amount))closeGive()
 }
 return <div className="stack dm-inventory-page">
  <div className="page-heading dm-inventory-heading"><div><span className="overline">DUNGEON MASTER · GESTIÓN</span><h1>Catálogo de objetos</h1><p>Busca un objeto, elige los personajes y entrégalo en segundos.</p></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{aiUiEnabled&&<button className="inv-button subtle" onClick={()=>setAiOpen(true)} type="button"><WandSparkles size={18}/> Crear con IA</button>}<button className="inv-button primary" onClick={()=>{setAiItem(null);setEditor(null)}} type="button"><Plus size={18}/> Crear objeto</button></div></div>
  <div className="dm-quick-guide"><ShieldCheck size={19}/><span><strong>Entrega rápida:</strong> escoge una categoría → pulsa <b>Dar</b> → selecciona jugadores → confirma.</span><span className="dm-count">{items.length} objetos</span></div>
  <label className="inv-search dm-search"><Search size={19}/><input value={search} onChange={e=>{setSearch(e.target.value);if(e.target.value.trim())setCategory('all')}} placeholder="Buscar por nombre, efecto o rareza…" aria-label="Buscar objetos del catálogo"/>{search&&<button type="button" onClick={()=>setSearch('')} title="Limpiar búsqueda" aria-label="Limpiar búsqueda"><X size={17}/></button>}</label>
  <div className="dm-category-tabs" role="group" aria-label="Filtrar objetos por tipo">
   <button type="button" className={category==='all'?'active':''} onClick={()=>setCategory('all')} aria-pressed={category==='all'}>Todos <span>{items.length}</span></button>
   {availableGroups.map(g=><button key={g.id} type="button" className={category===g.id?'active':''} aria-pressed={category===g.id} onClick={()=>setCategory(g.id)}>{g.label} <span>{g.items.length}</span></button>)}
  </div>
  {listed.length===0?<div className="card dm-empty"><Package size={26}/><strong>No hay objetos que coincidan.</strong><p>Prueba con otra categoría o borra el texto de búsqueda.</p><button className="inv-button subtle" onClick={()=>{setSearch('');setCategory('all')}}>Mostrar todos</button></div>:<div className="dm-catalog-sections">
   {availableGroups.filter(g=>category==='all'||g.id===category).map(g=>{
    const groupItems=g.items.filter(matches);if(groupItems.length===0)return null
    return <section key={g.id} className="dm-catalog-section" aria-label={g.label}>
     <div className="dm-category-heading"><h2>{g.label}</h2><span>{groupItems.length} {groupItems.length===1?'objeto':'objetos'}</span></div>
     <div className="dm-card-grid">{groupItems.map(item=>{
      const bonuses=Object.entries(item.bonuses??{}).filter(([,value])=>value!==0)
      const effect=item.restore_amount>0?`Recupera +${item.restore_amount} ${item.use_resource}`:bonuses.length?bonuses.map(([key,val])=>`${val>0?'+':''}${val} ${key}`).join(' · '):''
      return <article className="dm-catalog-card" key={item.id}>
       <div className="dm-card-top"><span className="dm-card-symbol"><FantasyIcon name={item.name} description={item.description} category={item.category} size={20}/></span><div className="dm-card-title"><strong>{item.name}</strong><small>{rarityLabels[item.rarity]}{!item.is_active?' · Inactivo':''}</small></div><button className="dm-edit-button" type="button" title={`Editar ${item.name}`} aria-label={`Editar ${item.name}`} onClick={()=>setEditor(item)}><Edit3 size={17}/></button></div>
       {effect&&<span className="dm-item-effect">{effect}</span>}
       {item.description&&<p className="dm-item-description">{item.description}</p>}
       <div className="dm-card-actions"><button className="inv-button primary" type="button" disabled={!item.is_active||busy} onClick={()=>openGive(item)}><Users size={16}/> Dar a jugadores <ArrowRight size={15}/></button></div>
      </article>
     })}</div>
    </section>
   })}
  </div>}
  <details className="card inv-fold dm-inventory-advanced" open={showInventory} onToggle={e=>setShowInventory(e.currentTarget.open)}>
   <summary><span><Archive size={21}/><strong>Administrar inventario individual</strong><small>Retirar objetos, equipamiento y monedas de un jugador</small></span><ChevronDown size={21}/></summary>
   <div className="inv-fold-body">{players.length===0?<p className="empty">Los inventarios aparecerán aquí cuando los jugadores creen sus personajes.</p>:<>
    <label className="dm-character-choice">Personaje a administrar<select value={players.some(c=>c.id===selectedCharacter?.id)?selectedCharacter!.id:''} onChange={e=>onSelectCharacter(e.target.value)}><option value="" disabled>Selecciona un personaje</option>{players.map(c=><option key={c.id} value={c.id}>{c.name} · {profiles.find(p=>p.id===c.owner_id)?.display_name||'Jugador'}</option>)}</select></label>
    {selectedCharacter&&players.some(c=>c.id===selectedCharacter.id)?<InventoryView character={selectedCharacter} characters={players} isStaff busy={busy} items={items} owned={owned} wallet={wallet} onSelectCharacter={onSelectCharacter} onSave={onSave} onGrant={onGrant} onAdjustMoney={onAdjustMoney} onEquip={onEquip} onUse={onUse} compactStaff/>:<p className="hint">Selecciona un jugador para retirar objetos o modificar sus monedas.</p>}
   </>}</div>
  </details>
  {aiOpen&&<AIGeneratorDialog kind="item" onClose={()=>setAiOpen(false)} onGenerated={value=>{setAiItem(value as Partial<ItemDraft>);setEditor(null);setAiOpen(false)}}/>}
  {editor!==undefined&&<ItemEditor key={editor?.id||'new-'+(aiItem?.name||'manual')} existing={editor} seed={aiItem||undefined} busy={busy} onSave={onSave} onClose={()=>{setEditor(undefined);setAiItem(null)}}/>}
  {toGive&&<div className="modal-backdrop inventory-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)closeGive()}}>
   <section className="card dm-give-modal" role="dialog" aria-modal="true" aria-labelledby="dm-give-heading">
    <header className="dm-give-heading"><div><span className="overline">ENTREGAR OBJETO</span><h2 id="dm-give-heading">¿A quién se lo entregamos?</h2><p>{toGive.name} · {groupFor(toGive)}</p></div><button className="inv-icon" type="button" onClick={closeGive} disabled={busy} aria-label="Cerrar"><X size={20}/></button></header>
    <form onSubmit={e=>void give(e)} className="dm-give-form">
     <label className="dm-give-quantity">Cantidad para cada personaje<input type="number" inputMode="numeric" min={1} max={100000} step={1} required value={quantity} onChange={e=>setQuantity(e.target.value)} disabled={busy}/></label>
     <div className="dm-give-player-heading"><strong>Selecciona destinatarios</strong><button className="dm-select-all" type="button" disabled={busy||players.length===0} onClick={()=>setRecipients(selectedRecipients.length===players.length?[]:players.map(c=>c.id))}>{selectedRecipients.length===players.length&&players.length>0?'Desmarcar todos':'Seleccionar todos'}</button></div>
     <div className="dm-recipient-list">{players.length===0?<p className="empty">Aún no hay personajes de jugadores. Puedes crear el catálogo y entregar los objetos cuando comiencen la aventura.</p>:players.map(c=>{
      const owner=profiles.find(p=>p.id===c.owner_id)
      return <label className={`dm-recipient ${recipients.includes(c.id)?'checked':''}`} key={c.id}><input type="checkbox" checked={recipients.includes(c.id)} onChange={()=>toggleRecipient(c.id)} disabled={busy}/><span><strong>{c.name}</strong><small>{owner?.display_name||'Jugador'} · {c.class_name}</small></span>{recipients.includes(c.id)&&<Check size={19}/>}</label>
     })}</div>
     <p className="dm-give-summary" aria-live="polite">{selectedRecipients.length===0?'Selecciona al menos un personaje.':`${amount||0} unidad${amount===1?'':'es'} por personaje · ${selectedRecipients.length} destinatario${selectedRecipients.length===1?'':'s'} · ${validAmount?amount*selectedRecipients.length:0} en total`}</p>
     <div className="dm-give-buttons"><button className="inv-button subtle" type="button" onClick={closeGive} disabled={busy}>Cancelar</button><button className="inv-button primary" type="submit" disabled={busy||!validAmount||selectedRecipients.length===0}>{busy?'Entregando…':<><CheckCheck size={17}/> Confirmar entrega</>}</button></div>
    </form>
   </section>
  </div>}
 </div>
}
