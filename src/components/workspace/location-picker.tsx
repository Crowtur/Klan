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
import {OUTSIDE_ECUADOR,possibleEcuador,type Coordinates} from "@/lib/locations/ecuador";
type Selection=Coordinates&{address:string;googleMapsUrl:string;token:string};
import type {Map as LeafletMap, Marker} from "leaflet";
import country from "@/lib/locations/ecuador-map.json";
import {cityCatalog,searchCities,type City} from "@/lib/locations/city-catalog";
/** El punto validado conserva sus coordenadas aunque se edite directamente el nombre de ciudad. */
export function LocationPicker({initial,onChange}:{initial:{address?:string;googleMapsUrl?:string;latitude?:number|null;longitude?:number|null};onChange:(selection:{token:string;city:string})=>void}) {
  const [open,setOpen]=useState(false),[mapReady,setMapReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[point,setPoint]=useState<Coordinates|null>(null),[verified,setVerified]=useState<Selection|null>(null),[display,setDisplay]=useState(initial);
  const [city,setCity]=useState('');
  const [options,setOptions]=useState<City[]>([]);
  const dialog=useRef<HTMLDialogElement>(null),canvas=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null),marker=useRef<Marker|null>(null);
  useEffect(()=>{setDisplay(initial);},[initial.address,initial.googleMapsUrl,initial.latitude,initial.longitude]);
  useEffect(()=>{
    if(!open)return;
    dialog.current?.showModal();
    let live=true;
    setOptions([]);setError('');setVerified(null);setPoint(null);setMapReady(false);setBusy(false);
    // El contorno y las ciudades se distribuyen con Klan y siguen visibles sin teselas externas.
    import('leaflet').then(L=>{
      if(!live||!canvas.current)return;
      const center:[number,number]=[display.latitude??-1.4,display.longitude??-79];
      const current=L.map(canvas.current).setView(center,display.latitude!=null?14:6);
      map.current=current;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(current);
      L.geoJSON({type:'Feature',properties:{},geometry:country.geometry} as GeoJSON.Feature,{interactive:false,style:{color:'#136336',weight:1,fillOpacity:.06}}).addTo(current);
      const pin=L.marker(center,{draggable:true,icon:L.divIcon({className:'klan-map-pin',html:'●',iconSize:[24,24],iconAnchor:[12,12]})}).addTo(current);
      marker.current=pin;
      function choose(lat:number,lng:number){pin.setLatLng([lat,lng]);setPoint({latitude:lat,longitude:lng});}
      current.on('click',event=>choose(event.latlng.lat,event.latlng.lng));
      pin.on('dragend',()=>{const p=pin.getLatLng();choose(p.lat,p.lng);});
      for(const city of cityCatalog)L.circleMarker([city.lat,city.lng],{radius:3,color:'#136336'}).bindTooltip(city.name).on('click',()=>choose(city.lat,city.lng)).addTo(current);
      if(display.latitude!=null&&display.longitude!=null)choose(display.latitude,display.longitude);
      setMapReady(true);
    }).catch(()=>{if(live)setError('No se pudo iniciar el selector. Cierra el mapa y vuelve a abrirlo.');});
    return()=>{live=false;map.current?.remove();map.current=null;marker.current=null;};
  },[open]);
  useEffect(()=>{
    setVerified(null);if(!point||!open)return;
    if(!possibleEcuador(point)){setError(OUTSIDE_ECUADOR);setBusy(false);return;}
    const controller=new AbortController();setBusy(true);setError('');
    const timer=setTimeout(()=>{
      fetch('/api/locations/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(point),signal:controller.signal})
        .then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.message||'No se pudo comprobar la ubicación');return data.location as Selection;})
        .then(location=>{if(controller.signal.aborted)return;
          // Al reabrir el mismo punto se conserva la ciudad ya confirmada.
          const label=point.latitude===display.latitude&&point.longitude===display.longitude&&display.address ? display.address : location.address;
          setVerified(location);setCity(label);})
        .catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    },350);
    return()=>{clearTimeout(timer);controller.abort();};
  },[point,open]);
  function close(){dialog.current?.close();setOpen(false);}
  function selectCity(city:City){
    setOptions([]);setError('');
    map.current?.setView([city.lat,city.lng],14);marker.current?.setLatLng([city.lat,city.lng]);
    setPoint({latitude:city.lat,longitude:city.lng});
  }
  function find(){
    const matches=searchCities(search);
    setOptions(matches.length>1?matches:[]);
    setError(matches.length?'':'No se encontró la ciudad. Elige el punto directamente en el mapa.');
    if(matches.length===1)selectCity(matches[0]);
  }
  return <div className="location-picker"><span>Ubicación del círculo</span><button type="button" className="secondary" onClick={()=>setOpen(true)}>Ubicación</button>
    <div className="location-summary"><span>Ciudad: <strong>{display.address||'Sin ubicación seleccionada'}</strong></span>{display.googleMapsUrl&&<a href={display.googleMapsUrl} target="_blank" rel="noopener noreferrer">Ver punto en Google Maps ↗</a>}</div>
    {open&&<dialog ref={dialog} className="editor-modal map-modal" aria-label="Elegir ubicación en el mapa" onCancel={e=>{e.preventDefault();close();}} onClose={()=>setOpen(false)}>
      <header><h2>Elegir ubicación en el mapa</h2><button className="secondary" type="button" onClick={close} aria-label="Cerrar mapa">×</button></header>
      <div className="map-search"><label>Buscar ciudad<input value={search} onChange={e=>{setOptions([]);setSearch(e.target.value);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void find();}}} placeholder="Quito, Puerto Ayora…"/></label><button type="button" disabled={!mapReady||!search.trim()} onClick={()=>void find()}>Buscar</button></div>
      {options.length>0&&<ul aria-label="Ciudades encontradas">{options.map(option=><li key={option.province+option.name}><button type="button" className="secondary" onClick={()=>selectCity(option)}>{option.name}, {option.province}</button></li>)}</ul>}
      {!mapReady&&!error&&<p role="status">Cargando mapa…</p>}<div className="location-map" ref={canvas} aria-label="Mapa interactivo del Ecuador"/>
      <p>Haz clic en el mapa o arrastra el marcador para elegir el punto exacto.</p>
      {busy&&<p role="status">Comprobando ubicación…</p>}{error&&<p role="alert">{error}</p>}{verified&&!error&&<div className="map-city-row">
        <label>Ciudad<input value={city} maxLength={160} onChange={e=>setCity(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")e.preventDefault();}}/></label>
      </div>}
      <div className="form-actions"><button type="button" disabled={!verified||busy||!!error||!city.trim()} onClick={()=>{if(verified){setDisplay({...verified,address:city.trim()});onChange({token:verified.token,city:city.trim()});close();}}}>Usar ubicación</button></div>
    </dialog>}
  </div>;
}
