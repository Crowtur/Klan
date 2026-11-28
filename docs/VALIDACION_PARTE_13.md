# Validación de Klan — Parte 13

La verificación se ejecutó sobre el código de esta entrega, derivado de `Klan_Parte_12.zip`. Los resultados corresponden al entorno local de producción y bases de prueba desechables. No se realizó un despliegue en una cuenta de Vercel.

## Compilación y dependencias

Entorno observado: Node.js 24.22.3, Next.js 16.3.6, React 19.2.8, TypeScript 5.9.3 y Prisma 5.22.0. La única dependencia añadida es `@types/google.maps@3.67.0`; se conservaron las versiones e integridades anteriores del lockfile.

| Comprobación | Resultado |
| --- | --- |
| `npm ci` con el lockfile final | Correcto; 410 paquetes instalados y generación Prisma por postinstall. |
| `npx prisma validate` | Esquema válido. |
| `npx prisma generate` | Cliente 5.22.0 generado correctamente. |
| `npm run build` | Compilación de producción y comprobación TypeScript correctas. |
| `npx tsc --noEmit` | Sin errores. |
| `npm test` | 69 pruebas aprobadas, ninguna fallida, omitida ni cancelada. |

El build usó valores locales de prueba para las variables obligatorias existentes; no incluyó secretos de usuarios. npm emitió avisos del entorno sobre su configuración de proxy y políticas de scripts de instalación; no impidieron la instalación ni la compilación. Los logs completos se adjuntan.

## Migración real en PostgreSQL

Se utilizó PostgreSQL **16.16**, codificación **UTF-8**, `LC_COLLATE`/`LC_CTYPE` **C.UTF-8**. Se aplicaron primero las 26 migraciones originales a una base vacía, se introdujeron siete registros relacionados de la Parte 12 y después se aplicó la nueva migración.

Se compararon los campos originales de `User`, `Entity`, `Post`, `MembershipPlan`, `PlanDocumentRequirement` y `MembershipApplication`. Todos conservaron valores y fechas, excepto el booleano heredado de documentación, cuyo cambio a valor derivado es intencional y se comprobó por separado.

También se verificaron:

- Backfill y actualización de hashtags con acentos, mayúsculas, NFC y exclusión de fragmentos de URL.
- Activación/desactivación de requisitos e imposibilidad de forzar manualmente el booleano a un valor incorrecto.
- Requisito opcional sin cambio del estado de la solicitud.
- Rechazo de un orden de regla fuera del rango por la propia base de datos.
- Segundo `prisma migrate deploy` sin migraciones pendientes.
- Instalación desde cero con las 27 migraciones.
- `prisma migrate diff --exit-code`: sin diferencias entre el esquema Prisma y las dos bases verificadas. Los triggers y checks adicionales permanecen en SQL versionado.

Evidencia: `evidencias_parte13/migration.json`.

## HTTP sobre Next.js de producción

`scripts/verify-part13.mjs` realizó **70 peticiones**, más aserciones directas sobre PostgreSQL, contra una instancia local iniciada con `next start`. Resultado: todas correctas.

Cobertura: lectura pública, creación/edición/orden/eliminación de reglas, autenticación, permisos entre círculos, versiones obsoletas, lectura/eliminación del PDF, búsqueda local/global de hashtags, exclusión de círculos suspendidos, paginación, indexado tras editar un post, rechazo de destinos de preview internos, rechazo de ubicación manual o prueba falsificada, país exterior, prueba firmada ligada al usuario, ciudad/enlace persistidos, planes sin requisitos, opcionales, obligatorios, documentos pendientes/aprobados y requisitos inactivos. Se verificaron HTTP 400, 401, 403, 404, 409 y el bloqueo de `/api/test-db`.

El token de ubicación del caso de persistencia se generó con la clave de prueba local. No representa una llamada real facturada a Google Maps. La validación del país y de los componentes geográficos se cubre además en las pruebas del servicio con respuestas controladas del proveedor.

Evidencia: `evidencias_parte13/http.json` y `http-summary.txt`.

## Navegador y revisión de interfaz

Chromium ejecutó Playwright contra la compilación de producción. Se verificaron anchos **390, 767, 768 y 1280 px**, sin desbordamientos horizontales en las vistas comprobadas, y once grupos funcionales:

