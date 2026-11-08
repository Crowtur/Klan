# Klubo Parte 7

## Instalación y actualización

Usa la configuración de PostgreSQL, autenticación, Stripe y UploadThing de tu instalación anterior. Desde la carpeta del proyecto, ejecuta:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

La Parte 6.1 no requiere una migración adicional sobre la Parte 6. La migración de la Parte 6 añade una fecha opcional de suspensión. Las suspensiones anteriores sin fecha comprobable se muestran como «Sin fecha registrada». Los comprobantes de pagos completados se consultan en Stripe al abrirlos con la clave del entorno que procesó el pago. El cron de Vercel incluido en `vercel.json` llama a `GET /api/cron/read-notifications` a las 05:00 UTC (medianoche en Ecuador continental). Configura `CRON_SECRET` en el despliegue de producción. Si utilizas otro alojamiento, programa la misma petición y hora con la cabecera `Authorization: Bearer <CRON_SECRET>`. La operación borra únicamente registros con `readAt` informado.

La migración previa `20261105000100_queue_document_withdrawals` registra las eliminaciones pendientes de archivos. La retirada se intenta al confirmar la operación y el proceso programado existente `POST /api/cron/expired-plans` reintenta los fallos. Debe ejecutarse periódicamente con la cabecera `Authorization: Bearer <CRON_SECRET>`.

Para desarrollo usa `npm run dev`. Para ejecutar las pruebas aisladas desde la raíz:

```bash
node --import tsx --test scripts/*.cjs scripts/*.tsx
```


## Guía de mantenimiento

| Área | Punto de entrada | Criterio que mantiene el código |
| --- | --- | --- |
| Navegación | `src/app/app/page.tsx` y `src/components/workspace/index.tsx` | El servidor verifica la sesión y el cliente resuelve la vista solicitada. Cada ruta de datos verifica sus propios permisos. |
| Autorización por club | `src/lib/auth/authorization.ts` | La autorización se comprueba con la identidad de la sesión y el club de la operación. |
| Reservas | `src/lib/reservations/authorize-facility-reservation.ts` y las rutas de `facilities` | La disponibilidad mostrada puede cambiar. El alta bloquea la instalación y vuelve a comprobar las condiciones dentro de la transacción. |
| Cobros | `src/app/api/webhooks/stripe/route.ts` | El evento firmado confirma el resultado. La obligación representa el importe exigible y el pago representa el intento de cobro. |
| Archivos | `src/app/api/uploadthing/core.ts` y `src/lib/document-cleanup.ts` | La autorización, la vinculación del archivo y los reintentos de eliminación tienen puntos de control distintos. |
| Presentación | `src/components/workspace/common.tsx` y `workspace.css` | Una operación DELETE recibe la variante destructiva. Para cancelar mediante POST o PATCH se indica `variant="destructive"`. La variante `club-suspension` identifica el botón principal del superadministrador. |

### Configuración y encabezados

El encabezado institucional precede a los módulos de aplicación, servicios, componentes, scripts, estilos y configuraciones JavaScript o TypeScript. El esquema de Prisma usa comentarios de línea. La declaración que figura a continuación también corresponde a los archivos de configuración que se consumen como datos.

| Archivo | Responsabilidad |
| --- | --- |
| `package.json` y `package-lock.json` | Comandos de desarrollo, dependencias y versiones reproducibles. |
| `tsconfig.json` | Opciones de compilación y resolución de importaciones de TypeScript. |
| `vercel.json` | Programación de la limpieza diaria de notificaciones. |
| `next-env.d.ts` | Referencias de tipos generadas por Next.js. |
| `prisma/migrations/` | Historial de despliegue. Prisma utiliza las sumas de comprobación de los archivos SQL aplicados. |

```javascript
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
```
