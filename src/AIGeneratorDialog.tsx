import {useRef,useState,type FormEvent} from 'react';
import {WandSparkles,X,Check} from 'lucide-react';
import {supabase} from './lib/supabase';

export type GeneratedContent={name:string;description:string;[key:string]:unknown};
type Props={
  kind:'item'|'skill';
  onClose:()=>void;
  onGenerated:(value:GeneratedContent)=>void;
};
export function AIGeneratorDialog({kind,onClose,onGenerated}:Props){
  const [prompt,setPrompt]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const sending=useRef(false);
  const isItem=kind==='item';
  async function submit(e:FormEvent){
    e.preventDefault();
    if(sending.current)return;
    const phrase=prompt.trim();
    if(phrase.length<8||phrase.length>800){
      setError('Escribe una descripción de entre 8 y 800 caracteres.');return;
    }
    sending.current=true;setLoading(true);setError('');
    try{
      const {data:{session},error:sessionError}=await supabase.auth.getSession();
      if(sessionError||!session?.access_token)throw Error('Tu sesión expiró. Inicia sesión nuevamente.');
      const response=await fetch('/api/generate-rpg',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
        body:JSON.stringify({kind,prompt:phrase})
      });
      let payload:Record<string,unknown>={};
      try{payload=await response.json()}catch{}
      if(!response.ok){
        if(response.status===402||payload.code==='CREDITS_EXHAUSTED')throw Error('Créditos de IA agotados. Prueba en el próximo período.');
        if(response.status===429)throw Error('Demasiadas solicitudes. Inténtalo más tarde.');
        throw Error(typeof payload.error==='string'?payload.error:'No se pudo generar contenido.');
      }
      const generated=payload[kind];
      if(!generated||typeof generated!=='object'||Array.isArray(generated))throw Error('La IA no devolvió contenido válido.');
      const value=generated as GeneratedContent;
      if(typeof value.name!=='string'||typeof value.description!=='string')throw Error('La IA no devolvió contenido válido.');
      onGenerated(value);
    }catch(e){
      setError(e instanceof Error?e.message:'No se pudo generar contenido.');
    }finally{sending.current=false;setLoading(false)}
  }
  return <div className="modal-backdrop inventory-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!loading)onClose()}}>
    <section className="card inventory-editor" role="dialog" aria-modal="true" aria-labelledby="ai-generator-title">
      <div className="card-header">
        <div><span className="overline">DUNGEON MASTER · ASISTENTE DE IA</span><h3 id="ai-generator-title">Crear {isItem?'objeto':'habilidad'} con IA</h3></div>
        <button className="inv-icon" type="button" onClick={onClose} disabled={loading} aria-label="Cerrar"><X size={20}/></button>
      </div>
      <form onSubmit={e=>void submit(e)} className="stack">
        <label>Describe el contenido que quieres generar
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={4} maxLength={800} disabled={loading}
            placeholder={isItem?'Ej.: Espada de hielo poco común con +3 de daño fijo':'Ej.: Escudo arcano pasivo que protege contra el fuego'}/>
        </label>
        <p className="hint">La propuesta se abrirá en el formulario habitual para revisarla y editarla antes de guardarla.</p>
        {error&&<p role="alert" className="hint">{error}</p>}
        <div className="skill-editor-actions">
          <button type="button" className="skill-secondary" disabled={loading} onClick={onClose}>Cancelar</button>
          <button type="submit" className="skill-primary" disabled={loading||prompt.trim().length<8}>
            {loading?<WandSparkles size={16}/>:<Check size={16}/>}
            {loading?'Generando…':'Generar borrador'}
          </button>
        </div>
      </form>
    </section>
  </div>;
}
