#!/usr/bin/env python3
"""TradingView-style chart for TASI on any intraday frame, numbered by the app's
own Elliott engine (lib/indicators.ts) with all three degrees, like the app:
  minor  -> badges (blue impulse / orange corrective)
  sub    -> small pink labels (a, b, c, i, ii, iii, iv, v)
  major  -> amber labels (I..V, (A)(B)(C))
"""
import json, os, sys, subprocess, urllib.request, datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import matplotlib.patheffects as pe

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BG = '#0B0E11'; UP = '#26A69A'; DOWN = '#EF5350'
C_MIN = '#7F1D1D'; C_COR = '#7F1D1D'; C_SUB = '#C62828'; C_MAJ = '#7F1D1D'
MUTED = '#B2B5BE'; TXT = '#F0F3FA'


def fetch(symbol, interval, rng):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?interval={interval}&range={rng}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    d = json.load(urllib.request.urlopen(req, timeout=25))
    r = d['chart']['result'][0]; q = r['indicators']['quote'][0]
    rows = []
    for i, t in enumerate(r['timestamp']):
        o, h, l, c, v = q['open'][i], q['high'][i], q['low'][i], q['close'][i], q['volume'][i]
        if None in (o, h, l, c):
            continue
        dt = datetime.datetime.fromtimestamp(t, datetime.timezone.utc) + datetime.timedelta(hours=3)
        rows.append((dt.strftime('%Y-%m-%d %H:%M'), o, h, l, c, v or 0))
    return rows


def engine(rows, key):
    payload = {key: {'times': list(range(len(rows))), 'highs': [x[2] for x in rows],
                       'lows': [x[3] for x in rows], 'closes': [x[4] for x in rows]}}
    open('/tmp/elliott_in.json', 'w').write(json.dumps(payload))
    subprocess.run(['node', 'scripts/elliott_export.mjs', '/tmp/elliott_in.json', '/tmp/elliott_out.json'],
                   check=True, capture_output=True)
    return json.load(open('/tmp/elliott_out.json'))[key]


def draw(rows, labels, out, title, window=None):
    n = len(rows)
    dates = [x[0] for x in rows]; O = [x[1] for x in rows]; H = [x[2] for x in rows]
    L = [x[3] for x in rows]; C = [x[4] for x in rows]; V = [x[5] for x in rows]
    start = 0
    if window:
        start = max(0, n - window)
    fig, (ax, axv) = plt.subplots(2, 1, figsize=(15, 8), sharex=True,
                                  gridspec_kw={'height_ratios': [3.2, 0.6], 'hspace': 0.06})
    fig.patch.set_facecolor(BG)
    for a in (ax, axv):
        a.set_facecolor(BG)
        for s in a.spines.values():
            s.set_color('#2A2E39')
        a.grid(True, color='#1E222D', lw=0.6)
        a.set_axisbelow(True)
        a.tick_params(colors=MUTED, labelsize=8, length=0)
    for i in range(start, n):
        col = UP if C[i] >= O[i] else DOWN
        ax.plot([i, i], [L[i], H[i]], color=col, lw=0.9, zorder=3)
        b = min(O[i], C[i])
        ax.add_patch(Rectangle((i - 0.32, b), 0.64, abs(C[i] - O[i]) or 0.01,
                               facecolor=col, edgecolor=col, lw=0, zorder=4))
    axv.bar(range(start, n), V[start:], color=[UP if C[i] >= O[i] else DOWN for i in range(start, n)],
            alpha=0.4, width=0.7)
    axv.set_yticks([]); axv.text(0.004, 0.9, 'Volume', transform=axv.transAxes, color=MUTED, fontsize=8, va='top')

    # labels: minor = badge, sub = pink text, major = amber text
    for l in labels:
        if l['index'] < start or l['index'] >= n:
            continue
        txt = l['label']; px = l['price']; deg = l['degree']
        above = l['position'] == 'aboveBar'
        if deg == 'minor':
            ax.text(l['index'], px, txt, color='white', fontsize=9, fontweight='bold', ha='center',
                    va='bottom' if above else 'top', zorder=12,
                    bbox=dict(facecolor=C_MIN, edgecolor='#3B0A0A', boxstyle='round,pad=0.25'),
                    path_effects=[pe.withStroke(linewidth=2.0, foreground=BG)])
        elif deg == 'sub':
            ax.text(l['index'], px, txt, color=C_SUB, fontsize=9, ha='center',
                    va='bottom' if above else 'top', zorder=11,
                    path_effects=[pe.withStroke(linewidth=2.0, foreground=BG)])
        else:
            ax.text(l['index'], px, txt, color=C_MAJ, fontsize=9, ha='center',
                    va='bottom' if above else 'top', zorder=11,
                    path_effects=[pe.withStroke(linewidth=2.0, foreground=BG)])

    ax.axhline(C[-1], color=C_MIN, ls='--', lw=0.7, alpha=0.5)
    ax.annotate(f'{C[-1]:.2f}', xy=(1.0, C[-1]), xycoords=('axes fraction', 'data'),
                xytext=(4, 0), textcoords='offset points', va='center', ha='left',
                color='white', fontsize=8.5, zorder=20,
                bbox=dict(facecolor=C_MIN, edgecolor='none', boxstyle='square,pad=0.25'), clip_on=False)
    ax.set_title(title, color=TXT, fontsize=11, loc='right')
    ax.yaxis.tick_right(); ax.yaxis.set_label_position('right')
    step = max(1, (n - start) // 9)
    ticks = list(range(start, n, step))
    ax.set_xticks([]); axv.set_xticks(ticks)
    axv.set_xticklabels([dates[i][5:16] for i in ticks], color=MUTED, fontsize=8)
    fig.savefig(out, facecolor=BG, dpi=110)
    plt.close(fig)
    print('saved', out)


if __name__ == '__main__':
    import urllib.parse
    for key, symbol, interval, rng, window, title in [
        ('TASI30', '^TASI.SR', '30m', '1mo', None, 'TASI 30m — Elliott (محرك التطبيق: minor/sub/major)'),
        ('TASI15', '^TASI.SR', '15m', '1mo', None, 'TASI 15m — Elliott (محرك التطبيق)'),
    ]:
        rows = fetch(symbol, interval, rng)
        d = engine(rows, key)
        out = f"/Users/mishalajmi/Desktop/التحليل/TASI-{interval}-ELT.png"
        draw(rows, d['labels'], out, title, window)
