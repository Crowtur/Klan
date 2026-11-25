# Cambios de la Parte 12

## Base y alcance

La base exclusiva es el archivo validado `Klan_Parte_11.zip`, de 1.026.141 bytes, cuyo SHA-256 es:

```text
19dc029fb65d74913dd63c01f809016d31a5db59bfc74e7ebde0249643d6018d
```

La interfaz adopta «Círculo / Círculos» para presentar una comunidad cercana e inclusiva. Se modifican 57 archivos de `src`: textos de interfaz y mensajes mostrados al usuario, más las adaptaciones de presentación descritas abajo. Se conservan todos los archivos y directorios de la base.

## Textos y concordancia

Se actualizan portada, navegación, catálogo, creación y administración, encabezados, formularios, estados vacíos, confirmaciones, avisos, textos accesibles, columnas de tablas móviles, finanzas, pagos, cabecera CSV y descripciones SEO. También se cambian los mensajes de respuesta del servidor que llegan a las alertas de la interfaz, sin modificar las validaciones ni los códigos HTTP.

| Antes | Ahora |
| --- | --- |
| La entidad / Las entidades | El círculo / Los círculos |
| Crear una entidad | Crear un círculo |
| Nuevas entidades | Nuevos círculos |
| Resumen de la entidad | Resumen del círculo |
| Miembros de la entidad | Miembros del círculo |
| Retirar de la entidad | Retirar del círculo |
| Ver entidad | Ver círculo |
| Entidad no encontrada o inactiva | Círculo no encontrado o inactivo |
| Todas / Activas / Suspendidas | Todos / Activos / Suspendidos, en el listado de círculos |

El ejemplo de slug pasa de `tu-entidad` a `tu-circulo`, sin tilde por tratarse de un identificador URL. No se modifica ningún slug existente.

## Adaptaciones de presentación

- `common.tsx` permite que `Badge` reciba un texto visible opcional como contenido. El valor técnico, el atributo `data-status` y sus clases se conservan. Sin ese contenido, mantiene el comportamiento anterior.
- `dashboard.tsx` presenta los estados de los círculos en masculino. Las etiquetas genéricas de membresías y suscripciones siguen siendo «Activa», «Inactiva» y «Suspendida».
- `notification-routing.ts` muestra «Retiro del círculo» para los avisos históricos de tipo `MEMBER_LEFT` o `MEMBER_REMOVED` cuyo título exacto es «Retiro de la entidad». No escribe en la base ni altera destinos, tipos o contenido ajeno a esos avisos del sistema. Los nuevos avisos ya usan el texto actualizado.
- `global-finances.tsx` actualiza conjuntamente la cabecera visible y la comparación que distingue la columna de nombre de las columnas numéricas, manteniendo las mismas clases y alineación.

Cada archivo fuente modificado incluye un comentario en español que documenta el alcance UI-Only de la Parte 12. Los encabezados institucionales se mantienen intactos, incluidos autoría, derechos y declaración de IA.

## Elementos preservados

- Esquema Prisma, seed, 26 migraciones y archivo de bloqueo: idénticos byte por byte.
- Modelos, relaciones, identificadores, roles, componentes, funciones, importaciones, rutas y parámetros del dominio `Entity`: conservados.
- Seguridad, permisos, códigos HTTP y ausencia de `/api/test-db`: conservados; los controladores sólo cambian textos visibles.
- Webhook de Stripe: archivo idéntico, con la misma idempotencia y sincronización de fechas.
- Tres hojas CSS, clases de presentación, hook móvil y recursos de marca Klan: conservados.
- Dependencias, lockfile y configuración de Next.js, TypeScript y Vercel: idénticos.

Las menciones a «Entidad» en comentarios técnicos, logs internos, pruebas históricas, metadatos del paquete y documentos de versiones anteriores son deliberadas. La comparación del título histórico también se mantiene para reconocer los avisos ya guardados. No se reemplazan textos escritos por los usuarios.

## Despliegue

Al actualizar una instalación de la Parte 11, basta instalar y compilar el nuevo código con la misma configuración. Esta entrega no añade migraciones ni requiere modificar datos. La guía de migración de la Parte 11 continúa aplicándose únicamente cuando la instalación todavía no tiene su esquema.
