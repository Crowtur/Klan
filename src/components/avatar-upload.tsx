"use client";
import {Icon} from "./ui";
import s from "./basic.module.css";
import { useRef, useState } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
const { useUploadThing } = generateReactHelpers<OurFileRouter>();
export function AvatarUpload({ onDone }: {
    onDone: () => void;
}) {
    const input = useRef<HTMLInputElement>(null), [error, setError] = useState("");
    const { startUpload, isUploading } = useUploadThing("userAvatarUploader", { onClientUploadComplete: onDone, onUploadError: e => setError(e.message) });
    return <><button className={s.photoAction} disabled={isUploading} onClick={() => input.current?.click()}><Icon name="camera"/>{isUploading ? "Subiendo…" : "Cambiar foto"}</button><input hidden ref={input} type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file)
        void startUpload([file]); e.target.value = ""; }}/>{error && <p role="alert">{error}</p>}</>;
}
