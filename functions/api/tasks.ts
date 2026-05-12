/// <reference types="@cloudflare/workers-types" />
interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === "GET") {
    try {
      const startDate = url.searchParams.get("startDate");
      const endDate = url.searchParams.get("endDate");

      let query = "SELECT * FROM tasks";
      let params: any[] = [];

      if (startDate && endDate) {
        query += " WHERE date BETWEEN ? AND ?";
        params.push(startDate, endDate);
      } else {
        // Fallback for backward compatibility or general overview
        // We could limit this to a certain range if needed
      }

      const { results } = await env.DB.prepare(query).bind(...params).all();
      // Personnel is stored as a string, need to parse if it was JSON or just split if comma-separated
      // Our frontend expects an array of strings.
      const formattedResults = results.map((task: any) => ({
        ...task,
        personnel: task.personnel ? JSON.parse(task.personnel) : []
      }));
      return new Response(JSON.stringify(formattedResults), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  if (request.method === "POST") {
    try {
      const body: any = await request.json();
      const tasksToUpsert = Array.isArray(body) ? body : [body];

      const statements = tasksToUpsert.map((task: any) => {
        const { id, title, description, startTime, endTime, personnel, status, date, equipmentId, notes, templateId } = task;
        return env.DB.prepare(`
          INSERT INTO tasks (id, title, description, startTime, endTime, personnel, status, date, equipmentId, notes, templateId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            startTime = excluded.startTime,
            endTime = excluded.endTime,
            personnel = excluded.personnel,
            status = excluded.status,
            date = excluded.date,
            equipmentId = excluded.equipmentId,
            notes = excluded.notes,
            templateId = excluded.templateId
        `).bind(
          id, 
          title, 
          description || null, 
          startTime || null, 
          endTime || null, 
          JSON.stringify(personnel || []), 
          status, 
          date, 
          equipmentId || null, 
          notes || null, 
          templateId || null
        );
      });

      await env.DB.batch(statements);

      return new Response(JSON.stringify({ success: true, count: tasksToUpsert.length }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  if (request.method === "DELETE") {
    try {
      const id = url.searchParams.get("id");
      if (!id) return new Response("Missing ID", { status: 400 });

      await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
