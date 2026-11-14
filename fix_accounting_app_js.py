import re

path = 'public/accounting-app.js'
with open(path, 'r') as f:
    content = f.read()

replacements = [
    # splashAkunSubtitle init
    ("splashAkunSubtitle: 'Digital Culinary',", "splashAkunSubtitle: '',"),
    # siteName init
    ("siteName: 'Dapur Kuliner Viral',  // fallback, akan di-load dari site_config/brandName",
     "siteName: '',  // fallback, akan di-load dari site_config/brandName"),
    # brandName init
    ("brandName: 'Dapur Kuliner Viral',", "brandName: '',"),
    # splashAkunSubtitle fallback (x3 - lines 585, 602, 663)
    ("this.splashAkunSubtitle = this.siteName || 'Digital Culinary';", "this.splashAkunSubtitle = this.siteName || '';"),
    # siteName check (x2 - lines 2453, 3116)
    ("if (!this.siteName || this.siteName === 'Dapur Kuliner Viral') {", "if (!this.siteName) {"),
    # String(this.siteName || 'DAPUR KULINER VIRAL') (x4 - lines 2457, 2620, 2965, 3039)
    ("String(this.siteName || 'DAPUR KULINER VIRAL')", "String(this.siteName || '')"),
    # sanitizeText(String(this.siteName || 'DAPUR KULINER VIRAL')) (x2 - lines 2620, 2965)
    ("sanitizeText(String(this.siteName || 'DAPUR KULINER VIRAL'))", "sanitizeText(String(this.siteName || ''))"),
    # Comment line 4
    ("* Dapur Kuliner Viral - Panel Admin & Ownerj.debitName || ('Akun '",
     "* [Nama Toko] - Panel Admin & Ownerj.debitName || ('Akun '"),
]

for old, new in replacements:
    count = content.count(old)
    content = content.replace(old, new)
    if count > 0:
        print(f'accounting-app.js: "{old[:50]}..." -> {count}')

with open(path, 'w') as f:
    f.write(content)

print('public/accounting-app.js: done')
