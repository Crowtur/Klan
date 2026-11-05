# Klubo · Actualización del feedback, parte 2

Base: `Klubo_Frontend_Integrado.zip`. Esta entrega conserva el proyecto completo y aplica el feedback de las 27 páginas de «Cosas a mejorar en Klubo Parte 2» y el diseño C06 para requisitos documentales.

## Instalación sobre tu proyecto

Conserva tu `.env` y sus credenciales. El ZIP no incluye secretos, dependencias ni archivos de compilación.

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Se incluye **una migración adicional**, `20261104000100_add_settlement_receipts`, que añade tres columnas opcionales a `ClubSettlement`: `receiptUrl`, `receiptFileKey` y `receiptFileName`. Es necesaria para guardar el comprobante. No cambia ni sustituye `add_membership_events_payment_obligations_and_notifications`, ni exige reiniciar la base de datos. No ejecutes `prisma migrate reset`.

Para producción: configura tus variables habituales, aplica la migración, genera Prisma y ejecuta `npm run build` y `npm run start`. UploadThing debe estar configurado y poder entregar sus callbacks al despliegue. Los nuevos endpoints de carga forman parte del router existente.

## Cobertura del feedback

| Sección del PDF | Cambios incluidos |
| --- | --- |
| Inicio | Vista ilustrativa alineada con el feed real: navegación horizontal, publicaciones y barra lateral de clubes. |
| Cabecera y notificaciones | Eliminados los enlaces duplicados; icono de pantalla con nombre accesible; tiempo relativo en años, meses, semanas, días, horas o segundos; separación, hover y cierre al pulsar fuera, Escape o navegar. Paginación de avisos. |
| Aislamiento de avisos | Mensajes de documentación recibida para administradores. Lectura por `recipientId`; resolver un trámite no marca como leído el aviso de otro destinatario. Los badges personales excluyen solicitudes recibidas como administrador. |
| Mis clubes | Acción de creación a la derecha, separación con las tarjetas, diálogo centrado, singular «1 miembro», ubicación con icono. |
| Explorar clubes | Portada temporal de perros en la URL solicitada; dirección e icono; singular/plural; enlace al club privado para miembros activos y al público para visitantes. |
| Club público | Dirección, enlace a Maps y planes con tarjetas uniformes. |
| Club privado | Portada recortada, ubicación con icono, identidad conservada al cambiar de pestaña. Avisos de solicitudes y documentos en Solicitudes; liquidaciones en Resumen; reservas en Mis reservas. Los totales de clubes usan el mismo criterio de destino. |
| Publicaciones | Crear a la derecha; seleccionar o arrastrar imagen y previsualizarla antes de publicar; texto e imagen se guardan juntos desde el diálogo. Edición con el mismo selector. Reintentos de la carga de creación sin duplicar la publicación. |
| Instalaciones | Acción de creación alineada y separada; «Consultar y reservar» como botón; diálogos centrados. |
| Detalle de instalación | Botón de regreso, edición junto a la descripción/ubicación, separación antes de reservas y diálogos centrados. Reservas confirmadas cuyo fin ya pasó se muestran como «Expirada»; no ofrecen cancelación. Canceladas en gris. |
| Resumen y actividad | Eliminado el gráfico de nuevas suscripciones por plan. Alertas antes de los pasteles. Serie de miembros activos al cierre de cada día/mes, usando estados, eventos e intervalos de acceso registrados. |
| Miembros | Avatar circular o iniciales del mismo tamaño, tarjetas uniformes, rol de administrador sin repetición, separación del historial y retirados en gris. Incluye acceso vigente durante gracia. |
| Planes y requisitos | Tarjetas uniformes, creación a la derecha y diálogos centrados. Requisitos separados mediante acordeón exclusivo por plan, iconos y estado de obligatoriedad. Panel derecho oculto hasta crear/editar; nombre, instrucciones, casilla Obligatorio, límites PDF/8 MB y botones Cancelar/Guardar. Crear un requisito activa el flujo documental del plan. |
| Solicitudes recibidas | Canceladas en gris y revisión dentro de diálogo centrado. |
| Pagos del club | Resumen del período antes de la gráfica de ingresos diarios. |
| Configuración del club | Campos en una columna, presentación de perfil, espacio tras guardar y áreas de arrastre de logotipo/portada en dos columnas. Se guardan y reemplazan automáticamente al seleccionar/subir; en móvil se apilan. |
| Panel personal | Cambiar foto con icono y el mismo tratamiento visual/hover que las demás opciones. |
| Mis membresías | Imagen y símbolo alternativo comparten tamaño y formato circular. |
| Mis solicitudes | «Administrar documentos» abre un diálogo centrado y contiene «Enviar a revisión». Sin requisitos documentales habilitados, se muestra directamente «Enviar a revisión». |
| Mis suscripciones | Próximo cobro de suscripciones recurrentes activas de pago; usa `nextBillingAt` o, para registros anteriores, el vencimiento como estimación. Excluye pases, planes gratuitos y renovaciones canceladas. |
| Administración global | Seis diagramas de pastel; ingresos desglosados por club; evolución mensual con barras de nuevos clubes y usuarios lado a lado. |
| Liquidaciones | Paso directo Pendiente → Pagada con referencia obligatoria; protección frente a actualizaciones concurrentes; comprobante PDF/imagen mediante arrastre, persistido y reemplazable. |
| Gestión global de clubes | Retirada la generación de liquidaciones de este panel; botones «Visitar Club (Admin)», «Visitar Club (Visitante)» y Publicaciones. Permisos comprobados en backend. |

