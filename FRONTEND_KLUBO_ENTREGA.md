# Frontend de Klubo

## Integración

Descomprime el proyecto, conserva tus variables locales e instala con npm ci. Ejecuta npx prisma generate y npm run dev desde la carpeta del proyecto. El ZIP incluye el código, los recursos y la migración que ya figuraba en tu proyecto.

## Cobertura del PDF y de las referencias nuevas

| Área | Cambios implementados |
|---|---|
| Inicio | Tarjeta recta, nombre Alexis y eliminación del copyright repetido. |
| Notificaciones | Campana, lectura, contador y enlaces. Indicadores en navegación, clubes y pestañas de solicitudes/reservas. Consulta cada 30 segundos y actualización al leer. |
| Clubes | Modal de creación, logo y portada en un segundo paso del mismo modal, dirección, Google Maps, conteo de miembros y plan del usuario. |
| Explorador | Logo real, portada personalizada, ubicación escrita y miembros activos. |
| Publicaciones | Modales para crear/editar, carga de imagen tras crear y reemplazo/eliminación de imagen. |
| Identidad | Nombre, descripción, logo y portada del club en las pestañas. Identidad del club también en instalaciones. |
| Instalaciones | Modales de edición, horarios y planes autorizados. Calendario semanal legible y nombre del titular de reservas cuando la API lo permite. |
| Resumen | Fechas inicial/final, agrupación diaria/mensual, altas recurrentes apiladas por plan, miembros, ingresos, horas e instalaciones, evolución y liquidaciones. Datos numéricos accesibles debajo de las gráficas. |
| Miembros | Foto y plan, retiro mediante modal, acción limitada a estados aceptados por el backend. |
| Planes | Días de pago único, beneficios, tarjetas y modales. Requisitos documentales visibles en sección inferior administrativa. |
| Revisión | Modal, botón para abrir documentos, rechazo condicionado a la decisión y número de versión en cada revisión. |
| Pagos del club | Gráfica diaria, exportación CSV y paginación. |
| Configuración | Dirección, enlace Maps, subida/eliminación de logo y portada, nombre limitado a 50 y descripción a 200 caracteres. |
| Perfil | Cambiar foto abre directamente el selector del sistema. |
| Membresías | Medallas activas con logo, rol, fecha Desde y enlace al club. Efecto hover con respeto a movimiento reducido. |
| Solicitudes | Progreso de tres pasos en cada solicitud, documentos, tamaño, drag and drop, retiro y envío a revisión. |
| Suscripciones | Vista actual/historial, pendientes y activas, resumen de cobro, diferenciación de pases y acción de cancelar renovación solo para recurrentes. |
| Pagos personales | Tabla, filtros por club/estado/año, CSV, total anual, pendiente y último pago. |
| Administración global | Tabla financiera por club, generación de liquidaciones, tabla de liquidaciones y detalle con bruto/comisiones/neto. |

Se usaron los ocho PDF de Klubo Design.zip como referencia. La paleta verde y los importes en USD se aplican sobre los componentes del proyecto.

## Decisiones y puntos que debes revisar

- La imagen provisional identificada en la página 24 del PDF solo aparece como una clave de archivo. Falta su URL completa. Se usa el recurso de marca local como respaldo de las portadas hasta contar con una imagen personalizada. Este punto queda pendiente.
- Las rutas públicas existentes usan el ID del club. El formulario muestra el slug mientras se escribe. La vista previa de una URL que navegue por slug queda pendiente de un contrato de enrutamiento por slug.
- La carga de imágenes al crear club o publicación ocurre después de guardar la entidad, dentro del mismo modal. El servicio de subida necesita ese ID. Si se cierra el modal, la entidad ya creada puede completarse desde edición.
- El reporte de miembros muestra las fechas históricas que el backend conoce. Las activaciones sin fecha comprobada no producen barras inventadas.
- El monto del próximo cobro en suscripciones usa el precio contratado disponible. Las suscripciones históricas pueden mostrar una fecha vacía hasta que el backend la registre.
- La revisión visual interactiva en escritorio/móvil queda pendiente. Se intentó instalar Chromium, pero la descarga en este entorno devolvió archivos inválidos. Por tanto, esta entrega no afirma una comparación visual píxel a píxel con Figma.
- También quedan pendientes las pruebas conectadas a tu PostgreSQL, Stripe Sandbox y UploadThing. Verifica especialmente crear club sin enlace Maps, subir/reemplazar fotos, revisar una segunda versión documental, pagar un pase y cancelar una reserva.

## Ajustes de integración del backend

Dos rutas recibieron ajustes pequeños para cubrir la interfaz. PATCH de publicación admite removeImage para retirar la referencia visual, con la autorización existente. La consulta de pagos personales calcula el total anual por fecha de pago y devuelve el club del último pago. El retiro de una imagen no elimina su archivo remoto, por lo que ese almacenamiento puede requerir limpieza posterior.

## Verificación realizada

TypeScript y compilación de producción aprobados. También pasaron las cinco pruebas existentes de contratos y las tres pruebas aisladas del ciclo de pagos/pases. Estas ocho pruebas cubren backend con dependencias simuladas, no los recorridos visuales completos.
