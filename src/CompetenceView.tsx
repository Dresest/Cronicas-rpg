import {useEffect,useMemo,useState} from 'react'
import {Award,BookOpen,Check,ChevronDown,LockKeyhole,ShieldCheck,Sparkles} from 'lucide-react'
import type {Attribute,Character,CharacterProficiency,EffectiveAttribute,Threshold} from './types'

export const campaignClasses=['Bárbaro','Bardo','Brujo','Clérigo','Druida','Explorador','Guerrero','Hechicero','Mago','Monje','Paladín','Pícaro'] as const
export const proficiencySkills: Record<string,string[]>={
  Fuerza:['Atletismo'],
  Destreza:['Acrobacias','Juego de manos','Sigilo'],
  Constitución:[],
  Inteligencia:['Arcanos','Historia','Investigación','Naturaleza','Religión'],
  Sabiduría:['Medicina','Percepción','Perspicacia','Supervivencia','Trato animal'],
  Carisma:['Engañar','Interpretar','Intimidar','Persuadir'],
}
export const campaignAttributes=['Fuerza','Destreza','Constitución','Inteligencia','Sabiduría','Carisma'] as const

const signed=(n:number)=>n>0?`+${n}`:String(n)

const skillAttribute=(skill:string):string=>Object.entries(proficiencySkills).find(([,list])=>list.includes(skill))?.[0]||''

/** Lista de selección: las habilidades pertenecen a cualquier atributo.
 * Las competencias confirmadas previamente se mantienen bloqueadas. */
function SkillPicker({selected,locked,onChange,disabled}: {
  selected:string[];locked:string[];onChange:(skills:string[])=>void;disabled:boolean;
}) {
  return <div className="campaign-skill-selector">
    <p className="hint"><b>{selected.length} de 2 habilidades seleccionadas.</b> Puedes combinar categorías, por ejemplo Atletismo (Fuerza) y Acrobacias (Destreza).</p>
    <div className="campaign-skill-groups">{campaignAttributes.filter(attr=>proficiencySkills[attr].length>0).map(attr=>
      <div key={attr} className="campaign-skill-group">
        <h5>{attr}</h5>
        <div className="campaign-skill-choices">{proficiencySkills[attr].map(skill=>{
          const isSelected=selected.includes(skill)
          const isLocked=locked.includes(skill)
          return <label key={skill} className={isSelected?'selected':''}>
            <input type="checkbox" checked={isSelected}
              disabled={disabled||isLocked||(!isSelected&&selected.length>=2)}
              onChange={()=>onChange(isSelected?selected.filter(s=>s!==skill):[...selected,skill])}/>
            <span>{skill}</span>{isLocked&&<LockKeyhole size={14} aria-label="Elección anterior permanente"/>}
          </label>
        })}</div>
      </div>
    )}</div>
  </div>
}

export function ChosenCompetences({proficiency,attributes,effective,compact=false,hideHint=false}: {proficiency:CharacterProficiency|null;attributes:Attribute[];effective:EffectiveAttribute[];compact?:boolean;hideHint?:boolean}) {
  if (!proficiency?.primary_attribute) return <p className="muted">Aún no has elegido tu atributo principal.</p>
  return <div className={`campaign-competence-results${compact?' campaign-competence-results-compact':''}`}>
    {!compact&&<div className="campaign-competence-line"><span>Competencia del personaje</span><strong>{signed(proficiency.proficiency_bonus)}</strong></div>}
    {proficiency.selected_skills.length===0?<p className="hint">Todavía no tienes habilidades seleccionadas. Puedes elegir dos de cualquier atributo.</p>:<div className="campaign-trained-list">
      {proficiency.selected_skills.map(skill=>{
        const attribute=skillAttribute(skill)
        const score=effective.find(a=>a.attribute_key===attribute)?.total_score ?? attributes.find(a=>a.attribute_key===attribute)?.base_score ?? 0
        return <div className="campaign-trained-row" key={skill}>
          <span><Check size={16}/><span>{skill}<small className="campaign-trained-attribute">{attribute}</small></span></span>
          <strong>{signed(score+proficiency.proficiency_bonus)}</strong>
        </div>
      })}
    </div>}
    {!compact&&!hideHint&&<p className="hint">Cada habilidad usa su propio atributo más la bonificación de competencia. Solo aparecen las habilidades elegidas y su selección es permanente.</p>}
  </div>
}

