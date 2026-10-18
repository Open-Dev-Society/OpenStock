#!/usr/bin/env python3
"""Elliott wave scanner — same Yahoo source + same strict rules as OpenStock.

Usage:
  python3 scripts/waves.py 4040.SR --range 2y --interval 1d --devs 5,6,10,12 --out /tmp/4040.png
  python3 scripts/waves.py ^TASI.SR --range 5d --interval 15m --devs 0.3,0.5 --out /tmp/tasi.png
Needs: pip install matplotlib
"""
import argparse
import datetime
import json
import sys
import urllib.request


def fetch(symbol, rng, itv):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?interval={itv}&range={rng}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    d = json.load(urllib.request.urlopen(req, timeout=25))
    r = d["chart"]["result"][0]
    ts, q = r["timestamp"], r["indicators"]["quote"][0]
    rows = []
    for i, t in enumerate(ts):
        o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
        if None in (o, h, l, c):
            continue
        dt = datetime.datetime.fromtimestamp(t, datetime.timezone.utc)
        tkey = dt.strftime("%Y-%m-%d %H:%M") if itv[-1] in ("m", "h") else dt.strftime("%Y-%m-%d")
        rows.append((tkey, o, h, l, c, t))
    return rows


def zigzag(H, L, C, dev):
    n = len(C)
    pivs, trend = [], 0
    eH, eL, eHi, eLi = H[0], L[0], 0, 0
    for i in range(1, n):
        if trend >= 0:
            if H[i] > eH:
                eH, eHi = H[i], i
            if (eH - L[i]) / eH * 100 >= dev:
                if trend == 0:
                    pivs.append((eLi, eL, "low"))
                pivs.append((eHi, eH, "high"))
                trend, eL, eLi = -1, L[i], i
                continue
        if trend <= 0:
            if L[i] < eL:
                eL, eLi = L[i], i
            if (H[i] - eL) / eL * 100 >= dev:
                pivs.append((eLi, eL, "low"))
                trend, eH, eHi = 1, H[i], i
    if trend > 0:
        pivs.append((eHi, eH, "high"))
    elif trend < 0:
        pivs.append((eLi, eL, "low"))
    else:
        pivs.append((n - 1, C[-1], "low"))
    return [p for j, p in enumerate(pivs) if j == 0 or p[0] != pivs[j - 1][0]]


def merge(pivs):
    mp = []
    for p in pivs:
        if mp and mp[-1][2] == p[2]:
            if p[2] == "high" and p[1] > mp[-1][1]:
                mp[-1] = p
            elif p[2] == "low" and p[1] < mp[-1][1]:
                mp[-1] = p
        else:
            mp.append(p)
    return mp


def test6(w):
    p0, p1, p2, p3, p4, p5 = w[:6]
    tys = [p[2] for p in w[:6]]
    if not all(tys[i] != tys[i - 1] for i in range(1, 6)):
        return None
    up = p1[1] > p0[1]
    if up and p0[2] != "low":
        return None
    if not up and p0[2] != "high":
        return None
    l1, l3, l5 = abs(p1[1] - p0[1]), abs(p3[1] - p2[1]), abs(p5[1] - p4[1])
    if up:
        if p2[1] <= p0[1] or p4[1] <= p1[1] or p3[1] <= p1[1]:
            return None
    else:
        if p2[1] >= p0[1] or p4[1] >= p1[1] or p3[1] >= p1[1]:
            return None
    if not (l3 >= min(l1, l5)):
        return None
    return {"up": up, "L": (round(l1, 2), round(l3, 2), round(l5, 2))}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("symbol")
    ap.add_argument("--range", default="1y")
    ap.add_argument("--interval", default="1d")
    ap.add_argument("--devs", default="3,5,8,12")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    rows = fetch(a.symbol, a.range, a.interval)
    dates = [r[0] for r in rows]
    O = [r[1] for r in rows]
    H = [r[2] for r in rows]
    L = [r[3] for r in rows]
    C = [r[4] for r in rows]
    print(f"bars={len(rows)} last={dates[-1]} close={C[-1]:.2f} (Yahoo, delayed ~15-20min)")
    best = None
    for dev in [float(x) for x in a.devs.split(",")]:
        mp = merge(zigzag(H, L, C, dev))
        print(f"--- dev={dev}: pivots={len(mp)}")
        for s in range(len(mp) - 5):
            r = test6(mp[s : s + 6])
            if r:
                print(f"  VALID s={s} {'up' if r['up'] else 'down'} L={r['L']}")
                for k, (ix, px, typ) in enumerate(mp[s : s + 6]):
                    print(f"    {'012345'[k]} {dates[ix]} {typ} {px:.2f}")
                if best is None:
                    best = (mp[s : s + 6], r)
    if a.out and best:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from matplotlib.patches import Rectangle

        win, r = best
        fig, ax = plt.subplots(figsize=(16, 8))
        for i in range(len(rows)):
            col = "#26a69a" if C[i] >= O[i] else "#ef5350"
            ax.plot([i, i], [L[i], H[i]], color=col, lw=0.8)
            b = min(O[i], C[i])
            ax.add_patch(Rectangle((i - 0.35, b), 0.7, abs(C[i] - O[i]) or 0.01, facecolor=col, edgecolor=col, lw=0))
        xs = [p[0] for p in win]
        ys = [p[1] for p in win]
        ax.plot(xs, ys, color="#2962FF", lw=2, marker="o", ms=4, zorder=5)
        for k, (ix, px, typ) in enumerate(win):
            off = 0
            try:
                rng = max(H) - min(L)
                off = rng * 0.02 * (1 if typ == "high" else -1)
            except Exception:
                pass
            ax.text(ix, px + off, "012345"[k], fontsize=13, fontweight="bold", color="white",
                    ha="center", zorder=6,
                    bbox=dict(facecolor="#2962FF", edgecolor="black", boxstyle="circle,pad=0.4"))
        ax.set_xlim(-5, len(rows) + 5)
        ax.set_title(f"{a.symbol} {a.interval} strict impulse ({'up' if r['up'] else 'down'}) — delayed, study only")
        ax.grid(alpha=0.3)
        fig.tight_layout()
        fig.savefig(a.out, dpi=110)
        print("chart:", a.out)


if __name__ == "__main__":
    sys.exit(main())
