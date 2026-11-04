"use client";
import { useState } from "react";
import Link from "next/link";
import { Form, clubFields, href, type Row } from "./common";
import { UploadButton } from "@/lib/uploadthing";
export function CreateClub() {
    const [club, setClub] = useState<Row | null>(null), [error, setError] = useState("");
    return club ? <><p className="notice">Club creado. Personaliza sus imágenes.</p><h3>Logotipo</h3><UploadButton endpoint="clubLogoUploader" input={{ clubId: club.id }} onUploadError={e => setError(e.message)}/><h3>Portada</h3><UploadButton endpoint="clubCoverUploader" input={{ clubId: club.id }} onUploadError={e => setError(e.message)}/>{error && <p role="alert">{error}</p>}<Link className="btn" href={href("club", { club: club.id })}>Abrir mi club →</Link></> : <Form fields={clubFields} url="/api/clubs" onDone={d => setClub(d.club)} submit="Crear club"/>;
}
