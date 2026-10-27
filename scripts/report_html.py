#!/usr/bin/env python3
"""Render the scenario/support-resistance report as an HTML page for the local server."""
import json, os

OUT = '/Users/mishalajmi/Desktop/التحليل/SCAN-10-19'
data = json.load(open('/tmp/scenario_report.json'))

rows = []
for d in data:
    fl = ('<div class="flag">' + ' | '.join(d['flags']) + '</div>') if d.get('flags') else ''
    up2 = (' ثم %.2f' % d['up2']) if d.get('up2') else ''
    dn2 = (' ثم %.2f' % d['dn2']) if d.get('dn2') else ''
    rows.append(
        '<tr>'
        '<td class="nm"><b>%s</b><span>%s</span></td>'
        '<td class="num">%.2f</td>'
        '<td class="num up">%+.2f%%</td>'
        '<td class="cnt">%s%s</td>'
        '<td class="lv">%s</td>'
        '<td class="lv">%s</td>'
        '<td class="sc">صاعد: %.2f%s (إبطال تحت %.2f)<br>هابط: %.2f%s (إبطال فوق %.2f)</td>'
        '</tr>' % (
            d['name'], d['sym'], d['close'], d['chg'], d['desc'], fl,
            ', '.join('%.2f' % v for v in d['supports']),
            ', '.join('%.2f' % v for v in d['resists']),
            d['up'], up2, d['inval_up'], d['dn'], dn2, d['inval_dn'],
        ))

CSS = """
 :root{color-scheme:dark}
 body{margin:0;background:#0B0E11;color:#F0F3FA;font-family:-apple-system,"SF Arabic","Geeza Pro",system-ui,sans-serif}
 header{padding:20px 26px 12px;border-bottom:1px solid #1E222D}
 h1{font-size:19px;margin:0 0 6px} p.sub{color:#B2B5BE;font-size:13px;margin:0;line-height:1.7}
 .wrap{padding:16px 26px 40px;overflow-x:auto}
 table{width:100%;border-collapse:collapse;font-size:12.5px}
 th{color:#B2B5BE;font-weight:600;text-align:right;padding:9px 10px;border-bottom:1px solid #1E222D;white-space:nowrap}
 td{padding:9px 10px;border-bottom:1px solid #161A22;vertical-align:top;line-height:1.6}
 td.nm b{font-size:13.5px} td.nm span{display:block;color:#787B86;font-size:11px}
 td.num{white-space:nowrap;font-variant-numeric:tabular-nums} td.up{color:#26A69A}
 td.cnt{color:#FFB74D;max-width:330px} td.lv{color:#9CDCFE;white-space:nowrap}
 td.sc{color:#B2B5BE;max-width:270px}
 .flag{color:#EF5350;font-size:11px;margin-top:3px}
 a{color:#2196F3}
"""

html = ('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<title>السيناريوهات والدعم والمقاومة — 19 أكتوبر 2026</title><style>' + CSS +
        '</style></head><body><header>'
        '<h1>السيناريوهات + الدعم والمقاومة</h1>'
        '<p class="sub">16 سهماً من ماسح 19 أكتوبر 2026 (إغلاق اليوم &gt; أمس &gt; قبل أمس) · '
        'بيانات ياهو متأخرة 15-20 دقيقة · للدراسة فقط وليس توصية · المستويات من فيبوناتشي آخر حركة '
        '+ المحاور الأخيرة + SMA20/50 · <a href="index.html">رجوع لمعرض الشارتات</a></p></header>'
        '<div class="wrap"><table>'
        '<tr><th>الشركة</th><th>الإغلاق</th><th>اليوم</th><th>الترقيم</th>'
        '<th>الدعم</th><th>المقاومة</th><th>السيناريو</th></tr>' +
        '\n'.join(rows) + '</table></div></body></html>')

open(os.path.join(OUT, 'السيناريوهات.html'), 'w').write(html)
print('wrote', os.path.join(OUT, 'السيناريوهات.html'), len(data), 'rows')
