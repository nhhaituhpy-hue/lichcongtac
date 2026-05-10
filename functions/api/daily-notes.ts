/// <reference types="@cloudflare/workers-types" />
interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === "GET") {
    try {
      const date = url.searchParams.get("date");
      const startDate = url.searchParams.get("startDate");
      const endDate = url.searchParams.get("endDate");

      let query = "SELECT * FROM daily_notes";
      let params: any[] = [];

      if (date) {
        query += " WHERE date = ?";
        params.push(date);
      } else if (startDate && endDate) {
        query += " WHERE date BETWEEN ? AND ?";
        params.push(startDate, endDate);
      }

      const { results } = await env.DB.prepare(query).bind(...params).all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  if (request.method === "POST") {
    try {
      const body: any = await request.json();
      const { id, date, content } = body;

      if (!date || content === undefined) {
        return new Response("Missing date or content", { status: 400 });
      }

      const now = new Date().toISOString();
      const noteId = id || `note-${date}`;
      
      // Upsert logic - using id as primary key
      await env.DB.prepare(`
        INSERT INTO daily_notes (id, date, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          content = excluded.content,
          updated_at = excluded.updated_at
      `).bind(
        noteId,
        date,
        content,
        now,
        now
      ).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
