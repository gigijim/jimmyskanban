/**
 * 加密 + 壓縮的純文字備份（可貼在 Email / 記事本 / 聊天軟體）
 *
 * 演算法（全部使用瀏覽器內建 Web Crypto / CompressionStream，不需外部套件、不連網）：
 *   1. JSON → UTF-8 → deflate-raw 壓縮（瀏覽器不支援時不壓縮，以旗標記錄）
 *   2. 密碼 → PBKDF2-SHA256（預設 600,000 次，隨機 16 bytes salt）→ AES-256 金鑰
 *   3. AES-256-GCM 加密（隨機 12 bytes IV）；格式版本、迭代次數、匯出時間
 *      當作 GCM 的附加驗證資料（AAD）→ 時間戳記被竄改也會解密失敗
 *   4. salt | iv | 密文 → Base64URL
 *
 * 文字格式（前兩行給人看，匯入時只認 JKB1| 那一行，換行 / 空白會自動忽略）：
 *   JimmysKanban 加密備份
 *   時間：2026/11/07 10:20:30
 *   JKB1|600000|2026-11-07T02:20:30.123Z|<Base64URL>
 */

export const SECURE_PREFIX = "JKB1";
export const DEFAULT_ITERATIONS = 600000;

const FLAG_RAW = 0;
const FLAG_DEFLATE = 1;

export class SecureFormatError extends Error {
  constructor(message = "not a JimmysKanban encrypted backup") {
    super(message);
    this.name = "SecureFormatError";
  }
}

/** 密碼錯誤，或內容 / 時間戳記被修改過 */
export class SecureDecryptError extends Error {
  constructor(message = "wrong password or corrupted data") {
    super(message);
    this.name = "SecureDecryptError";
  }
}

const subtle = () => {
  const c = (globalThis as any).crypto;
  if (!c || !c.subtle) throw new Error("Web Crypto is not available in this browser");
  return c.subtle as SubtleCrypto;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

// ---------- Base64URL
const toBase64Url = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (s: string) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

// ---------- 壓縮
const streamBytes = async (data: Uint8Array, stream: any): Promise<Uint8Array> => {
  const buf = await new Response(new Blob([data as any]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(buf);
};

const canCompress = () => typeof (globalThis as any).CompressionStream === "function";

const compress = async (data: Uint8Array) => {
  if (!canCompress()) return { flag: FLAG_RAW, bytes: data };
  return { flag: FLAG_DEFLATE, bytes: await streamBytes(data, new (globalThis as any).CompressionStream("deflate-raw")) };
};

const decompress = async (flag: number, data: Uint8Array) => {
  if (flag === FLAG_RAW) return data;
  if (flag !== FLAG_DEFLATE) throw new SecureFormatError("unknown compression");
  if (typeof (globalThis as any).DecompressionStream !== "function") {
    throw new Error("This browser cannot decompress the backup (DecompressionStream missing)");
  }
  return streamBytes(data, new (globalThis as any).DecompressionStream("deflate-raw"));
};

// ---------- 金鑰
const deriveKey = async (password: string, salt: Uint8Array, iterations: number) => {
  const base = await subtle().importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as any, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

const header = (iterations: number, exportedAt: string) => `${SECURE_PREFIX}|${iterations}|${exportedAt}`;

const pad = (n: number) => String(n).padStart(2, "0");
const localTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export type SecureExport = { text: string; exportedAt: string };

/** 把任何可 JSON 化的資料加密成純文字 */
export async function encryptToText(
  data: unknown,
  password: string,
  options: { now?: string; iterations?: number; title?: string } = {}
): Promise<SecureExport> {
  if (!password) throw new Error("password required");
  const exportedAt = options.now || new Date().toISOString();
  const iterations = options.iterations || DEFAULT_ITERATIONS;

  const { flag, bytes } = await compress(enc.encode(JSON.stringify(data)));
  const plain = new Uint8Array(bytes.length + 1);
  plain[0] = flag;
  plain.set(bytes, 1);

  const c = (globalThis as any).crypto;
  const salt = c.getRandomValues(new Uint8Array(16));
  const iv = c.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations);
  const cipher = new Uint8Array(
    await subtle().encrypt(
      { name: "AES-GCM", iv, additionalData: enc.encode(header(iterations, exportedAt)) },
      key,
      plain
    )
  );

  const packed = new Uint8Array(salt.length + iv.length + cipher.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(cipher, salt.length + iv.length);

  const text = [
    options.title || "JimmysKanban encrypted backup",
    `${localTime(exportedAt)}`,
    `${header(iterations, exportedAt)}|${toBase64Url(packed)}`,
  ].join("\n");
  return { text, exportedAt };
}

/** 從文字中找出加密備份的時間戳記（不需要密碼，用來在輸入密碼前先顯示） */
export function peekText(text: string): { exportedAt: string; iterations: number } | null {
  const m = parse(text);
  return m ? { exportedAt: m.exportedAt, iterations: m.iterations } : null;
}

const parse = (text: string) => {
  const compact = (text || "").replace(/\s+/g, "");
  const m = compact.match(/JKB1\|(\d{1,8})\|([0-9T:.\-+Z]{10,40})\|([A-Za-z0-9_-]+)/);
  if (!m) return null;
  return { iterations: parseInt(m[1], 10), exportedAt: m[2], payload: m[3] };
};

/** 解密純文字備份，回傳原本的資料 */
export async function decryptFromText(text: string, password: string): Promise<{ data: any; exportedAt: string }> {
  const m = parse(text);
  if (!m) throw new SecureFormatError();
  if (m.iterations < 1000 || m.iterations > 10000000) throw new SecureFormatError("bad iteration count");
  let packed: Uint8Array;
  try {
    packed = fromBase64Url(m.payload);
  } catch (e) {
    throw new SecureFormatError("bad base64");
  }
  if (packed.length < 16 + 12 + 16 + 1) throw new SecureFormatError("too short");

  const salt = packed.subarray(0, 16);
  const iv = packed.subarray(16, 28);
  const cipher = packed.subarray(28);
  const key = await deriveKey(password, salt, m.iterations);

  let plain: Uint8Array;
  try {
    plain = new Uint8Array(
      await subtle().decrypt(
        { name: "AES-GCM", iv: iv as any, additionalData: enc.encode(header(m.iterations, m.exportedAt)) },
        key,
        cipher as any
      )
    );
  } catch (e) {
    throw new SecureDecryptError();
  }

  const json = dec.decode(await decompress(plain[0], plain.subarray(1)));
  return { data: JSON.parse(json), exportedAt: m.exportedAt };
}
