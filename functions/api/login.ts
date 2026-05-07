/// <reference types="@cloudflare/workers-types" />

interface Env {
  ADMIN_PIN: string;
  USER_PIN: string;
  KV: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const kvKey = `login_fail_${ip}`;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { hashedPin, captchaAnswer } = await request.json() as { hashedPin: string, captchaAnswer?: string };
    
    // Check failure count in KV
    const failCountStr = await env.KV.get(kvKey);
    const failCount = failCountStr ? parseInt(failCountStr) : 0;

    // If failures >= 5, check captcha
    if (failCount >= 5) {
      const expectedAnswer = await env.KV.get(`captcha_ans_${ip}`);

      if (!captchaAnswer) {
        // Generate new random captcha
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        await env.KV.put(`captcha_ans_${ip}`, (num1 + num2).toString(), { expirationTtl: 300 });

        return new Response(JSON.stringify({ 
          needsCaptcha: true, 
          captchaQuestion: `${num1} + ${num2} = ?`,
          error: "Đăng nhập sai quá nhiều lần. Vui lòng nhập mã xác nhận." 
        }), { 
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      if (captchaAnswer !== expectedAnswer) {
        // Wrong answer, generate a new one
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        await env.KV.put(`captcha_ans_${ip}`, (num1 + num2).toString(), { expirationTtl: 300 });

        return new Response(JSON.stringify({ 
          needsCaptcha: true, 
          captchaQuestion: `${num1} + ${num2} = ?`,
          error: "Mã xác nhận không chính xác." 
        }), { 
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (!hashedPin) {
      return new Response(JSON.stringify({ error: "Missing PIN" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isAdmin = hashedPin === env.ADMIN_PIN;
    const isUser = hashedPin === env.USER_PIN;

    if (isAdmin || isUser) {
      // Success: Reset fail count
      await env.KV.delete(kvKey);
      
      return new Response(JSON.stringify({ role: isAdmin ? "ADMIN" : "VIEWER" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Failure: Increment fail count
    const newCount = failCount + 1;
    await env.KV.put(kvKey, newCount.toString(), { expirationTtl: 3600 }); // Expire in 1 hour

    let captchaQuestion = undefined;
    if (newCount >= 5) {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      await env.KV.put(`captcha_ans_${ip}`, (num1 + num2).toString(), { expirationTtl: 300 });
      captchaQuestion = `${num1} + ${num2} = ?`;
    }

    return new Response(JSON.stringify({ 
      error: "Mã PIN không chính xác.",
      remainingAttempts: Math.max(0, 5 - newCount),
      needsCaptcha: newCount >= 5,
      captchaQuestion
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