export function CompetenceView({character,proficiency,attributes,effective,levels,statsReady,busy,onChoose,onComplete,onPrimaryClass,onSecondaryClass}: {
  character:Character;
  proficiency:CharacterProficiency|null;
  attributes:Attribute[];
  effective:EffectiveAttribute[];
  levels:Threshold[];
  statsReady:boolean;
  busy:boolean;
  onChoose:(attribute:string,skills:string[])=>Promise<boolean>;
  onComplete:(skills:string[])=>Promise<boolean>;
  onPrimaryClass:(className:string)=>Promise<boolean>;
  onSecondaryClass:(className:string)=>Promise<boolean>;
}) {
  const [focus,setFocus]=useState('')
  const [chosen,setChosen]=useState<string[]>([])
  const [legacyClass,setLegacyClass]=useState('')
  const [secondClass,setSecondClass]=useState('')
  const [working,setWorking]=useState(false)
  useEffect(()=>{setFocus('');setChosen(proficiency?.selected_skills||[]);setLegacyClass('');setSecondClass('')},[character.id,proficiency?.primary_attribute,proficiency?.selected_skills.join('|')])
  const best=useMemo(()=>Math.max(...attributes.map(a=>a.base_score),Number.NEGATIVE_INFINITY),[attributes])
  const possible=attributes.filter(a=>a.base_score===best)
  const level=levels.reduce((n,t)=>character.xp>=t.min_xp?Math.max(n,t.level):n,1)
  const validClass=campaignClasses.some(c=>c===character.class_name)
  const canChoose=statsReady&&attributes.length===6&&!!proficiency&&!proficiency.primary_attribute
  async function submitChoose(){
    if(!focus||chosen.length!==2||working)return
    const message=`¿Confirmas ${focus} como atributo principal y ${chosen.join(' y ')} como tus dos habilidades? Las tres elecciones serán permanentes.`
    if(!window.confirm(message))return
    setWorking(true);try{await onChoose(focus,chosen)}finally{setWorking(false)}
  }
  async function submitComplete(){
    if(chosen.length!==2||working||!proficiency?.primary_attribute||!proficiency.selected_skills.every(s=>chosen.includes(s)))return
    if(!window.confirm(`¿Confirmas tus dos habilidades: ${chosen.join(' y ')}? La elección anterior se conservará y ya no podrás cambiarlas.`))return
    setWorking(true);try{await onComplete(chosen)}finally{setWorking(false)}
  }
  return <section className="card campaign-competence-card">
    <div className="card-header"><div><span className="overline">ESPECIALIZACIÓN DEL PERSONAJE</span><h3>Competencias y clases</h3></div><Award size={21}/></div>
    <div className="campaign-bonus-hero"><span><Sparkles size={19}/> Bonificación de competencia</span><strong>{signed(proficiency?.proficiency_bonus??1)}</strong><small>Comienza en +1. Solo el Dungeon Master puede cambiarla.</small></div>
    {!validClass&&<div className="campaign-subsection"><h4>Elige tu clase principal</h4><p className="hint">Este personaje se creó antes de establecer las clases oficiales. Elige una ahora; después quedará fija.</p><div className="campaign-inline-form"><select aria-label="Clase principal" value={legacyClass} onChange={e=>setLegacyClass(e.target.value)} disabled={busy||working}><option value="">Selecciona una clase</option>{campaignClasses.map(c=><option key={c}>{c}</option>)}</select><button className="button button-outline" disabled={!legacyClass||busy||working} onClick={()=>{if(window.confirm('¿Confirmar clase principal? Esta elección será permanente.'))void onPrimaryClass(legacyClass)}}><Check size={16}/> Confirmar</button></div></div>}
    {!proficiency?.primary_attribute?<div className="campaign-subsection">
      <h4><ShieldCheck size={18}/> Elige tu atributo principal</h4>
      {!statsReady?<p className="hint">Primero el DM debe registrar los resultados de los dados físicos en tu ficha. Después podrás elegir entre tus atributos más altos.</p>:<p className="hint">Solo puedes elegir entre los atributos cuya puntuación base sea la más alta ({best}). Si hay empate, puedes escoger cualquiera de ellos. <b>La decisión no se podrá cambiar.</b></p>}
      {statsReady&&<><div className="campaign-attribute-choices" role="group" aria-label="Atributos principales disponibles">{possible.map(a=><button key={a.attribute_key} className={focus===a.attribute_key?'selected':''} type="button" aria-pressed={focus===a.attribute_key} disabled={!canChoose||busy||working} onClick={()=>{setFocus(a.attribute_key);setChosen([])}}><span>{a.attribute_key}</span><b>{signed(a.base_score)}</b>{focus===a.attribute_key&&<Check size={17}/>}</button>)}</div>
      {focus&&<><h4>Elige 2 habilidades</h4><p className="hint">Puedes elegir dos de cualquier categoría, aunque no coincidan con tu atributo principal. En tu ficha solo aparecerán las elegidas.</p>
        <SkillPicker selected={chosen} locked={[]} disabled={busy||working} onChange={setChosen}/>
        <button className="button button-primary" type="button" disabled={busy||working||chosen.length!==2} onClick={()=>void submitChoose()}><LockKeyhole size={17}/> Confirmar atributo y 2 habilidades</button>
      </>}
      </>}
    </div>:<div className="campaign-subsection"><h4><Check size={18}/> Competencias seleccionadas</h4>
      <ChosenCompetences proficiency={proficiency} attributes={attributes} effective={effective}/>
      {proficiency.selected_skills.length<2&&<div className="campaign-complete-skills">
        <h4>Completar tus 2 habilidades</h4>
        <p className="hint">La elección original de tu atributo principal y las habilidades ya aprendidas permanece bloqueada. Ahora puedes escoger {2-proficiency.selected_skills.length} {proficiency.selected_skills.length===1?'habilidad adicional':'habilidades'} de cualquier atributo.</p>
        <SkillPicker selected={chosen} locked={proficiency.selected_skills} disabled={busy||working} onChange={setChosen}/>
        <button className="button button-primary" type="button" disabled={busy||working||chosen.length!==2} onClick={()=>void submitComplete()}><LockKeyhole size={17}/> Guardar las 2 habilidades permanentemente</button>
      </div>}
    </div>}
    <div className="campaign-subsection campaign-second-class"><h4><BookOpen size={18}/> Clases del aventurero</h4><p>Clase principal: <b>{character.class_name}</b></p>{proficiency?.secondary_class?<p>Segunda clase: <b>{proficiency.secondary_class}</b> <span className="campaign-locked"><LockKeyhole size={13}/> Elección permanente</span></p>:level<4?<p className="hint"><LockKeyhole size={15}/> Segunda clase opcional: disponible a partir del nivel 4. Estás en el nivel {level}.</p>:!validClass?<p className="hint">Primero elige tu clase principal para poder desbloquear la segunda.</p>:<div><p className="hint">Ya puedes escoger una segunda clase, pero no es obligatorio. Si lo haces, no podrás modificarla.</p><div className="campaign-inline-form"><select aria-label="Segunda clase opcional" value={secondClass} onChange={e=>setSecondClass(e.target.value)} disabled={busy||working}><option value="">Todavía no quiero una segunda clase</option>{campaignClasses.filter(c=>c!==character.class_name).map(c=><option key={c}>{c}</option>)}</select><button className="button button-outline" disabled={!secondClass||busy||working} onClick={()=>{if(window.confirm(`¿Confirmar ${secondClass} como segunda clase permanente?`))void onSecondaryClass(secondClass)}}><ChevronDown size={16}/> Elegir segunda clase</button></div></div>}</div>
  </section>
}
