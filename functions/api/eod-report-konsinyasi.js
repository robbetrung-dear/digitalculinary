/**
 * functions/api/eod-report-konsinyasi.js
 * Cloudflare Pages Function — POST /api/eod-report-konsinyasi
 * 
 * Sprint 2: Kirim laporan tutup konsinyasi ke owner via WA.
 * - Mode "test" (default): return preview, tidak kirim WA
 * - Mode "live": kirim via Fonnte (butuh env WA_FONNTE_TOKEN + OWNER_WA_NUMBER)
 * 
 * Body: { settlementDate, reportText, mode, supplierCount, totalBayar }
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed. Use POST.' }, 405);
  }

  const body = await request.json().catch(() => ({}));
  const settlementDate = String(body.settlementDate || '').trim();
  const reportText = String(body.reportText || '').trim();
  const mode = String(body.mode || 'test').toLowerCase();
  const supplierCount = Number(body.supplierCount) || 0;
  const totalBayar = Number(body.totalBayar) || 0;

  if (!reportText) {
    return jsonResponse({ success: false, error: 'reportText wajib diisi' }, 400);
  }

  // Setup Firebase REST
  const dbUrl = (env.FIREBASE_DATABASE_URL || "https://digitalculinary-app-default-rtdb.asia-southeast1.firebasedatabase.app").replace(/\/$/, "");
  const apiKey = env.FIREBASE_API_KEY || "";
  const auth = apiKey ? `?auth=${encodeURIComponent(apiKey)}` : '';
      // ✅ Multi-owner WA: baca dari Firebase dulu, fallback ke env var
    let ownerWaRaw = '';
    try {
      const ownersRes = await fetch(`${dbUrl}/site_config/ownerWaNumbers.json${auth}`);
      if (ownersRes.ok) {
        const ownersData = await ownersRes.json();
        if (Array.isArray(ownersData) && ownersData.length > 0) {
          ownerWaRaw = ownersData.map(n => String(n).trim()).filter(Boolean).join(',');
          console.log('[EOD-REPORT] Owners from Firebase:', ownersData.length, 'numbers');
        } else if (typeof ownersData === 'string' && ownersData.trim()) {
          ownerWaRaw = ownersData.trim();
          console.log('[EOD-REPORT] Owner from Firebase (string):', ownerWaRaw.slice(0, 8) + '****');
        }
      }
    } catch (e) {
      console.warn('[EOD-REPORT] Fetch ownerWaNumbers note:', e.message);
    }
    // Fallback ke env var kalau Firebase kosong
    if (!ownerWaRaw) {
      ownerWaRaw = String(env.OWNER_WA_NUMBER || '').trim();
      console.log('[EOD-REPORT] Owner from env var (fallback)');
    }
    const ownerWaList = ownerWaRaw.split(',').map(s => s.trim()).filter(Boolean);
    const ownerWa = ownerWaList.join(',');
    console.log('[EOD-REPORT] Final owners:', ownerWaList.length, 'recipients');
  const logKey = `eod_${settlementDate || 'unknown'}_${Date.now()}`;
  const logPayload = {
    at: Date.now(),
    iso: new Date().toISOString(),
    type: 'eod_report_konsinyasi',
    settlementDate,
    mode,
    supplierCount,
    totalBayar,
    reportText,
    status: 'pending',
    provider: null,
    waResult: null
  };

  // === MODE TEST ===
  if (mode === 'test') {
    logPayload.status = 'test_only';
    try {
      await fetch(`${dbUrl}/notifications_log/${logKey}.json${auth}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logPayload)
      });
    } catch (e) {
      console.warn('[EOD-REPORT] Log error:', e.message);
    }

    return jsonResponse({
      success: true,
      mode: 'test',
      message: 'Mode test — laporan tidak dikirim ke WA.',
      preview: reportText,
      logKey
    }, 200);
  }

  // === MODE LIVE ===
  if (mode === 'live') {
    const provider = String(env.WA_PROVIDER || 'fonnte').toLowerCase();
    logPayload.provider = provider;

    // ✅ Support multi-recipient (comma-separated)
    // ✅ Opsi C: Baca owner WA dari Firebase dulu, fallback ke env var
    let ownerWaRaw = '';
    let ownerWaSource = 'none';
    try {
      const ownersRes = await fetch(`${dbUrl}/site_config/ownerWaNumbers.json${auth}`);
      if (ownersRes.ok) {
        const ownersData = await ownersRes.json();
        if (Array.isArray(ownersData) && ownersData.length > 0) {
          ownerWaRaw = ownersData.map(n => String(n).trim()).filter(Boolean).slice(0, 5).join(',');
          ownerWaSource = 'firebase_array';
          console.log('[EOD-REPORT] Owners from Firebase (array):', ownersData.length, 'numbers');
        } else if (typeof ownersData === 'string' && ownersData.trim()) {
          ownerWaRaw = ownersData.trim();
          ownerWaSource = 'firebase_string';
          console.log('[EOD-REPORT] Owner from Firebase (string)');
        }
      }
    } catch (e) {
      console.warn('[EOD-REPORT] Fetch ownerWaNumbers note:', e.message);
    }

    if (!ownerWaRaw) {
      ownerWaRaw = String(env.OWNER_WA_NUMBER || '').trim();
      ownerWaSource = 'env_var';
      console.log('[EOD-REPORT] Owner from env var (fallback)');
    }

    const ownerWaList = ownerWaRaw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
    const ownerWa = ownerWaList.join(',');

    console.log('[EOD-REPORT] Final owners:', ownerWaList.length, 'recipients from', ownerWaSource);

    if (!ownerWa) {
      logPayload.status = 'failed_no_owner';
      await fetch(`${dbUrl}/notifications_log/${logKey}.json${auth}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logPayload)
      }).catch(() => {});
      return jsonResponse({ success: false, error: 'Tidak ada OWNER_WA_NUMBER di Firebase maupun env var' }, 500);
    }

    // Prefix R&D/Production
    const prefix = String(env.EOD_HEADER_PREFIX || '');
    const finalMessage = prefix ? (prefix + '\n' + reportText) : reportText;

    if (provider === 'fonnte') {
      const token = String(env.WA_FONNTE_TOKEN || '').trim();
      if (!token) {
        logPayload.status = 'failed_no_token';
        await fetch(`${dbUrl}/notifications_log/${logKey}.json${auth}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logPayload)
        }).catch(() => {});
        return jsonResponse({ success: false, error: 'WA_FONNTE_TOKEN belum diset di environment variable' }, 500);
      }

      try {
        const form = new URLSearchParams();
        form.append('target', ownerWa);
        form.append('message', finalMessage);
        form.append('countryCode', '62');

        const fRes = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: form.toString()
        });

        const fJson = await fRes.json().catch(() => ({}));
        logPayload.waResult = fJson;
        logPayload.status = fRes.ok ? 'sent' : 'failed_http';

        await fetch(`${dbUrl}/notifications_log/${logKey}.json${auth}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logPayload)
        }).catch(() => {});

        return jsonResponse({
          success: fRes.ok,
          mode: 'live',
          provider: 'fonnte',
          message: fRes.ok ? 'Laporan terkirim ke WA owner.' : 'Gagal kirim via Fonnte.',
          waResult: fJson,
          logKey
        }, fRes.ok ? 200 : 502);
      } catch (err) {
        logPayload.status = 'failed_exception';
        logPayload.waResult = { error: err.message };
        await fetch(`${dbUrl}/notifications_log/${logKey}.json${auth}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logPayload)
        }).catch(() => {});
        return jsonResponse({ success: false, error: 'Fonnte error: ' + err.message }, 500);
      }
    }

    return jsonResponse({ success: false, error: `Provider '${provider}' belum didukung` }, 400);
  }

  return jsonResponse({ success: false, error: `Mode '${mode}' tidak valid. Gunakan 'test' atau 'live'.` }, 400);
}
