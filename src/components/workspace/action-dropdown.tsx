"use client";
import {useEffect,useId,useRef,useState,type ReactNode} from "react";

export function ActionDropdown({label,compact=false,children}:{
  label:string;compact?:boolean;children:(close:()=>void)=>ReactNode;
}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const id=useId();
  useEffect(()=>{
    if(!open)return;
    function outside(event:Event){
      if(event.target instanceof Node && !root.current?.contains(event.target))setOpen(false);
    }
    function escape(event:KeyboardEvent){
      if(event.key==="Escape"){setOpen(false);trigger.current?.focus();}
    }
    document.addEventListener("pointerdown",outside);
    document.addEventListener("focusin",outside);
    document.addEventListener("keydown",escape);
    return ()=>{
      document.removeEventListener("pointerdown",outside);
      document.removeEventListener("focusin",outside);
      document.removeEventListener("keydown",escape);
    };
  },[open]);
  function close(){setOpen(false);trigger.current?.focus();}
  return <div ref={root} className="action-dropdown">
    <button ref={trigger} type="button" className={compact?"post-options":"visit-club"} aria-label={label}
      aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(value=>!value)}>
      {compact?<svg width="15" height="15" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">{[3,9,15].map(x=><circle key={x} cx={x} cy="9" r="1.5"/>)}</svg>:<>{label} <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3 6 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
    </button>
    {open&&<div className="dropdown-options" id={id}>{children(close)}</div>}
  </div>;
}
