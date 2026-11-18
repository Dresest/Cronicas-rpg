import {useState} from 'react'
import {Calculator,ChevronDown,Delete,RotateCcw} from 'lucide-react'
import type {EffectiveAttribute} from './types'
import {calculateArithmetic} from './lib/arithmetic'
import {deleteCalculatorInput,insertCalculatorOperator,insertCalculatorShortcut} from './lib/calculatorInput'

const keyboard=['C','(',')','⌫','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','+','=']
const format=(value:number)=>new Intl.NumberFormat('es-CL',{maximumFractionDigits:6}).format(value)
export function BattleCalculator({attributes,lastDice,suggestedDamage,attackTotal}:{attributes:EffectiveAttribute[];lastDice:number|null;suggestedDamage?:string;attackTotal?:number|null}){
 const [expression,setExpression]=useState('')
 const [result,setResult]=useState<number|null>(null)
 const [error,setError]=useState('')
 const [justEvaluated,setJustEvaluated]=useState(false)
 function write(value:string){
  setError('')
  setResult(null)
  setExpression(prev=>{
   const text=justEvaluated&&/[0-9.(]/.test(value)?'':prev
   return (/^[+\-×÷*/]$/.test(value)?insertCalculatorOperator(text,value):text+value).slice(0,180)
  })
  setJustEvaluated(false)
 }
 function shortcut(value:number){
  setError('');setResult(null)
  setExpression(prev=>insertCalculatorShortcut(prev,value,justEvaluated).slice(0,180))
  setJustEvaluated(false)
 }
 function click(key:string){
  if(key==='C'){setExpression('');setResult(null);setError('');setJustEvaluated(false);return}
  if(key==='⌫'){setExpression(deleteCalculatorInput);setError('');setResult(null);setJustEvaluated(false);return}
  if(key==='='){
   try{
    // Los atajos agregan un '+' sugerido: '=' también funciona sin escribir otro valor.
    const ready=expression.trimEnd().replace(/[+\-×÷*/]$/,'').trimEnd()
    const val=calculateArithmetic(ready)
    setResult(val);setExpression(String(val));setError('');setJustEvaluated(true)
   }
   catch(e){setError(e instanceof Error?e.message:'Operación incorrecta.')}
   return
  }
  write(key==='−'?'-':key)
 }
 return <details className="card play-calculator" open>
  <summary><span><Calculator size={20}/><b>Calculadora de combate</b><small>Sumar · Restar · Multiplicar · Dividir</small></span><ChevronDown size={20}/></summary>
  <div className="play-calculator-body">
   {suggestedDamage&&<div className="play-damage-suggestion"><span>Fórmula de ataque: <b>{suggestedDamage}</b></span><small>Para calcular, tira los dados y luego suma el resultado. Los atributos son opcionales.</small>{attackTotal!==null&&attackTotal!==undefined&&<button type="button" onClick={()=>shortcut(attackTotal)}>Insertar tirada: {attackTotal}</button>}</div>}
   <p className="play-helper">Toca un atributo para añadir su valor con «+». Puedes cambiar ese signo por ×, ÷ o −. Ningún cálculo modifica tu personaje.</p>
   <label className="play-calculator-display"><span>Operación</span><input type="text" inputMode="decimal" value={expression} onChange={e=>{setExpression(e.target.value.slice(0,180));setResult(null);setError('');setJustEvaluated(false)}} placeholder="10 + 12 + 18 − 7" aria-label="Operación de la calculadora" autoComplete="off"/></label>
   <div className="play-calc-feedback" aria-live="polite">{error?<span className="play-calc-error">{error}</span>:result!==null?<strong>Resultado: {format(result)}</strong>:<span>Los signos × y ÷ respetan la prioridad habitual.</span>}</div>
   <div className="play-calculator-keys">{keyboard.map(key=><button type="button" key={key} className={`play-calc-key ${'÷×−+'.includes(key)?'operator':''} ${key==='='?'equal':''} ${key==='C'?'clear':''}`} onClick={()=>click(key)} aria-label={key==='⌫'?'Borrar último carácter':key==='C'?'Borrar operación':key==='×'?'Multiplicar':key==='÷'?'Dividir':key==='−'?'Restar':key==='+'?'Sumar':key==='='?'Calcular':key}>{key==='⌫'?<Delete size={18}/>:key==='C'?<RotateCcw size={16}/>:key}</button>)}</div>
   {(lastDice!==null||attributes.length>0)&&<div className="play-calc-shortcuts"><small>INSERTAR VALOR</small><div>{lastDice!==null&&<button type="button" onClick={()=>shortcut(lastDice)}>Dado: {lastDice}</button>}{attributes.map(a=><button type="button" key={a.attribute_key} onClick={()=>shortcut(a.total_score)}>{a.attribute_key}: {a.total_score}</button>)}</div></div>}
  </div>
 </details>
}
