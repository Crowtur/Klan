
"use client";

import "@/components/workspace/workspace.css";
import { useState } from "react";
import { UploadButton } from "@/lib/uploadthing";

type UploadResult = {
  success: boolean;
  message: string;
  documentId?: string;
};

export default function UploadDocumentTestPage() {
  const [clubId, setClubId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [requirementId, setRequirementId] = useState("");

  const [result, setResult] = useState<UploadResult | null>(
    null
  );

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const validInputs =
    uuidRegex.test(clubId.trim()) &&
    uuidRegex.test(applicationId.trim()) &&
    uuidRegex.test(requirementId.trim());

  return (
    <main id="main-content" className="workspace technical-page">
      <div>
        <h1 className="text-2xl font-bold">
          Prueba de documentos de membresía
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Fase 20.5.3 - Integración temporal con UploadThing
        </p>
      </div>

      <section className="panel">
        <div className="space-y-2">
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
            onChange={(event) => {
              setClubId(event.target.value);
              setResult(null);
            }}
            placeholder="UUID del club"
            className="w-full rounded border p-2"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="applicationId"
            className="block text-sm font-medium"
          >
            ID de la solicitud
          </label>

          <input
            id="applicationId"
            type="text"
            value={applicationId}
            onChange={(event) => {
              setApplicationId(event.target.value);
              setResult(null);
            }}
            placeholder="UUID de MembershipApplication"
            className="w-full rounded border p-2"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="requirementId"
            className="block text-sm font-medium"
          >
            ID del requisito documental
          </label>

          <input
            id="requirementId"
            type="text"
            value={requirementId}
            onChange={(event) => {
              setRequirementId(event.target.value);
              setResult(null);
            }}
            placeholder="UUID de PlanDocumentRequirement"
            className="w-full rounded border p-2"
          />
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <p className="mb-3 text-sm font-medium text-gray-800">
            Subir documento PDF
          </p>

          {!validInputs ? (
            <p className="text-sm text-amber-700">
              Introduce los tres UUID válidos para habilitar
              la subida.
            </p>
          ) : (
            <UploadButton
              key={`${clubId}-${applicationId}-${requirementId}`}
              endpoint="membershipDocumentUploader"
              input={{
                clubId: clubId.trim(),
                applicationId: applicationId.trim(),
                requirementId: requirementId.trim(),
              }}
              onUploadBegin={() => {
                setResult(null);
              }}
              onClientUploadComplete={(files) => {
                const uploadedFile = files[0];

                if (!uploadedFile) {
                  setResult({
                    success: false,
                    message:
                      "No se recibió confirmación del archivo.",
                  });
                  return;
                }

                setResult({
                  success: true,
                  message:
                    "UploadThing confirmó la subida. " +
                    "Verifica la persistencia en Prisma Studio.",
                });
              }}
              onUploadError={(error) => {
                setResult({
                  success: false,
                  message: error.message,
                });
              }}
            />
          )}

          <p className="mt-3 text-xs text-gray-500">
            Formato permitido: PDF. Tamaño máximo: 8 MB.
          </p>
        </div>
      </section>

      {result && (
        <div
          role="status"
          className={`rounded-lg border p-4 ${
            result.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="font-medium">
            {result.success
              ? "Subida confirmada"
              : "No se pudo completar la subida"}
          </p>

          <p className="mt-1 text-sm">
            {result.message}
          </p>
        </div>
      )}
    </main>
  );
}
