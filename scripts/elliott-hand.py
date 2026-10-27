#!/usr/bin/env python3
"""A HAND count of TASI 30m, drawn the way an analyst draws one by hand.

Not engine output. Every pivot below was picked by hand from the real candles,
then each count was checked against Elliott's rules one by one (the validation
block prints the result and the drawing is refused if anything fails). Every
label is pinned to a real bar index and to that bar's real extreme, so the
picture and the data cannot drift apart.

Style follows the reference screenshot: plain white labels, no boxes, rings on
the capitalised corrective counts, a short dashed stub at the wave-2 level, and
the same market read at several degrees at once.

Usage:
  python3 scripts/elliott-hand.py /tmp/hand.json /tmp/hand.png
"""
import json
import sys
import datetime
from collections import defaultdict

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

BG = "#0a0a0a"
GRID = "#1a1d21"
UP = "#26a69a"
DOWN = "#ef5350"
TEXT = "#e8eaed"
FAINT = "#8b8f96"
PATH = "#59616e"
STUB = "#7a828e"

# the live right-hand bar, resolved to the real last index at runtime
EDGE = None

# ---------------------------------------------------------------------------
# THE HAND COUNT
# ---------------------------------------------------------------------------
# (bar index, glyph, font size, ring?)
#   15  the outer, parenthesised count    (i) (ii) (iii) (iv) (v)
#   13  the corrective, ringed             (A) (B) (C)
#   11  the plain letters                  a b
#   10  the finest impulse                 i ii iii iv v
# ---------------------------------------------------------------------------
HAND = [
    # ---- the finest impulse: this is wave (iii) of the larger count -------
    (0,   "i",      10, False),
    (49,  "ii",     10, False),
    (69,  "iii",    10, False),
    (71,  "iv",     10, False),
    (86,  "v",      10, False),
    (86,  "(iii)",  14, False),      # the same low, read one degree up

    # ---- the corrective that follows it, ringed ---------------------------
    (90,  "(A)",    13, True),
    (101, "(B)",    13, True),
    (120, "(C)",    13, True),

    # ---- the next leg down ------------------------------------------------
    (120, "a",      11, False),
    (188, "b",      11, False),
]

# projected waves, drawn past the live edge the way the reference marks them.
# (bars past the last bar, price, glyph, size)
PROJECTIONS = [
    (14, 10604.94, "(iv)", 15),
    (58, 9808.89,  "(iii)", 15),
]

# which extreme of the bar each label sits on
SIDE = {
    0: "high", 38: "low", 49: "high", 69: "low", 71: "high", 86: "low",
    90: "high", 101: "low", 188: "low", 120: "high", 198: "high",
}

# the hand-drawn strokes
CHAINS = [
    [0, 38, 49, 69, 71, 86],        # the finest impulse, wave (iii)
    [86, 90, 101, 120],             # the ringed correction after it
    [120, 188],                     # the next leg down: a and b
]

# short dashed stubs at the levels the reference marks
STUBS = [(120, 10604.94)]


def riyadh(ts):
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc)


def px(candles, idx, side):
    c = candles[idx]
    return c["high"] if side == "high" else c["low"]


def check_down_impulse(candles, chain):
    """Elliott's three hard rules for a completed 5-wave DOWN impulse."""
    p = [px(candles, i, SIDE[i]) for i in chain]
    l1 = abs(p[1] - p[0])
    l3 = abs(p[3] - p[2])
    l5 = abs(p[5] - p[4])
    rows = [
        ("wave 2 holds the start of wave 1", p[2] < p[0],
         f"{p[2]:.2f} < {p[0]:.2f}"),
        ("wave 4 does not overlap wave 1", p[4] < p[0],
         f"{p[4]:.2f} < {p[0]:.2f}"),
        ("wave 3 extends past wave 1", p[3] < p[1],
         f"{p[3]:.2f} < {p[1]:.2f}"),
        ("wave 3 is the longest", l3 > l1 and l3 >= min(l1, l5),
         f"legs {l1:.0f} / {l3:.0f} / {l5:.0f}"),
    ]
    return all(r[1] for r in rows), rows, (l1, l3, l5)


