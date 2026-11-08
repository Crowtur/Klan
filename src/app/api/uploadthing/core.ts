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

/* Cada tipo de archivo declara sus límites, el permiso necesario y la operación que vincula el resultado con el registro de Klubo. */
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/auth";
import { requireClubAdmin } from "@/lib/auth/authorization";
import { deleteUploadThingFile } from "@/lib/uploadthing-server";

const f = createUploadthing();

const clubUploadInput = z.object({
  clubId: z.string().uuid(),
});

/** Exige una sesión válida para vincular la carga a un usuario. */
async function getAuthenticatedUser(req: Request) {
  try {
    return await requireAuth(req);
  } catch {
    throw new UploadThingError({
      code: "FORBIDDEN",
      message: "Debes iniciar sesión para subir archivos",
    });
  }
}

/** Vuelve a comprobar el rol antes de permitir una carga administrativa. */
async function verifyClubAdmin(userId: string, clubId: string) {
  try {
    await requireClubAdmin(userId, clubId);
  } catch {
    throw new UploadThingError({
      code: "FORBIDDEN",
      message: "No tienes permisos para subir archivos a este club",
    });
  }
}

/**
 * Comprueba si un archivo continúa referenciado
 * en algún registro de la plataforma.
 */
/** Busca referencias antes de eliminar una clave que podría seguir en uso. */
async function isFileReferenced(fileKey: string) {
  const [receipts, users, clubs, documents, versions, posts] = await Promise.all([
    prisma.clubSettlement.count({ where: { receiptFileKey: fileKey } }),
    prisma.user.count({
      where: { avatarFileKey: fileKey },
    }),

    prisma.club.count({
      where: { OR: [{ logoFileKey: fileKey }, { coverFileKey: fileKey }] },
    }),

    prisma.membershipDocument.count({
      where: { fileKey },
    }),

    prisma.membershipDocumentVersion.count({ where: { fileKey } }),
    prisma.post.count({
      where: { imageFileKey: fileKey },
    }),
  ]);

  return users + clubs + documents + posts + versions + receipts > 0;
}

/**
 * Intenta eliminar un archivo antiguo.
 *
 * Un fallo de limpieza no debe provocar que
 * la nueva imagen deje de funcionar.
 */
/** Comprueba si el archivo anterior puede retirarse al reemplazarlo. */
async function cleanupOldFile(
  oldFileKey: string | null,
  newFileKey: string
) {
  if (!oldFileKey || oldFileKey === newFileKey) {
    return;
  }

  try {
    const referenced = await isFileReferenced(oldFileKey);

    if (referenced) {
      console.warn(
        "[UploadThing] Archivo anterior todavía referenciado:",
        oldFileKey
      );
      return;
    }

    await deleteUploadThingFile(oldFileKey);

    console.log(
      "[UploadThing] Archivo anterior eliminado:",
      oldFileKey
    );
  } catch (error) {
    console.error(
      "[UploadThing] Error al eliminar archivo anterior:",
      error
    );
  }
}

/**
 * Intenta eliminar un archivo recién subido
 * cuando no pudo registrarse en PostgreSQL.
 */
/** Intenta retirar un archivo cuya vinculación no llegó a completarse. */
async function cleanupFailedUpload(fileKey: string) {
  try {
    const referenced = await isFileReferenced(fileKey);

    if (!referenced) {
      await deleteUploadThingFile(fileKey);
    }
  } catch (error) {
    console.error(
      "[UploadThing] No se pudo limpiar la subida fallida:",
      error
    );
  }
}

