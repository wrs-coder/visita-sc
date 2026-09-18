// Cofre de credenciais para entrada sem internet (Offline-First).
//
// Princípio de segurança: a SENHA da conta NUNCA é guardada no aparelho.
// Guardamos apenas a credencial de sessão do Supabase (access/refresh token)
// e o retrato do perfil, cifrados com AES-GCM.
//
// Formato v2 (envelope duplo):
//   - `contentKey` aleatória de 256 bits cifra o conteúdo (iv + cipher).
//   - A `contentKey` é embrulhada pela chave derivada do PIN (PBKDF2-SHA256).
//   - A mesma `contentKey` pode ser guardada no cofre nativo do aparelho,
//     liberada por digital/rosto/bloqueio do sistema (src/lib/biometric-unlock).
//   Assim, biometria e PIN abrem o mesmo cofre, e o PIN continua sendo o
//   caminho garantido de recuperação.
//
// Formato v1 (legado): conteúdo cifrado diretamente pela chave do PIN.
// É migrado para v2 de forma transparente no primeiro desbloqueio por PIN.
//
// Regras:
//   - 30 dias sem NENHUMA conexão invalidam o cofre (exige login online).
//   - 5 erros → espera progressiva; 10 erros → o cofre é apagado.
//   - Apagar o cofre não afeta nada na nuvem.

const VAULT_KEY = "visita-sc:offline-vault";
const PBKDF2_ITERATIONS = 210_000;

export const VAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
export const VAULT_SOFT_LIMIT = 5; // a partir daqui, espera progressiva
export const VAULT_HARD_LIMIT = 10; // aqui o cofre é destruído

export type VaultSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
};

export type VaultPayload = {
  userId: string;
  email: string | null;
  session: VaultSession;
  /** Snapshot de perfil/papel/congregação (mesmo formato de auth-profile). */
  profile?: unknown;
};

type VaultRecordV1 = {
  v: 1;
  userId: string;
  label: string;
  salt: number[];
  iv: number[];
  cipher: number[];
  createdAt: number;
  lastOnlineAt: number;
  failedAttempts: number;
  lockedUntil: number;
};

type VaultRecordV2 = {
  v: 2;
  userId: string;
  /** Rótulo amigável mostrado na tela de entrada (nome ou e-mail mascarado). */
  label: string;
  salt: number[];
  /** Envelope do PIN: contentKey cifrada pela chave derivada do PIN. */
  wrapIv: number[];
  wrappedKey: number[];
  /** Conteúdo cifrado pela contentKey. */
  iv: number[];
  cipher: number[];
  createdAt: number;
  lastOnlineAt: number;
  failedAttempts: number;
  lockedUntil: number;
  /** Apenas informativo: se a biometria foi ativada neste aparelho. */
  biometric?: boolean;
};

type VaultRecord = VaultRecordV1 | VaultRecordV2;

export type VaultMeta = {
  userId: string;
  label: string;
  createdAt: number;
  lastOnlineAt: number;
  failedAttempts: number;
  lockedUntil: number;
  expiresAt: number;
  biometric: boolean;
};

export class VaultError extends Error {
  code: "no-vault" | "expired" | "locked" | "wrong-pin" | "destroyed" | "unsupported";
  retryInMs?: number;
  attemptsLeft?: number;
  constructor(code: VaultError["code"], extra?: { retryInMs?: number; attemptsLeft?: number }) {
    super(code);
    this.code = code;
    this.retryInMs = extra?.retryInMs;
    this.attemptsLeft = extra?.attemptsLeft;
  }
}

// ---------------------------------------------------------------------------
// Armazenamento
// ---------------------------------------------------------------------------

async function readRecord(): Promise<VaultRecord | null> {
  if (typeof window === "undefined") return null;
  try {
    const { get } = await import("idb-keyval");
    const v = (await get(VAULT_KEY)) as VaultRecord | undefined;
    if (v && (v.v === 1 || v.v === 2)) return v;
  } catch {
    /* IndexedDB indisponível */
  }
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VaultRecord;
    return parsed?.v === 1 || parsed?.v === 2 ? parsed : null;
  } catch {
    return null;
  }
}

