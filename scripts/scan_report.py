#!/usr/bin/env python3
"""Scenario + support/resistance report for the screened Tadawul stocks.

Levels come from the same data the charts use:
  fib  = retracement of the last significant leg (dev 3%)
  piv  = recent swing highs/lows
  ma   = SMA20 / SMA50 (dynamic levels)
Scenario: the up path (nearest resistance above) and the down path (nearest
support below) with the invalidation level. Study only — not advice.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scan_waves import fetch, merge, zigzag, ma, hand_count, ar_text  # noqa: E402

RES = json.load(open('/tmp/screen_up3.json'))[:16]
SRC = '/Users/mishalajmi/Documents/Default Project/OpenStock/lib/tadawul-companies.ts'
import re
src = open(SRC).read()
names_en = {s + '.SR': n for s, n, a in re.findall(r"symbol: '(\d+)\.SR', name: '([^']+)'(?:, ar: '([^']+)')?", src)}
raw = {s + '.SR': (a or n) for s, n, a in re.findall(r"symbol: '(\d+)\.SR', name: '([^']+)'(?:, ar: '([^']+)')?", src)}
raw.update({'2083.SR': 'الطاقة والمياه للصافي والينبع', '4142.SR': 'مجموعة الرياض للأسلاك'})


def uniq(vals, nd=2):
    out = []
    for v in sorted(vals):
        if not out or abs(v - out[-1]) > 0.015:
            out.append(round(v, nd))
    return out


def build(sym):
    rows = fetch(sym)
    dates = [x[0] for x in rows]
    H = [x[2] for x in rows]; L = [x[3] for x in rows]; C = [x[4] for x in rows]; n = len(rows)
    close = C[-1]
    rc = hand_count(H, L, C, n)
    win_start = rc['win_start'] if rc else max(0, n - 90)
    mp = merge(zigzag(H, L, C, 3))
    win = [p for p in mp if p[0] >= win_start]
    m20 = ma(C, 20); m50 = ma(C, 50)
    ma20 = m20[-1] if m20[-1] else None
    ma50 = m50[-1] if m50[-1] else None

    # fib of the last leg
    fib = {}
    leg = None
    if len(win) >= 2:
        pa, pb = win[-2], win[-1]
        hi, lo = max(pa[1], pb[1]), min(pa[1], pb[1])
        rng = hi - lo
        up = pb[1] > pa[1]
        if rng > 0:
            leg = (pa[1], pb[1])
            for r, lab in ((0.0, '0%'), (0.236, '23.6%'), (0.382, '38.2%'), (0.5, '50%'),
                           (0.618, '61.8%'), (0.786, '78.6%'), (1.0, '100%')):
                fib[lab] = (lo + rng * r) if up else (hi - rng * r)
    fibv = list(fib.values())

    lows = [p[1] for p in win if p[2] == 'low']
    highs = [p[1] for p in win if p[2] == 'high']
    mas = [v for v in (ma20, ma50) if v]

    sup_cands = [v for v in (fibv + lows + mas) if v < close]
    res_cands = [v for v in (fibv + highs + mas) if v > close]
    supports = uniq(sup_cands)[-3:][::-1]          # nearest first
    resists = uniq(res_cands)[:3]

    # scenario: up toward the nearest resistance, down toward the nearest support
    up_t = resists[0] if resists else round(close * 1.05, 2)
    dn_t = supports[0] if supports else round(close * 0.95, 2)
    up_t2 = resists[1] if len(resists) > 1 else None
    dn_t2 = supports[1] if len(supports) > 1 else None

    # invalidation: below the last swing low (up scenario) / above the last swing high (down)
    inval_up = min(lows) if lows else round(close * 0.95, 2)
    inval_dn = max(highs) if highs else round(close * 1.05, 2)

    prev = rc['prev'] if rc else None
    live = rc['live'] if rc else None
    desc = []
    if prev:
        if prev['kind'] == 'impulse':
            d = 'هابطة' if prev['pts'][1][1] < prev['pts'][0][1] else 'صاعدة'
            desc.append(f"دفعة {d} 1-5 من {prev['pts'][0][1]:.2f} إلى {prev['pts'][-1][1]:.2f}")
        else:
            desc.append(f"تصحيح A-B-C من {prev['pts'][0][1]:.2f} إلى {prev['pts'][-1][1]:.2f}")
    if live:
        desc.append(' + ' + ' '.join(live['labels']))
    flags = rc.get('flags', []) if rc else []
    return dict(sym=sym, name=raw.get(sym, names_en.get(sym, '')), close=round(close, 2),
                chg=r, supports=supports, resists=resists, up=up_t, up2=up_t2,
                dn=dn_t, dn2=dn_t2, inval_up=inval_up, inval_dn=inval_dn,
                desc=' '.join(desc), flags=flags, ma20=ma20, ma50=ma50,
                last=dates[-1], fib=fib)


if __name__ == '__main__':
    out = []
    for r in RES:
        sym = r['sym']
        d = build(sym)
        d['chg'] = r['p1']; d['chg2'] = r['p2']
        out.append(d)
    json.dump([{k: v for k, v in d.items() if k != 'fib'} for d in out],
              open('/tmp/scenario_report.json', 'w'), ensure_ascii=False)

    lines = []
    lines.append('السيناريوهات + الدعم والمقاومة — 19 أكتوبر 2026 (السوق مغلق، بيانات ياهو متأخرة 15-20 دقيقة)')
    lines.append('=' * 96)
    for d in out:
        lines.append('')
        lines.append(f"{d['name']} ({d['sym']})  |  الإغلاق {d['close']}  |  اليوم {d['chg']:+.2f}%  |  أمس {d['chg2']:+.2f}%")
        lines.append(f"  الترقيم: {d['desc']}")
        if d['flags']:
            lines.append(f"  ⚠ قراءة ذاتية: {' | '.join(d['flags'])}")
        lines.append(f"  الدعم    : {' , '.join(f'{v:.2f}' for v in d['supports'])}"
                     + (f"   (SMA20 {d['ma20']:.2f} / SMA50 {d['ma50']:.2f})" if d['ma20'] and d['ma50'] else ''))
        lines.append(f"  المقاومة : {' , '.join(f'{v:.2f}' for v in d['resists'])}")
        up2 = f" ثم {d['up2']:.2f}" if d['up2'] else ''
        dn2 = f" ثم {d['dn2']:.2f}" if d['dn2'] else ''
        lines.append(f"  السيناريو الصاعد: حتى {d['up']:.2f}{up2}  — الإبطال تحت {d['inval_up']:.2f}")
        lines.append(f"  السيناريو الهابط: حتى {d['dn']:.2f}{dn2}  — الإبطال فوق {d['inval_dn']:.2f}")
    text = '\n'.join(lines)
    open('/Users/mishalajmi/Desktop/التحليل/SCAN-10-19/السيناريوهات.txt', 'w').write(text)
    print(text)
