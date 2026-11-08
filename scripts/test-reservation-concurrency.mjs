/**
 * ==============================================================================
 * PONTIFICIA UNIVERSIDAD CATÓLICA DEL ECUADOR
 * Facultad Internacional de Innovación (PUCE - Icam)
 * ==============================================================================
 * 
 * PROYECTO DE TITULACIÓN - INGENIERÍA INTEGRAL
 * Autor: Diego Alexis Tipán Zambrano
 * Director del Proyecto: PhD. Rafael Melgarejo
 * Promoción: Primera Promoción (Año 2026)
 * 
 * ------------------------------------------------------------------------------
 * DECLARACIÓN SOBRE EL USO DE INTELIGENCIA ARTIFICIAL
 * ------------------------------------------------------------------------------
 * Se declara formalmente el uso de herramientas de Inteligencia Artificial como
 * soporte y asistente técnico para el desarrollo de este proyecto, destacando su
 * aplicación en:
 * 
 * - Generación y optimización de bloques de código repetitivos y extensos.
 * - Desarrollos de endpoints complejos con variabilidad de permisos y roles.
 * - Integración de nuevas funciones y sugerencias de arquitectura de software.
 * - Depuración ágil, corrección de errores y optimización de rendimiento.
 * - Creación, maquetación e integración de diseños UI/UX de formato visual a código.
 * - Automatización de documentación técnica y estructuración de comentarios.
 * 
 * Herramientas de IA utilizadas:
 * - GPT-5.6 Luna
 * - GPT-6 Astra
 * - Gemini 3.6 Flash
 * - Figma AI (Visual Engine / Make Real)
 * 
 * ------------------------------------------------------------------------------
 * DERECHOS DE AUTOR Y PROPIEDAD INTELECTUAL
 * ------------------------------------------------------------------------------
 * Los derechos del presente proyecto corresponden a la Pontificia Universidad
 * Católica del Ecuador junto al autor y al director del proyecto, en estricto
 * cumplimiento del reglamento institucional sobre patentes, tesis y titulación.
 * 
 * ALCANCE: Dichos derechos aplican exclusivamente al código fuente desarrollado
 * en este proyecto, excluyendo la idea de negocio global y futuras versiones 
 * o derivados sustanciales que puedan desarrollarse sobre el sistema.
 * ==============================================================================
 */

/* Envía peticiones de reserva concurrentes a la instalación de prueba configurada mediante variables de entorno. */

const BASE_URL =
  process.env.TEST_BASE_URL ?? "http://localhost:3000";

const CLUB_ID = process.env.TEST_CLUB_ID;
const FACILITY_ID = process.env.TEST_FACILITY_ID;
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

if (!CLUB_ID || !FACILITY_ID || !AUTH_TOKEN) {
  console.error(
    "Faltan TEST_CLUB_ID, TEST_FACILITY_ID o TEST_AUTH_TOKEN"
  );
  process.exit(1);
}

const endpoint =
  `${BASE_URL}/api/clubs/${CLUB_ID}` +
  `/facilities/${FACILITY_ID}/reservations`;

async function createReservation(startAt, endAt) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `auth_token=${AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      startAt,
      endAt,
    }),
  });

  const result = await response.json();

  return {
    status: response.status,
    success: result.success,
    message: result.message,
    reservationId: result.reservation?.id ?? null,
  };
}

async function runTest() {
  const [startAt, endAt] = process.argv.slice(2);

  if (!startAt || !endAt) {
    console.error(
      "Uso: node scripts/test-reservation-concurrency.mjs <startAt> <endAt>"
    );
    process.exit(1);
  }

  console.log("\nIniciando prueba de concurrencia...\n");

    // Reemplaza temporalmente el Promise.all en runTest() con esto:
    const results = await Promise.all([
        createReservation(
            "2026-10-19T13:00:00.000Z",
            "2026-10-19T14:30:00.000Z" // 90 min
        ),
        createReservation(
            "2026-10-19T14:30:00.000Z",
            "2026-10-19T16:00:00.000Z" // 90 min (Total: 180 min > límite 120 min)
        ),
    ]);

  console.table(results);

  const accepted = results.filter(
    (result) => result.status === 201
  );

  const rejected = results.filter(
    (result) => result.status === 409
  );

  if (accepted.length === 1 && rejected.length === 1) {
    console.log(
      "\nPRUEBA SUPERADA: una reserva aceptada y otra rechazada."
    );
  } else {
    console.log(
      "\nRESULTADO A REVISAR: no se obtuvo la combinación esperada."
    );
  }
}

runTest().catch((error) => {
  console.error("Error ejecutando la prueba:", error);
  process.exit(1);
});