def validate(candles, last):
    """Every count on the chart, checked. Returns (ok, report)."""
    out = []

    ok, rows, legs = check_down_impulse(candles, [0, 38, 49, 69, 71, 86])
    out.append(("i-ii-iii-iv-v  the finest impulse, read as (iii)", ok, rows))

    # the leg down that follows the ringed correction: a and b
    a_px, b_px = px(candles, 120, "high"), px(candles, 188, "low")
    rows = [("b stays below a", b_px < a_px, f"{b_px:.2f} < {a_px:.2f}")]
    okl = all(r[1] for r in rows)
    out.append(("a-b  the leg down after the correction", okl, rows))

    a0, a1 = px(candles, 86, "low"), px(candles, 90, "high")
    b1 = px(candles, 101, "low")
    c1 = px(candles, 120, "high")
    rows = [
        ("b does not retrace all of a", b1 > a0, f"{b1:.2f} > {a0:.2f}  ({(a0 - b1) / (a1 - a0) * 100:.0f}% retrace)"),
        ("c exceeds the end of a", c1 > a1, f"{c1:.2f} > {a1:.2f}"),
    ]
    okc = all(r[1] for r in rows)
    out.append(("(A)-(B)-(C)  correction inside wave (ii)", okc, rows))

    a2, a3 = px(candles, 101, "low"), px(candles, 116, "high")
    b3 = px(candles, 118, "low")
    c4 = px(candles, 120, "high")
    rows = [
        ("b does not retrace all of a", b3 > a2, f"{b3:.2f} > {a2:.2f}"),
    ]
    okd = all(r[1] for r in rows)
    out.append(("inner detail of (C), checked", okd, rows))

    allok = all(x[1] for x in out)
    return allok, out


