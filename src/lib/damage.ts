import type {Character,CharacterItem,ItemDefinition} from '../types'

export const legalBaseDice=[4,6,8,10,12,20] as const
export function equippedSlot(item:ItemDefinition):string|null{
 return item.equip_slot||(item.category==='arma'?'arma_principal':item.category==='armadura'?'armadura':null)
}
export function equippedItems(items:ItemDefinition[], owned:CharacterItem[]){
 return owned.filter(ci=>ci.equipped&&ci.quantity>0).flatMap(ci=>{
  const item=items.find(x=>x.id===ci.item_id)
  return item&&item.is_active?[item]:[]
 })
}
export function equippedWeapon(items:ItemDefinition[],owned:CharacterItem[]){
 const all=equippedItems(items,owned)
 return all.find(i=>equippedSlot(i)==='arma_principal')||all.find(i=>equippedSlot(i)==='arma_secundaria')
}
export function damageNotation(character:Character,weapon?:ItemDefinition){
 const die=character.base_damage_die||8
 const n=weapon?.damage_dice_count||0, sides=weapon?.damage_die_sides||0
 const fixed=weapon?.damage_bonus||0
 return `1d${die}${n&&sides?` + ${n}d${sides}`:''}${fixed?` ${fixed>0?'+':'−'} ${Math.abs(fixed)}`:''}`
}
export function rollFair(sides:number){
 const max=2**32,limit=Math.floor(max/sides)*sides
 const r=new Uint32Array(1)
 do{crypto.getRandomValues(r)}while(r[0]>=limit)
 return 1+(r[0]%sides)
}
export function rollAttack(character:Character,weapon?:ItemDefinition){
 const die=character.base_damage_die||8
 const base=rollFair(die)
 const extra=Array.from({length:weapon?.damage_dice_count||0},()=>rollFair(weapon?.damage_die_sides||4))
 const fixed=weapon?.damage_bonus||0
 return {base,extra,fixed,total:base+extra.reduce((s,x)=>s+x,0)+fixed}
}
