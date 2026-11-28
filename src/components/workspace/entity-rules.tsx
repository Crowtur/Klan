/**
 * ==============================================================================
 * PONTIFICIA UNIVERSIDAD CATÓLICA DEL ECUADOR
 * Facultad Internacional de Innovación (PUCE - Icam)
 * ==============================================================================
 * 
 * PROYECTO DE TITULACIÓN - INGENIERÍA INTEGRAL
 * Autor: Diego Alexis Tipán Zambrano
 * Director del Proyecto: PhD. Rafael Melgarejo
 * Promoción: Primera Promoción (Año 2026)
 * 
 * ------------------------------------------------------------------------------
 * DECLARACIÓN SOBRE EL USO DE INTELIGENCIA ARTIFICIAL
 * ------------------------------------------------------------------------------
 * Se declara formalmente el uso de herramientas de Inteligencia Artificial como
 * soporte y asistente técnico para el desarrollo de este proyecto, destacando su
 * aplicación en:
 * 
 * - Generación y optimización de bloques de código repetitivos y extensos.
 * - Desarrollos de endpoints complejos con variabilidad de permisos y roles.
 * - Integración de nuevas funciones y sugerencias de arquitectura de software.
 * - Depuración ágil, corrección de errores y optimización de rendimiento.
 * - Creación, maquetación e integración de diseños UI/UX de formato visual a código.
 * - Automatización de documentación técnica y estructuración de comentarios.
 * 
 * Herramientas de IA utilizadas:
 * - GPT-5.6 Luna
 * - GPT-6 Astra
 * - Gemini 3.6 Flash
 * - Figma AI (Visual Engine / Make Real)
 * 
 * ------------------------------------------------------------------------------
 * DERECHOS DE AUTOR Y PROPIEDAD INTELECTUAL
 * ------------------------------------------------------------------------------
 * Los derechos del presente proyecto corresponden a la Pontificia Universidad
 * Católica del Ecuador junto al autor y al director del proyecto, en estricto
 * cumplimiento del reglamento institucional sobre patentes, tesis y titulación.
 * 
 * ALCANCE: Dichos derechos aplican exclusivamente al código fuente desarrollado
 * en este proyecto, excluyendo la idea de negocio global y futuras versiones 
 * o derivados sustanciales que puedan desarrollarse sobre el sistema.
 * ==============================================================================
 */

"use client";
import {useRef,useState} from "react";
import {UploadDropzone} from "@/lib/uploadthing";
import {Icon} from "@/components/ui";
import {api,Action,Status,useData,safeUrl,type Row} from "./common";
import {EditorModal} from "./modal";
/** Lectura común para visitantes y miembros; el servidor vuelve a comprobar cada acción administrativa. */
export function EntityRules({entity,admin=false}:{entity:string;admin?:boolean}) {
  const [version,setVersion]=useState(0),[message,setMessage]=useState('');
  const state=useData(`/api/entities/${entity}/rules`,version),refresh=()=>setVersion(v=>v+1);
  const document=state.data?.document;
  return <section className="entity-rules"><div className="list-heading"><h2>Reglas del círculo</h2>{admin&&<EditorModal title="Crear regla"><RuleEditor entity={entity} onDone={refresh}/></EditorModal>}</div>
    <Status state={state}>
      {!state.data?.rules?.length&&!document&&<div className="empty-state rules-empty"><span className="icon-tile"><Icon name="document" size={28}/></span><p>Todavía no hay registros</p></div>}
      <ol className="rule-list">{state.data?.rules?.map((rule:Row,index:number)=><li key={rule.id} className="rule-card"><span className="rule-number" aria-label={`Regla ${index+1}`}>{index+1}</span><div><h3>{rule.title}</h3><p>{rule.content}</p>{admin&&<div className="actions"><EditorModal title="Editar"><RuleEditor key={rule.version} entity={entity} rule={rule} onDone={refresh}/></EditorModal><Action url={`/api/entities/${entity}/rules/${rule.id}`} method="DELETE" body={{version:rule.version}} confirm="¿Eliminar esta regla?" onDone={refresh}>Eliminar</Action></div>}</div></li>)}</ol>
      {document&&<article className="rule-document"><Icon name="document" size={28}/><div><h3>Documento del círculo</h3><p>{document.name||'Estatuto en PDF'}</p><a className="btn btn-outline" href={safeUrl(document.url)} target="_blank" rel="noopener noreferrer">Abrir / descargar PDF ↗</a></div>{admin&&<Action url={`/api/entities/${entity}/rules/document`} method="DELETE" body={{version:state.data?.documentVersion}} confirm="¿Retirar el documento publicado?" onDone={refresh}>Eliminar documento</Action>}</article>}
      {admin&&state.data&&<section className="rule-upload"><h3>{document?'Reemplazar documento PDF':'Subir documento PDF'}</h3><p>El documento se podrá consultar públicamente desde esta pestaña.</p><UploadDropzone endpoint="entityRulesDocumentUploader" input={{entityId:entity,version:state.data.documentVersion}} config={{mode:'auto'}} content={{label:'Arrastra un PDF o haz clic para elegir',allowedContent:'Formato admitido: PDF · Máximo 8 MB',button:'Subir PDF'}} onUploadBegin={()=>setMessage('Subiendo documento…')} onClientUploadComplete={files=>{if(!files[0]?.serverData?.persisted){setMessage('No se confirmó la publicación del PDF.');return;}setMessage('Documento publicado.');refresh();}} onUploadError={e=>setMessage(e.message)}/><p role="status">{message}</p></section>}
    </Status>
  </section>;
}
function RuleEditor({entity,rule,onDone}:{entity:string;rule?:Row;onDone:()=>void}) {
  const form=useRef<HTMLFormElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <form className="editor" ref={form} onSubmit={async event=>{
    event.preventDefault();setBusy(true);setError('');const data=new FormData(event.currentTarget);
    try {await api(`/api/entities/${entity}/rules${rule?'/'+rule.id:''}`,rule?'PATCH':'POST',{title:data.get('title'),content:data.get('content'),sortOrder:Number(data.get('sortOrder')),...(rule?{version:rule.version}:{})});onDone();form.current?.closest('dialog')?.close();if(!rule)form.current?.reset();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }}><fieldset disabled={busy}><label>Título<input name="title" required maxLength={120} defaultValue={rule?.title||''}/></label><label>Redacción de la norma<textarea name="content" required maxLength={5000} defaultValue={rule?.content||''}/></label><label>Orden<input name="sortOrder" type="number" min={0} max={9999} step={1} required defaultValue={rule?.sortOrder??0}/></label></fieldset>{error&&<p role="alert">{error}</p>}<div className="form-actions"><button disabled={busy}>{busy?'Guardando…':'Guardar regla'}</button></div></form>;
}