export const ourFileRouter = {
  postComposerUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .input(z.object({ clubId: z.string().uuid(), postId: z.string().uuid().optional(), requestKey: z.string().uuid(), title: z.string().max(150), content: z.string().trim().min(1).max(5000) }))
    .middleware(async ({ req, input }) => { const user = await getAuthenticatedUser(req); await verifyClubAdmin(user.id, input.clubId); return { ...input, userId: user.id }; })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        await verifyClubAdmin(metadata.userId, metadata.clubId);
        const club = await prisma.club.findUnique({ where: { id: metadata.clubId }, select: { status: true } });
        if (club?.status !== "ACTIVE") throw new UploadThingError("El club no está activo");
        const previous = metadata.postId ? await prisma.post.findFirst({ where: { id: metadata.postId, clubId: metadata.clubId } }) : null;
        if (metadata.postId && !previous) throw new UploadThingError("Publicación no encontrada");
        const data = { title: metadata.title.trim() || null, content: metadata.content, imageUrl: file.ufsUrl, imageFileKey: file.key };
        const post = metadata.postId ? await prisma.post.update({ where: { id: metadata.postId, clubId: metadata.clubId }, data }) : await prisma.post.upsert({ where: { id: metadata.requestKey }, create: { id: metadata.requestKey, clubId: metadata.clubId, authorId: metadata.userId, ...data }, update: {} });
        if (post.clubId !== metadata.clubId || (!metadata.postId && post.authorId !== metadata.userId)) throw new UploadThingError("Identificador de publicación no válido");
        if (previous) await cleanupOldFile(previous.imageFileKey, file.key);
        if (post.imageFileKey !== file.key) await cleanupFailedUpload(file.key);
        return { persisted: true, postId: post.id };
      } catch (error) { await cleanupFailedUpload(file.key); throw error; }
    }),
  settlementReceiptUploader: f({ pdf: { maxFileSize: "8MB", maxFileCount: 1 }, image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .input(z.object({ settlementId: z.string().uuid() }))
    .middleware(async ({ req, input, files }) => { const user = await getAuthenticatedUser(req); if (user.globalRole !== "SUPER_ADMIN" || files.length !== 1) throw new UploadThingError("Carga no autorizada"); const settlement = await prisma.clubSettlement.findUnique({ where: { id: input.settlementId } }); if (!settlement) throw new UploadThingError("Liquidación no encontrada"); return { ...input, userId: user.id }; })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        const user = await prisma.user.findUnique({ where: { id: metadata.userId } }); if (user?.globalRole !== "SUPER_ADMIN" || user.status !== "ACTIVE") throw new UploadThingError("Carga no autorizada");
        const old = await prisma.clubSettlement.findUniqueOrThrow({ where: { id: metadata.settlementId } });
        const saved = await prisma.clubSettlement.updateMany({ where: { id: old.id, receiptFileKey: old.receiptFileKey }, data: { receiptUrl: file.ufsUrl, receiptFileKey: file.key, receiptFileName: file.name } });
        if (saved.count !== 1) throw new UploadThingError("El comprobante cambió durante la subida. Actualiza e intenta nuevamente.");
        await cleanupOldFile(old.receiptFileKey, file.key); return { persisted: true };
      } catch (error) { await cleanupFailedUpload(file.key); throw error; }
    }),

  // 1. Fotografía de perfil
  userAvatarUploader: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      const user = await getAuthenticatedUser(req);

      return {
        userId: user.id,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Guardar la referencia anterior antes del cambio.
      const previousUser = await prisma.user.findUnique({
        where: {
          id: metadata.userId,
        },
        select: {
          avatarFileKey: true,
        },
      });

      if (!previousUser) {
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "El usuario ya no existe",
        });
      }

      // Actualizar la fotografía en PostgreSQL.
      const imageUrl = "/api/avatars/" + encodeURIComponent(file.key);
      try {
        const { downloadAvatars } = await import("@/lib/thumbnails");
        const sizes = await downloadAvatars(file.ufsUrl);
        await prisma.$transaction(async tx => {
          const saved = await tx.user.updateMany({
            where: {id:metadata.userId,status:"ACTIVE",avatarFileKey:previousUser.avatarFileKey},
            data: {avatarUrl:imageUrl,avatarFileKey:file.key}
          });
          if (!saved.count) throw new UploadThingError("La imagen cambió. Vuelve a intentarlo.");
          await tx.avatarThumbnail.upsert({where:{key:file.key},create:{key:file.key,...sizes},update:sizes});
          if (previousUser.avatarFileKey && previousUser.avatarFileKey !== file.key)
            await tx.avatarThumbnail.deleteMany({where:{key:previousUser.avatarFileKey}});
        });
      } catch (error) { await cleanupFailedUpload(file.key); throw error; }
      // Eliminar la fotografía anterior, si corresponde.
      await cleanupOldFile(
        previousUser.avatarFileKey,
        file.key
      );

      return {
        uploadedBy: metadata.userId,
        fileKey: file.key,
        fileUrl: imageUrl,
        persisted: true,
      };
    }),

  // 2. Logotipo del club
  clubLogoUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .input(clubUploadInput)
    .middleware(async ({ req, input }) => {
      const user = await getAuthenticatedUser(req);

      await verifyClubAdmin(user.id, input.clubId);

      return {
        userId: user.id,
        clubId: input.clubId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Revalidar permisos antes de modificar el club.
      await verifyClubAdmin(
        metadata.userId,
        metadata.clubId
      );

      // Consultar el logotipo anterior.
      const previousClub = await prisma.club.findUnique({
        where: {
          id: metadata.clubId,
        },
        select: {
          logoFileKey: true,
        },
      });

      if (!previousClub) {
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "El club ya no existe",
        });
      }

      // Guardar el nuevo logotipo.
      const imageUrl = "/api/avatars/" + encodeURIComponent(file.key);
      try {
        const { downloadAvatars } = await import("@/lib/thumbnails");
        const sizes = await downloadAvatars(file.ufsUrl);
        await prisma.$transaction(async tx => {
          const saved = await tx.club.updateMany({
            where: {id:metadata.clubId,status:"ACTIVE",logoFileKey:previousClub.logoFileKey},
            data: {logoUrl:imageUrl,logoFileKey:file.key}
          });
          if (!saved.count) throw new UploadThingError("La imagen cambió. Vuelve a intentarlo.");
          await tx.avatarThumbnail.upsert({where:{key:file.key},create:{key:file.key,...sizes},update:sizes});
          if (previousClub.logoFileKey && previousClub.logoFileKey !== file.key)
            await tx.avatarThumbnail.deleteMany({where:{key:previousClub.logoFileKey}});
        });
      } catch (error) { await cleanupFailedUpload(file.key); throw error; }
      // Intentar eliminar el logotipo anterior.
      await cleanupOldFile(
        previousClub.logoFileKey,
        file.key
      );

      return {
        uploadedBy: metadata.userId,
        clubId: metadata.clubId,
        fileKey: file.key,
        fileUrl: imageUrl,
        persisted: true,
      };
    }),
  clubCoverUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .input(clubUploadInput)
    .middleware(async ({ req, input }) => {
      const user = await getAuthenticatedUser(req);

      await verifyClubAdmin(user.id, input.clubId);

      return {
        userId: user.id,
        clubId: input.clubId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Revalidar permisos antes de modificar el club.
      await verifyClubAdmin(
        metadata.userId,
        metadata.clubId
      );

      // Consultar el logotipo anterior.
      const previousClub = await prisma.club.findUnique({
        where: {
          id: metadata.clubId,
        },
        select: {
          coverFileKey: true,
        },
      });

      if (!previousClub) {
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "El club ya no existe",
        });
      }

      // Guardar el nuevo logotipo.
      await prisma.club.update({
        where: {
          id: metadata.clubId,
          status: "ACTIVE",
        },
        data: {
          coverUrl: file.ufsUrl,
          coverFileKey: file.key,
        },
      });

      // Intentar eliminar el logotipo anterior.
      await cleanupOldFile(
        previousClub.coverFileKey,
        file.key
      );

      return {
        uploadedBy: metadata.userId,
        clubId: metadata.clubId,
        fileKey: file.key,
        fileUrl: file.ufsUrl,
        persisted: true,
      };
    }),

  // 3. Documentos de solicitudes de membresía
  membershipDocumentUploader: f({
    pdf: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .input(
      z.object({
        clubId: z.string().uuid(),
        applicationId: z.string().uuid(),
        requirementId: z.string().uuid(),
      })
    )
    .middleware(async ({ req, input }) => {
      const user = await getAuthenticatedUser(req);

      // Verificar que la solicitud pertenezca al usuario y al club especificado.
      const application = await prisma.membershipApplication.findFirst({
        where: {
          id: input.applicationId,
          userId: user.id,
          status: {
            in: ["PENDING", "DOCUMENTATION_REVIEW"],
          },
          plan: {
            clubId: input.clubId,
            requiresDocumentation: true,
          },
        },
        select: {
          id: true,
          planId: true,
        },
      });

      if (!application) {
        throw new UploadThingError({
          code: "FORBIDDEN",
          message: "No puedes cargar documentos en esta solicitud",
        });
      }

      // Verificar que el requisito pertenezca al plan de la solicitud.
      const requirement = await prisma.planDocumentRequirement.findFirst({
        where: {
          id: input.requirementId,
          planId: application.planId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!requirement) {
        throw new UploadThingError({
          code: "BAD_REQUEST",
          message: "El requisito documental no es válido",
        });
      }

      const existing = await prisma.membershipDocument.findUnique({
        where: {
          applicationId_requirementId: {
            applicationId: input.applicationId,
            requirementId: input.requirementId,
          },
        },
        select: {
          id: true,
          version: true, status: true, deletedAt: true,
        },
      });

      // Si ya existe un documento, solamente puede
      // reemplazarse cuando fue rechazado.
      if (existing && !existing.deletedAt && existing.status !== "REJECTED" && existing.status !== "PENDING") {
        throw new UploadThingError({
          code: "BAD_REQUEST",
          message:
            "Solo puedes reemplazar documentos rechazados",
        });
      }

      return {
        userId: user.id,
        clubId: input.clubId,
        applicationId: input.applicationId,
        requirementId: input.requirementId,
        expectedVersion: existing?.version ?? 0,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        // Revalidar que la solicitud sigue perteneciendo
        // al usuario y que continúa abierta.
        const application =
          await prisma.membershipApplication.findFirst({
            where: {
              id: metadata.applicationId,
              userId: metadata.userId,
              status: {
                in: ["PENDING", "DOCUMENTATION_REVIEW"],
              },
              plan: {
                clubId: metadata.clubId,
                requiresDocumentation: true,
              },
            },
            select: {
              id: true,
              planId: true,
            },
          });

        if (!application) {
          throw new UploadThingError({
            code: "FORBIDDEN",
            message:
              "La solicitud ya no permite subir documentos",
          });
        }

        // Verificar que el requisito sigue activo
        // y pertenece al plan de la solicitud.
        const requirement =
          await prisma.planDocumentRequirement.findFirst({
            where: {
              id: metadata.requirementId,
              planId: application.planId,
              isActive: true,
            },
            select: {
              id: true,
            },
          });

        if (!requirement) {
          throw new UploadThingError({
            code: "BAD_REQUEST",
            message:
              "El requisito documental ya no es válido",
          });
        }

        const existing =
          await prisma.membershipDocument.findUnique({
            where: {
              applicationId_requirementId: {
                applicationId: metadata.applicationId,
                requirementId: metadata.requirementId,
              },
            },

          });

        if (existing && !existing.deletedAt && existing.fileKey === file.key) {
          return { persisted: true, documentId: existing.id, applicationId: existing.applicationId, requirementId: existing.requirementId };
        }
        if (metadata.expectedVersion !== undefined && metadata.expectedVersion !== (existing?.version ?? 0)) {
          throw new UploadThingError({ code: "BAD_REQUEST", message: "El documento cambió durante la subida. Actualiza la solicitud." });
        }

        // CASO 1: Primera subida.
        if (!existing) {
          const document =
            await prisma.membershipDocument.create({
              data: {
                applicationId: metadata.applicationId,
                requirementId: metadata.requirementId,
                fileUrl: file.ufsUrl,
                fileKey: file.key,
                fileName: file.name,
                mimeType: "application/pdf", fileSizeBytes: file.size,
                status: "PENDING",
              },
            });

          return {
            persisted: true,
            replaced: false,
            documentId: document.id,
            applicationId: document.applicationId,
            requirementId: document.requirementId,
          };
        }

        // CASO 2: Solo se reemplazan documentos rechazados.
        if (!existing.deletedAt && existing.status === "APPROVED") {
          throw new UploadThingError({
            code: "BAD_REQUEST",
            message:
              "Solo puedes reemplazar documentos rechazados",
          });
        }

        // Actualización condicional para evitar que
        // dos reemplazos sobrescriban el mismo documento.
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const updated =
            await tx.membershipDocument.updateMany({
              where: {
                id: existing.id, version: existing.version,
                status: existing.status,
                application: {
                  userId: metadata.userId,
                  status: {
                    in: ["PENDING", "DOCUMENTATION_REVIEW"],
                  },
                  plan: {
                    clubId: metadata.clubId,
                    requiresDocumentation: true,
                  },
                },
                requirement: {
                  planId: application.planId,
                  isActive: true,
                },
              },
              data: {
                version: { increment: 1 }, deletedAt: null, uploadedAt: new Date(), fileUrl: file.ufsUrl,
                fileKey: file.key,
                fileName: file.name,
                mimeType: "application/pdf", fileSizeBytes: file.size,
                status: "PENDING",
                rejectionReason: null,
                reviewedAt: null,
                reviewedById: null,
              },
            });

          if (updated.count !== 1) {
            throw new UploadThingError({
              code: "BAD_REQUEST",
              message:
                "El documento cambió de estado. Actualiza la solicitud antes de intentar nuevamente.",
            });
          }

          const { id, applicationId, requirementId, deletedAt, ...snapshot } = existing;
          if (!deletedAt) await tx.membershipDocumentVersion.create({ data: { ...snapshot, documentId: id } });
        });
        return {
          persisted: true,
          replaced: true,
          documentId: existing.id,
          applicationId: metadata.applicationId,
          requirementId: metadata.requirementId,
        };
      } catch (error) {
        // Si el nuevo archivo no quedó referenciado,
        // intentamos eliminarlo de UploadThing.
        await cleanupFailedUpload(file.key);

        throw error;
      }
    }),

  // 4. Imagen de publicación
  postImageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .input(
      z.object({
        clubId: z.string().uuid(),
        postId: z.string().uuid(),
      })
    )
    .middleware(async ({ req, input }) => {
      const user = await getAuthenticatedUser(req);

      await verifyClubAdmin(user.id, input.clubId);

      const post = await prisma.post.findFirst({
        where: {
          id: input.postId,
          clubId: input.clubId,
          club: {
            status: "ACTIVE",
          },
        },
        select: {
          id: true,
        },
      });

      if (!post) {
        throw new UploadThingError({
          code: "NOT_FOUND",
          message: "La publicación no existe en este club activo",
        });
      }

      return {
        userId: user.id,
        clubId: input.clubId,
        postId: input.postId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        // 1. Revalidar permisos.
        await verifyClubAdmin(
          metadata.userId,
          metadata.clubId
        );

        // 2. Consultar el estado actual de la publicación.
        const previousPost = await prisma.post.findFirst({
          where: {
            id: metadata.postId,
            clubId: metadata.clubId,
            club: {
              status: "ACTIVE",
            },
          },
          select: {
            id: true,
            imageFileKey: true,
          },
        });

        if (!previousPost) {
          throw new UploadThingError({
            code: "NOT_FOUND",
            message: "La publicación ya no está disponible",
          });
        }

        // 3. Actualización condicional:
        // solo reemplazar si la imagen no ha cambiado.
        const updated = await prisma.post.updateMany({
          where: {
            id: metadata.postId,
            clubId: metadata.clubId,
            club: {
              status: "ACTIVE",
            },
            imageFileKey: previousPost.imageFileKey,
          },
          data: {
            imageUrl: file.ufsUrl,
            imageFileKey: file.key,
          },
        });

        if (updated.count !== 1) {
          throw new UploadThingError({
            code: "BAD_REQUEST",
            message:
              "La imagen fue modificada durante la subida. Intenta nuevamente.",
          });
        }

        // 4. Eliminar la imagen anterior si ya no está referenciada.
        await cleanupOldFile(
          previousPost.imageFileKey,
          file.key
        );

        return {
          persisted: true,
          postId: metadata.postId,
          clubId: metadata.clubId,
          fileKey: file.key,
          fileUrl: file.ufsUrl,
        };
      } catch (error) {
        // Si esta subida no quedó guardada, intentar limpiar el archivo.
        await cleanupFailedUpload(file.key);
        throw error;
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;