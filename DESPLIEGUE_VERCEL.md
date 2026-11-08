# Despliegue de Klubo en Vercel

Preparación sobre Klubo Parte 7. No se ha desplegado ni conectado a cuentas externas.

## Cambios incluidos

- postinstall ejecuta prisma generate y falla si no puede generar el cliente.
- @prisma/client pasa a dependencias de ejecución; lockfile actualizado.
- vercel.json no programa tareas: cron-job.org será el programador exclusivo.
- .gitignore excluye secretos y archivos generados. .env.example contiene solo nombres.

## 1. Base de datos y repositorio

Usar PostgreSQL accesible desde Vercel. localhost no es accesible desde Vercel.
DATABASE_URL: conexión de ejecución (pooler si lo proporciona el proveedor).
DIRECT_URL: conexión adecuada para migraciones según el proveedor. No compartir valores.
Si la base ya existe y está actualizada, revisar antes de aplicar migraciones.
En una terminal con las variables del entorno de pruebas cargadas:

    npm ci
    npx prisma migrate deploy
    npm run build

No ejecutar migrate reset ni seed sobre una base existente para desplegar.
Subir el contenido de esta carpeta a un repositorio privado. No subir .env, node_modules ni .next.

## 2. Proyecto Vercel

Importar el repositorio desde Add New > Project. Framework: Next.js.
Root Directory: carpeta que contiene package.json (si el repositorio contiene esta carpeta dentro de otra, seleccionarla).
Install Command: npm ci. Build Command: npm run build. Output Directory: predeterminada.
Vercel administra el servidor: no dejar npm run start ejecutándose en el ordenador.

Añadir variables para el entorno Production de este despliegue académico, manteniendo Stripe en Sandbox:

| Variable | Valor |
|---|---|
| DATABASE_URL | Conexión PostgreSQL de ejecución |
| DIRECT_URL | Conexión PostgreSQL para migraciones |
| JWT_SECRET | Secreto aleatorio fuerte |
| CRON_SECRET | Otro secreto aleatorio fuerte |
| STRIPE_SECRET_KEY | Clave secreta del Sandbox |
| STRIPE_WEBHOOK_SECRET | Secreto de la nueva destination pública de Stripe |
| NEXT_PUBLIC_APP_URL | URL estable HTTPS de Vercel sin barra final |
| UPLOADTHING_TOKEN | Token del proyecto de UploadThing usado para archivos |

Generar cada secreto por separado en tu terminal:

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

No poner prefijo NEXT_PUBLIC_ a secretos. Si todavía no conoces la URL, realizar el primer despliegue, obtener el dominio estable, actualizar NEXT_PUBLIC_APP_URL y redesplegar antes de probar checkout.
Si STRIPE_WEBHOOK_SECRET aún no existe, configurarlo tras crear la destination y redesplegar antes de probar pagos.
Confirmar que Stripe y cron-job.org pueden acceder a sus rutas sin pantalla de login de Vercel, preservando la firma de Stripe y el Bearer del cron.

## 3. Stripe Sandbox

En Workbench > Webhooks crear una destination HTTPS para la misma cuenta Sandbox:

    https://TU-DOMINIO/api/webhooks/stripe

Elegir eventos con payload snapshot compatible con el handler existente y revisar la versión API seleccionada:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

Copiar el signing secret whsec_ de esa destination a STRIPE_WEBHOOK_SECRET en Vercel y redesplegar.
El secreto mostrado por stripe listen es para la escucha local: no sustituye el secreto de la destination pública.
No se necesita stripe listen para el despliegue. Evitar mantener el listener local contra la misma base al probar pagos cloud, porque ambos endpoints podrían procesar eventos.
Hacer un checkout real de prueba desde la aplicación y comprobar entrega 2xx en Stripe y actualización de la membresía. Un evento sintético sin registros relacionados no valida todo el flujo.

## 4. cron-job.org

Crear tres jobs usando el dominio estable, zona horaria America/Guayaquil para medianoche de Ecuador continental. No usar UTC por accidente.
En todos: cabecera Authorization con valor Bearer seguido de un espacio y el CRON_SECRET configurado en Vercel. No incluir el secreto en la URL.

| Tarea | Ruta | Método | Horario |
|---|---|---|---|
| Vencimientos | /api/cron/expired-plans | POST | Todos los días 00:00 |
| Notificaciones leídas | /api/cron/read-notifications | GET | Todos los días 00:00 |
| Liquidaciones | /api/cron/settlements | POST | Día 1 de cada mes 00:00 |

Las rutas POST admiten cuerpo vacío. Conservar respuestas e historial y activar avisos por fallo. Revisar tanto el código HTTP como success en el JSON.
Las tareas diarias son independientes; no se presupone orden de ejecución.

IMPORTANTE: settlements calcula el MES ANTERIOR en UTC. Por eso se programa el día 1, cuando el mes acaba de cerrarse. Ejecutarlo el último día liquidaría el mes anterior y dejaría pendiente el que termina.
Ejemplo: el 1 de diciembre liquida del 1 de noviembre 00:00 UTC al 1 de diciembre 00:00 UTC. Esto equivale a límites a las 19:00 del día anterior en Ecuador; si el cierre contable debe usar meses en horario de Ecuador, hay que adaptar el cálculo antes de activar ese job. No se ha cambiado esa regla en este paquete.
No hacer una ejecución manual de settlements antes del cierre: crea liquidaciones persistentes y omite períodos ya liquidados. Una prueba debe usar una base ficticia aislada.

## 5. Verificación del despliegue

- Build exitoso y aplicación abre mediante HTTPS.
- Registro, login y persistencia de sesión funcionan.
- Imágenes y carga de documentos funcionan con UploadThing.
- Checkout vuelve al dominio público; webhook verifica la firma y recibe 2xx.
- Cada cron sin Bearer válido responde 401; cada ejecución autorizada se valida con datos ficticios.
- El historial de cron-job.org confirma método, zona horaria, respuesta y próxima ejecución.
- Registrar dominio, fecha, versión del código y evidencias sin secretos para las pruebas de titulación.

Validación local: npm ci, prisma generate y npm run build completados con variables ficticias de compilación. No se conectó a una base de datos ni a Stripe.

Pendiente: comprobar conectividad PostgreSQL, migraciones, credenciales externas, límites/tiempos de ejecución y funcionamiento desplegado. Este paquete prepara la configuración; no acredita un despliegue exitoso.
