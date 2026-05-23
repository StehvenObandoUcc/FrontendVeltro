export async function hashPassword(password: string): Promise<string> {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error("Entorno no seguro: La autenticación requiere una conexión HTTPS");
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
