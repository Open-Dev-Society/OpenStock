#!/usr/bin/env python3
"""TradingView-style charts for the screened Tadawul stocks.

Layout (dark theme, like the app / TradingView):
  panel 1  candles + SMA20 + SMA50 + Elliott labels (orange) + Fib retracement (left %/price)
  panel 2  volume
  panel 3  RSI(14) with overbought/oversold bands and a right-side value tag
Data: Yahoo daily 1y (delayed ~15-20 min). Scenarios are hypothetical (?).
"""
import json, os, sys, datetime, urllib.request
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import matplotlib.patheffects as pe

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scan_waves import (fetch, analyze, ar_text, ma, rsi, merge, zigzag,  # noqa: E402
                        hand_count, market_open_now, C_IMP, C_ABC, C_NIM, C_NAB, C_ASK)


def fetch_vol(sym):
    """Same as scan_waves.fetch but keeps volume as a 6th field."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=1y"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    d = json.load(urllib.request.urlopen(req, timeout=25))
    r = d['chart']['result'][0]
    q = r['indicators']['quote'][0]
    rows = []
    for i, t in enumerate(r['timestamp']):
        o, h, l, c, v = q['open'][i], q['high'][i], q['low'][i], q['close'][i], q['volume'][i]
        if None in (o, h, l, c):
            continue
        dt = datetime.datetime.fromtimestamp(t, datetime.timezone.utc) + datetime.timedelta(hours=3)
        rows.append((dt.strftime('%Y-%m-%d'), o, h, l, c, v or 0))
    return rows

ENGINE = {}
MARKET_OPEN = False
BG = '#0B0E11'
PANEL = '#0B0E11'
GRID = '#1E222D'
TXT = '#F0F3FA'
MUTED = '#B2B5BE'
UP = '#26A69A'
DOWN = '#EF5350'
SMA20 = '#2196F3'
SMA50 = '#AB47BC'
ELL = '#C62828'   # bright red — the reference chart's colour
FIB = '#787B86'
BLUE = '#2962FF'


def style_axes(ax, right=True):
    ax.set_facecolor(PANEL)
    for s in ax.spines.values():
        s.set_color('#2A2E39')
    ax.grid(True, color=GRID, lw=0.6, alpha=0.9)
    ax.set_axisbelow(True)
    if right:
        ax.yaxis.tick_right()
        ax.yaxis.set_label_position('right')
    ax.tick_params(colors=MUTED, labelsize=8, length=0)


def tag_right(ax, y, text, color, fontsize=8):
    """TradingView-like last-value tag on the right price scale."""
    ax.annotate(text, xy=(1.0, y), xycoords=('axes fraction', 'data'),
                xytext=(4, 0), textcoords='offset points',
                va='center', ha='left', color='white', fontsize=fontsize, zorder=20,
                bbox=dict(facecolor=color, edgecolor='none', boxstyle='square,pad=0.25'),
                clip_on=False)


def wave_label(ax, x, y, text, color=ELL, size=10, above=True):
    ax.text(x, y, text, color=color, fontsize=size, ha='center', va='bottom' if above else 'top',
            zorder=12, path_effects=[pe.withStroke(linewidth=2.4, foreground='#0B0E11')])


def draw_structure(ax, pts, label_pts, labs, alpha=1.0, lw=1.1, ls='-', H=None, L=None, edge=None,
                   placed=None):
    """Orange Elliott polyline + plain orange labels (TradingView style).
    label_pts = where the letters/numbers sit (end of each wave)."""
    rng = (max(H) - min(L)) if (H and L) else 0
    off = rng * 0.012 if rng else 0
    ax.plot([p[0] for p in pts], [p[1] for p in pts], color=ELL, lw=lw, ls=ls, alpha=alpha, zorder=8)
    if placed is None:
        placed = []
    for (ix, px, typ), lab in zip(label_pts, labs):
        tx = ix
        if edge is not None and ix > edge - 3:      # keep clear of the last-price tag
            tx = ix - 2.6
        ty = px + (off if typ == 'low' else -off)
        for _ in range(8):                          # avoid overlapping badges
            if not any(abs(tx - qx) < 1.9 and abs(ty - qy) < rng * 0.04 for qx, qy in placed):
                break
            tx += 0.9 if tx >= ix else -0.9
        placed.append((tx, ty))
        wave_label(ax, tx, ty, lab, above=(typ == 'low'))


def _spread_indices(n, k):
    """k indices spread across n (keeps the first and last)."""
    if k >= n:
        return list(range(n))
    if k == 1:
        return [0]
    return [round(i * (n - 1) / (k - 1)) for i in range(k)]


def build(sym, raw_name, rows, a, outpath, mini=False):
    dates = a['dates']; O = a['O']; H = a['H']; L = a['L']; C = a['C']; n = a['n']
    imp, abc, nxt, pivs, tail = a['imp'], a['abc'], a['nxt'], a['pivs'], a['tail']
    close = C[-1]
    name = ar_text(raw_name)          # shape + RTL order applied exactly once
    rc = hand_count(H, L, C, n) or dict(prev=None, live=None, win_start=max(0, n - 90),
                                        dev=3, flags=[])
    win_start = rc['win_start']

    if mini:
        fig = plt.figure(figsize=(4.6, 3.4), facecolor=BG)
        gs = fig.add_gridspec(3, 1, height_ratios=[3.0, 0.45, 1.0], hspace=0.08)
    else:
        fig = plt.figure(figsize=(14, 8.4), facecolor=BG)
        gs = fig.add_gridspec(3, 1, height_ratios=[3.1, 0.5, 1.05], hspace=0.07)
    ax = fig.add_subplot(gs[0])
    axv = fig.add_subplot(gs[1], sharex=ax)
    axr = fig.add_subplot(gs[2], sharex=ax)
    for a_ in (ax, axv, axr):
        style_axes(a_)

    # candles
    for i in range(n):
        col = UP if C[i] >= O[i] else DOWN
        ax.plot([i, i], [L[i], H[i]], color=col, lw=0.9, zorder=3)
        b = min(O[i], C[i])
        ax.add_patch(Rectangle((i - 0.32, b), 0.64, abs(C[i] - O[i]) or 0.01,
                               facecolor=col, edgecolor=col, lw=0, zorder=4))

    # SMA20 / SMA50
    m20 = ma(C, 20); m50 = ma(C, 50)
    ax.plot([i for i in range(win_start, n) if m20[i]], [m20[i] for i in range(win_start, n) if m20[i]],
            color=SMA20, lw=1.3, zorder=5)
    ax.plot([i for i in range(win_start, n) if m50[i]], [m50[i] for i in range(win_start, n) if m50[i]],
            color=SMA50, lw=1.3, zorder=5)

    # ---- Elliott structures: last complete count + the live one (focused window) ----
    summary = []
    structs = []
    if rc['prev']:
        p = rc['prev']
        structs.append((p['pts'], p['label_pts'], p['labels'], 1.0, 1.15, '-', p['kind']))
        summary.append(p['kind'])
    if rc['live']:
        p = rc['live']
        structs.append((p['pts'], p['label_pts'], p['labels'], 0.8, 1.0, '-', 'live ' + p['kind']))
        summary.append('live ' + p['kind'])
    placed_labels = []
    for pts, label_pts, labs, alpha, lw, ls, tag in structs:
        draw_structure(ax, pts, label_pts, labs, alpha=alpha, lw=lw, ls=ls, H=H, L=L, edge=n,
                       placed=placed_labels)
    if not structs and pivs:
        lp = pivs[-1]
        ax.plot([lp[0]], [lp[1]], marker='D', ms=5, color=MUTED, zorder=9)
        ax.text(lp[0], lp[1], '?', color=MUTED, fontsize=10, ha='center', va='bottom', zorder=9,
                path_effects=[pe.withStroke(linewidth=2.2, foreground='#0B0E11')])

    # pivots inside the window (for fib + scenarios)
    mp = merge(zigzag(H, L, C, rc['dev'] or 6))
    win_pivs = [p for p in mp if p[0] >= win_start]

    # ---- Fib retracement of the last leg inside the window (labels left) ----
    fib_levels = []
    if len(win_pivs) >= 2:
        pa, pb = win_pivs[-2], win_pivs[-1]
        hi, lo = max(pa[1], pb[1]), min(pa[1], pb[1])
        rng = hi - lo
        if rng > 0:
            up_leg = pb[1] > pa[1]
            start = lo if up_leg else hi
            for rr, lab in ((0.0, '0%'), (0.236, '23.6%'), (0.382, '38.2%'), (0.5, '50%'),
                            (0.618, '61.8%'), (0.786, '78.6%'), (1.0, '100%')):
                price = start + rng * rr if up_leg else start - rng * rr
                ax.axhline(price, color=FIB, ls='--', lw=0.7, alpha=0.75, zorder=2)
                fib_levels.append((price, lab))

    # ---- scenarios (hypothetical) ----
    if len(win_pivs) >= 2:
        pa, pb = win_pivs[-2], win_pivs[-1]
        hi, lo = max(pa[1], pb[1]), min(pa[1], pb[1])
        rng = hi - lo
        if rng > 0:
            if pb[2] == 'low':
                cands = [lo + rng * rr for rr in (0.382, 0.5, 0.618)]
                tgt_up = next((x for x in cands if x > close), hi + rng * 0.272)
                tgt_dn = lo - rng * 0.272 if close <= lo else lo
            else:
                cands = [hi - rng * rr for rr in (0.618, 0.5, 0.382)]
                tgt_up = hi + rng * 0.272 if close >= hi else hi
                tgt_dn = next((x for x in cands if x < close), lo - rng * 0.272)
            if tgt_up > close > tgt_dn:
                ax.plot([n - 1, n + 5, n + 9], [close, close + (tgt_up - close) * 0.5, tgt_up],
                        color='#2E7D32', lw=1.1, ls='--', zorder=7)
                ax.text(n + 9, tgt_up, f' r?{tgt_up:.2f}', color='#66BB6A', fontsize=7.5,
                        ha='left', va='center', zorder=10)
                ax.plot([n - 1, n + 5, n + 9], [close, close - (close - tgt_dn) * 0.5, tgt_dn],
                        color='#C62828', lw=1.1, ls='--', zorder=7)
                ax.text(n + 9, tgt_dn, f' s?{tgt_dn:.2f}', color='#EF5350', fontsize=7.5,
                        ha='left', va='center', zorder=10)

    # last price tag + line
    ax.axhline(close, color=BLUE, ls='--', lw=0.7, alpha=0.45, zorder=1)
    tag_right(ax, close, f'{close:.2f}', BLUE)

    # ---- volume ----
    V = [r[5] if len(r) > 5 else 0 for r in rows]
    cols = [UP if C[i] >= O[i] else DOWN for i in range(n)]
    axv.bar(range(n), V, color=cols, alpha=0.35, width=0.7)
    axv.text(0.004, 0.92, 'Volume', transform=axv.transAxes, color=MUTED, fontsize=8, va='top')
    axv.set_yticks([])
    if V:
        axv.set_ylim(0, max(V) * 1.15)

    # ---- inner (sub) + major degree labels straight from the app engine ----
    eng = ENGINE.get(sym, {})
    for deg, color, size in (('sub', '#C62828', 7.5), ('major', '#7F1D1D', 8.5)):
        for l in eng.get(deg, []):
            if l['index'] >= n or l['index'] < win_start:
                continue
            ax.text(l['index'], l['price'], l['label'], color=color, fontsize=size, ha='center',
                    va='bottom' if l['position'] == 'aboveBar' else 'top', zorder=11,
                    path_effects=[pe.withStroke(linewidth=2.0, foreground='#0B0E11')])

    # ---- RSI(14) ----
    rv = a['rsi']
    xs = [i for i in range(n) if rv[i] is not None]
    ys = [v for v in rv if v is not None]
    axr.axhspan(70, 100, color='#B71C1C', alpha=0.28)
    axr.axhspan(0, 30, color='#00695C', alpha=0.28)
    axr.axhline(70, color=FIB, ls='--', lw=0.8, alpha=0.8)
    axr.axhline(30, color=FIB, ls='--', lw=0.8, alpha=0.8)
    axr.plot(xs, ys, color='#FF9800', lw=1.4, zorder=6)
    axr.text(0.004, 0.95, 'RSI (14)', transform=axr.transAxes, color=MUTED, fontsize=8, va='top')
    axr.set_ylim(0, 100)
    axr.set_yticks([30, 50, 70])
    last_r = next((v for v in reversed(rv) if v is not None), None)
    if last_r is not None:
        tag_right(axr, last_r, f'{last_r:.1f}', '#FF9800')

    # ---- legend (top-right) ----
    items = [('SMA20', SMA20), ('SMA50', SMA50), ('Elliott', ELL), ('Fib retracement', BLUE)]
    x = 0.995
    if mini:
        ax.text(0.995, 1.005, f'{sym} {name}', transform=ax.transAxes, color=TXT, fontsize=8.5,
                ha='right', va='bottom', zorder=15)
    else:
        for label, col in reversed(items):
            ax.text(x, 1.005, label, transform=ax.transAxes, color=col, fontsize=8.5,
                    ha='right', va='bottom', zorder=15)
            x -= 0.075 + 0.009 * len(label)
    # ---- title (top-left) ----
    if not mini:
        live_tag = ' · شمعة جارية' if MARKET_OPEN else ''
        ar_title = ar_text(f"{raw_name} — {'السعر الآن' if MARKET_OPEN else 'الإغلاق'} {close:.2f} ريال{live_tag}")
        ax.text(0.004, 1.005, ar_title, transform=ax.transAxes, color=TXT, fontsize=10.5,
                ha='left', va='bottom', zorder=15)
        head = rc.get('prev')
        if head:
            if head['kind'] == 'impulse':
                d = 'هابطة' if head['pts'][1][1] < head['pts'][0][1] else 'صاعدة'
                cap = f"موجة {d} 1-5 — من {head['pts'][0][1]:.2f} إلى {head['pts'][-1][1]:.2f}"
            else:
                cap = f"تصحيح A-B-C — من {head['pts'][0][1]:.2f} إلى {head['pts'][-1][1]:.2f}"
            ax.text(0.004, 1.055, ar_text(cap), transform=ax.transAxes, color='#FFB74D',
                    fontsize=9.5, ha='left', va='bottom', zorder=15)
            for i, fl in enumerate(rc.get('flags', [])[:2]):
                ax.text(0.004, 0.055 - i * 0.05, ar_text('⚠ ' + fl), transform=ax.transAxes,
                        color='#EF5350', fontsize=8, ha='left', va='bottom', zorder=15,
                        bbox=dict(facecolor='#0B0E11', edgecolor='#EF5350', alpha=0.75,
                                  boxstyle='round,pad=0.25'))

    # price axis: fit ONLY the visible window (candles of the whole year would
    # stretch the axis and squash the fib labels)
    vis = list(range(win_start, n))
    lo = min([L[i] for i in vis] + [v for i in vis for v in (m20[i], m50[i]) if v is not None])
    hi = max([H[i] for i in vis] + [v for i in vis for v in (m20[i], m50[i]) if v is not None])
    pad = max((hi - lo) * 0.06, 0.001)
    ax.set_ylim(lo - pad, hi + pad)

    # x axis — ticks inside the window only; limits are set LAST because
    # set_xticks widens the view while autoscaling is on
    span_bars = max(1, n - win_start)
    step = max(1, span_bars // 8)
    ticks = [t for t in range(win_start, n, step)]
    ax.set_xticks([])
    axv.set_xticks([])
    axr.set_xticks(ticks)
    axr.set_xticklabels([dates[i][5:] for i in ticks], color=MUTED, fontsize=8)
    ax.set_xlim(win_start, n + 10)
    axv.set_xlim(win_start, n + 10)
    axr.set_xlim(win_start, n + 10)

    # fib labels: keep only the levels that fit, each drawn at its own price
    if fib_levels and not mini:
        y0, y1 = ax.get_ylim()
        span = y1 - y0
        need = 0.0135                                   # label height in axes fraction
        fib_frac = (max(p for p, _ in fib_levels) - min(p for p, _ in fib_levels)) / span
        fits = max(2, int(fib_frac / need))
        keep_idx = _spread_indices(len(fib_levels), fits)
        placed = []
        for i in keep_idx:
            price, lab = fib_levels[i]
            f = (price - y0) / span
            for _ in range(30):
                if not any(abs(f - pf) < need for pf in placed):
                    break
                f += need * 0.6
            placed.append(f)
            ax.text(0.006, y0 + f * span, f'{lab}  {price:.2f}',
                    transform=ax.get_yaxis_transform(), color=MUTED, fontsize=6.8,
                    va='center', zorder=11)
    if mini:
        ax.set_title('')
        for a_ in (ax, axv, axr):
            a_.set_yticklabels([])
        ax.set_yticks([])
    else:
        ax.set_title('')
    fig.patch.set_facecolor(BG)
    fig.savefig(outpath, facecolor=BG, dpi=100)
    plt.close(fig)
    return summary


def engine_labels(symbols_rows, out_json='/tmp/elliott_out.json'):
    """Run the app's own Elliott engine (lib/indicators.ts) over the same candles
    and return {symbol: {degree: [labels]}} so the chart numbering matches the app."""
    import subprocess
    payload = {}
    for sym, rows in symbols_rows.items():
        payload[sym] = {'times': list(range(len(rows))),
                        'highs': [r[2] for r in rows], 'lows': [r[3] for r in rows],
                        'closes': [r[4] for r in rows]}
    open('/tmp/elliott_in.json', 'w').write(json.dumps(payload))
    subprocess.run(['node', 'scripts/elliott_export.mjs', '/tmp/elliott_in.json', out_json],
                   check=True, capture_output=True)
    raw = json.load(open(out_json))
    out = {}
    for sym, d in raw.items():
        by_deg = {}
        for l in d['labels']:
            by_deg.setdefault(l['degree'], []).append(l)
        out[sym] = by_deg
    return out


if __name__ == '__main__':
    import re
    src = open('lib/tadawul-companies.ts').read()
    names_en = {s + '.SR': n for s, n, a in re.findall(r"symbol: '(\d+)\.SR', name: '([^']+)'(?:, ar: '([^']+)')?", src)}
    raw_names = {s + '.SR': (a or n) for s, n, a in re.findall(r"symbol: '(\d+)\.SR', name: '([^']+)'(?:, ar: '([^']+)')?", src)}
    raw_names.update({'2083.SR': 'الطاقة والمياه للصافي والينبع', '4142.SR': 'مجموعة الرياض للأسلاك'})
    res = json.load(open('/tmp/screen_up3.json'))[:16]
    outdir = '/Users/mishalajmi/Desktop/التحليل/SCAN-10-19'
    os.makedirs(outdir, exist_ok=True)
    minis = []
    all_rows = {r['sym']: fetch_vol(r['sym']) for r in res}
    ENGINE = engine_labels(all_rows)
    MARKET_OPEN = market_open_now()
    for r in res:
        sym = r['sym']
        rows = all_rows[sym]
        a = analyze(rows)
        raw = raw_names.get(sym, names_en.get(sym, ''))[:32]
        fname = f"{sym} - {raw}.png"
        s = build(sym, raw, rows, a, os.path.join(outdir, fname))
        mfp = os.path.join(outdir, f"_{sym}-mini.png")
        build(sym, raw, rows, a, mfp, mini=True)
        minis.append(mfp)
        print(f"{sym:9} {fname:46} {s}")

    grid = plt.figure(figsize=(17, 15), facecolor=BG)
    for i, mfp in enumerate(minis):
        img = plt.imread(mfp)
        axi = grid.add_subplot(4, 4, i + 1)
        axi.imshow(img); axi.axis('off')
    grid.suptitle('Tadawul scan 19-10-2026 — Elliott + Fib + RSI14 + Volume (Yahoo delayed, study only)',
                  fontsize=13, color=TXT)
    grid.tight_layout(rect=[0, 0, 1, 0.97])
    grid.savefig(os.path.join(outdir, '_GRID-16.png'), facecolor=BG, dpi=100)
    print('grid saved')
