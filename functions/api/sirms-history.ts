/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

const PARAM_MAP: Record<string, string> = {
  "Azimuth": "dvor_azi",
  "Mod 30Hz": "dvor_m30",
  "Mod 9960Hz": "dvor_m99",
  "Deviation": "dvor_dev",
  "RF Level": "dvor_rf",
  "Delay": "dme_delay",
  "Spacing": "dme_spacing",
  "Tx Power": "dme_pwr",
  "ERP": "dme_erp",
  "Efficiency": "dme_eff"
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const param = url.searchParams.get("param");

  if (!param || !PARAM_MAP[param]) {
    return new Response(JSON.stringify({ error: "Invalid or missing parameter" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const column = PARAM_MAP[param];
  const txColumn = column.startsWith("dvor") ? "dvor_tx" : "dme_tx";

  try {
    // Fetch last 48 hours of data for the specific parameter
    // We also select the TX column to know which transmitter was active
    const { results } = await env.DB.prepare(`
      SELECT strftime('%Y-%m-%dT%H:%M:%SZ', timestamp) as timestamp, ${column} as value, ${txColumn} as tx
      FROM sirms_data
      WHERE timestamp >= datetime('now', '-48 hours')
      ORDER BY timestamp ASC
    `).all();

    return new Response(JSON.stringify(results), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60" 
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
