
"use client";

import { useState } from "react";

type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

type MembershipDocument = {
  id: string;
  fileUrl: string;
  fileName: string | null;
  mimeType: string | null;
  status: DocumentStatus;
  rejectionReason: string | null;
  uploadedAt: string;
  requirement: {
    id: string;
    name: string;
    description: string | null;
    isRequired: boolean;
    isActive: boolean;
  };
};

type ApplicationInfo = {
  id: string;
  status: string;
  plan: {
    id: string;
    name: string;
    requiresDocumentation: boolean;
  };
};

type DocumentsResponse = {
  success: boolean;
  message?: string;
  application?: ApplicationInfo;
  documents?: MembershipDocument[];
};

export default function ReviewDocumentsTestPage() {
  const [clubId, setClubId] = useState("");
  const [applicationId, setApplicationId] = useState("");

  const [application, setApplication] =
    useState<ApplicationInfo | null>(null);

  const [documents, setDocuments] =
    useState<MembershipDocument[]>([]);

  const [rejectionReasons, setRejectionReasons] =
    useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [reviewingId, setReviewingId] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const validInputs =
    uuidRegex.test(clubId.trim()) &&
    uuidRegex.test(applicationId.trim());

  const baseUrl =
    `/api/clubs/${encodeURIComponent(clubId.trim())}` +
    `/membership-applications/${encodeURIComponent(
      applicationId.trim()
    )}/documents`;

  async function loadDocuments() {
    if (!validInputs) {
      setError("Introduce identificadores UUID válidos.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setApplication(null);
    setDocuments([]);

    try {
      const response = await fetch(baseUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: DocumentsResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ?? "No se pudieron obtener los documentos"
        );
      }

      setApplication(data.application ?? null);
      setDocuments(data.documents ?? []);

      setMessage("Documentos cargados correctamente.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al consultar los documentos"
      );
    } finally {
      setLoading(false);
    }
  }

  async function reviewDocument(
    documentId: string,
    status: "APPROVED" | "REJECTED"
  ) {
    const rejectionReason =
      rejectionReasons[documentId]?.trim() ?? "";

    if (status === "REJECTED" && !rejectionReason) {
      setError(
        "Debes indicar una razón para rechazar el documento."
      );
      return;
    }

    const confirmed = window.confirm(
      status === "APPROVED"
        ? "¿Confirmas la aprobación de este documento?"
        : "¿Confirmas el rechazo de este documento?"
    );

    if (!confirmed) return;

    setReviewingId(documentId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${baseUrl}/${encodeURIComponent(documentId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            ...(status === "REJECTED"
              ? { rejectionReason }
              : {}),
          }),
        }
      );

      const data: {
        success: boolean;
        message?: string;
      } = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ?? "No se pudo revisar el documento"
        );
      }

      // Actualizar la lista desde PostgreSQL.
      await loadDocuments();

      setMessage(
        status === "APPROVED"
          ? "Documento aprobado correctamente."
          : "Documento rechazado correctamente."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al revisar el documento"
      );
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-bold">
          Revisión de documentos
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Fase 20.5.4 - Interfaz temporal para CLUB_ADMIN
        </p>
      </header>

      <section className="space-y-4 rounded-lg border p-6">
        <div>
          <label
            htmlFor="clubId"
            className="mb-2 block text-sm font-medium"
          >
            ID del club
          </label>

          <input
            id="clubId"
            value={clubId}
            onChange={(event) => {
              setClubId(event.target.value);
              setApplication(null);
              setDocuments([]);
            }}
            placeholder="UUID del club"
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label
            htmlFor="applicationId"
            className="mb-2 block text-sm font-medium"
          >
            ID de la solicitud
          </label>

          <input
            id="applicationId"
            value={applicationId}
            onChange={(event) => {
              setApplicationId(event.target.value);
              setApplication(null);
              setDocuments([]);
            }}
            placeholder="UUID de MembershipApplication"
            className="w-full rounded border p-2"
          />
        </div>

        <button
          type="button"
          onClick={loadDocuments}
          disabled={!validInputs || loading || reviewingId !== null}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Consultando..." : "Consultar documentos"}
        </button>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded border border-green-300 bg-green-50 p-4 text-green-800"
        >
          {message}
        </div>
      )}

      {application && (
        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">
            Solicitud de membresía
          </h2>

          <p className="mt-2">
            <strong>Plan:</strong> {application.plan.name}
          </p>

          <p>
            <strong>Estado:</strong> {application.status}
          </p>

          <p>
            <strong>Documentos encontrados:</strong>{" "}
            {documents.length}
          </p>
        </section>
      )}

      {application && documents.length === 0 && (
        <p className="rounded-lg border p-6 text-gray-500">
          Esta solicitud todavía no tiene documentos registrados.
        </p>
      )}

      {documents.map((document) => (
        <section
          key={document.id}
          className="space-y-4 rounded-lg border p-6"
        >
          <div>
            <h3 className="text-lg font-semibold">
              {document.requirement.name}
            </h3>

            <p className="text-sm text-gray-500">
              {document.requirement.description ??
                "Sin descripción"}
            </p>
          </div>

          <div className="space-y-1 text-sm">
            <p>
              <strong>Archivo:</strong>{" "}
              {document.fileName ?? "Documento PDF"}
            </p>

            <p>
              <strong>Estado:</strong> {document.status}
            </p>

            <p>
              <strong>Obligatorio:</strong>{" "}
              {document.requirement.isRequired
                ? "Sí"
                : "No"}
            </p>

            <p>
              <strong>Fecha de subida:</strong>{" "}
              {new Date(
                document.uploadedAt
              ).toLocaleString("es-EC")}
            </p>
          </div>

          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white"
          >
            Abrir documento PDF
          </a>

          <div className="space-y-3 border-t pt-4">
            <label
              htmlFor={`reason-${document.id}`}
              className="block text-sm font-medium"
            >
              Motivo del rechazo
            </label>

            <textarea
              id={`reason-${document.id}`}
              value={
                rejectionReasons[document.id] ?? ""
              }
              onChange={(event) =>
                setRejectionReasons((previous) => ({
                  ...previous,
                  [document.id]: event.target.value,
                }))
              }
              placeholder="Explica por qué se rechaza el documento"
              rows={3}
              className="w-full rounded border p-2"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={reviewingId !== null}
                onClick={() =>
                  reviewDocument(document.id, "APPROVED")
                }
                className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
              >
                {reviewingId === document.id
                  ? "Procesando..."
                  : "Aprobar"}
              </button>

              <button
                type="button"
                disabled={reviewingId !== null}
                onClick={() =>
                  reviewDocument(document.id, "REJECTED")
                }
                className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
