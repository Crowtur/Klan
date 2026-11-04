# Integración de Klubo

El proyecto usa la migración ya aplicada 20261103025355_add_membership_events_payment_obligations_and_notifications. Instala las dependencias del lockfile con `npm ci`, conserva tu configuración local y ejecuta `npx prisma generate`. Para desarrollo usa `npm run dev`. El ZIP no contiene credenciales. Copia el proyecto sobre una rama de trabajo y conserva tu historial Git.

## Contratos para la interfaz

| Función | Ruta / entrada | Resultado |
|---|---|---|
| Actividad del club | GET /api/clubs/:clubId/dashboard/activity?start=YYYY-MM-DD&end=YYYY-MM-DD&group=day | Rango inclusivo en la zona del club. Admite month. Cada entrada de series contiene activaciones e ingresos en centavos por ID de plan, movimientos de membresía y reservas por instalación/hora/estado. Liquidaciones usa todo el historial mensual disponible. |
| Pagos | GET /api/me/payments o /api/clubs/:clubId/payments | Añade format=csv para exportar con los mismos filtros. La consulta propia admite clubId, status, year, page y limit. La consulta administrativa admite status, year, month, page y limit. |
| Avisos | GET /api/me/notifications?page=1 | Devuelve avisos del destinatario, total, unread y byClub. Admite clubId. |
| Lectura | PATCH /api/me/notifications con JSON que incluya id | Marca la lectura del destinatario. Resolver la solicitud modifica el estado de tarea. |
| Pase | Crear plan pagado con durationUnit DAY y durationValue entero positivo | La aprobación captura el precio y duración. Checkout en modo payment. Webhook firmado y pagado activa la vigencia en períodos de 24 horas. |
| Documentos | POST /api/clubs/:clubId/membership-applications/:applicationId/submit | Envía a revisión si están completos los requisitos obligatorios. |
| Revisión | PATCH /api/clubs/:clubId/membership-applications/:applicationId/documents/:documentId | Enviar version junto con status y rejectionReason si procede. Una versión antigua produce conflicto. Para compatibilidad, omitir version identifica exclusivamente la primera versión. |
| Retirar documento | DELETE sobre la misma ruta | El solicitante puede retirarlo mientras la solicitud está abierta. |
| Portada | UploadThing clubCoverUploader con clubId | Control administrativo y reemplazo de imagen. PATCH del club permite clearCover, clearLogo, address, googleMapsUrl y timeZone. |
| Salida de miembro | DELETE /api/clubs/:clubId/members/:userId | Un socio puede salir por su cuenta. El administrador puede retirar a un socio. |

Configura el receptor de Stripe Sandbox en /api/webhooks/stripe para los eventos de checkout completado, pago asíncrono exitoso, facturas pagadas/fallidas y cambios/bajas de suscripción que consume el proyecto. Mantén la tarea existente para POST /api/cron/expired-plans con CRON_SECRET. Los contratos antiguos sin primera activación conocida se excluyen del gráfico de altas. Los importes de pagos históricos siguen disponibles aunque no tengan una obligación asociada.

## Comprobación

Ejecuta `node scripts/test-ui-contracts.cjs` y `node scripts/test-backend-lifecycle.cjs`. Las pruebas usan dependencias simuladas. Para aceptación local, prueba un pase de un día con Stripe Sandbox, reenvía el webhook, comprueba la fecha de fin y ejecuta el cron contra datos de prueba. Comprueba que el cargo permanezca pagado, que el pase termine una vez y que un administrador activo mantenga su acceso. Sube y reemplaza un PDF con UploadThing y verifica que la revisión de la versión anterior reciba 409. Las pruebas de concurrencia existentes en scripts necesitan una instancia ejecutándose y sus datos de prueba.

La migración que figura en el proyecto no incluye la exclusión GiST del borrador SQL previo. La API de reservas serializa las escrituras mediante bloqueo de la fila de instalación. Las inserciones directas a PostgreSQL eluden esa protección.
