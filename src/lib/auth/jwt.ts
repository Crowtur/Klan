import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET no está definido en las variables de entorno");
}

// Asignación explícita de tipo string para evitar problemas de narrowing dentro de funciones
const secret: string = JWT_SECRET;

export interface AuthTokenPayload {
  userId: string;
  email: string;
  globalRole: string;
}

export function createAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, secret, {
    expiresIn: "1d",
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, secret) as unknown as AuthTokenPayload;
}