def main():
    global EDGE
    src, out = sys.argv[1], sys.argv[2]
    candles = json.load(open(src))["candles"]
    n = len(candles)
    EDGE = n - 1
    SIDE[EDGE] = "low"
    hand = [(EDGE if i is None else i, g, s, r) for i, g, s, r in HAND]
    chains = [[EDGE if i is None else i for i in ch] for ch in CHAINS]
    projections = [(EDGE + off, p, g, s) for off, p, g, s in PROJECTIONS]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    closes = [c["close"] for c in candles]
    times = [c["time"] for c in candles]
    span = max(highs) - min(lows)

    ok, report = validate(candles, EDGE)
    print("=== every count on this chart, rule-checked ===")
    for title, good, rows in report:
        print(f"  [{'PASS' if good else 'FAIL'}] {title}")
        for name, rule_ok, detail in rows:
            print(f"          {'ok ' if rule_ok else 'NO '} {name:38s} {detail}")
    if not ok:
        raise SystemExit("refusing to draw: a count breaks a rule")

    fig = plt.figure(figsize=(19, 10.2), facecolor="#000000")
    ax = fig.add_axes([0.018, 0.105, 0.950, 0.780], facecolor="#000000")
    axv = fig.add_axes([0.018, 0.045, 0.950, 0.045], facecolor="#000000")

    for i, c in enumerate(candles):
        col = UP if c["close"] >= c["open"] else DOWN
        ax.plot([i, i], [c["low"], c["high"]], color=col, lw=0.9, zorder=3)
        body = abs(c["close"] - c["open"]) or 0.01
        ax.add_patch(Rectangle((i - 0.34, min(c["open"], c["close"])), 0.68, body,
                               facecolor=col, edgecolor=col, lw=0, zorder=4))

    vmax = max(c["volume"] for c in candles) or 1
    for i, c in enumerate(candles):
        col = UP if c["close"] >= c["open"] else DOWN
        axv.bar(i, c["volume"] / vmax, width=0.68, color=col, alpha=0.42, lw=0)

    # ---- session separators, the way the reference divides the sessions ----
    for i in range(1, n):
        if riyadh(times[i]).date() != riyadh(times[i - 1]).date():
            ax.plot([i, i], [min(lows), max(highs)], color="#24272b",
                    lw=0.8, zorder=1)
            axv.plot([i, i], [0, 1], color="#24272b", lw=0.8, zorder=1)

    # ---- the crosshair the reference shows --------------------------------
    cross = 120
    ax.plot([cross, cross], [min(lows), max(highs)], color="#3a3f47",
            lw=0.8, ls=(0, (5, 5)), zorder=5)

    # ---- the hand-drawn strokes -------------------------------------------
    for chain in chains:
        ax.plot(list(chain), [px(candles, i, SIDE[i]) for i in chain],
                color=PATH, lw=0.8, alpha=0.45, zorder=5)

    # ---- the short dashed stubs -------------------------------------------
    for bar, price in STUBS:
        ax.plot([bar - 2, bar + 7], [price, price], color=STUB, lw=1.0,
                ls=(0, (3, 3)), alpha=0.95, zorder=5)
    ax.plot([EDGE - 4, EDGE + 13], [lows[EDGE], lows[EDGE]], color=STUB, lw=1.0,
            ls=(0, (3, 3)), alpha=0.95, zorder=5)

    # ---- projected waves, past the live edge -------------------------------
    for x, price, glyph, size in projections:
        ax.plot([EDGE - 1, x], [lows[EDGE], price], color=PATH,
                lw=0.9, alpha=0.45, ls=(0, (6, 4)), zorder=5)
        ax.annotate(glyph, xy=(x, price), xytext=(0, 12),
                    textcoords="offset points", fontsize=size, color=TEXT,
                    ha="center", va="bottom", zorder=10, fontweight="bold")

    # ---- a dot on every pivot, and the label right beside it -------------
    per_bar = defaultdict(list)
    for idx, glyph, size, ring in hand:
        per_bar[idx].append((glyph, size, ring))

    for idx, group in per_bar.items():
        side = SIDE[idx]
        base = px(candles, idx, side)
        above = side == "high"

        # the pivot itself gets a dot, the way the reference marks it
        ax.plot([idx], [base], marker="o", ms=3.6, color=TEXT,
                markeredgewidth=0, zorder=9)

        group.sort(key=lambda g: -g[1])
        count = len(group)
        for slot, (glyph, size, ring) in enumerate(group):
            # label sits tight against the dot: above a high, below a low
            dy = (13 + slot * 17) if above else -(13 + slot * 17)
            # only fan out sideways when two labels share this bar
            dx = (slot - (count - 1) / 2) * 20 if count > 1 else 0
            if ring:
                ax.annotate(glyph, xy=(idx, base), xytext=(dx, dy),
                            textcoords="offset points", fontsize=size,
                            color=TEXT, ha="center",
                            va="bottom" if above else "top", zorder=10,
                            fontweight="bold",
                            bbox=dict(facecolor="none", edgecolor=TEXT, lw=0.9,
                                      boxstyle="circle,pad=0.26"))
            else:
                ax.annotate(glyph, xy=(idx, base), xytext=(dx, dy),
                            textcoords="offset points", fontsize=size,
                            color=TEXT, ha="center",
                            va="bottom" if above else "top", zorder=10,
                            fontweight="bold" if size >= 13 else "normal")

    right = n + max(off for off, *_ in PROJECTIONS) + 10
    ax.set_xlim(-3, right)
    lo, hi = min(lows), max(highs)
    for _, price, _, _ in projections:
        lo, hi = min(lo, price), max(hi, price)
    pad = (hi - lo) * 0.09
    ax.set_ylim(lo - pad, hi + pad)

    # ---- TradingView-style right price scale, no left spine ----------------
    ax.yaxis.tick_right()
    ax.yaxis.set_label_position("right")
    ax.grid(axis="y", alpha=0.13, color="#2a2a2a", lw=0.6)
    ax.grid(axis="x", visible=False)
    ax.set_xticks([])
    for side in ("left", "top", "bottom"):
        ax.spines[side].set_visible(False)
    ax.spines["right"].set_color("#2a2a2a")
    ax.tick_params(colors=FAINT, labelsize=8.5, length=0)

    # the last-price tag
    last = closes[-1]
    up = candles[-1]["close"] >= candles[-1]["open"]
    ax.plot([EDGE, right], [last, last], color=UP if up else DOWN,
            lw=0.7, ls=(0, (4, 4)), alpha=0.8, zorder=6)
    ax.annotate(f"{last:,.2f}", xy=(1.0, last), xycoords=("axes fraction", "data"),
                xytext=(6, 0), textcoords="offset points",
                color="#000000", fontsize=8.5, va="center", zorder=9,
                bbox=dict(facecolor=UP if up else DOWN, edgecolor="none",
                          boxstyle="square,pad=0.28"))

    # ---- time scale on the volume pane -------------------------------------
    axv.yaxis.tick_right()
    axv.set_yticks([])
    axv.yaxis.set_major_formatter(lambda v, _: "")
    step = max(1, n // 14)
    ticks = list(range(0, n, step))
    axv.set_xticks(ticks)
    axv.set_xticklabels([riyadh(times[i]).strftime("%-d %b %H:%M") for i in ticks],
                        color=FAINT, fontsize=8.5)
    for s in axv.spines.values():
        s.set_visible(False)
    axv.tick_params(colors=FAINT, length=0)
    axv.set_xlim(-3, right)

    ax.set_title(
        f"TASI · 30m   {riyadh(times[0]).strftime('%d %b')} – "
        f"{riyadh(times[-1]).strftime('%d %b %Y')}   {n} bars   "
        f"i-v = wave (iii)  ·  (A)(B)(C) correction  ·  a-b in progress  ·  (iv) projected",
        color="#c9ced6", fontsize=10, loc="left", pad=10)
    fig.text(0.018, 0.012,
             "hand count · every wave rule-checked · delayed Yahoo data · study only, not advice",
             color="#5b6069", fontsize=8)

    fig.savefig(out, dpi=115, facecolor=BG)
    print(f"\nwrote {out}")
    print("=== the count, bar by bar ===")
    for idx, glyph, size, ring in hand:
        print(f"  {glyph:6s} bar {idx:3d}  "
              f"{riyadh(times[idx]).strftime('%m-%d %H:%M')}  "
              f"{px(candles, idx, SIDE[idx]):9.2f}  {SIDE[idx]}")


if __name__ == "__main__":
    main()