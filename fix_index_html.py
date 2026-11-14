import re

path = 'public/index.html'
with open(path, 'r') as f:
    content = f.read()

replacements = [
    # Title tag
    ('<title>Dapur Kuliner Viral & Catering Rumahan | Dari Dapur Kami, Viral di Meja Anda</title>',
     '<title><span x-text="siteConfig.brandName || \'\'"></span> & Catering Rumahan | Dari Dapur Kami, Viral di Meja Anda</title>'),
    # Meta author
    ('<meta name="author" content="Dapur Kuliner Viral" />',
     '<meta name="author" content="" />'),
    # og:title
    ('<meta property="og:title" content="Dapur Kuliner Viral & Catering Rumahan" />',
     '<meta property="og:title" content="" />'),
    # JSON-LD name
    ('"name": "Dapur Kuliner Viral & Catering",',
     '"name": "",'),
    # Fallback brandName in cached config
    ("brandName: String(cfg.brandName || 'DIGITAL CULINARY').trim(),",
     "brandName: String(cfg.brandName || '').trim(),"),
    # Fallback brandName default return
    ("return { brandName: 'DIGITAL CULINARY', logoBgColor: '#ea580c', logoImage: '' };",
     "return { brandName: '', logoBgColor: '#ea580c', logoImage: '' };"),
    # Static HTML title
    ('''    <h1 id="splashTitleStatic"
        style="font-family:'Plus Jakarta Sans',sans-serif; font-weight:900; color:#fff; font-size:1.75rem; letter-spacing:-0.025em; text-transform:uppercase; text-align:center; padding:0 24px; margin:0;">
      DIGITAL CULINARY
    </h1>''',
     '''    <h1 id="splashTitleStatic"
        style="font-family:'Plus Jakarta Sans',sans-serif; font-weight:900; color:#fff; font-size:1.75rem; letter-spacing:-0.025em; text-transform:uppercase; text-align:center; padding:0 24px; margin:0;"
        x-text="splashBrandName.toUpperCase() || 'NAMA TOKO'">
    </h1>'''),
    # splashBrandName init
    ("splashBrandName: 'DIGITAL CULINARY',", "splashBrandName: '',"),
    # siteConfig.brandName init (WRONG name - says Dapur Kuliner Viral)
    ("brandName: 'DAPUR KULINER VIRAL',", "brandName: '',"),
    # x-text fallback qrisMerchantName
    ("x-text=\"siteConfig.paymentConfig.qrisMerchantName || 'DAPUR KULINER VIRAL - QRIS RESMI'\"",
     'x-text="siteConfig.paymentConfig.qrisMerchantName || \'\'"'),
    # qrisMerchantName init
    ("qrisMerchantName: 'DAPUR KULINER VIRAL - QRIS RESMI',", "qrisMerchantName: '',"),
    # bankAccountHolder init
    ("bankAccountHolder: 'DAPUR KULINER VIRAL',", "bankAccountHolder: '',"),
    # brandWords split fallback (x2)
    ("(this.siteConfig.brandName || 'DAPUR KULINER VIRAL').trim().split(/\\s+/)", "(this.siteConfig.brandName || '').trim().split(/\\s+/)"),
    # firebase-config.js comment
    ("// Di-generate otomatis dari Panel Admin Dapur Kuliner Viral", "// Di-generate otomatis dari Panel Admin"),
    # brandNameRaw fallback
    ("String(this.siteConfig.brandName || \"Dapur Kuliner Viral\").trim()", "String(this.siteConfig.brandName || \"\").trim()"),
    # brandName fallback toUpperCase
    ("String(this.siteConfig.brandName || \"DAPUR KULINER VIRAL\").toUpperCase()", "String(this.siteConfig.brandName || \"\").toUpperCase()"),
    # doc.text fallback
    ("doc.text(this.siteConfig.brandName || \"DAPUR KULINER VIRAL\", 105, 28, { align: \"center\" });", "doc.text(this.siteConfig.brandName || \"\", 105, 28, { align: \"center\" });"),
    # x-text fallback qrisMerchantName (line 1775)
    ("x-text=\"siteConfig.paymentConfig.qrisMerchantName || 'DAPUR KULINER VIRAL - QRIS RESMI'\"",
     'x-text="siteConfig.paymentConfig.qrisMerchantName || \'\'"'),
    # Hardcoded text line 2404 equivalent
    ('Silakan pilih pintu masuk portal sesuai peran operasional Anda di <span class="font-bold text-stone-700">Dapur Kuliner Viral</span>.',
     'Silakan pilih pintu masuk portal sesuai peran operasional Anda di <span class="font-bold text-stone-700" x-text="siteConfig.brandName || \'\'"></span>.'),
    # Placeholder qrisMerchantName
    ('placeholder="Contoh: DAPUR KULINER VIRAL"', 'placeholder="Contoh: Nama Toko"'),
    # x-text fallback qrisMerchantName (line 4117 equivalent)
    ("x-text=\"siteConfig.paymentConfig.qrisMerchantName || 'DAPUR KULINER VIRAL'\"",
     'x-text="siteConfig.paymentConfig.qrisMerchantName || \'\'"'),
    # Placeholder bankAccountHolder
    ('placeholder="Contoh: DAPUR KULINER VIRAL"', 'placeholder="Contoh: Nama Pemilik Rekening"'),
    # Hardcoded text about Cloudflare Pages
    ('Langkah demi langkah menyebarkan website Dapur Kuliner Viral ke Cloudflare Pages dengan CDN gratis global, SSL otomatis, dan serverless functions.',
     'Langkah demi langkah menyebarkan website ke Cloudflare Pages dengan CDN gratis global, SSL otomatis, dan serverless functions.'),
    # Placeholder
    ('placeholder="Dapur Kuliner Viral" ', 'placeholder="Nama Toko" '),
    # x-text fallback kasirSubtitle
    ("x-text=\"siteConfig.kasirSubtitle || 'Dapur Kuliner Viral'\"",
     'x-text="siteConfig.kasirSubtitle || \'\'"'),
    # client text
    ('client: "Admin CMS Dapur Kuliner Viral"', 'client: "Admin CMS"'),
    # kasirSubtitle init
    ("kasirSubtitle: 'Dapur Kuliner Viral',", "kasirSubtitle: '',"),
]

for old, new in replacements:
    count = content.count(old)
    content = content.replace(old, new)
    if count > 0:
        print(f'index.html: "{old[:50]}..." -> {count}')

with open(path, 'w') as f:
    f.write(content)

print('public/index.html: done')
