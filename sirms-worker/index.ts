interface Env {
  DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string; // usually mailto:your@email.com
}

const TUNNEL_URL = "https://sirms-api.hainh.io.vn/navaid";

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleSchedule(env));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    await handleSchedule(env);
    return new Response("OK");
  }
};

async function handleSchedule(env: Env) {
  try {
    const response = await fetch(TUNNEL_URL, {
      headers: {
        "ngrok-skip-browser-warning": "true",
        "authorization": "nguyenhoanghai1992"
      }
    });

    if (!response.ok) return;

    const json: any = await response.json();
    if (!json.ok || !json.data) return;

    const { dvor, dme } = json.data;

    // 1. Insert snapshot
    await env.DB.prepare(`
      INSERT INTO sirms_data (
        dvor_tx, dvor_azi, dvor_m30, dvor_m99, dvor_dev, dvor_rf,
        dme_tx, dme_delay, dme_spacing, dme_pwr, dme_erp, dme_eff
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      dvor.Main, dvor.Azimuth, dvor.Mod30Hz, dvor.Mod9960Hz, dvor.Deviation, dvor.RFLevel,
      dme.Main, dme.Delay, dme.Spacing, dme.TxPower, dme.ERP, dme.Efficiency
    ).run();

    // 2. Cleanup old data
    await env.DB.prepare("DELETE FROM sirms_data WHERE timestamp < datetime('now', '-48 hours')").run();
    await env.DB.prepare("DELETE FROM notification_logs WHERE last_sent_at < datetime('now', '-7 days')").run();

    // 3. Threshold Check & Notifications
    await checkThresholds(env, { ...dvor, ...dme });

    console.log("SIRMS snapshot and monitoring completed.");

  } catch (err) {
    console.error("Worker error:", err);
  }
}

const TIER_CONFIG: any = {
  "Mod 30Hz": { maxTier: 2, step: 1 },
  "Mod 9960Hz": { maxTier: 2, step: 1 },
  "Deviation": { maxTier: 1, step: 1 },
  "RF Level": { maxTier: 1, step: 1 }
};

async function checkThresholds(env: Env, currentData: any) {
  const { results: limits } = await env.DB.prepare("SELECT * FROM navaid_limits WHERE enabled = 1").all();
  if (!limits || limits.length === 0) return;

  const PARAM_MAP: any = {
    "Azimuth": currentData.Azimuth,
    "Mod 30Hz": currentData.Mod30Hz,
    "Mod 9960Hz": currentData.Mod9960Hz,
    "Deviation": currentData.Deviation,
    "RF Level": currentData.RFLevel,
    "Delay": currentData.Delay,
    "Spacing": currentData.Spacing,
    "Tx Power": currentData.TxPower,
    "ERP": currentData.ERP,
    "Efficiency": currentData.Efficiency
  };

  for (const limit of (limits as any[])) {
    const val = PARAM_MAP[limit.param_name];
    if (val === null || val === undefined) continue;

    if (val < limit.min_val || val > limit.max_val) {
      const isHigh = val > limit.max_val;
      const diff = isHigh ? val - limit.max_val : limit.min_val - val;
      const config = TIER_CONFIG[limit.param_name];
      let currentTier = 0;

      if (config) {
        currentTier = Math.min(config.maxTier, Math.floor(diff / config.step));
      }

      const logKey = `${limit.param_name}#tier${currentTier}`;

      // Violation! Check log
      const lastNotify = await env.DB.prepare("SELECT last_sent_at FROM notification_logs WHERE param_name = ? ORDER BY last_sent_at DESC LIMIT 1")
        .bind(logKey).first<any>();

      const now = new Date();
      const shouldNotify = !lastNotify || (now.getTime() - new Date(lastNotify.last_sent_at).getTime() > 12 * 60 * 60 * 1000);

      if (shouldNotify) {
        const sentCount = await sendAlert(env, limit.param_name, val, limit.min_val, limit.max_val, currentTier, isHigh);
        if (sentCount > 0) {
          await env.DB.prepare("INSERT INTO notification_logs (param_name) VALUES (?)").bind(logKey).run();
        }
      }
    }
  }
}

