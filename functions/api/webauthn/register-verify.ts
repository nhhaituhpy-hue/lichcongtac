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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const kvKey = `webauthn_reg_challenge_${ip}`;
    
    // Get stored challenge from KV
    const storedChallenge = await env.KV.get(kvKey);
    if (!storedChallenge) {
      return new Response(JSON.stringify({ error: "Phiên đăng ký đã hết hạn hoặc không hợp lệ. Vui lòng thử lại." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await request.json() as { 
      id: string; 
      clientDataJSON: string; 
      publicKey: string; 
      role: string; 
      deviceName: string;
    };

    if (!body.id || !body.clientDataJSON || !body.publicKey || !body.role) {
      return new Response(JSON.stringify({ error: "Dữ liệu sinh trắc học không đầy đủ." }), { 
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

    if (clientData.type !== "webauthn.create") {
      return new Response(JSON.stringify({ error: "Loại thao tác không hợp lệ." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const deviceName = body.deviceName || request.headers.get("user-agent") || "PWA Device";

    // Store in D1 Database
    await env.DB.prepare(`
      INSERT INTO webauthn_credentials (id, public_key, role, device_name)
      VALUES (?, ?, ?, ?)
    `).bind(body.id, body.publicKey, body.role, deviceName).run();

    // Delete challenge from KV
    await env.KV.delete(kvKey);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
