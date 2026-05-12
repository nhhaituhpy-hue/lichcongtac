interface Env {
  DB: D1Database;
}

const TUNNEL_URL = "https://morale-delivery-chirping.ngrok-free.dev/navaid";

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleSchedule(env));
  },

  // Also allow manual trigger via fetch if needed
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    await handleSchedule(env);
    return new Response("OK");
  }
};

async function handleSchedule(env: Env) {
  try {
    const response = await fetch(TUNNEL_URL, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    
    if (!response.ok) {
      console.error(`Fetch failed: ${response.status}`);
      return;
    }

    const json: any = await response.json();
    if (!json.ok || !json.data) return;

    const { dvor, dme } = json.data;

    // Insert snapshot
    await env.DB.prepare(`
      INSERT INTO sirms_data (
        dvor_tx, dvor_azi, dvor_m30, dvor_m99, dvor_dev, dvor_rf,
        dme_tx, dme_delay, dme_spacing, dme_pwr, dme_erp, dme_eff
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      dvor.Main, dvor.Azimuth, dvor.Mod30Hz, dvor.Mod9960Hz, dvor.Deviation, dvor.RFLevel,
      dme.Main, dme.Delay, dme.Spacing, dme.TxPower, dme.ERP, dme.Efficiency
    ).run();

    // Cleanup old data (older than 48 hours)
    await env.DB.prepare("DELETE FROM sirms_data WHERE timestamp < datetime('now', '-48 hours')").run();
    
    console.log("SIRMS snapshot saved successfully.");

  } catch (err) {
    console.error("Worker error:", err);
  }
}
