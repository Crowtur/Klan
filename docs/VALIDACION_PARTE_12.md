# Validación de la Parte 12

Fecha: 25 de noviembre de 2026. Entorno local: Node.js 24.22.3, npm 11.19.1, Next.js 16.3.6, TypeScript 5.9.3 y Prisma 5.22.0.

## Resultados de esta entrega

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| `npm ci --no-audit --no-fund` | Correcto; cliente Prisma generado por `postinstall` | `evidencias_parte12/install.txt` |
| `npm run build` | Correcto; producción y TypeScript, 31 páginas generadas | `evidencias_parte12/build.txt` |
| `npx tsc --noEmit` | Código de salida 0; sin errores de tipado | `evidencias_parte12/typescript.txt` |
| `npm test` | 51 aprobadas; 0 fallidas, omitidas o pendientes | `evidencias_parte12/automated-tests.txt` |
| Auditoría de preservación | Aprobada | `evidencias_parte12/preservation.json` |
| Inspección de HTML generado y títulos de avisos | Textos y destinos esperados | `evidencias_parte12/rendered-copy.json` |

La compilación utilizó valores locales de validación para las variables de entorno, sin conectarse a servicios de producción. Los avisos de npm sobre la configuración del proxy del entorno no son errores de compilación ni de TypeScript.

## Comparación con la Parte 11

La auditoría compara la copia extraída del ZIP base con la entrega. Conserva los hashes de los archivos originales y finales en la trazabilidad.

- Las 135 rutas de archivos de `src` permanecen iguales.
- Los 131 encabezados institucionales de los archivos TypeScript de `src` son idénticos.
- La secuencia de símbolos y cadenas técnicas `Entity`/`entity`/`entities`, las importaciones y las rutas se conserva.
- En 54 de los 57 archivos fuente modificados, el árbol sintáctico sólo difiere en cadenas y comentarios. Los otros tres contienen las adaptaciones de presentación de `Badge`, los estados de círculos y los títulos históricos, documentadas en los cambios.
- Las propiedades JSX de clases, estilos, estados e identificadores mantienen sus valores y comportamiento. La comparación del nombre de columna en finanzas se actualiza junto con su etiqueta.
- Se comparan byte por byte Prisma, las migraciones, el seed, las hojas CSS, los recursos públicos, los scripts existentes y los archivos de configuración. También son idénticos el webhook de Stripe, la autorización y el hook móvil.
- No quedan cadenas estáticas de presentación «Entidad/Entidades» en `src`. Las únicas cadenas residuales corresponden a logs internos y a la comparación exacta del título histórico de retiro.

La revisión del renderizado confirma que un círculo activo muestra «Activo» con `data-status="ACTIVE"`, mientras una membresía conserva «Activa». Una tarjeta muestra «Conoce este círculo» y «Ver círculo» manteniendo `/entity/sample`. Los avisos históricos reconocidos se muestran con la terminología nueva sin modificar el título de entrada ni el destino.

## Alcance de las comprobaciones

Las 51 pruebas existentes cubren permisos, validaciones, contratos de consulta, ciclo de suscripciones y renderizado de componentes. Se ejecutaron de nuevo sin modificar sus archivos.

No se ejecutaron migraciones ni se modificó una base de datos: esta entrega no cambia Prisma. Las pruebas HTTP y PostgreSQL documentadas para la Parte 11 permanecen como evidencias históricas y no se presentan como ejecuciones nuevas de la Parte 12.

No se desplegó en Vercel ni se efectuó una revisión visual interactiva de navegador. La validación de esta entrega comprende compilación local de producción, tipado, pruebas existentes, inspección de HTML y preservación del código de presentación y de negocio. Las dependencias y el resultado compilado se regeneran con los comandos del README.