## Precisiones de comportamiento

- «Expirada» es un estado de presentación calculado con `endAt`. Se conserva el estado histórico `CONFIRMED` en PostgreSQL; no se necesita un cron para que la interfaz muestre el vencimiento.
- La visita administrativa del superadministrador no crea membresías ficticias ni aumenta los miembros del club. Permite administrar el club. Para realizar una **reserva propia** hace falta una membresía real; consultar y administrar las reservas existentes sigue disponible.
- La ubicación se muestra cuando el club tiene `address`. Si no está guardada, aparece «Ubicación por confirmar»; puede completarse en Configuración.
- Los avisos recibidos como administrador y los avisos de solicitudes personales se contabilizan por separado. Un aviso antiguo ya marcado como leído no se vuelve a convertir en no leído con esta actualización.
- El histórico de miembros utiliza eventos e intervalos de suscripción existentes. Las suspensiones, reingresos o períodos antiguos que nunca se registraron no pueden reconstruirse con exactitud. Se usa la información disponible; no se inventa historial.
- Los cobros calculados a partir de `expiresAt` se identifican como estimados en la tarjeta. La fecha confirmada depende de los eventos de Stripe.
- Marcar una liquidación como pagada registra la transferencia realizada fuera del sistema; no ordena una transferencia bancaria.

## Verificación realizada y pendiente

Realizado:

- Validación del schema de Prisma y generación de cliente.
- Comprobación TypeScript y compilación de producción con Next.js (webpack).
- 5 pruebas de contratos existentes y 3 de ciclo de vida existentes.
- 15 pruebas nuevas: destinos/tiempos de avisos, aislamiento entre destinatarios, contadores, transición directa de liquidación, conflictos concurrentes, próximo cobro, permisos globales, histórico de miembros, publicación con imagen e idempotencia, autorización y persistencia de comprobantes.
- Comparación de la migración existente con el ZIP base para conservarla intacta.

Pendiente de verificar con tu entorno:

- Revisión visual en navegador real, escritorio y móvil. Chromium local fue bloqueado por la restricción de sockets del entorno y el navegador alternativo no pudo acceder al servidor local. **No se presentan pruebas visuales ni capturas como realizadas.**
- Migración sobre PostgreSQL real, carga/callbacks de UploadThing, webhooks/cobros de Stripe y navegación con tus cuentas y datos. Las pruebas de endpoints usan repositorios simulados; no certifican estas integraciones externas.
- Exactitud histórica de datos anteriores al registro de eventos, por la limitación descrita arriba.

No he dejado un apartado del feedback sin implementación de código. Las reservas anteriores, los cobros estimados y el histórico tienen las precisiones anteriores; la validación visual y las integraciones reales requieren revisión en tu entorno.

## Pruebas reproducibles

```bash
npx prisma validate
npx tsc --noEmit
node scripts/test-ui-contracts.cjs
node scripts/test-backend-lifecycle.cjs
node scripts/test-feedback-part2.cjs
npm run build
```

`ARCHIVOS_CAMBIADOS_PARTE_2.txt` enumera las diferencias frente a la entrega anterior.
