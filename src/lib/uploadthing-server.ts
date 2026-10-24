
import { UTApi } from "uploadthing/server";

/**
 * Cliente de UploadThing para operaciones
 * realizadas exclusivamente desde el servidor.
 *
 * Utiliza UPLOADTHING_TOKEN desde las
 * variables de entorno del proyecto.
 */
export const utapi = new UTApi();

/**
 * Elimina un archivo de UploadThing mediante
 * su identificador (fileKey).
 *
 * Esta función no debe ejecutarse directamente
 * desde componentes del navegador.
 */
export async function deleteUploadThingFile(
  fileKey: string
): Promise<void> {
  if (!fileKey || !fileKey.trim()) {
    throw new Error(
      "El identificador del archivo es obligatorio"
    );
  }

  const result = await utapi.deleteFiles(fileKey);

  if (!result.success) {
    throw new Error(
      "UploadThing no pudo eliminar el archivo"
    );
  }
}
