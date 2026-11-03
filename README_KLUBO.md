# Klubo — frontend basado en Figma

Entrega del 30 de octubre de 2026. Base: `club-saas(1).zip`, los cinco PDF de `Klubo Figma.zip` y la hoja de ruta de pantallas, funciones y navegación.

## Integración

1. Extrae este ZIP en una carpeta nueva y conserva tu proyecto anterior como respaldo.
2. Copia tu archivo `.env` local a la carpeta `club-saas`. Las credenciales no se incluyen en esta entrega.
3. Ejecuta `npm ci`, `npx prisma generate` y `npm run dev`.
4. Abre `http://localhost:3000`.

No hay migraciones de base de datos ni dependencias nuevas. Se conservan package.json y package-lock.json del proyecto recibido. El identificador interno del paquete sigue siendo `club-saas`; la marca visible, el título del navegador y el icono son Klubo.

Si prefieres integrar en tu carpeta actual, copia `src/components`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, los cuatro `page.tsx` de pruebas y `src/app/explore/[clubId]/page.tsx`; añade `public/brand/klubo-icon.png` y elimina el favicon anterior `src/app/favicon.ico` para que Next use el nuevo icono. Conserva tu `.env` y tu base de datos.

## Qué cambió

- Landing con hero, vista ilustrativa del producto, módulos, pasos y llamada a registro, siguiendo el PDF P01.
- Cabecera, logo original de `docs/ico.png`, menú de perfil, cambio de foto, accesos personales y cierre de sesión. Sin página de cuenta ni dashboards dentro del perfil.
- Navegación del workspace con sección activa y desplazamiento horizontal en móvil.
- Feed separado en `workspace/feed.tsx`, con tarjetas de publicaciones, estado vacío y columna lateral alimentada por las membresías reales.
- Explorador público y autenticado comparten `BrowseClubs`, con búsqueda real, tarjetas en tres columnas y paginación de seis clubes.
- Membresías, suscripciones, pagos y solicitudes con tarjetas, estados, formularios y carga documental existentes. Se muestra también el precio del plan de cada suscripción.
- Ficha pública, nueve pestañas del club, instalaciones, reservas, planes, requisitos, miembros, revisión documental y configuración con estilos comunes.
- Horarios y disponibilidad en dos columnas en escritorio y una en móvil. Franjas disponibles en verde menta.
- Dashboards con tarjetas de métricas y bloques agrupados; gestión global de clubes, publicaciones y liquidaciones conservada. El detalle de liquidación añade un enlace al panel global.
- Diálogos nativos accesibles para las confirmaciones de `Action`: foco inicial en Volver, Escape para cerrar y retorno del foco al control de origen. Los formularios desplegables siguen siendo desplegables.
- Cambiar nombre/logo del club actualiza su cabecera. Cancelar una reserva desde una instalación actualiza también su disponibilidad.
- Páginas de retorno de pagos y las cuatro páginas técnicas de prueba conservadas y adaptadas al estilo.
- Tipografía local, sin descargas de Google Fonts. Iconos SVG integrados, sin dependencia adicional.

## Diseño y recursos

Los siete colores solicitados están centralizados en `src/app/globals.css`. Los estilos del workspace viven en `src/components/workspace/workspace.css`; autenticación y perfil en `src/components/basic.module.css`.

El logo original se conserva en `docs/ico.png` y se copia a `public/brand/klubo-icon.png`. Se usa en cabecera, pie, icono de pestaña y metadatos Apple.

La URL temporal indicada está centralizada en `PLACEHOLDER_IMAGE`, en `src/components/ui.tsx`. Se usa para portadas decorativas de clubes. Para cambiar esas portadas, modifica esa constante. Las fotos de perfil, logos y publicaciones existentes siguen usando las URLs que devuelve tu backend; no se sustituyen imágenes reales ni se escribe el placeholder en la base de datos.

Los importes se formatean explícitamente como USD en `money()` y en las métricas financieras. No se ha añadido una conversión de divisas ni se han alterado los importes guardados. El backend recibido ya configura los cobros en USD.

## Fidelidad funcional a la hoja de ruta

Se mantienen los 12 archivos `page.tsx`, los 15 valores de `view` de `/app` y las nueve pestañas de club. No se han modificado archivos de `src/app/api`, `src/lib` ni `prisma`. Los controles siguen usando sus endpoints originales y las verificaciones de roles del servidor.

Los PDF incluyen elementos que no están implementados en la API: comentarios, likes, categorías de clubes, ciudades, contadores públicos de socios y una agenda de actividades. No se han inventado esos datos ni se han añadido botones sin función. La columna lateral usa clubes reales y enlaces a funciones existentes. Contacto, Privacidad y Términos no se presentan como enlaces porque el proyecto no tiene esas páginas.

La vista del panel en la landing es una ilustración identificada como tal; sus cifras no son estadísticas reales de la plataforma. Ninguna pantalla operativa incorpora registros de ejemplo.

## Verificación y límites

- TypeScript: `tsc --noEmit`, sin errores.
- Compilación: `next build --webpack`, completada con las rutas existentes.
- Comparación de archivos: API, bibliotecas de negocio y esquema Prisma sin cambios.
- Revisión visual e interacciones en navegador con un entorno aislado de datos simulados: landing, explorador/búsqueda, feed/estado vacío, perfil, suscripciones, diálogos, ficha pública, pagos, planes, instalaciones, solicitudes, miembros, configuración, panel del club, gestión global y liquidaciones. Revisión móvil del feed a 390 px.
- El entorno de revisión usa los componentes reales con respuestas simuladas; no se incluye en el ZIP. No sustituye pruebas integradas con tu PostgreSQL, Stripe y UploadThing.
- No se realizaron cobros, subidas de documentos, modificaciones de usuarios ni migraciones sobre servicios reales.

Antes de usarlo con usuarios reales, verifica en tu entorno el registro/login/logout, cambio de avatar, carga de documentos, aprobación de solicitudes, reserva/cancelación y checkout de Stripe en modo de prueba. Las páginas técnicas de prueba mantienen el acceso que tenían en el proyecto recibido.

No se incluyen `node_modules`, `.next`, credenciales, cachés ni archivos del entorno de revisión.
