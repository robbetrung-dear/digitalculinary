/**
 * functions/suppliers/[[path]].js
 * Cloudflare Pages Function — CRUD Supplier Master ke Firebase Realtime Database
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const dbUrl = (env.FIREBASE_DATABASE_URL || "https://digitalculinary-app-default-rtdb.asia-southeast1.firebasedatabase.app").replace(/\/$/, "");
  const apiKey = env.FIREBASE_API_KEY || "";
  const authParam = apiKey ? `?auth=${encodeURIComponent(apiKey)}` : "";

  const fullPath = url.pathname.replace(/^\/suppliers\/?/, '');
  const parts = fullPath.split('/').filter(Boolean);

  try {
    // 1. GET /suppliers — Ambil semua supplier
    if (method === 'GET' && parts.length === 0) {
      const res = await fetch(`${dbUrl}/suppliers.json${authParam}`);
      const data = await res.json();
      const list = data && typeof data === 'object'
        ? Object.entries(data).map(([id, v]) => ({ id, ...(v || {}) }))
        : [];
      return new Response(JSON.stringify({ success: true, data: list }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 2. GET /suppliers/:id — Ambil satu supplier
    if (method === 'GET' && parts.length === 1) {
      const supId = parts[0];
      const res = await fetch(`${dbUrl}/suppliers/${encodeURIComponent(supId)}.json${authParam}`);
      const data = await res.json();
      if (!data) {
        return new Response(JSON.stringify({ success: false, error: 'Supplier not found' }), {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ success: true, data: { id: supId, ...data } }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 3. POST /suppliers — Tambah supplier baru
    if (method === 'POST' && parts.length === 0) {
      const body = await request.json().catch(() => ({}));
      const supId = body.id || `sp_${Date.now()}`;
      const payload = {
        id: supId,
        name: body.name || 'Supplier Tanpa Nama',
        contact: body.contact || '',
        address: body.address || '',
        active: body.active !== undefined ? Boolean(body.active) : true,
        createdAt: body.createdAt || new Date().toISOString()
      };
      await fetch(`${dbUrl}/suppliers/${encodeURIComponent(supId)}.json${authParam}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return new Response(JSON.stringify({ success: true, data: payload }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 4. PUT / PATCH /suppliers/:id — Update data supplier
    if ((method === 'PUT' || method === 'PATCH') && parts.length === 1) {
      const supId = parts[0];
      const body = await request.json().catch(() => ({}));
      await fetch(`${dbUrl}/suppliers/${encodeURIComponent(supId)}.json${authParam}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return new Response(JSON.stringify({ success: true, message: 'Supplier updated' }), {
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 5. DELETE /suppliers/:id — Hapus supplier
    if (method === 'DELETE' && parts.length === 1) {
      const supId = parts[0];
      await fetch(`${dbUrl}/suppliers/${encodeURIComponent(supId)}.json${authParam}`, {
        method: 'DELETE'
      });
      return new Response(JSON.stringify({ success: true, message: 'Supplier deleted' }), {
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
