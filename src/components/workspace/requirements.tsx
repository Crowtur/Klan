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
import {useMobile} from "../use-mobile";
import {useEffect,useRef,useId,useState} from "react";
import {Icon} from "@/components/ui";
import {api,useData,Status,Action,type Row} from "./common";
/** Coordina el plan desplegado con el requisito que se está creando o editando. */
export function Requirements({club,plans,onChanged}:{club:string;plans:Row[];onChanged:()=>void}){
 const [opened,setOpened]=useState<string|null>(null),[editing,setEditing]=useState<{plan:Row;requirement:Row}|null>(null),[version,setVersion]=useState(0);
 const base=`/api/clubs/${club}/membership-plans`;
 return <section className="requirements-section"><h2>Requisitos documentales</h2><p className="muted">Gestiona los documentos que se solicitan antes de aprobar una membresía.</p><div className={editing?"requirements-layout editing":"requirements-layout"}><div>{plans.map(plan=><RequirementGroup key={plan.id} plan={plan} base={`${base}/${plan.id}/document-requirements`} open={opened===plan.id} version={version} onToggle={()=>{setOpened(opened===plan.id?null:plan.id);setEditing(null)}} onEdit={requirement=>setEditing({plan,requirement})}/>)}</div>{editing && <RequirementEditor key={editing.plan.id + (editing.requirement.id || "new")}
    plan={editing.plan} initial={editing.requirement} base={base}
    onCancel={() => setEditing(null)} onDone={() => {
        // Volver a consultar los requisitos del plan tras guardar o desactivar.
        setVersion(value => value + 1);
        setEditing(null);
        onChanged();
    }}/>}</div></section>
}
/** En escritorio el editor usa su columna original. En móvil el diálogo nativo
 * aísla el foco y coloca el formulario por encima de cualquier tarjeta. */
function RequirementEditor({plan, initial, base, onCancel, onDone}: {
    plan:Row; initial:Row; base:string; onCancel:()=>void; onDone:()=>void;
}) {
    const mobile = useMobile();
    const dialog = useRef<HTMLDialogElement>(null);
    // Al cruzar el umbral, alternar la modalidad del mismo nodo preserva el borrador.
    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        // El modo no modal de escritorio mantiene el contenido interactivo sin telón ni captura de foco.
        if (mobile) element.showModal();
        else element.show();
        return () => { element.close(); };
    }, [mobile]);
    const url = base + "/" + plan.id + "/document-requirements" + (initial.id ? "/" + initial.id : "");
    return <dialog ref={dialog} role={mobile ? "dialog" : "complementary"} className="requirement-shell" aria-label={initial.id ? "Editar requisito" : "Crear requisito"}
        onCancel={event => {
            // Escape dentro de la confirmación de baja debe cerrar solo ese diálogo hijo.
            if (event.target === event.currentTarget) { event.preventDefault(); onCancel(); }
        }}>
        <aside className="panel requirement-editor">
            {/* Cierre explícito en móvil; el escritorio conserva sus controles originales. */}
            <button type="button" className="requirement-close secondary" aria-label="Cerrar" onClick={onCancel}>×</button>
            <h3>{initial.id ? "Editar requisito" : "Crear requisito"}</h3><p className="muted">Plan {plan.name}</p>
            <RequirementForm initial={initial} url={url} onCancel={onCancel} onDone={onDone}/>
        </aside>
    </dialog>;
}

/** Agrupa los requisitos de un plan y permite elegir uno para su edición. */
function RequirementGroup({plan,base,open,version,onToggle,onEdit}:{plan:Row;base:string;open:boolean;version:number;onToggle:()=>void;onEdit:(r:Row)=>void}){
 const state=useData(open ? base : null,version),rows:Row[]=(open && state.data?.requirements) || plan.documentRequirements || [];
 return <section className={open?"requirement-group expanded":"requirement-group"}><button className="requirement-toggle" aria-expanded={open} aria-controls={"requirements-"+plan.id} onClick={onToggle}><span><Icon name="chevron" size={17}/>{plan.name}</span><small>{rows.filter(r=>r.isActive!==false).length} requisitos · {rows.filter(r=>r.isActive!==false&&r.isRequired).length} obligatorios</small></button>{open&&<div id={"requirements-"+plan.id}><Status state={state}>{!rows.length&&<p className="requirement-empty">Este plan todavía no tiene requisitos.</p>}{rows.map(r=><div className="requirement-row" key={r.id}><Icon name="document"/><div><strong>{r.name}</strong><p>{r.description||"Sin instrucciones adicionales."}</p><small>{r.isActive===false?"Desactivado":r.isRequired?"✓ Obligatorio":"Opcional"}</small></div><button className="secondary" onClick={()=>onEdit(r)}>Editar</button></div>)}<button className="requirement-create" onClick={()=>onEdit({isRequired:true})}>+ Crear requisito para {plan.name}</button></Status></div>}</section>
}

/** Envía un alta o modificación según exista identificador y guarda las instrucciones y la obligatoriedad. */
function RequirementForm({initial,url,onCancel,onDone}:{initial:Row;url:string;onCancel:()=>void;onDone:()=>void}){
    // El estado local evita reenvíos y mantiene el borrador visible ante una respuesta fallida.
    const [busy,setBusy] = useState(false);
    const [error,setError] = useState("");
    const formId = useId();

    /** El identificador distingue creación y edición; ambos flujos envían los mismos campos normalizados. */
    async function save(event:React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        try {
            await api(url, initial.id ? "PATCH" : "POST", {
                name:String(data.get("name") || "").trim(),
                description:String(data.get("description") || "").trim(),
                isRequired:data.has("isRequired"),
            });
            onDone();
        } catch (cause) {
            setError((cause as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return <>
        <form id={formId} className="editor" onSubmit={save}>
            <fieldset disabled={busy}>
                <label>Nombre del requisito<input name="name" required defaultValue={initial.name || ""}/></label>
                <label>Instrucciones para el socio<textarea name="description" defaultValue={initial.description || ""}/></label>
                <label className="checkbox-line"><input type="checkbox" name="isRequired" defaultChecked={initial.isRequired !== false}/>Obligatorio</label>
            </fieldset>
            <p className="muted">Formato admitido: PDF · Tamaño máximo: 8 MB. El socio debe adjuntarlo para enviar su solicitud si es obligatorio.</p>
            {error && <p role="alert">{error}</p>}
        </form>
        {/* Guardar se vincula por id; la confirmación de baja nunca provoca el submit del editor. */}
        <div className="requirement-actions">
            <button type="button" className="outline-destructive" onClick={onCancel} disabled={busy}>Cancelar</button>
            <button form={formId} type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar requisito"}</button>
            {initial.id && initial.isActive !== false && <Action method="DELETE" url={url}
                confirm="¿Desactivar este requisito?" onDone={onDone}>Desactivar requisito</Action>}
        </div>
    </>;
}