async function sendAlert(env: Env, param: string, val: number, min: number, max: number, tier: number, isHigh: boolean) {
  const direction = isHigh ? "vượt ngưỡng trên" : "thấp dưới ngưỡng";
  let tierPrefix = "⚠️ [ALERT]";
  let tierDesc = "";

  if (tier === 1) {
    tierPrefix = "🚨 [ALARM]";
    tierDesc = " (Nghiêm trọng)";
  } else if (tier === 2) {
    tierPrefix = "🔥 [ALARM CRITICAL]";
    tierDesc = " (Cực kỳ nghiêm trọng)";
  }

  const payload = JSON.stringify({
    title: `${tierPrefix} SIRMS`,
    body: `Tham số ${param} ${direction}${tierDesc}: ${val.toFixed(2)} (Cho phép: ${min}-${max})`
  });

  const { results: subs } = await env.DB.prepare("SELECT subscription_json FROM push_subscriptions").all();
  console.log(`Found ${subs?.length || 0} subscriptions to notify.`);

  let successCount = 0;
  for (const sub of (subs as any[])) {
    try {
      const subscription = JSON.parse(sub.subscription_json);
      const ok = await sendPushNotification(env, subscription, payload);
      if (ok) successCount++;
    } catch (e) {
      console.error("Failed to process subscription", e);
    }
  }
  return successCount;
}

// Minimal Web Push Implementation for Workers
async function sendPushNotification(env: Env, subscription: any, payload: string) {
  const { endpoint } = subscription;

  // VAPID Authentication Header
  const jwt = await createVapidJWT(env, endpoint);

  // Apple/Safari often require the 'vapid' scheme and explicit public key
  const authHeader = `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`;

  console.log(`Attempting push to ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'TTL': '86400',
        'Urgency': 'high'
      }
    });

    if (response.ok) {
      console.log(`Push sent successfully to ${endpoint}`);
      return true;
    } else {
      const text = await response.text();
      console.error(`Push failed for ${endpoint}: ${response.status} ${text}`);
      if (response.status === 410 || response.status === 404) {
        await env.DB.prepare("DELETE FROM push_subscriptions WHERE subscription_json LIKE ?")
          .bind(`%${endpoint}%`).run();
      }
      return false;
    }
  } catch (err) {
    console.error(`Fetch error for push: ${err}`);
    return false;
  }
}

function decodeBase64Url(str: string) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function createVapidJWT(env: Env, endpoint: string) {
  const origin = new URL(endpoint).origin;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12h

  const header = { alg: "ES256", typ: "JWT" };
  const payload = {
    aud: origin,
    exp: expiry,
    sub: env.VAPID_SUBJECT || "mailto:admin@example.com"
  };

  const b64Url = (buf: Uint8Array | string) => {
    const str = typeof buf === 'string' ? btoa(buf) : btoa(String.fromCharCode(...buf));
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  // Specialized b64Url for raw binary (no double encoding)
  const b64UrlRaw = (buf: Uint8Array) => {
    const str = btoa(String.fromCharCode(...buf));
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const tokenData = `${b64Url(JSON.stringify(header))}.${b64Url(JSON.stringify(payload))}`;

  // Decode Public Key to get X and Y
  const pubKeyBuf = decodeBase64Url(env.VAPID_PUBLIC_KEY);
  // P-256 uncompressed key starts with 0x04, followed by 32 bytes X and 32 bytes Y
  const x = b64UrlRaw(pubKeyBuf.slice(1, 33));
  const y = b64UrlRaw(pubKeyBuf.slice(33, 65));

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: x,
    y: y,
    d: env.VAPID_PRIVATE_KEY,
    ext: true
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key,
    new TextEncoder().encode(tokenData)
  );

  return `${tokenData}.${b64UrlRaw(new Uint8Array(signature))}`;
}