1. Reglas públicas vacías con texto exacto y sin controles administrativos.
2. Lectura como miembro con plan vigente, sin permisos de administrador.
3. Creación, edición, orden y eliminación de reglas.
4. Selector móvil, navegación a Planes y cierre con Escape.
5. Guardar/Cancelar en la misma fila en los cuatro anchos y ausencia de la casilla eliminada.
6. Una vista previa por publicación, antes de la imagen, reproducción tras pulsar y tarjeta genérica para enlaces no audiovisuales.
7. Recorte real: selección de proporción y posición, cancelación sin adjuntar y comparación de píxeles entre la vista elegida y el archivo exportado. Modal dentro del área visible.
8. Alternancia círculo/global/círculo de hashtags sin recargar toda la aplicación.
9. Google Maps sin clave: aviso controlado y confirmación deshabilitada.
10. SDK y geocodificación de Maps controlados: rechazo exterior, punto de Galápagos, búsqueda de Quito y confirmación de ciudad.
11. Logo y portada con proporciones propias; cancelar no produce ninguna petición de subida.

No se registraron errores JavaScript. La inspección visual incluyó reglas de escritorio, el formulario de planes y el recorte móvil. Las capturas se usaron únicamente para inspección interna y no se incluyen en el paquete.

Los metadatos externos, el iframe de video y el SDK/respuestas de Google Maps se controlaron en el navegador de pruebas. No se afirma reproducción real de todas las redes sociales ni validación con una clave de Google del despliegue.

Evidencia: `evidencias_parte13/browser.json`.

## Preservación y pruebas aisladas

- Se mantienen los 216 archivos originales; algunos se modifican y no se elimina ninguno.
- Se verifican 53 encabezados académicos de archivos fuente nuevos o modificados.
- Las 26 migraciones anteriores, seed, marca, estilos anteriores, utilidades móviles, autorización y webhook de Stripe coinciden byte por byte con la base. El inventario completo protegido consta en `preservation.json`.
- Las 51 pruebas anteriores continúan aprobadas. Los 18 casos nuevos cubren tokenización, primera URL, proveedores de video, límites de SSRF y DNS fijado/redirecciones, metadatos, Ecuador/Galápagos, separación de tokens, recorte, requisitos, autorización y callbacks de PDF idempotentes/revocados/obsoletos.
- Se inventarían 71 rutas API. La nueva entrega añade seis archivos de rutas API y la página `/hashtags`.

## Reproducción de pruebas

Las pruebas unitarias requieren únicamente `npm ci` y `npm test`.

Para HTTP, inicia una instancia local con las 27 migraciones aplicadas a una base desechable. Configura `TEST_BASE_URL`, `TEST_DATABASE_URL` y el mismo `JWT_SECRET` del servidor y ejecuta `npm run test:part13`. El script acepta sólo servidores locales, genera identificadores y etiquetas propias y elimina sus fixtures al finalizar normalmente, salvo que se active `TEST_KEEP_FIXTURES`.

Para navegador, ejecuta primero HTTP con `TEST_KEEP_FIXTURES=1` y `TEST_FIXTURES_PATH` apuntando a un archivo temporal. Ejecuta `node scripts/verify-part13-browser.mjs` con esas variables y Playwright disponible como herramienta externa. `TEST_PLAYWRIGHT_MODULE` permite indicar su módulo; `TEST_CHROMIUM_MODULE` es opcional para un runtime Chromium compatible con `executablePath()`/`args`; de lo contrario se usa Chromium de Playwright. `TEST_BROWSER_EVIDENCE` permite un directorio temporal para el resultado y capturas de inspección. Las fixtures contienen tokens de prueba: no deben publicarse ni usarse en producción.

## Alcance externo pendiente de configuración

Para activar el selector real en el despliegue, configura las claves y el Map ID descritos en README y aplica `npm run db:deploy`. Se conservan las credenciales de Stripe/UploadThing de la instalación existente. Los callbacks de archivos y las reglas de permisos fueron probados con sustitutos controlados; no se transfirieron archivos a una cuenta real de UploadThing ni se hicieron cobros reales. Las restricciones de reproducción de cada red social se manejan mediante el enlace externo disponible.
