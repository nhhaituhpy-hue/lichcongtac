/// <reference types="@cloudflare/workers-types" />
interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { ids }: { ids: string[] } = await request.json();
    if (!ids || !Array.isArray(ids)) {
      return new Response("Invalid IDs", { status: 400 });
    }

    if (ids.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // SQLite doesn't support array parameters easily, so we build the query
    // Caution: Ensure IDs are strings and length is reasonable to avoid SQL limit issues
    const placeholders = ids.map(() => "?").join(",");
    await env.DB.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`)
      .bind(...ids)
      .run();

    return new Response(JSON.stringify({ success: true, count: ids.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
