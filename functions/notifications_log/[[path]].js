/**
 * functions/notifications_log/[[path]].js
 * Cloudflare Pages Function — Log Notifikasi WhatsApp & Sistem
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const dbUrl = (env.FIREBASE_DATABASE_URL || "https://digitalculinary-app-default-rtdb.asia-southeast1.firebasedatabase.app").replace(/\/$/, "");
  const apiKey = env.FIREBASE_API_KEY || "";
  const authParam = apiKey ? `?auth=${encodeURIComponent(apiKey)}` : "";

  try {
    // 1. GET /notifications_log
    if (method === 'GET') {
      const res = await fetch(`${dbUrl}/notifications_log.json${authParam}`);
      const data = await res.json();
      const list = data && typeof data === 'object'
        ? Object.entries(data).map(([id, v]) => ({ id, ...(v || {}) }))
        : [];
      list.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
      return new Response(JSON.stringify({ success: true, data: list.slice(0, 100) }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 2. POST /notifications_log
    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const logId = body.id || `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const payload = {
        id: logId,
        at: body.at || new Date().toISOString(),
        phone: body.phone || '',
        template: body.template || 'custom',
        status: body.status || 'logged',
        messageId: body.messageId || '',
        messagePreview: body.messagePreview || ''
      };
      await fetch(`${dbUrl}/notifications_log/${encodeURIComponent(logId)}.json${authParam}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return new Response(JSON.stringify({ success: true, data: payload }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Route not handled' }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
}
