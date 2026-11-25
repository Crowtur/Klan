# Klan — Parte 12

Plataforma de círculos, membresías, reservas y pagos. Esta entrega parte exactamente de `Klan_Parte_11.zip` y cambia únicamente la presentación: **Círculo / Círculos** en los textos de la aplicación, con el dominio técnico **Entity** intacto.

## Actualización desde la Parte 11

**La Parte 12 no requiere ninguna migración nueva de base de datos.** El esquema Prisma, el seed y las 26 migraciones existentes son idénticos a los de la Parte 11. Se conservan los identificadores, roles, rutas, parámetros y contratos de la API.

Los avisos históricos de retiro se muestran con la nueva terminología sin actualizar sus registros. Los nombres, descripciones y publicaciones escritos por los usuarios se conservan.

## Instalación y ejecución

Utiliza las mismas variables de entorno y dependencias de la Parte 11. La entrega se verificó con Node.js 24.22.3, npm 11.19.1, Next.js 16.3.6, TypeScript 5.9.3 y Prisma 5.22.0.

1. Configura las variables de `.env.example` en tu entorno.
2. Instala las dependencias; `postinstall` genera el cliente Prisma:

```sh
npm ci
```

3. Compila y comprueba:

```sh
npm run build
npx tsc --noEmit
npm test
```

4. Ejecuta `npm start` para producción o `npm run dev` para desarrollo.

Para una base nueva o una instalación anterior a la Parte 11, sigue [la guía de migración de la Parte 11](docs/MIGRACION_PARTE_11.md). El historial se incluye completo. No es necesario ejecutar el seed al actualizar una instalación existente.

## Terminología y contratos

| Presentación | Contrato técnico conservado |
| --- | --- |
| Círculo | `Entity`, `entityId` |
| Círculos | `entities` |
| Explorar círculos | `/entities` |
| Ficha de un círculo | `/entity/[entityId]` |
| Espacio del círculo | `/app?view=entity&entity=<id>` |
| Mis círculos | `/app?view=entities` |
| API | `/api/entities` y sus rutas existentes |
| Administrador | `ENTITY_ADMIN` |

## Vercel

Mantén la configuración y las variables del despliegue de la Parte 11. Puedes conservar `npm ci` como instalación y `npx prisma generate && npm run build` como comando de compilación. Esta actualización no añade pasos de migración ni modifica `vercel.json`.

## Documentación

- [Cambios de interfaz y preservación](docs/CAMBIOS_PARTE_12.md).
- [Validación de esta entrega](docs/VALIDACION_PARTE_12.md).
- [Trazabilidad y hashes de la base](docs/TRAZABILIDAD_PARTE_12.json).

Los documentos `*_PARTE_11` y `docs/evidencias/` se conservan como historial. Las evidencias de esta entrega están en `docs/evidencias_parte12/`.
