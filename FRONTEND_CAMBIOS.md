# Club SaaS — Frontend funcional

## Instalación sobre tu proyecto
1. Haz una copia de tu proyecto local.
2. Copia `src/` y `scripts/test-ui-contracts.cjs` de esta entrega. Conserva tus variables de entorno.
3. Si ya tenías `src/components/personal-home.tsx`, puedes eliminarlo: lo sustituye `src/components/workspace/`.
4. Ejecuta `npm ci` si necesitas reinstalar dependencias y `npx prisma generate`.
5. Ejecuta `npm run dev`. Para producción, ejecuta `npm run build` con tus variables configuradas.
No se cambiaron dependencias ni el esquema Prisma. No hace falta una migración.

## Navegación
- `/`: presentación, registro e inicio de sesión.
- `/explore`: búsqueda pública de clubes.
- `/explore/[clubId]`: ficha pública, planes y publicaciones.
- `/app`: feed autenticado y navegación de módulos mediante parámetros de consulta.
- Avatar en todas las páginas: nombre, correo, foto, membresías, suscripciones, pagos, solicitudes y logout. Sin dashboards ni estado del usuario.
- Mis clubes: crear club, entrar al club y acceder a las opciones contextuales.
- Dentro de un club: publicaciones, instalaciones, disponibilidad y reservas propias.
- Administradores de club: planes, requisitos, solicitudes/documentos, miembros, publicaciones, fotos, horarios, acceso por plan, paneles, pagos y configuración.
- SUPER_ADMIN: panel global, gestión de estado de clubes, publicaciones y liquidaciones. No hereda permisos contextuales; la subida de imágenes de publicaciones conserva el requisito de administrador del club.
- `/payment/success` y `/payment/cancelled`: retorno de Stripe y consulta del pago. Nunca se considera pagado por la redirección.

## Flujos implementados
1. Registro/login/logout y foto persistente.
2. Descubrimiento → plan → solicitud → documentos PDF → revisión administrativa → suscripción → Checkout → estado de pago.
3. Club → instalación → horarios disponibles en Ecuador → reserva → consulta y cancelación.
4. Gestión de clubes, planes, requisitos documentales, instalaciones, horarios semanales con múltiples intervalos y cuotas por plan.
5. Revisión de miembros y solicitudes; aprobación/rechazo documental con motivo.
6. Publicaciones con texto e imagen, edición y eliminación.
7. Dashboards de club (resumen, miembros, suscripciones, reservas, finanzas, alertas) y globales.
8. Liquidaciones: consulta desde finanzas globales por período, generación desde el club y actualización de estado/referencia. Registrar PAID no transfiere dinero.

## Extensiones mínimas del backend
El inventario original tenía 75 operaciones. Se añadieron dos consultas para completar los flujos que el mapa declaraba bloqueados:
- GET `/api/catalog/clubs/[clubId]`: proyección pública del club ACTIVE, planes activos y requisitos activos. No expone miembros, solicitudes ni finanzas.
- GET `/api/me/applications`: requiere requireAuth y filtra exclusivamente por userId de la sesión. Entrega solicitudes, requisitos y documentos propios.
Además, `/api/auth/me` devuelve avatarUrl desde la entrega anterior.
Los permisos de los endpoints existentes se mantienen. El backend sigue siendo la autoridad para acciones, estados, propiedad y disponibilidad.

## Verificación realizada
- `npm run build`: compilación de producción completada con valores locales ficticios de JWT/Stripe/DB solo para carga de módulos. No se guardaron en archivos ni se deben usar al desplegar.
- TypeScript sin errores.
- `node scripts/test-ui-contracts.cjs`: 5 pruebas aprobadas sobre alcance público, aislamiento por propietario, autenticación y manejo de errores en las consultas nuevas, con persistencia simulada.
- 4 comprobaciones DOM aisladas con JSDOM: serialización de formulario, error de API y recuperación del botón, cancelación de acción sin petición, enlaces seguros/codificación. No son una prueba de navegador completo ni de servicios reales.

## Pruebas pendientes con tu configuración real
- Dos usuarios en clubes diferentes para comprobar aislamiento y menús contextuales.
- Un administrador de club y un SUPER_ADMIN sin membresía contextual.
- Registro, login, logout, recarga y expiración de cookie.
- UploadThing: avatar, logo, imagen de publicación, PDF inicial y reemplazo rechazado.
- Crear plan gratuito y de pago; solicitar ingreso, aprobar/rechazar y revisar documentación.
- Stripe en modo prueba: Checkout, webhook, historial y cancelación al final del período.
- Horarios y acceso por plan; reserva confirmada, solapamiento y cancelación.
- Suspensión/reactivación y sus efectos en membresías y Stripe.
- Liquidaciones y diferencias de períodos financieros documentadas en el backend.

## Alcance y límites
El frontend usa interfaces simples, formularios y listas, con estados de carga, error, vacío y confirmación. No se inventaron likes, comentarios, crowdfunding, edición de nombre/correo o cambio de contraseña: no están respaldados por el backend actual.
No se ejecutaron consultas a tu PostgreSQL ni cobros, transferencias o subidas reales. La compilación y pruebas aisladas no certifican el funcionamiento integral en producción.
Las páginas y rutas de prueba que ya venían en el proyecto se conservaron; esta entrega no es una publicación en un servidor.
