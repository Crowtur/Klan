# Klan — Parte 10.4

Plataforma de clubes, membresías, reservas y pagos. Esta entrega aplica el cambio de identidad sobre el código de la Parte 10.3.

## Cambios de marca

La navegación compartida, el pie de página, el registro, la presentación de acceso y el panel global muestran Klan. Los títulos y metadatos sociales incluyen la nueva marca. El recurso público del monograma K se sirve desde `/brand/klan-icon.png`; se conserva su diseño, válido para la nueva inicial. Los comentarios de identidad y la descripción del paquete se actualizan al mismo nombre.

La revisión de los textos transaccionales del repositorio no encontró menciones adicionales de la marca anterior. La configuración comercial almacenada en la cuenta de Stripe y los contenidos históricos de la base de datos se administran fuera de este código.

## Compatibilidad técnica

Se conservan deliberadamente las claves internas `klubo-theme` y `klubo:admin-filters` para recuperar las preferencias guardadas, el evento `klubo-notifications` para coordinar notificaciones y los nombres de animaciones CSS `klubo-grow` y `klubo-enter`. Son identificadores internos. El paquete mantiene el identificador `club-saas` y su archivo de dependencias fijadas.

Las cabeceras académicas conservan su texto original. Esta entrega no requiere una migración de base de datos.

## Verificación y ejecución

Utiliza las variables de entorno del despliegue anterior.

```sh
npm ci
npm run build
node --import tsx --test scripts/*.tsx scripts/*.cjs
npm start
```

El comando de instalación genera el cliente Prisma. La compilación verifica TypeScript. Las pruebas existentes incluyen recuperación de pagos Stripe y validación de permisos y cuerpos JSON.

La entrega pasó la compilación de producción y las 51 pruebas automatizadas. Se verificaron por HTTP las páginas /, /login y /register con título y metadatos Klan, el icono con respuesta 200 y /api/test-db con respuesta 404. La comprobación se realizó localmente.
