
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
