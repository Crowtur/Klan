# Klan — Parte 11

Plataforma de entidades, membresías, reservas y pagos. Esta versión migra el dominio completo a **Entity** en el código y **Entidad** en la interfaz, partiendo exclusivamente de `Klan_Parte_10.4.zip`.

## Antes de actualizar

**Esta versión requiere una migración de PostgreSQL.** Consulta [MIGRACION_PARTE_11.md](docs/MIGRACION_PARTE_11.md) antes de activar el código nuevo sobre una base existente. El renombrado conserva datos, pagos, relaciones y eventos; las 25 migraciones anteriores se mantienen intactas.

La aplicación de la Parte 10.4 no debe seguir atendiendo solicitudes contra la base después del renombrado. Coordina la migración con el cambio de versión.

## Instalación y ejecución

Se mantienen las dependencias fijadas de la Parte 10.4. Next.js requiere Node.js 20.9 o superior; la entrega se verificó con Node.js 24.22.3 y Prisma 5.22.0.

1. Conserva las variables de entorno del despliegue anterior. Para una instalación nueva, completa `.env.example` y guarda los valores en `.env` o en la configuración del proveedor.
2. Instala y valida el cliente:

```sh
npm ci
npx prisma validate
npx prisma generate
```

3. En la base correspondiente, aplica las migraciones según la guía:

```sh
npm run db:deploy
```

4. Compila, comprueba y ejecuta:

```sh
npm run build
npm test
npm start
```

Para desarrollo utiliza `npm run dev`. El seed original conserva su comportamiento y no es necesario para actualizar una instalación existente. No lo uses como mecanismo de creación de credenciales de producción: mantiene el usuario inicial de prueba de la versión base.

## Contratos principales

| Ámbito | Parte 11 |
| --- | --- |
| Catálogo público | `/entities` |
| Ficha pública | `/entity/[entityId]` |
| Espacio privado | `/app?view=entity&entity=<id>` |
| Colección privada | `/app?view=entities` |
| API de entidades | `/api/entities` y `/api/entities/[entityId]/…` |
| Búsqueda y catálogo | `/api/search/entities`, `/api/catalog/entities/[entityId]` |
| Administración global | `/api/admin/dashboard/entities` |
| Rol administrativo | `ENTITY_ADMIN` |
| Notificaciones | `entityId` identifica la organización; `targetType` y `targetId`, el recurso del aviso |

## Vercel

Conserva las variables `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `UPLOADTHING_TOKEN`, `CRON_SECRET` y `NEXT_PUBLIC_APP_URL` de cada entorno. `DIRECT_URL` debe permitir las operaciones de migración en PostgreSQL.

Usa `npm ci` como instalación y `npx prisma generate && npm run build` como comando de compilación. Aplica `npx prisma migrate deploy` en la etapa controlada de actualización de la base, antes de activar la Parte 11. La generación del cliente y la compilación no ejecutan la migración automáticamente.

## Documentación y comprobaciones

- [Cambios y alcance](docs/CAMBIOS_PARTE_11.md).
- [Migración, despliegue y recuperación](docs/MIGRACION_PARTE_11.md).
- [Resultados de validación y límites](docs/VALIDACION_PARTE_11.md).
- [Trazabilidad de la base y archivos](docs/TRAZABILIDAD_PARTE_11.json).

Se mantienen Klan, las cabeceras institucionales PUCE - Icam, los controles HTTP 400/403, la ausencia de `/api/test-db`, la idempotencia de Stripe y las reglas móviles del umbral `< 768px`.
