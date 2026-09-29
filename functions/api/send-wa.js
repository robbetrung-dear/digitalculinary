/**
 * functions/api/send-wa.js
 * Cloudflare Pages Function — WhatsApp Gateway Proxy & Notification Logger
 */

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }

  const dbUrl = (env.FIREBASE_DATABASE_URL || "https://digitalculinary-app-default-rtdb.asia-southeast1.firebasedatabase.app").replace(/\/$/, "");
  const apiKey = env.FIREBASE_API_KEY || "";
  const authParam = apiKey ? `?auth=${encodeURIComponent(apiKey)}` : "";

  try {
    const body = await request.json().catch(() => ({}));
    let phone = String(body.phone || '').trim().replace(/[^0-9]/g, '');
    const message = String(body.message || '').trim();
    const template = body.template || 'custom';

    if (!phone || !message) {
      return new Response(JSON.stringify({ success: false, error: 'phone dan message wajib diisi' }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // Normalisasi nomor telepon: jika mulai '08' -> ganti jadi '628'
    if (phone.startsWith('08')) {
      phone = '62' + phone.slice(1);
    }

    // Ambil konfigurasi WhatsApp dari site_config
    let waConfig = { waEnabled: false, waGatewayUrl: '', waSenderNumber: '' };
    try {
      const cfgRes = await fetch(`${dbUrl}/site_config.json${authParam}`);
      const cfg = await cfgRes.json();
      if (cfg) {
        waConfig.waEnabled = Boolean(cfg.waEnabled);
        waConfig.waGatewayUrl = (cfg.waGatewayUrl || '').replace(/\/$/, '');
        waConfig.waSenderNumber = cfg.waSenderNumber || '';
      }
    } catch (e) {
      // fallback jika gagal fetch config
    }

    let gatewayResult = null;
    let sendStatus = 'simulated';
    const messageId = `wa_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (waConfig.waEnabled && waConfig.waGatewayUrl) {
      try {
        // Kirim request ke HTTP Gateway (WAHA / Baileys endpoint)
        const gwRes = await fetch(`${waConfig.waGatewayUrl}/api/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone.includes('@') ? phone : `${phone}@c.us`,
            message,
            chatId: phone.includes('@') ? phone : `${phone}@c.us`,
            text: message
          })
        });
        gatewayResult = await gwRes.json().catch(() => null);
        sendStatus = gwRes.ok ? 'sent' : 'failed';
      } catch (gwErr) {
        gatewayResult = { error: gwErr.message };
        sendStatus = 'gateway_error';
      }
    } else {
      // Gateway belum dikonfigurasi / dinonaktifkan -> dicatat sebagai queued/ready
      sendStatus = 'ready_for_web';
    }

    // Catat ke /notifications_log
    const logId = `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const logPayload = {
      id: logId,
      at: new Date().toISOString(),
      phone,
      template,
      messagePreview: message.slice(0, 100),
      status: sendStatus,
      messageId,
      gatewayResponse: gatewayResult
    };

    await fetch(`${dbUrl}/notifications_log/${encodeURIComponent(logId)}.json${authParam}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logPayload)
    }).catch(() => {});

    return new Response(JSON.stringify({
      success: true,
      messageId,
      status: sendStatus,
      phone,
      waLink: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      gatewayConfigured: Boolean(waConfig.waEnabled && waConfig.waGatewayUrl)
    }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
}
