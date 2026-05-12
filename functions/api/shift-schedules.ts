/// <reference types="@cloudflare/workers-types" />
interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // GET all shift schedules or filter by month
  if (request.method === "GET") {
    try {
      const month = url.searchParams.get("month");
      const startDateStr = url.searchParams.get("startDate");
      const endDateStr = url.searchParams.get("endDate");

      let query = "SELECT * FROM shift_schedules";
      let params: any[] = [];
      
      if (startDateStr && endDateStr) {
        // Logic for filtering by date range across months
        const start = startDateStr.split('-'); // [YYYY, MM, DD]
        const end = endDateStr.split('-');     // [YYYY, MM, DD]
        
        const startMonth = `${start[0]}-${start[1]}`;
        const startDay = parseInt(start[2]);
        const endMonth = `${end[0]}-${end[1]}`;
        const endDay = parseInt(end[2]);

        if (startMonth === endMonth) {
          query += " WHERE month = ? AND date BETWEEN ? AND ?";
          params.push(startMonth, startDay, endDay);
        } else {
          query += " WHERE (month = ? AND date >= ?) OR (month = ? AND date <= ?)";
          params.push(startMonth, startDay, endMonth, endDay);
        }
      } else if (month) {
        query += " WHERE month = ?";
        params.push(month);
      }

      const { results } = await env.DB.prepare(query).bind(...params).all();
      const formattedResults = results.map((s: any) => ({
        id: s.id,
        month: s.month,
        personName: s.person_name,
        date: s.date,
        shiftType: s.shift_type
      }));
      return new Response(JSON.stringify(formattedResults), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  // POST new shift schedules or update
  if (request.method === "POST") {
    try {
      const body: any = await request.json();
      const schedulesToUpsert = Array.isArray(body) ? body : [body];

      if (schedulesToUpsert.length === 0) {
        return new Response(JSON.stringify({ success: true, count: 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // If we have a lot of schedules, D1 batch might have limits.
      // We'll process them in chunks of 50 to be safe.
      const CHUNK_SIZE = 50;
      for (let i = 0; i < schedulesToUpsert.length; i += CHUNK_SIZE) {
        const chunk = schedulesToUpsert.slice(i, i + CHUNK_SIZE);
        const statements = chunk.map((schedule: any) => {
          const { id, month, personName, date, shiftType } = schedule;
          return env.DB.prepare(`
            INSERT INTO shift_schedules (id, month, person_name, date, shift_type)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(month, person_name, date) DO UPDATE SET
              shift_type = excluded.shift_type
          `).bind(
            id,
            month,
            personName,
            date,
            shiftType
          );
        });
        await env.DB.batch(statements);
      }

      return new Response(JSON.stringify({ success: true, count: schedulesToUpsert.length }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  // DELETE shift schedules for a specific month
  if (request.method === "DELETE") {
    try {
      const month = url.searchParams.get("month");
      if (!month) return new Response("Missing month parameter", { status: 400 });

      await env.DB.prepare("DELETE FROM shift_schedules WHERE month = ?").bind(month).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};
