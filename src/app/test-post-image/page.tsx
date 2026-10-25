
"use client";

import { useState } from "react";
import { UploadButton } from "@/lib/uploadthing";

export default function TestPostImagePage() {
  const [clubId, setClubId] = useState("");
  const [postId, setPostId] = useState("");
  const [result, setResult] = useState("");

  return (
    <main style={{ padding: "40px", maxWidth: "600px" }}>
      <h1>Prueba de imágenes de publicaciones</h1>

      <p>Club ID:</p>
      <input
        type="text"
        value={clubId}
        onChange={(e) => setClubId(e.target.value)}
        placeholder="UUID del club"
        style={{ width: "100%", padding: "10px" }}
      />

      <p>Post ID:</p>
      <input
        type="text"
        value={postId}
        onChange={(e) => setPostId(e.target.value)}
        placeholder="UUID de la publicación"
        style={{ width: "100%", padding: "10px" }}
      />

      <div style={{ marginTop: "25px" }}>
        {clubId && postId ? (
          <UploadButton
            endpoint="postImageUploader"
            input={{
              clubId,
              postId,
            }}
            onClientUploadComplete={(res) => {
              setResult(
                JSON.stringify(res, null, 2)
              );
            }}
            onUploadError={(error) => {
              setResult(`ERROR: ${error.message}`);
            }}
          />
        ) : (
          <p>Introduce ambos identificadores para habilitar la subida.</p>
        )}
      </div>

      {result && (
        <pre
          style={{
            marginTop: "25px",
            padding: "15px",
            background: "#f3f4f6",
            color: "#111827",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {result}
        </pre>
      )}
    </main>
  );
}
