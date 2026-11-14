import re

# Fix accounting.html
path = 'public/accounting.html'
with open(path, 'r') as f:
    content = f.read()

replacements = [
    ("<title>Sistem Akuntansi & Keuangan - Digital Culinary</title>",
     "<title>Sistem Akuntansi & Keuangan - <span x-text=\"siteName || ''\"></span></title>"),
    ('<span class="..." x-text="siteName">Dapur Kuliner Viral</span>',
     '<span class="..." x-text="siteName || \'\'"></span>'),
    ('<h4 class="..." x-text="siteName.toUpperCase()">DAPUR KULINER VIRAL</h4>',
     '<h4 class="..." x-text="(siteName || \'\').toUpperCase()"></h4>'),
]

for old, new in replacements:
    count = content.count(old)
    content = content.replace(old, new)
    if count > 0:
        print(f'accounting.html: "{old[:50]}..." -> {count}')

with open(path, 'w') as f:
    f.write(content)

print('public/accounting.html: done')

# Fix login-gate.html
path2 = 'public/login-gate.html'
with open(path2, 'r') as f:
    content2 = f.read()

replacements2 = [
    ("<title>Pilih Akses - Kasir Pintar & Panel Admin | Dapur Kuliner Viral</title>",
     "<title>Pilih Akses - Kasir Pintar & Panel Admin | <span x-text=\"siteName || ''\"></span></title>"),
    ('<span class="font-bold text-stone-700">Dapur Kuliner Viral</span>',
     '<span class="font-bold text-stone-700" x-text="siteName || \'\'"></span>'),
    ("Hubungi Admin Dapur Kuliner untuk reset kode shift.",
     "Hubungi Admin untuk reset kode shift."),
]

for old, new in replacements2:
    count = content2.count(old)
    content2 = content2.replace(old, new)
    if count > 0:
        print(f'login-gate.html: "{old[:50]}..." -> {count}')

with open(path2, 'w') as f:
    f.write(content2)

print('public/login-gate.html: done')

# Fix lib/rto-core.js
path3 = 'lib/rto-core.js'
with open(path3, 'r') as f:
    content3 = f.read()

old3 = 'const brand = outlet.brandName || "Dapur Kuliner Viral";'
new3 = 'const brand = outlet.brandName || "";'
count3 = content3.count(old3)
content3 = content3.replace(old3, new3)
print(f'lib/rto-core.js: "{old3[:50]}..." -> {count3}')

with open(path3, 'w') as f:
    f.write(content3)

print('lib/rto-core.js: done')

# Fix functions/report-pl.js
path4 = 'functions/report-pl.js'
with open(path4, 'r') as f:
    content4 = f.read()

old4 = 'name: "DAPUR KULINER VIRAL",'
new4 = 'name: "",'
count4 = content4.count(old4)
content4 = content4.replace(old4, new4)
print(f'report-pl.js name: {count4}')

old4b = 'addText(company.name || "DAPUR KULINER VIRAL", marginX + 16, curY - 18, 14, true, [1, 1, 1]);'
new4b = 'addText(company.name || "", marginX + 16, curY - 18, 14, true, [1, 1, 1]);'
count4b = content4.count(old4b)
content4 = content4.replace(old4b, new4b)
print(f'report-pl.js addText: {count4b}')

with open(path4, 'w') as f:
    f.write(content4)

print('functions/report-pl.js: done')

# Fix functions/receipt.js
path5 = 'functions/receipt.js'
with open(path5, 'r') as f:
    content5 = f.read()

old5 = 'name: "DAPUR KULINER VIRAL",'
new5 = 'name: "",'
count5 = content5.count(old5)
content5 = content5.replace(old5, new5)
print(f'receipt.js name: {count5}')

old5b = 'addCenterText(company.name || "DAPUR KULINER VIRAL", 12, true);'
new5b = 'addCenterText(company.name || "", 12, true);'
count5b = content5.count(old5b)
content5 = content5.replace(old5b, new5b)
print(f'receipt.js addCenterText: {count5b}')

with open(path5, 'w') as f:
    f.write(content5)

print('functions/receipt.js: done')

print('\n=== Semua perubahan digitalculinary selesai ===')
