import re

path = 'public/kasir-app.js'
with open(path, 'r') as f:
    content = f.read()

replacements = [
    # customKasirSubtitle init (x2)
    ("customKasirSubtitle: 'Dapur Kuliner Viral',", "customKasirSubtitle: '',"),
    # splashKasirSubtitle init
    ("splashKasirSubtitle: 'Digital Culinary',", "splashKasirSubtitle: '',"),
    # brandName init
    ("brandName: 'Dapur Kuliner Viral & Catering Rumahan',", "brandName: '',"),
    # qrisMerchantName init
    ("qrisMerchantName: 'Dapur Kuliner Viral',", "qrisMerchantName: '',"),
    # splashKasirSubtitle fallback
    ("this.splashKasirSubtitle = this.customKasirSubtitle || 'Digital Culinary';", "this.splashKasirSubtitle = this.customKasirSubtitle || '';"),
    # customKasirTitle fallback (x4)
    ("this.customKasirTitle || 'Dapur Kuliner Viral'", "this.customKasirTitle || ''"),
    # brand fallback (const brand)
    (": 'Dapur Kuliner Viral';", ": '';"),
    # siteInfo.brandName fallback
    ("this.siteInfo.brandName || 'Dapur Kuliner Viral'", "this.siteInfo.brandName || ''"),
    # customKasirTitle uppercase fallback (x3)
    ("this.customKasirTitle || 'DAPUR KULINER VIRAL'", "this.customKasirTitle || ''"),
    # doc.text uppercase fallback (x2)
    ("doc.text('DAPUR KULINER VIRAL',", "doc.text('',"),
    # STRUK TRANSAKSI header
    ("const text = `*DAPUR KULINER VIRAL - STRUK TRANSAKSI*\\n\\n` +",
     "const brand = (this.siteInfo && this.siteInfo.brandName) ? this.siteInfo.brandName : '';\nconst text = `*${brand} - STRUK TRANSAKSI*\\n\\n` +"),
    # Terima kasih message
    ("`Terima kasih telah berbelanja di Dapur Kuliner Viral!`;",
     "`Terima kasih telah berbelanja di ${(this.siteInfo && this.siteInfo.brandName) ? this.siteInfo.brandName : ''}!`;"),
    # confMsg fallback
    ("this.customKasirTitle || 'Dapur Kuliner Viral'", "this.customKasirTitle || ''"),
    # Auto-report
    ("'🤖 Auto-report POS Digital Culinary'", "'🤖 Auto-report POS'"),
    # POS footer backtick
    ("`_POS Digital Culinary_`;", "`_POS_`;"),
    # Comment line 5
    ("* Sistem Kasir Pintar POS - Dapur Kuliner Viral & Catering Rumahan",
     "* Sistem Kasir Pintar POS - [Nama Toko] & Catering Rumahan"),
]

for old, new in replacements:
    count = content.count(old)
    content = content.replace(old, new)
    if count > 0:
        print(f'kasir-app.js: "{old[:50]}..." -> {count}')

with open(path, 'w') as f:
    f.write(content)

print('public/kasir-app.js: done')
