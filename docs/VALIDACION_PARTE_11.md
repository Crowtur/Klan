# Validación de la Parte 11

Fecha: 24 de noviembre de 2026. Entorno local: Node.js 24.22.3, npm 11.19.1, Next.js 16.3.6, Prisma 5.22.0 y PostgreSQL 16.16. Las pruebas usan registros sintéticos y claves de prueba locales.

## Resultados ejecutados

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| Instalación con `npm ci` | Correcta; mismas versiones y resoluciones que la Parte 10.4 | Auditoría del lockfile y ejecución local |
| `npx prisma validate` | Correcto | `evidencias/prisma-validate.txt` |
| `npx prisma generate` | Correcto; cliente 5.22.0 generado | `evidencias/prisma-generate.txt` |
| `npm run build` | Correcto; compilación de producción y comprobación de TypeScript | `evidencias/build.txt` |
| `npm test` | 51 pruebas aprobadas; 0 fallidas, omitidas o pendientes | `evidencias/automated-tests.txt` |
| Actualización desde el historial 10.4 | Correcta; 26 migraciones totales, 23 tablas y 28 filas sintéticas preservadas | `evidencias/migration-upgrade.json` |
| Instalación desde una base vacía | Correcta; 26 migraciones y 23 tablas | `evidencias/migration-fresh.json` |
| Comparación base/esquema con `prisma migrate diff --exit-code` | Sin diferencias reconocidas por Prisma, en ambos recorridos | Prueba de migración incluida |
| Repetición de `migrate deploy` | Sin migraciones pendientes ni cambios de datos | Prueba de migración incluida |
| Verificación HTTP con servidor de producción | 29 peticiones con resultado esperado | `evidencias/http.json` |
| Migraciones originales | 25 archivos SQL y el archivo de bloqueo idénticos | Trazabilidad y auditoría |
| Encabezados institucionales originales | 146 bloques idénticos, incluidos espacios y texto de autoría/IA | `evidencias/preservation.json` |
| Estilos | 3 hojas CSS conservadas tras normalizar únicamente el nombre del dominio y los comentarios | `evidencias/preservation.json` |
| Clases y condiciones JSX | 409 literales asociados a `className` comparados con su equivalente original | `evidencias/jsx-style-audit.json` |
| Hook móvil | Archivo original idéntico; conserva `(width < 768px)` | Auditoría de preservación |
| Recursos binarios de marca | PNG e ICO originales idénticos | Auditoría y hashes |
| Referencias antiguas en código activo | Sin coincidencias de `Club`, `clubId`, `CLUB_ADMIN` o rutas anteriores en `src`, esquema y seed | Auditoría del código |

## Qué cubren las pruebas

Las pruebas de migración comparan todas las columnas y filas de las fixtures antes y después del cambio. Verifican identificadores, precios, importes, fechas, pagos, obligaciones, referencias Stripe, datos bancarios, reservas, publicaciones, roles y eventos históricos. Los nombres y textos escritos por usuarios se conservan incluso cuando contienen la palabra «club».

Se comprueba expresamente que `Notification.entityId` quede separado de `targetId`, que una notificación sin entidad conserve el valor nulo y que los destinos previos se conviertan correctamente. Se verifica que sigan rechazándose las membresías duplicadas, las referencias a entidades inexistentes y las reservas solapadas.

La verificación HTTP consulta las páginas públicas, el catálogo, la búsqueda y las colecciones privadas. Comprueba creación con `ENTITY_ADMIN`, filtrado de notificaciones, redirección de visitantes, aislamiento entre entidades, códigos 400/401/403 y respuesta 404 de `/api/test-db`.

El webhook de prueba se firma con el SDK de Stripe y contiene metadatos de una sesión anterior. El pago se registra sobre PostgreSQL, se repite el mismo evento y se verifica que no haya una segunda activación ni modificación de fechas. Para el pase de un día, se usa una fecha sintética anterior y se ejecuta la tarea de vencimiento: queda `FINISHED`, con `gracePeriodEndsAt = null`. Esta prueba simula el transcurso del tiempo; no esperó 24 horas ni efectuó un cobro real.

Las 51 pruebas existentes continúan cubriendo, entre otros casos, renovación de facturas en gracia sin duplicar deuda ni retroceder fechas, validación de permisos, restricciones documentales, cargas con dependencias simuladas y componentes renderizados en servidor.

## Límites de la validación

- La revisión interactiva en Chromium no pudo ejecutarse: el entorno impidió crear el socket del proceso del navegador. No se declara aprobada una revisión visual a 390/767/768/1280 px. La preservación móvil se comprobó mediante comparación de CSS, clases, hook y pruebas existentes.
- No se desplegó en Vercel ni se modificó una base de producción. La compilación se ejecutó localmente con las versiones del proyecto.
- No se realizaron cargos ni cargas reales a servicios externos. Stripe se validó con eventos firmados localmente; las pruebas de UploadThing emplean dependencias simuladas.
- La conservación de datos se verificó con fixtures controladas. Antes de actualizar los datos reales se debe seguir la guía de migración y comprobar su copia de recuperación.

Los scripts `verify-entity-migration.mjs` y `verify-entity-http.mjs` están incluidos para repetir las comprobaciones sobre entornos de prueba propios. El ZIP contiene código fuente, migraciones, recursos, configuración de ejemplo y evidencias; las dependencias y el resultado compilado se regeneran con los comandos del README.
