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
    const kvKey = `webauthn_login_challenge_${ip}`;
    await env.KV.put(kvKey, challengeBase64, { expirationTtl: 300 });

    const options = {
      challenge: challengeBase64,
      rpId: new URL(request.url).hostname,
      userVerification: "required",
      timeout: 60000
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
