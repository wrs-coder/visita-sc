// Desbloqueio offline por biometria nativa (digital / rosto) e, quando o
// aparelho permitir, pelo próprio PIN/padrão da tela de bloqueio.
//
// O sistema NUNCA entrega o PIN do aparelho ao app. O que fazemos é guardar a
// chave de conteúdo do cofre no armazenamento seguro nativo (Keystore /
// Keychain) e só lê-la após o sistema confirmar a identidade do dono.
//
// Na web o recurso é indisponível: lá vale apenas o PIN de 6 dígitos do app.

const STORE_KEY = "visita-sc.offline-content-key";

function isNative(): boolean {
  try {
    // Import síncrono não é possível aqui; usamos o global injetado pelo Capacitor.
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

async function biometry() {
  const mod = await import("@aparajita/capacitor-biometric-auth");
  return mod;
}

async function storage() {
  const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
  return SecureStorage;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export type BiometryInfo = {
  available: boolean;
  /** true quando só há PIN/padrão do sistema (sem digital cadastrada). */
  deviceCredentialOnly: boolean;
};

/** Diz se este aparelho pode desbloquear o cofre sem o PIN do app. */
export async function checkBiometricSupport(): Promise<BiometryInfo> {
  if (!isNative()) return { available: false, deviceCredentialOnly: false };
  try {
    const { BiometricAuth } = await biometry();
    const info = await BiometricAuth.checkBiometry();
    if (info.isAvailable) return { available: true, deviceCredentialOnly: false };
    // Sem digital cadastrada, mas com bloqueio de tela configurado.
    const hasLock = info.deviceIsSecure === true;
    return { available: hasLock, deviceCredentialOnly: hasLock };
  } catch {
    return { available: false, deviceCredentialOnly: false };
  }
}

/** Já existe uma chave guardada neste aparelho? (não pede biometria) */
export async function isBiometricEnabled(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const SecureStorage = await storage();
    const v = await SecureStorage.get(STORE_KEY);
    return typeof v === "string" && v.length > 0;
  } catch {
    return false;
  }
}

async function authenticate(reason: string): Promise<void> {
  const { BiometricAuth } = await biometry();
  await BiometricAuth.authenticate({
    reason,
    allowDeviceCredential: true,
    androidTitle: "Visita SC",
    androidSubtitle: reason,
    androidConfirmationRequired: false,
  });
}

/** Ativa a biometria guardando a chave do cofre no cofre nativo. */
export async function enableBiometric(contentKey: Uint8Array, reason: string): Promise<void> {
  if (!isNative()) throw new Error("biometric-unavailable");
  await authenticate(reason);
  const SecureStorage = await storage();
  await SecureStorage.set(STORE_KEY, toBase64(contentKey));
}

/** Pede a confirmação nativa e devolve a chave do cofre. */
export async function unlockWithBiometric(reason: string): Promise<Uint8Array | null> {
  if (!isNative()) return null;
  await authenticate(reason);
  const SecureStorage = await storage();
  const stored = await SecureStorage.get(STORE_KEY);
  if (typeof stored !== "string" || !stored) return null;
  return fromBase64(stored);
}

/** Remove a chave nativa (desativar biometria / remover o acesso offline). */
export async function disableBiometric(): Promise<void> {
  if (!isNative()) return;
  try {
    const SecureStorage = await storage();
    await SecureStorage.remove(STORE_KEY);
  } catch {
    /* nada guardado */
  }
}
