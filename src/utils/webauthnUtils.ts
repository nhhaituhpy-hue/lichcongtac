/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper to convert ArrayBuffer to Base64URL string
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function isPWADisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
         ('standalone' in window.navigator && (window.navigator as any).standalone === true);
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && 
         window.PublicKeyCredential !== undefined;
}

export async function registerBiometric(role: string, deviceName?: string): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    throw new Error('Trình duyệt hoặc thiết bị của bạn không hỗ trợ WebAuthn.');
  }

  // 1. Lấy challenge từ server
  const resChallenge = await fetch('/api/webauthn/register-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, deviceName: deviceName || 'PWA Device' })
  });

  if (!resChallenge.ok) {
    const err = await resChallenge.json() as any;
    throw new Error(err.error || 'Không thể lấy dữ liệu đăng ký từ máy chủ.');
  }

  const options: any = await resChallenge.json();

  // Chuyển đổi challenge và user.id từ base64url sang Uint8Array
  const decodeBase64Url = (str: string) => {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  };

  options.challenge = decodeBase64Url(options.challenge);
  options.user.id = decodeBase64Url(options.user.id);

  // 2. Gọi API tạo credential của trình duyệt
  const credential = await navigator.credentials.create({
    publicKey: options
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Đăng ký sinh trắc học bị hủy hoặc thất bại.');
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  // Lấy public key SPKI buffer (nếu trình duyệt hỗ trợ getPublicKey)
  let publicKeyBase64 = '';
  if (typeof response.getPublicKey === 'function') {
    const pubKeyBuf = response.getPublicKey();
    if (pubKeyBuf) {
      publicKeyBase64 = bufferToBase64Url(pubKeyBuf);
    }
  }

  if (!publicKeyBase64) {
    throw new Error('Trình duyệt không hỗ trợ trích xuất Public Key trực tiếp.');
  }

  // 3. Gửi thông tin attestation lên server verify
  const verifyBody = {
    id: credential.id,
    clientDataJSON: bufferToBase64Url(response.clientDataJSON),
    publicKey: publicKeyBase64,
    role,
    deviceName: deviceName || 'PWA Device'
  };

  const resVerify = await fetch('/api/webauthn/register-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(verifyBody)
  });

  if (!resVerify.ok) {
    const err = await resVerify.json() as any;
    throw new Error(err.error || 'Xác thực sinh trắc học trên máy chủ thất bại.');
  }

  localStorage.setItem('dvor_biometric_enabled', 'true');
  return true;
}

export async function loginBiometric(abortController?: AbortController): Promise<{ role: 'VIEWER' | 'ADMIN' }> {
  if (!isWebAuthnSupported()) {
    throw new Error('Trình duyệt hoặc thiết bị của bạn không hỗ trợ WebAuthn.');
  }

  // 1. Lấy challenge từ server
  const resChallenge = await fetch('/api/webauthn/login-challenge');
  if (!resChallenge.ok) {
    const err = await resChallenge.json() as any;
    throw new Error(err.error || 'Không thể lấy dữ liệu đăng nhập từ máy chủ.');
  }

  const options: any = await resChallenge.json();

  const decodeBase64Url = (str: string) => {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  };

  options.challenge = decodeBase64Url(options.challenge);

  // 2. Gọi API get credential của trình duyệt
  const getOptions: CredentialRequestOptions = {
    publicKey: options,
    signal: abortController?.signal
  };

  const credential = await navigator.credentials.get(getOptions) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Đăng nhập sinh trắc học bị hủy hoặc thất bại.');
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  // 3. Gửi assertion lên server verify
  const verifyBody = {
    id: credential.id,
    clientDataJSON: bufferToBase64Url(response.clientDataJSON),
    authenticatorData: bufferToBase64Url(response.authenticatorData),
    signature: bufferToBase64Url(response.signature)
  };

  const resVerify = await fetch('/api/webauthn/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(verifyBody)
  });

  if (!resVerify.ok) {
    const err = await resVerify.json() as any;
    throw new Error(err.error || 'Xác thực đăng nhập sinh trắc học thất bại.');
  }

  const data = await resVerify.json() as { success: boolean, role: 'VIEWER' | 'ADMIN' };
  return { role: data.role };
}
