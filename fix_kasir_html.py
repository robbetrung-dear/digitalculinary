import re

path = 'public/kasir.html'
with open(path, 'r') as f:
    content = f.read()

replacements = [
    # Title tag
    ("<title>Kasir Pintar - Dapur Kuliner Viral</title>",
     "<title>Kasir Pintar - <span x-text=\"siteInfo.brandName || ''\"></span></title>"),
    # subtitle fallback
    ("x-text=\"customKasirSubtitle || 'Dapur Kuliner Viral'\"", "x-text=\"customKasirSubtitle || ''\""),
    # h4 brand
    ('''<h4 class="font-extrabold text-stone-900 text-lg uppercase tracking-tight" x-text="(siteInfo && siteInfo.brandName ? siteInfo.brandName : (customKasirSubtitle || 'Dapur Kuliner Viral')).toUpperCase()">DAPUR KULINER VIRAL</h4>''',
     '''<h4 class="font-extrabold text-stone-900 text-lg uppercase tracking-tight" x-text="(siteInfo && siteInfo.brandName ? siteInfo.brandName : (customKasirSubtitle || '')).toUpperCase()"></h4>'''),
    # qrisMerchantName fallback
    ("x-text=\"paymentConfig.qrisMerchantName || 'Dapur Kuliner Viral'\"", "x-text=\"paymentConfig.qrisMerchantName || ''\""),
    # h5 brand
    ('''<h5 class="font-black text-sm uppercase" x-text="(siteInfo && siteInfo.brandName ? siteInfo.brandName : 'Dapur Kuliner Viral').toUpperCase()">DAPUR KULINER VIRAL</h5>''',
     '''<h5 class="font-black text-sm uppercase" x-text="(siteInfo && siteInfo.brandName ? siteInfo.brandName : '').toUpperCase()"></h5>'''),
    # thank you message
    ("x-text=\"'Terima kasih sudah berbelanja di ' + ((siteInfo && siteInfo.brandName) ? siteInfo.brandName : 'Dapur Kuliner Viral') + ' & selamat menikmati.'\"",
     "x-text=\"'Terima kasih sudah berbelanja di ' + ((siteInfo && siteInfo.brandName) ? siteInfo.brandName : '') + ' & selamat menikmati.'\""),
    # customKasirTitle fallback (line 7541)
    ("x-text=\"customKasirTitle || 'DAPUR KULINER VIRAL'\"", "x-text=\"customKasirTitle || ''\""),
]

for old, new in replacements:
    count = content.count(old)
    content = content.replace(old, new)
    if count > 0:
        print(f'kasir.html: "{old[:50]}..." -> {count}')

with open(path, 'w') as f:
    f.write(content)

print('public/kasir.html: done')
