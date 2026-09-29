/**
 * functions/settlements/[[path]].js
 * Cloudflare Pages Function — Settlement Konsinyasi Harian & Pembayaran Supplier
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

  const fullPath = url.pathname.replace(/^\/settlements\/?/, '');
  const parts = fullPath.split('/').filter(Boolean);

  try {
    // 1. GET /settlements — Ambil semua riwayat settlement
    if (method === 'GET' && parts.length === 0) {
      const res = await fetch(`${dbUrl}/settlements.json${authParam}`);
      const data = await res.json();
      const list = data && typeof data === 'object'
        ? Object.entries(data).map(([id, v]) => ({ id, ...(v || {}) }))
        : [];
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return new Response(JSON.stringify({ success: true, data: list }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 2. GET /settlements/:id
    if (method === 'GET' && parts.length === 1) {
      const stlId = parts[0];
      const res = await fetch(`${dbUrl}/settlements/${encodeURIComponent(stlId)}.json${authParam}`);
      const data = await res.json();
      if (!data) {
        return new Response(JSON.stringify({ success: false, error: 'Settlement not found' }), {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ success: true, data: { id: stlId, ...data } }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 3. POST /settlements — Buat settlement baru
    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randHex = Math.floor(Math.random() * 9000 + 1000).toString();
      const stlId = body.settlementId || `STL-${dateStr}-${randHex}`;

      const payload = {
        settlementId: stlId,
        id: stlId,
        date: body.date || now.toISOString().slice(0, 10),
        supplierId: body.supplierId || '',
        supplierName: body.supplierName || 'Semua Supplier',
        totalPaid: Number(body.totalPaid) || 0,
        soldItemsCount: Number(body.soldItemsCount) || 0,
        returnedItemsCount: Number(body.returnedItemsCount) || 0,
        details: body.details || [],
        paymentMethod: body.paymentMethod || 'cash',
        status: 'settled',
        createdAt: body.createdAt || Date.now()
      };

      await fetch(`${dbUrl}/settlements/${encodeURIComponent(stlId)}.json${authParam}`, {
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
