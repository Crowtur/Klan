-- Habilitar operadores GiST para identificadores UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Garantizar que una reserva tenga duración positiva
ALTER TABLE "Reservation"
ADD CONSTRAINT "reservation_valid_interval"
CHECK ("startAt" < "endAt");

-- Impedir solapamientos entre reservas confirmadas de una misma instalación
ALTER TABLE "Reservation"
ADD CONSTRAINT "reservation_no_overlap"
EXCLUDE USING gist (
  "facilityId" WITH =,
  tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE ("status" = 'CONFIRMED');