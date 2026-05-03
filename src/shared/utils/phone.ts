const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s\-()]/g, "");
  if (!E164_REGEX.test(trimmed)) {
    throw new Error(`Invalid phone number format (expected E.164): ${raw}`);
  }
  return trimmed;
}

export function isValidE164(value: string): boolean {
  return E164_REGEX.test(value);
}

export function maskPhone(e164: string): string {
  if (!E164_REGEX.test(e164)) return e164;
  const cc = e164.startsWith("+1") ? "+1" : e164.slice(0, 3);
  const last4 = e164.slice(-4);
  return `${cc}•••••${last4}`;
}
