/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM navaid_limits").all();
    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "POST") {
    try {
      const limits = await request.json() as any[];
      
      // Clear existing and re-insert or use UPSERT
      for (const limit of limits) {
        await env.DB.prepare(`
          INSERT INTO navaid_limits (param_name, min_val, max_val, enabled)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(param_name) DO UPDATE SET
            min_val = excluded.min_val,
            max_val = excluded.max_val,
            enabled = excluded.enabled
        `).bind(limit.param_name, limit.min_val, limit.max_val, limit.enabled ? 1 : 0).run();
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
