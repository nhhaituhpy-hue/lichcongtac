/// <reference types="@cloudflare/workers-types" />

interface Env {
  KV: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== "POST" && request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    
    // Generate a random 32-byte challenge
    const challengeBuffer = new Uint8Array(32);
    crypto.getRandomValues(challengeBuffer);
    
    // Convert challenge to base64url
    const challengeBase64 = btoa(String.fromCharCode(...challengeBuffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Store challenge in KV with 5 minutes expiration (300 seconds)
    const kvKey = `webauthn_reg_challenge_${ip}`;
    await env.KV.put(kvKey, challengeBase64, { expirationTtl: 300 });

    // Parse request body if any (to get role or username)
    let role = "VIEWER";
    let deviceName = "PWA Device";
    if (request.method === "POST") {
      try {
        const body = await request.json() as { role?: string, deviceName?: string };
        if (body.role) role = body.role;
        if (body.deviceName) deviceName = body.deviceName;
      } catch (e) {}
    }

    // Prepare WebAuthn creation options
    const options = {
      challenge: challengeBase64,
      rp: {
        name: "Lịch Công Tác Đài Tuy Hòa",
        id: new URL(request.url).hostname
      },
      user: {
        id: btoa(role + "_" + Date.now()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
        name: `${role.toLowerCase()}@tuyhoa.dvor`,
        displayName: `Tài khoản ${role} (${deviceName})`
      },
      pubKeyCredParams: [
        {
          type: "public-key",
          alg: -7 // ECDSA w/ SHA-256
        }
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "required"
      },
      timeout: 60000,
      attestation: "none"
    };

    return new Response(JSON.stringify(options), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
