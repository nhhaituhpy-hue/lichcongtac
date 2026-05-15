/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { subscription } = await request.json() as any;
    
    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: "Invalid subscription" }), { status: 400 });
    }

    // Insert or update subscription
    await env.DB.prepare(`
      INSERT INTO push_subscriptions (subscription_json, user_agent)
      VALUES (?, ?)
      ON CONFLICT DO UPDATE SET created_at = CURRENT_TIMESTAMP
    `).bind(
      JSON.stringify(subscription),
      request.headers.get("user-agent") || "unknown"
    ).run();

    // Note: To use ON CONFLICT, we might need a unique index on subscription_json 
    // or just use INSERT and handle duplicates later. 
    // For now, let's just insert.
    /*
    await env.DB.prepare("INSERT INTO push_subscriptions (subscription_json, user_agent) VALUES (?, ?)")
      .bind(JSON.stringify(subscription), request.headers.get("user-agent"))
      .run();
    */

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
