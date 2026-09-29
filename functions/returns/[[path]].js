/**
 * functions/returns/[[path]].js
 * Cloudflare Pages Function — Retur Barang Konsinyasi ke Supplier
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
    // 1. GET /returns — Ambil semua log retur
    if (method === 'GET') {
      const res = await fetch(`${dbUrl}/returns_log.json${authParam}`);
      const data = await res.json();
      const list = data && typeof data === 'object'
        ? Object.entries(data).map(([id, v]) => ({ id, ...(v || {}) }))
        : [];
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return new Response(JSON.stringify({ success: true, data: list }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 2. POST /returns — Catat retur barang konsinyasi
    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randHex = Math.floor(Math.random() * 9000 + 1000).toString();
      const retId = body.returnId || `RET-${dateStr}-${randHex}`;

      const payload = {
        returnId: retId,
        id: retId,
        date: body.date || now.toISOString().slice(0, 10),
        supplierId: body.supplierId || '',
        supplierName: body.supplierName || 'Umum',
        items: body.items || [],
        totalValue: Number(body.totalValue) || 0,
        totalQty: Number(body.totalQty) || 0,
        reason: body.reason || 'Barang konsinyasi belum laku (Tutup Hari)',
        createdAt: body.createdAt || Date.now()
      };

      await fetch(`${dbUrl}/returns_log/${encodeURIComponent(retId)}.json${authParam}`, {
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
