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
import {useEffect,useRef,useState} from "react";
import {cropRectangle} from "@/lib/image-crop";
/** El diálogo nativo mantiene el foco, permite cancelar sin subir y exporta exactamente el encuadre visible. */
export function ImageCropDialog({file,aspect,maxBytes,onConfirm,onCancel}:{file:File;aspect?:number;maxBytes:number;onConfirm:(file:File)=>void;onCancel:()=>void}) {
  const frame=useRef<HTMLDivElement>(null);
  const pointers=useRef(new Map<number,{x:number;y:number}>());
  const pinch=useRef({distance:0,zoom:1});
  const separation=()=>{const [a,b]=Array.from(pointers.current.values());return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;};
  const limit=(value:number)=>Math.min(4,Math.max(1,value));
  const drag=useRef<{px:number;py:number;x:number;y:number}|null>(null);
  const dialog=useRef<HTMLDialogElement>(null),canvas=useRef<HTMLCanvasElement>(null),image=useRef<HTMLImageElement|null>(null);
  const [ready,setReady]=useState(false),[ratio,setRatio]=useState(aspect||1),[zoom,setZoom]=useState(1),[x,setX]=useState(50),[y,setY]=useState(50),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    dialog.current?.showModal();const url=URL.createObjectURL(file);const picture=new Image();let live=true;
    picture.onload=()=>{if(!live)return;if(picture.naturalWidth*picture.naturalHeight>80000000){setError('La imagen es demasiado grande para editarla en este navegador.');return;}image.current=picture;setRatio(aspect||picture.naturalWidth/picture.naturalHeight);setReady(true);};
    // Algunos navegadores no decodifican el objeto temporal en el primer intento.
    let retried=false;
    picture.onerror=()=>{if(!live)return;
      if(!retried){retried=true;const reader=new FileReader();
        reader.onload=()=>{if(live&&typeof reader.result==='string')picture.src=reader.result;};
        reader.onerror=()=>{if(live)setError('No se pudo leer la imagen. Elige el archivo nuevamente.');};
        reader.readAsDataURL(file);return;
      }
      setError('El navegador no puede abrir este formato. Elige otra imagen o conviértela a PNG, JPEG o WebP.');};picture.src=url;
    return()=>{live=false;URL.revokeObjectURL(url);image.current=null;};
  },[file,aspect]);
  // El control vertical y los gestos escriben el mismo estado que usa la exportación.
  useEffect(()=>{
    const element=frame.current;if(!element||!ready||busy)return;
    const wheel=(event:WheelEvent)=>{
      event.preventDefault();
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?element.clientHeight:1);
      setZoom(value=>limit(value*Math.exp(-delta*.002)));
    };
    element.addEventListener("wheel",wheel,{passive:false});
    // En móviles se cancela la acción nativa sólo dentro del marco. Pointer Events sigue controlando el recorte.
    const isolate=(event:Event)=>{if(event.cancelable)event.preventDefault();};
    const gestures=["touchstart","touchmove","gesturestart","gesturechange"];
    gestures.forEach(type=>element.addEventListener(type,isolate,{passive:false}));
    return ()=>{
      element.removeEventListener("wheel",wheel);
      gestures.forEach(type=>element.removeEventListener(type,isolate));
    };
  },[ready,busy]);
  function release(id:number){
    if(!pointers.current.delete(id))return;
    pinch.current.distance=0;
    const remaining=Array.from(pointers.current.values())[0];
    drag.current=remaining?{px:remaining.x,py:remaining.y,x,y}:null;
  }
  function paint(target:HTMLCanvasElement,maxDimension:number) {
    const picture=image.current;if(!picture)return;
    const rect=cropRectangle(picture.naturalWidth,picture.naturalHeight,ratio,zoom,x,y);
    const scale=Math.min(1,maxDimension/Math.max(rect.width,rect.height));
    target.width=Math.max(1,Math.round(rect.width*scale));target.height=Math.max(1,Math.round(rect.height*scale));
    const context=target.getContext('2d');if(!context)throw Error('No se pudo preparar la imagen');
    context.drawImage(picture,rect.x,rect.y,rect.width,rect.height,0,0,target.width,target.height);
  }
  useEffect(()=>{if(ready&&canvas.current)paint(canvas.current,900);},[ready,ratio,zoom,x,y]);
  async function confirm(){
    setBusy(true);setError('');
    try{
      const output=document.createElement('canvas');let blob:Blob|null=null;
      for(const [dimension,quality] of [[1920,.92],[1600,.85],[1200,.75],[900,.65]] as const){
        paint(output,dimension);blob=await new Promise<Blob|null>(resolve=>output.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=maxBytes)break;
      }
      if(!blob||blob.size>maxBytes)throw Error('No se pudo ajustar la imagen al tamaño admitido. Prueba con un recorte menor.');
      const ext=blob.type==='image/webp'?'webp':blob.type==='image/jpeg'?'jpg':'png';
      onConfirm(new File([blob],file.name.replace(/\.[^.]*$/,'')+'-recorte.'+ext,{type:blob.type,lastModified:Date.now()}));
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <dialog ref={dialog} className="image-crop-modal" aria-labelledby="crop-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}>
    <header><h2 id="crop-title">Ajustar imagen</h2><button type="button" className="crop-secondary" aria-label="Cerrar editor de imagen" disabled={busy} onClick={onCancel}>×</button></header>
    {!ready&&!error&&<p role="status">Preparando vista previa…</p>}
    {/* El desplazamiento del puntero se transforma en coordenadas del original. */}
    <div className="crop-stage"><div ref={frame} className="crop-preview" style={{aspectRatio:ratio,width:`min(100%, ${Math.min(ratio*35,300)}dvh)`}} tabIndex={0} aria-label="Mover encuadre con arrastre o flechas"
      onKeyDown={e=>{if(e.key.startsWith('Arrow')){e.preventDefault();if(e.key==='ArrowLeft'||e.key==='ArrowRight')setX(v=>Math.max(0,Math.min(100,v+(e.key==='ArrowLeft'?-3:3))));else setY(v=>Math.max(0,Math.min(100,v+(e.key==='ArrowUp'?-3:3))));}}}
      onPointerDown={e=>{if(!ready||busy)return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(pointers.current.size===2)pinch.current={distance:separation(),zoom};
        drag.current={px:e.clientX,py:e.clientY,x,y};}}
      onPointerUp={e=>release(e.pointerId)} onPointerCancel={e=>release(e.pointerId)}
      onLostPointerCapture={e=>release(e.pointerId)}
      onPointerMove={e=>{
        if(!pointers.current.has(e.pointerId))return;
        pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(pointers.current.size>=2){
          if(pinch.current.distance>0)setZoom(limit(pinch.current.zoom*separation()/pinch.current.distance));
          return;
        }
        const start=drag.current,picture=image.current;if(!start||!picture)return;
        const rect=cropRectangle(picture.naturalWidth,picture.naturalHeight,ratio,zoom,x,y);
        const box=e.currentTarget.getBoundingClientRect();
        const move=(origin:number,delta:number,visible:number,total:number,display:number)=> total>visible?Math.max(0,Math.min(100,origin-100*delta*visible/(display*(total-visible)))):50;
        setX(move(start.x,e.clientX-start.px,rect.width,picture.naturalWidth,box.width));
        setY(move(start.y,e.clientY-start.py,rect.height,picture.naturalHeight,box.height));
      }}><canvas ref={canvas} aria-label="Vista previa del recorte"/></div>
      <input className="crop-zoom" aria-label="Zoom" type="range" min={1} max={4} step={.01} disabled={!ready||busy} value={zoom} onChange={e=>setZoom(Number(e.target.value))}/>
    </div>
    {error&&<p role="alert">{error}</p>}
    {/* Los tres controles comparten dimensiones y los secundarios se agrupan a la derecha. */}
    <div className="crop-actions"><button type="button" disabled={!ready||busy||!!error} onClick={()=>void confirm()}>{busy?'Preparando…':'Aplicar'}</button>
      <div className="crop-tools">{!aspect&&<select disabled={!ready||busy} aria-label="Proporción" value={ratio} onChange={e=>{setRatio(Number(e.target.value));setZoom(1);setX(50);setY(50);}}><option value={image.current?image.current.naturalWidth/image.current.naturalHeight:1}>Original</option><option value={1}>Cuadrada</option><option value={4/3}>4:3</option><option value={16/9}>16:9</option></select>}<button className="crop-secondary" disabled={!ready||busy} type="button" onClick={()=>{setX(50);setY(50);setZoom(1);}}>Centrar</button></div>
    </div>
  </dialog>;
}
