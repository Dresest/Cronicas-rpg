import {ArrowRight,Award,BookOpen,ClipboardCheck,Package,Palette,ScrollText,Shield,Swords,TrendingUp,UserRound} from 'lucide-react'
import type {Tab,Profile} from './types'
const playerTiles:[Tab,string,string,typeof Swords][]=[
 ['atributos','Atributos','Progresión y mejoras de tu personaje',TrendingUp],
 ['habilidades','Habilidades','Aprende, entrena y consulta tus poderes',Swords],
 ['inventario','Inventario','Armas, armaduras, objetos y monedas',Package],
 ['titulos','Logros y títulos','Reconocimientos y bonificaciones',Award],
 ['conocimientos','Conocimientos','Descubrimientos personales',BookOpen],
 ['misiones','Misiones','Objetivos, bitácora y recompensas',ScrollText],
]
const dmTiles:[Tab,string,string,typeof Swords][]=[
 ['admin','Panel DM','Gestionar jugadores, dados, experiencia y reglas',Shield],
 ['inventario','Objetos y entregas','Catálogo por categorías y reparto a varios jugadores',Package],
 ['bandeja','Solicitudes','Revisar pendientes de habilidades, misiones y conocimientos',ClipboardCheck],
 ['habilidades','Habilidades','Crear, modificar y asignar habilidades',Swords],
 ['misiones','Misiones','Crear misiones y asignar recompensas',ScrollText],
 ['titulos','Logros y títulos','Reconocimientos, condiciones y mejoras',Award],
 ['conocimientos','Conocimientos','Revisar propuestas y descubrimientos',BookOpen],
]
export function MoreView({onNavigate,isStaff,profile,dmPending}:{onNavigate:(tab:Tab)=>void;isStaff:boolean;profile:Profile|null;dmPending:number}){
 const tiles=isStaff?dmTiles:playerTiles
 return <div className="stack more-view"><div className="page-heading"><div><span className="overline">{isStaff?'HERRAMIENTAS DEL DM':'EXPLORAR CRÓNICAS'}</span><h1>{isStaff?'Administrar campaña':'Más opciones'}</h1><p>{isStaff?'Accesos directos para gestionar la partida. No necesitas crear un personaje como DM.':'Todo lo que necesitas para gestionar tu aventura.'}</p></div></div><div className="more-list">{tiles.map(([tab,title,desc,Icon])=><button key={tab} onClick={()=>onNavigate(tab)}><span className="more-tile-icon"><Icon size={22}/></span><span><strong>{title}{tab==='bandeja'&&dmPending>0&&<b className="more-pending">{dmPending}</b>}</strong><small>{desc}</small></span><ArrowRight size={19}/></button>)}</div><div className="more-footer-note">{isStaff?<Shield size={18}/>:<UserRound size={18}/>} {isStaff?`Panel activo: ${profile?.role==='adminInformatico'?'administración informática':'Dungeon Master'}. Accede al Panel desde el logotipo.`:'Puedes volver al personaje desde el logo o el botón inferior de inicio.'} <Palette size={18}/></div></div>
}
