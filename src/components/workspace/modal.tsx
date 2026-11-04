"use client";
import { useRef, type ReactNode } from "react";
export function EditorModal({ title, children }: {
    title: string;
    children: ReactNode;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    return <><button className="secondary" onClick={() => dialog.current?.showModal()}>{title}</button><dialog className="editor-modal" ref={dialog} aria-label={title} onClick={e => { if (e.target === dialog.current)
        dialog.current.close(); }}>
 <header><h2>{title}</h2><button className="secondary" onClick={() => dialog.current?.close()} aria-label="Cerrar">×</button></header>
 {children}<button className="secondary" onClick={() => dialog.current?.close()}>Cancelar</button>
 </dialog></>;
}
