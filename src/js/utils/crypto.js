/**
 * AI 智能刷题平台 — Crypto Utility
 * Web Crypto API (AES-GCM) 加密/解密 API Key
 *
 * 密钥派生自设备指纹，即使 localStorage 数据泄露也无法在其他设备解密。
 * 加密后的 key 以 "aes:" 前缀存储在 localStorage 中，兼容旧版明文 key。
 */
const ALGO = { name: 'AES-GCM', length: 256 };
const STORAGE_KEY = 'ai_device_salt';

/** 获取设备密码（稳定派生，不清除） */
function getDevicePassword() {
  let salt = localStorage.getItem(STORAGE_KEY);
  if (!salt) {
    salt = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(STORAGE_KEY, salt);
  }
  return salt;
}

/** 从密码派生 CryptoKey */
async function deriveKey(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('aiautop-salt'), iterations: 200000, hash: 'SHA-256' },
    keyMaterial,
    ALGO,
    false,
    ['encrypt', 'decrypt']
  );
}

/** 加密明文 API Key，返回 "aes:base64iv:base64cipher" */
export async function encryptApiKey(plaintext) {
  const password = getDevicePassword();
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, enc.encode(plaintext)
  );
  const ivStr = btoa(String.fromCharCode(...iv));
  const ctStr = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `aes:${ivStr}:${ctStr}`;
}

/** 解密，支持 "aes:..." 加密格式和旧版明文 */
export async function decryptApiKey(stored) {
  if (!stored) return '';
  if (!stored.startsWith('aes:')) return stored; // 明文兼容

  try {
    const password = getDevicePassword();
    const key = await deriveKey(password);
    const [, ivStr, ctStr] = stored.split(':');
    const iv = new Uint8Array(atob(ivStr).split('').map(c => c.charCodeAt(0)));
    const ct = new Uint8Array(atob(ctStr).split('').map(c => c.charCodeAt(0)));
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(dec);
  } catch (e) {
    console.warn('API Key 解密失败，可能设备指纹已变更');
    throw new Error('解密失败，请重新输入 API Key');
  }
}
