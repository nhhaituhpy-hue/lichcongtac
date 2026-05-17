/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === "GET") {
    try {
      const { results } = await env.DB.prepare(`
        SELECT id, role, device_name, created_at, last_used_at 
        FROM webauthn_credentials 
        ORDER BY created_at DESC
      `).all();

      return new Response(JSON.stringify(results || []), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  if (request.method === "DELETE") {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing credential id" }), { status: 400 });
      }

      await env.DB.prepare("DELETE FROM webauthn_credentials WHERE id = ?").bind(id).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
