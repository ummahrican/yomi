import { WORDLIST } from "./wordlist";

/**
 * Recovery-phrase based identity + end-to-end encryption.
 *
 * From a 12-word phrase we derive (with PBKDF2):
 *  - encKey:    AES-GCM key, NEVER leaves the device, encrypts the sync payload.
 *  - authToken: a bearer credential sent to the server; the server keys storage
 *               by sha256(authToken), so only someone with the phrase can address
 *               the account. The server learns nothing it can decrypt.
 */

const PBKDF2_SALT = "yomi-sync-v1";
const PBKDF2_ITERS = 100_000;

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 12 random words. The phrase string itself is the secret. */
export function generatePhrase(): string {
  const idx = new Uint16Array(12);
  crypto.getRandomValues(idx);
  return [...idx].map((n) => WORDLIST[n % WORDLIST.length]).join(" ");
}

export function normalizePhrase(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isValidPhrase(phrase: string): boolean {
  const words = normalizePhrase(phrase).split(" ");
  return words.length >= 6 && words.every((w) => WORDLIST.includes(w));
}

export interface Keys {
  encKey: CryptoKey;
  authToken: string;
}

export async function deriveKeys(phrase: string): Promise<Keys> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizePhrase(phrase)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(PBKDF2_SALT),
      iterations: PBKDF2_ITERS,
      hash: "SHA-256",
    },
    material,
    512, // 64 bytes
  );
  const all = new Uint8Array(bits);
  const encKeyBytes = all.slice(0, 32);
  const authSeed = all.slice(32, 64);

  const encKey = await crypto.subtle.importKey("raw", encKeyBytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  return { encKey, authToken: toHex(authSeed) };
}

/** Encrypt a UTF-8 string -> base64( iv || ciphertext ). */
export async function encrypt(encKey: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encKey, new TextEncoder().encode(plaintext)),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return bytesToBase64(out);
}

export async function decrypt(encKey: CryptoKey, payload: string): Promise<string> {
  const bytes = base64ToBytes(payload);
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, encKey, ct);
  return new TextDecoder().decode(pt);
}
