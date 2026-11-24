# Migración y despliegue de la Parte 11

## Qué aplica

La migración `20261124000100_rename_domain_to_entity` usa `ALTER … RENAME` dentro de una transacción. Conserva identificadores, fechas, importes, archivos, enlaces entre registros y datos de Stripe. Los nombres de restricciones e índices se alinean con Prisma.

Los roles históricos de `MembershipEvent` usan el mismo enum renombrado que las membresías, por lo que también quedan coherentes. No se cambian los roles globales `SUPER_ADMIN` y `USER`.

El cambio de nombres físicos exige coordinar código y base. No mantengas instancias de la Parte 10.4 atendiendo tráfico después de aplicar la migración. En una instalación nueva PostgreSQL debe permitir `btree_gist`, que ya utiliza la restricción de reservas del historial original.

## Base existente validada en la Parte 10.4

1. Conserva una copia recuperable de la base y de la versión anterior. Comprueba el destino de `DIRECT_URL` y que el historial de Prisma esté completo.
2. Instala la Parte 11 en un directorio separado, configura las variables existentes y ejecuta `npm ci`, `npx prisma generate`, `npm run build` y `npm test`.
3. En la ventana de actualización, detén temporalmente las escrituras de la aplicación anterior y sus tareas programadas. Evita cargas de archivos en curso durante el cambio de contratos. Los reintentos de Stripe se procesan con la nueva versión y las mismas claves de idempotencia.
4. Aplica y verifica la migración:

```sh
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

5. Activa la Parte 11 con el mismo entorno de datos y reactiva las tareas. Comprueba `/entities`, una ficha `/entity/<id>`, los accesos por rol y los pagos del usuario.

No utilices `prisma migrate reset`, `db push --accept-data-loss` ni edites las migraciones históricas para realizar esta actualización. Tampoco marques la migración nueva como aplicada sin ejecutar su SQL.

### Vercel

Conserva el proyecto y sus variables por entorno. Instala con `npm ci` y compila con `npx prisma generate && npm run build`. Ejecuta `npx prisma migrate deploy` mediante el proceso controlado de despliegue que tenga acceso a `DIRECT_URL`, coordinado con la activación de la nueva versión.

El script genérico de build no migra bases automáticamente. Así, una compilación de vista previa no modifica una base compartida. La carpeta raíz del proyecto es la carpeta que contiene `package.json`.

### Instalación nueva

En una base vacía, `npx prisma migrate deploy` aplica las 25 migraciones originales y después la de la Parte 11. El resultado coincide con `schema.prisma`. Se probó este recorrido completo en PostgreSQL 16.16.

## Enlaces, API e integraciones

Los enlaces internos generados por la nueva versión usan `entity` y `entities`. Se migran los destinos de las notificaciones ya guardadas. Los marcadores externos y clientes externos de las APIs antiguas deben adoptar las rutas nuevas; no se mantienen endpoints duplicados con el dominio anterior.

Los tokens de sesión mantienen su formato porque contienen identidad y rol global, no el enum de rol por entidad. Los contratos de UploadThing cambian a `entityId` y a los nuevos nombres de uploader. No se alteran las URLs ni las claves de archivos ya almacenados.

Las sesiones de Checkout anteriores siguen siendo procesables: sus identificadores `paymentId` y `subscriptionId` permanecen. Los nuevos metadatos incluyen `entityId`. No se requiere reescribir productos, suscripciones ni facturas históricos de la cuenta Stripe.

## Recuperación ante una interrupción

La transacción SQL evita dejar un renombrado parcial. Si Prisma informa una migración fallida, comprueba el error y el estado de `_prisma_migrations` antes de reintentar. Corrige primero la causa; usa las herramientas de resolución de Prisma únicamente tras confirmar si la transacción se revirtió o terminó.

Una reversión de la aplicación a la Parte 10.4 por sí sola no revierte los nombres físicos. Para volver a esa versión, utiliza la copia verificada y un procedimiento de restauración coordinado que contemple cualquier escritura posterior a la actualización. Esta entrega no incluye ni ejecuta una restauración destructiva.

## Pruebas reproducibles

`npm test` ejecuta las 51 pruebas automatizadas de la base, adaptadas a los nuevos contratos.

La prueba de migración exige una base vacía y exclusiva de pruebas. Rechaza una base que ya tenga tablas, no utiliza `DATABASE_URL` como alternativa y no elimina bases ni esquemas:

```sh
TEST_DATABASE_URL='postgresql://usuario:clave@host:5432/pruebas_actualizacion' npm run test:migration
TEST_DATABASE_URL='postgresql://usuario:clave@host:5432/pruebas_instalacion' TEST_MIGRATION_MODE=fresh npm run test:migration
```

El modo de actualización aplica el historial anterior, crea datos sintéticos, aplica la Parte 11 y compara todas las filas. El modo `fresh` usa otra base vacía. Ambos verifican que no existan diferencias con Prisma y que una segunda ejecución de `migrate deploy` no tenga migraciones pendientes.

Para `npm run test:http`, inicia una instancia local compilada conectada exclusivamente a la base sintética creada por el modo de actualización. Exporta `TEST_BASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `STRIPE_WEBHOOK_SECRET` y `CRON_SECRET` con los valores de esa instancia. La prueba crea registros sintéticos; no debe ejecutarse contra producción. Simula Stripe mediante firmas generadas localmente y no llama a una cuenta real.

Referencias técnicas: [migraciones personalizadas en Prisma](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/customizing-migrations) y [ALTER TABLE en PostgreSQL](https://www.postgresql.org/docs/16/sql-altertable.html).