async function writeRecord(rec: VaultRecord): Promise<void> {
  if (typeof window === "undefined") return;
  let stored = false;
  try {
    const { set } = await import("idb-keyval");
    await set(VAULT_KEY, rec);
    stored = true;
  } catch {
    /* fallback abaixo */
  }
  if (!stored) {
    try {
      localStorage.setItem(VAULT_KEY, JSON.stringify(rec));
    } catch {
      /* quota */
    }
  }
}

export async function clearVault(): Promise<void> {
  if (typeof window === "undefined") return;
  memoryKey = null;
  try {
    const { disableBiometric } = await import("@/lib/biometric-unlock");
    await disableBiometric();
  } catch {
    /* sem plugin nativo */
  }
  try {
    const { del } = await import("idb-keyval");
    await del(VAULT_KEY);
  } catch {
    /* noop */
  }
  try {
    localStorage.removeItem(VAULT_KEY);
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------------------------
// Criptografia
// ---------------------------------------------------------------------------

function subtle(): SubtleCrypto {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (!c?.subtle) throw new VaultError("unsupported");
  return c.subtle;
}

const buf = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await subtle().importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "PBKDF2", salt: buf(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function importContentKey(raw: Uint8Array): Promise<CryptoKey> {
  return subtle().importKey("raw", buf(raw), { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Chave de conteúdo mantida em memória após criar/desbloquear. */
let memoryKey: { userId: string; key: CryptoKey; raw: Uint8Array } | null = null;

/** Bytes da chave de conteúdo da sessão atual (para ativar a biometria). */
export function getUnlockedContentKey(userId?: string): Uint8Array | null {
  if (!memoryKey) return null;
  if (userId && memoryKey.userId !== userId) return null;
  return memoryKey.raw;
}

async function encryptPayload(key: CryptoKey, payload: VaultPayload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await subtle().encrypt({ name: "AES-GCM", iv: buf(iv) }, key, buf(data));
  return { iv: Array.from(iv), cipher: Array.from(new Uint8Array(cipher)) };
}

async function decryptPayload(key: CryptoKey, iv: number[], cipher: number[]): Promise<VaultPayload> {
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: buf(new Uint8Array(iv)) },
    key,
    buf(new Uint8Array(cipher)),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as VaultPayload;
}

async function wrapContentKey(pin: string, salt: Uint8Array, contentRaw: Uint8Array) {
  const kek = await deriveKey(pin, salt);
  const wrapIv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await subtle().encrypt({ name: "AES-GCM", iv: buf(wrapIv) }, kek, buf(contentRaw));
  return { wrapIv: Array.from(wrapIv), wrappedKey: Array.from(new Uint8Array(wrapped)) };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export function isPinValid(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export async function hasVault(): Promise<boolean> {
  return (await readRecord()) !== null;
}

export async function getVaultMeta(): Promise<VaultMeta | null> {
  const rec = await readRecord();
  if (!rec) return null;
  return {
    userId: rec.userId,
    label: rec.label,
    createdAt: rec.createdAt,
    lastOnlineAt: rec.lastOnlineAt,
    failedAttempts: rec.failedAttempts,
    lockedUntil: rec.lockedUntil,
    expiresAt: rec.lastOnlineAt + VAULT_MAX_AGE_MS,
    biometric: rec.v === 2 && !!rec.biometric,
  };
}

export function isVaultExpired(meta: VaultMeta | null): boolean {
  if (!meta) return false;
  return Date.now() - meta.lastOnlineAt > VAULT_MAX_AGE_MS;
}

/** Marca (ou desmarca) no registro que a biometria está ativa neste aparelho. */
export async function setVaultBiometricFlag(on: boolean): Promise<void> {
  const rec = await readRecord();
  if (!rec || rec.v !== 2) return;
  await writeRecord({ ...rec, biometric: on });
}

/** Cria (ou substitui) o cofre com um novo PIN. Exige estar online. */
export async function createVault(pin: string, payload: VaultPayload, label: string): Promise<void> {
  if (!isPinValid(pin)) throw new VaultError("wrong-pin");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const contentRaw = crypto.getRandomValues(new Uint8Array(32));
  const contentKey = await importContentKey(contentRaw);
  const { iv, cipher } = await encryptPayload(contentKey, payload);
  const { wrapIv, wrappedKey } = await wrapContentKey(pin, salt, contentRaw);
  const now = Date.now();
  await writeRecord({
    v: 2,
    userId: payload.userId,
    label,
    salt: Array.from(salt),
    wrapIv,
    wrappedKey,
    iv,
    cipher,
    createdAt: now,
    lastOnlineAt: now,
    failedAttempts: 0,
    lockedUntil: 0,
    biometric: false,
  });
  memoryKey = { userId: payload.userId, key: contentKey, raw: contentRaw };
}

function backoffMs(attempts: number): number {
  if (attempts < VAULT_SOFT_LIMIT) return 0;
  // 30s, 60s, 120s, 240s...
  return Math.min(30_000 * 2 ** (attempts - VAULT_SOFT_LIMIT), 15 * 60_000);
}

function assertUsable(rec: VaultRecord | null): asserts rec is VaultRecord {
  if (!rec) throw new VaultError("no-vault");
}

async function registerFailure(rec: VaultRecord): Promise<never> {
  const attempts = rec.failedAttempts + 1;
  if (attempts >= VAULT_HARD_LIMIT) {
    await clearVault();
    throw new VaultError("destroyed");
  }
  const wait = backoffMs(attempts);
  await writeRecord({ ...rec, failedAttempts: attempts, lockedUntil: wait ? Date.now() + wait : 0 });
  throw new VaultError("wrong-pin", {
    attemptsLeft: VAULT_HARD_LIMIT - attempts,
    retryInMs: wait || undefined,
  });
}

async function guardState(rec: VaultRecord): Promise<void> {
  if (Date.now() - rec.lastOnlineAt > VAULT_MAX_AGE_MS) {
    await clearVault();
    throw new VaultError("expired");
  }
  if (rec.lockedUntil > Date.now()) {
    throw new VaultError("locked", { retryInMs: rec.lockedUntil - Date.now() });
  }
}

/** Abre o cofre com o PIN. Lança VaultError em qualquer falha. */
export async function unlockVault(pin: string): Promise<VaultPayload> {
  const rec = await readRecord();
  assertUsable(rec);
  await guardState(rec);

  const salt = new Uint8Array(rec.salt);

  if (rec.v === 1) {
    // Legado: a chave do PIN cifra o conteúdo diretamente. Abrimos e migramos.
    const legacyKey = await deriveKey(pin, salt);
    let payload: VaultPayload;
    try {
      payload = await decryptPayload(legacyKey, rec.iv, rec.cipher);
    } catch (err) {
      if (err instanceof VaultError) throw err;
      return registerFailure(rec);
    }
    const contentRaw = crypto.getRandomValues(new Uint8Array(32));
    const contentKey = await importContentKey(contentRaw);
    const { iv, cipher } = await encryptPayload(contentKey, payload);
    const { wrapIv, wrappedKey } = await wrapContentKey(pin, salt, contentRaw);
    await writeRecord({
      v: 2,
      userId: rec.userId,
      label: rec.label,
      salt: rec.salt,
      wrapIv,
      wrappedKey,
      iv,
      cipher,
      createdAt: rec.createdAt,
      lastOnlineAt: rec.lastOnlineAt,
      failedAttempts: 0,
      lockedUntil: 0,
      biometric: false,
    });
    memoryKey = { userId: rec.userId, key: contentKey, raw: contentRaw };
    return payload;
  }

  const kek = await deriveKey(pin, salt);
  try {
    const rawBuf = await subtle().decrypt(
      { name: "AES-GCM", iv: buf(new Uint8Array(rec.wrapIv)) },
      kek,
      buf(new Uint8Array(rec.wrappedKey)),
    );
    const contentRaw = new Uint8Array(rawBuf);
    const contentKey = await importContentKey(contentRaw);
    const payload = await decryptPayload(contentKey, rec.iv, rec.cipher);
    memoryKey = { userId: rec.userId, key: contentKey, raw: contentRaw };
    if (rec.failedAttempts || rec.lockedUntil) {
      await writeRecord({ ...rec, failedAttempts: 0, lockedUntil: 0 });
    }
    return payload;
  } catch (err) {
    if (err instanceof VaultError) throw err;
    return registerFailure(rec);
  }
}

/**
 * Abre o cofre com a chave liberada pela biometria / bloqueio do aparelho.
 * Nunca destrói o cofre: se a chave nativa estiver velha, apenas falha e o
 * usuário continua com o PIN.
 */
export async function unlockVaultWithKey(contentRaw: Uint8Array): Promise<VaultPayload> {
  const rec = await readRecord();
  assertUsable(rec);
  await guardState(rec);
  if (rec.v !== 2) throw new VaultError("wrong-pin");
  const contentKey = await importContentKey(contentRaw);
  try {
    const payload = await decryptPayload(contentKey, rec.iv, rec.cipher);
    memoryKey = { userId: rec.userId, key: contentKey, raw: contentRaw };
    if (rec.failedAttempts || rec.lockedUntil) {
      await writeRecord({ ...rec, failedAttempts: 0, lockedUntil: 0 });
    }
    return payload;
  } catch {
    throw new VaultError("wrong-pin");
  }
}

/**
 * Marca que houve contato real com o servidor agora — renova o prazo de 30 dias
 * e, quando a chave estiver em memória (mesma sessão do desbloqueio/criação),
 * regrava os tokens atualizados.
 */
export async function touchVaultOnline(session?: VaultSession | null, userId?: string | null): Promise<void> {
  const rec = await readRecord();
  if (!rec) return;
  if (userId && rec.userId !== userId) return;
  const now = Date.now();

  if (session && memoryKey && memoryKey.userId === rec.userId) {
    try {
      const payload = await decryptPayload(memoryKey.key, rec.iv, rec.cipher);
      const next: VaultPayload = { ...payload, session };
      const { iv, cipher } = await encryptPayload(memoryKey.key, next);
      await writeRecord({ ...rec, iv, cipher, lastOnlineAt: now, failedAttempts: 0, lockedUntil: 0 });
      return;
    } catch {
      /* cai no caminho simples abaixo */
    }
  }
  await writeRecord({ ...rec, lastOnlineAt: now });
}

/** Atualiza somente o retrato de perfil guardado (quando a chave está em memória). */
export async function updateVaultProfile(profile: unknown, userId: string): Promise<void> {
  const rec = await readRecord();
  if (!rec || rec.userId !== userId) return;
  if (!memoryKey || memoryKey.userId !== userId) return;
  try {
    const payload = await decryptPayload(memoryKey.key, rec.iv, rec.cipher);
    const { iv, cipher } = await encryptPayload(memoryKey.key, { ...payload, profile });
    await writeRecord({ ...rec, iv, cipher });
  } catch {
    /* noop */
  }
}

/** Mascara um e-mail/usuário para exibir na tela de entrada. */
export function maskLabel(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  const at = v.indexOf("@");
  if (at > 0) {
    const user = v.slice(0, at);
    const visible = user.slice(0, Math.min(2, user.length));
    return `${visible}${"•".repeat(Math.max(1, user.length - visible.length))}${v.slice(at)}`;
  }
  return v;
}
