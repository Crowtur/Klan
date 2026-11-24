# Cambios de la Parte 11

## Base de trabajo

- Archivo: `Klan_Parte_10.4.zip`.
- Tamaño original: 982 633 bytes.
- SHA-256: `6f88a19ce8a2e163e99fcf7d016d5ed60482ab50b87c833bb2edffc5a001337c`.
- Fecha de validación: 24 de noviembre de 2026.

## Datos y permisos

| Parte 10.4 | Parte 11 |
| --- | --- |
| `Club` | `Entity` |
| `ClubMembership` | `EntityMembership` |
| `ClubSettlement` | `EntitySettlement` |
| `ClubBankDetails` | `EntityBankDetails` |
| `ClubRole` / `CLUB_ADMIN` | `EntityRole` / `ENTITY_ADMIN` |
| `ClubStatus` | `EntityStatus` |
| `clubId` / `clubMembershipId` | `entityId` / `entityMembershipId` |
| `club` / `clubs` / `clubMembership` | `entity` / `entities` / `entityMembership` |
| `userId_clubId` | `userId_entityId` |

Los modelos genéricos que ya existían, como `MembershipPlan`, `Facility`, `Post` y `PlanDocumentRequirement`, conservan sus nombres. Sus relaciones, consultas, claves foráneas e índices utilizan el dominio Entity. No se introducen modelos satélite inexistentes ni se cambia su comportamiento.

La migración renombra físicamente cuatro tablas, dos tipos enum, un valor enum, catorce columnas contando la separación de notificaciones, y las restricciones e índices correspondientes. No utiliza `@map` para mantener tablas antiguas ni recrea tablas con datos.

### Colisión resuelta en notificaciones

En la base original, `Notification.entityId` era el identificador genérico del objeto notificado. No podía recibir también el antiguo `clubId`.

| Campo original | Campo final | Significado |
| --- | --- | --- |
| `Notification.clubId` | `Notification.entityId` | Entidad a la que pertenece el aviso; puede ser nulo |
| `Notification.entityType` | `Notification.targetType` | Tipo de recurso: documento, reserva, solicitud, etc. |
| `Notification.entityId` | `Notification.targetId` | Identificador de ese recurso |

La migración realiza primero la separación del recurso y después el renombrado de la entidad. Se actualizan escrituras, resolución de avisos, filtros, agrupaciones, claves de respuesta `byEntity` e índices. Los destinos internos almacenados se convierten al nuevo formato. Solo se modifica el título automático conocido `Retiro del club`; los textos introducidos por usuarios se conservan.

## Arquitectura y navegación

| Ruta o componente original | Equivalente final |
| --- | --- |
| `src/app/explore/page.tsx` | `src/app/entities/page.tsx` |
| `src/app/explore/[clubId]/page.tsx` | `src/app/entity/[entityId]/page.tsx` |
| `src/app/api/clubs/…` | `src/app/api/entities/…` |
| `src/app/api/catalog/clubs/…` | `src/app/api/catalog/entities/…` |
| `src/app/api/search/clubs/…` | `src/app/api/search/entities/…` |
| `src/app/api/admin/dashboard/clubs/…` | `src/app/api/admin/dashboard/entities/…` |
| `src/lib/clubs/…` | `src/lib/entities/…` |
| `club-bubbles.tsx` | `entity-bubbles.tsx` |
| `workspace/club.tsx` | `workspace/entity.tsx` |
| `workspace/club-hero.tsx` | `workspace/entity-hero.tsx` |
| `workspace/club-sidebar.tsx` | `workspace/entity-sidebar.tsx` |
| `workspace/create-club.tsx` | `workspace/create-entity.tsx` |

La versión base organiza el panel privado mediante `/app` y parámetros de consulta; no contenía carpetas `/dashboard/club` ni `/club`. Se migra su arquitectura real: `view=entity`, `view=entities`, `view=publicEntity`, `view=globalEntities` y parámetro `entity`.

Los imports, componentes, tipos, props, funciones, clases CSS, consultas Prisma, SQL del catálogo, endpoints de UploadThing, enlaces, llamadas HTTP, CSV y respuestas JSON se actualizan juntos. Los contratos de carga pasan a `entityLogoUploader` y `entityCoverUploader`, con `entityId` en sus datos.

## Interfaz y textos

Se actualizan navegación, formularios, fichas públicas, paneles, alertas, confirmaciones, estados vacíos, mensajes API y metadatos SEO. Se revisa la concordancia: «la entidad», «de la entidad», «una nueva entidad», «entidades activas», «entidad suspendida». La marca continúa siendo Klan.

Se conservan los nombres, descripciones y publicaciones almacenados por los usuarios, incluso cuando contienen el nombre propio de un club. Los objetos históricos de Stripe tampoco se reescriben. El código de los nuevos cobros emite metadatos `entityId`; los webhooks siguen resolviendo por `paymentId` y `subscriptionId`, por lo que admiten sesiones previas.

## Comportamiento conservado

- Permisos por entidad y excepciones del superadministrador, con `ENTITY_ADMIN`.
- Respuestas 400 ante JSON o datos de planes inválidos y 403 ante permisos insuficientes.
- Ausencia de la ruta de diagnóstico `/api/test-db`.
- Bloqueos transaccionales y claves de idempotencia de pagos, obligaciones y eventos Stripe.
- Renovaciones, fechas originales, cancelaciones y finalización de pases de un día sin gracia.
- Restricción PostgreSQL que impide solapamientos de reservas confirmadas.
- Reglas CSS y comportamiento compartido para pantallas de menos de 768 px.
- Preferencias internas `klubo-theme`, `klubo:admin-filters`, evento `klubo-notifications` y animaciones existentes, para conservar el estado de sesiones previas.
- Versiones y resoluciones de dependencias. Solo cambia el nombre del paquete a `entity-saas`.

Las 25 migraciones históricas y su archivo de bloqueo permanecen byte por byte. Las menciones antiguas en ese historial, la nueva migración, las fixtures de compatibilidad y esta documentación son deliberadas. No quedan símbolos ni rutas del dominio anterior en `src`, `schema.prisma` o el seed.
