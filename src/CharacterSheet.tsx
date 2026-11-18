import {useEffect,useState,type ChangeEvent} from 'react'
import {Camera,Dices,Shield,Sword,UserRound,Package} from 'lucide-react'
import {supabase} from './lib/supabase'
import {ChosenCompetences} from './CompetenceView'
import {damageNotation,equippedItems,equippedSlot,legalBaseDice} from './lib/damage'
import type {Character,CharacterItem,ItemDefinition,Attribute,EffectiveAttribute,CharacterProficiency,Resource} from './types'

type Props={character:Character;items:ItemDefinition[];owned:CharacterItem[];attributes:Attribute[];effective:EffectiveAttribute[];proficiency:CharacterProficiency|null;resources:Resource[];editable:boolean;onDie:(sides:number)=>Promise<boolean>;onPortraitSaved:(path:string)=>Promise<void>;onCombat:()=>void;onInventory:()=>void;onError:(message:string)=>void}
const scoreOrder=['Fuerza','Destreza','Constitución','Inteligencia','Sabiduría','Carisma']
async function optimizePicture(file:File):Promise<Blob>{
 if(file.size>15*1024*1024)throw new Error('La fotografía original no puede superar los 15 MB.')
 if(!file.type.startsWith('image/'))throw new Error('Selecciona una fotografía válida.')
 let bitmap:ImageBitmap|null=null
 try{
  bitmap=await createImageBitmap(file)
  const factor=Math.min(1,1200/Math.max(bitmap.width,bitmap.height))
  const canvas=document.createElement('canvas')
  canvas.width=Math.max(1,Math.round(bitmap.width*factor));canvas.height=Math.max(1,Math.round(bitmap.height*factor))
  const ctx=canvas.getContext('2d')
  if(!ctx)throw new Error('No se pudo procesar la fotografía')
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height)
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo comprimir la fotografía')),'image/webp',0.78))
  if(blob.type!=='image/webp'||blob.size>2*1024*1024)throw new Error('No se pudo comprimir la foto a WebP de 2 MB o menos.')
  return blob
 }finally{bitmap?.close()}
}
export function CharacterSheet({character,items,owned,attributes,effective,proficiency,resources,editable,onDie,onPortraitSaved,onCombat,onInventory,onError}:Props){
 const [photo,setPhoto]=useState('')
 const [uploading,setUploading]=useState(false)
 const [dieBusy,setDieBusy]=useState(false)
 const equipped=equippedItems(items,owned)
 const main=equipped.find(x=>equippedSlot(x)==='arma_principal')
 const secondary=equipped.find(x=>equippedSlot(x)==='arma_secundaria')
 const armor=equipped.find(x=>equippedSlot(x)==='armadura')
 const shield=equipped.find(x=>equippedSlot(x)==='escudo')
 const accessories=equipped.filter(x=>equippedSlot(x)==='accesorio')
 const equippedWeapon=main||secondary
 useEffect(()=>{
  let active=true
  setPhoto('')
  if(character.portrait_path){
   void supabase.storage.from('character-portraits').createSignedUrl(character.portrait_path,3600).then(({data,error})=>{
    if(active&&data&&!error)setPhoto(`${data.signedUrl}${data.signedUrl.includes('?')?'&':'?'}refresh=${Date.now()}`)
   })
  }
  return ()=>{active=false}
 },[character.id,character.portrait_path])
 async function upload(event:ChangeEvent<HTMLInputElement>){
  const f=event.target.files?.[0];event.target.value='';if(!f)return
  setUploading(true)
  try{
   const blob=await optimizePicture(f)
   const path=`${character.owner_id}/${character.id}/portrait.webp`
   const {error}=await supabase.storage.from('character-portraits').upload(path,blob,{contentType:'image/webp',upsert:true,cacheControl:'60'})
   if(error)throw error
   const {error:saveError}=await supabase.rpc('save_my_portrait',{p_character_id:character.id,p_path:path})
   if(saveError)throw saveError
   const {data,error:signError}=await supabase.storage.from('character-portraits').createSignedUrl(path,3600)
   if(signError)throw signError
   setPhoto(`${data.signedUrl}&refresh=${Date.now()}`)
   await onPortraitSaved(path)
  }catch(err){onError(err instanceof Error?err.message:'No se pudo subir la fotografía')}
  finally{setUploading(false)}
 }
 async function changeDie(sides:number){
  setDieBusy(true)
  try{await onDie(sides)}finally{setDieBusy(false)}
 }
 return <section className="card character-sheet" aria-label="Hoja de personaje">
  <header className="character-sheet-header">
   <div className="character-sheet-photo">{photo?<img src={photo} alt={`Retrato de ${character.name}`}/>:<UserRound size={43}/>}{editable&&<label className="character-photo-upload" title="Subir fotografía optimizada"><Camera size={17}/><input type="file" accept="image/*" aria-label="Subir fotografía del personaje" onChange={e=>void upload(e)} disabled={uploading}/></label>}</div>
   <div className="character-sheet-identity"><span className="overline">FICHA DE AVENTURERO</span><h2>{character.name}</h2><p>{character.species||'Especie sin definir'} · {character.class_name}</p>{uploading&&<small>Optimizando y subiendo fotografía…</small>}</div>
  </header>
  <div className="character-sheet-attributes">
   {scoreOrder.map(name=>{const a=attributes.find(x=>x.attribute_key===name),value=effective.find(x=>x.attribute_key===name)?.total_score??a?.base_score??0;return <div className="character-sheet-attribute" key={name}><small>{name}</small><strong>{value}</strong></div>})}
  </div>
  <div className="character-sheet-resources">{resources.filter(x=>['Vida','Maná','NEM','Éter'].includes(x.name)).map(r=><div className="character-sheet-resource" key={r.id}><small>{r.name}</small><strong>{r.current_value} <span>/ {r.max_value}</span></strong></div>)}</div>
  <div className="character-sheet-row"><div><h3>Competencias</h3>{proficiency?.primary_attribute?<ChosenCompetences proficiency={proficiency} attributes={attributes} effective={effective} hideHint/>:<p className="hint">Selecciona las competencias en Atributos.</p>}</div></div>
  <div className="character-sheet-row"><h3><Dices size={18}/> Dado de daño base</h3><div className="character-sheet-dice-picker"><div className="character-dice-buttons">{legalBaseDice.map(n=><button key={n} type="button" className={(character.base_damage_die||8)===n?'selected':''} aria-pressed={(character.base_damage_die||8)===n} disabled={!editable||dieBusy} onClick={()=>void changeDie(n)}>d{n}</button>)}</div><small>{editable?'Se guarda automáticamente y se aplica a la calculadora.':'El jugador configura su propio dado.'}</small></div></div>
  <div className="character-sheet-row"><h3><Shield size={18}/> Equipamiento</h3><div className="character-equipment-grid">{[
   ['Arma principal',main],['Arma secundaria',secondary],['Armadura',armor],['Escudo',shield],
  ].map(([label,raw])=>{const item=raw as ItemDefinition|undefined;return <div key={label as string} className="character-equipment-row"><span>{label as string}</span><b>{item?.name||'Sin equipar'}</b>{item&&<small>{item.damage_bonus?`${item.damage_bonus>0?'+':''}${item.damage_bonus} daño`:''}{item.damage_dice_count?` · ${item.damage_dice_count}d${item.damage_die_sides}`:''}</small>}</div>})}<div className="character-equipment-row"><span>Accesorios</span><b>{accessories.length?accessories.map(i=>i.name).join(' · '):'Sin equipar'}</b></div></div>
   <div className="character-sheet-attack"><Sword size={20}/><div><small>Daño del ataque · arma principal</small><strong>{damageNotation(character,equippedWeapon)}</strong></div><button type="button" className="button button-primary" onClick={onCombat}>Calcular</button></div>
   <button type="button" className="button button-outline" onClick={onInventory}><Package size={17}/> Gestionar equipo en Inventario</button>
  </div>
 </section>
}
