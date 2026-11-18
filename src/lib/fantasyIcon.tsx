import {Beef, BookOpen, Crosshair, Droplets, Fish, Flame, FlaskConical, Heart, KeyRound, Leaf, Package, Shield, Snowflake, Sparkles, Sword, Target, Utensils, WandSparkles, Zap} from 'lucide-react'
import type {LucideIcon} from 'lucide-react'

type IconType = LucideIcon
type Category = 'arma'|'armadura'|'clave'|'objeto'|'activa'|'pasiva'|string

// Presentación únicamente: no cambia los datos, los permisos ni los efectos de juego.
// Las expresiones se prueban en orden; primero el nombre y después la descripción.
const cues: Array<{pattern: RegExp; icon: IconType}> = [
  {pattern:/\b(pez|peces|pescad[oa]s?|salmon|atun|trucha)\b/, icon:Fish},
  {pattern:/\b(carne|bistec|filete|asado|pollo|jamon)\b/, icon:Beef},
  {pattern:/\b(comida|comer|alimento|banquete|pan|fruta|sopa|cocinar|cena|desayuno|verdura)\b/, icon:Utensils},
  {pattern:/\b(fuego|llama|flama|incendio|quemar|ardiente|brasas|piromancia|infernal|meteorito)\b/, icon:Flame},
  {pattern:/\b(hielo|helado|escarcha|nieve|glacial|congelar|frio)\b/, icon:Snowflake},
  {pattern:/\b(agua|lluvia|acuatico|mareas|oceano|marea)\b/, icon:Droplets},
  {pattern:/\b(lanzar|lanzamiento|arrojad[oa]|proyectil|flecha|arco|dardo|jabalina|ballesta|disparo)\b/, icon:Crosshair},
  {pattern:/\b(espada|espadon|sable|katana|cuchillo|daga|corte|filo|hoja|estocada)\b/, icon:Sword},
  {pattern:/\b(armadura|escudo|yelmo|casco|coraza|proteccion|defensa)\b/, icon:Shield},
  {pattern:/\b(pocion|elixir|brebaje|frasco|botella|tonico)\b/, icon:FlaskConical},
  {pattern:/\b(curacion|curar|sanar|salud|vida|restauracion)\b/, icon:Heart},
  {pattern:/\b(rayo|trueno|electrico|electricidad|relampago)\b/, icon:Zap},
  {pattern:/\b(planta|bosque|naturaleza|hoja|hierba|semilla)\b/, icon:Leaf},
  {pattern:/\b(magia|magico|hechizo|conjuro|encantar|invocar|ritual)\b/, icon:WandSparkles},
  {pattern:/\b(pergamino|libro|escritura|manuscrito|grimorio)\b/, icon:BookOpen},
  {pattern:/\b(llave|reliquia|tesoro|clave|sello)\b/, icon:KeyRound},
  {pattern:/\b(precision|punteria|objetivo)\b/, icon:Target},
]
function clean(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
export function findFantasyIcon(name:string,description='',category:Category=''):IconType {
  for (const value of [name,description]) {
    const txt=clean(value)
    for (const cue of cues) if (cue.pattern.test(txt)) return cue.icon
  }
  return category==='arma'?Sword:category==='armadura'?Shield:category==='clave'?KeyRound:category==='objeto'?Package:category==='pasiva'?Shield:category==='activa'?WandSparkles:Sparkles
}
export function FantasyIcon({name,description='',category='',size=21,className}: {name:string;description?:string;category?:Category;size?:number;className?:string}){
  const Icon=findFantasyIcon(name,description,category)
  return <Icon size={size} className={className} aria-hidden />
}
