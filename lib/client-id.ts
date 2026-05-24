import { randomBytes } from "crypto";

/** Generates an anonymous client identifier, e.g. PDH-A1B2C3D4 */
export function generateClientId(): string {
  const segment = randomBytes(4).toString("hex").toUpperCase();
  return `PDH-${segment}`;
}
