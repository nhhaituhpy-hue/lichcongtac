/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

function base64UrlDecode(str: string): Uint8Array {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function parseDERSignature(derBuf: Uint8Array): Uint8Array {
  // derBuf is ASN.1 DER sequence: 0x30, len, 0x02, lenR, r..., 0x02, lenS, s...
  let offset = 0;
  if (derBuf[offset++] !== 0x30) throw new Error("Expected DER SEQUENCE");
  offset++; // skip sequence length
  
  if (derBuf[offset++] !== 0x02) throw new Error("Expected DER INTEGER (r)");
  let lenR = derBuf[offset++];
  let r = derBuf.slice(offset, offset + lenR);
  offset += lenR;
  
  if (derBuf[offset++] !== 0x02) throw new Error("Expected DER INTEGER (s)");
  let lenS = derBuf[offset++];
  let s = derBuf.slice(offset, offset + lenS);
  
  // Normalize r and s to exactly 32 bytes each
  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);
  
  const rawR = new Uint8Array(32);
  rawR.set(r, 32 - r.length);
  
  const rawS = new Uint8Array(32);
  rawS.set(s, 32 - s.length);
  
  const rawSignature = new Uint8Array(64);
  rawSignature.set(rawR, 0);
  rawSignature.set(rawS, 32);
  
  return rawSignature;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const kvKey = `webauthn_login_challenge_${ip}`;
    
    // Get stored challenge from KV
    const storedChallenge = await env.KV.get(kvKey);
    if (!storedChallenge) {
      return new Response(JSON.stringify({ error: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng thử lại." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json() as { 
      id: string; 
      clientDataJSON: string; 
      authenticatorData: string; 
      signature: string; 
    };

    if (!body.id || !body.clientDataJSON || !body.authenticatorData || !body.signature) {
      return new Response(JSON.stringify({ error: "Dữ liệu xác thực sinh trắc học không đầy đủ." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Decode clientDataJSON
    const clientDataBytes = base64UrlDecode(body.clientDataJSON);
    const clientDataStr = new TextDecoder().decode(clientDataBytes);
    const clientData = JSON.parse(clientDataStr);

    // Verify challenge
    if (clientData.challenge !== storedChallenge) {
      return new Response(JSON.stringify({ error: "Mã xác thực challenge không khớp." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verify origin
    const expectedOrigin = new URL(request.url).origin;
    if (clientData.origin !== expectedOrigin) {
      return new Response(JSON.stringify({ error: "Origin không hợp lệ." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (clientData.type !== "webauthn.get") {
      return new Response(JSON.stringify({ error: "Loại thao tác không hợp lệ." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Query D1 Database for the credential
    const credential = await env.DB.prepare(`
      SELECT public_key, role FROM webauthn_credentials WHERE id = ?
    `).bind(body.id).first<{ public_key: string, role: string }>();

    if (!credential) {
      return new Response(JSON.stringify({ error: "Không tìm thấy thông tin sinh trắc học trên hệ thống. Vui lòng đăng nhập bằng mã PIN và đăng ký lại." }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Decode public key SPKI buffer
    const spkiBytes = base64UrlDecode(credential.public_key);

    // Import public key for ECDSA P-256
    const key = await crypto.subtle.importKey(
      "spki",
      spkiBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );

    // Calculate SHA-256 hash of clientDataJSON
    const clientDataHash = await crypto.subtle.digest("SHA-256", clientDataBytes);

    // Decode authenticatorData
    const authDataBytes = base64UrlDecode(body.authenticatorData);

    // Concatenate authenticatorData and clientDataHash
    const signedData = new Uint8Array(authDataBytes.length + clientDataHash.byteLength);
    signedData.set(authDataBytes, 0);
    signedData.set(new Uint8Array(clientDataHash), authDataBytes.length);

    // Decode DER signature to raw 64-byte signature
    const signatureBytes = base64UrlDecode(body.signature);
    const rawSignature = parseDERSignature(signatureBytes);

    // Verify signature
    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      key,
      rawSignature,
      signedData
    );

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Xác thực chữ ký sinh trắc học thất bại." }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Update last_used_at in D1
    await env.DB.prepare(`
      UPDATE webauthn_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(body.id).run();

    // Delete challenge from KV
    await env.KV.delete(kvKey);

    return new Response(JSON.stringify({ success: true, role: credential.role }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
