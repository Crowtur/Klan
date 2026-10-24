
"use client";

import { useState } from "react";
import { UploadButton } from "@/lib/uploadthing";

export default function UploadTestPage() {
  const [clubId, setClubId] = useState("");
  const [message, setMessage] = useState("");

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-bold">
          Pruebas de UploadThing
        </h1>
        <p className="mt-2 text-gray-600">
          Fase 20.4 - Subida de imágenes
        </p>
      </div>

      <section className="space-y-4 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">
          Fotografía de perfil
        </h2>

        <UploadButton
          endpoint="userAvatarUploader"
          onClientUploadComplete={(res) => {
            setMessage(
              `Avatar subido correctamente: ${res[0]?.ufsUrl}`
            );
          }}
          onUploadError={(error) => {
            setMessage(`Error: ${error.message}`);
          }}
        />
      </section>

      <section className="space-y-4 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">
          Logotipo del club
        </h2>

        <label
          htmlFor="clubId"
          className="block text-sm font-medium"
        >
          ID del club
        </label>

        <input
          id="clubId"
          type="text"
          value={clubId}
          onChange={(event) =>
            setClubId(event.target.value)
          }
          placeholder="UUID del club"
          className="w-full rounded border p-2"
        />

        <UploadButton
          endpoint="clubLogoUploader"
          input={{ clubId }}
          onClientUploadComplete={(res) => {
            setMessage(
              `Logotipo subido correctamente: ${res[0]?.ufsUrl}`
            );
          }}
          onUploadError={(error) => {
            setMessage(`Error: ${error.message}`);
          }}
        />
      </section>

      {message && (
        <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-900">
          {message}
        </div>
      )}
    </main>
  );
}
