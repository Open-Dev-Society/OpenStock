#!/usr/bin/env python3
"""Render the OpenStock Elliott count the way an analyst draws it by hand.

The reference style (professional charting packages, and how a hand count
looks) is not a flat label list. It is ONE structure read at several levels
at once:

    (iv)  (iii)          the outermost impulse, parenthesised, largest
    (A)  (B)  (C)       the correction that contains it, parenthesised, ringed
    a    b    c          the correction inside that
    i    ii   iii iv v   the finest impulse, smallest

Rules this renderer follows:
  - labels are plain white, never boxed
  - a parenthesised label gets a thin ring, like the reference
  - a dotted projection line runs right from the wave-2 level
  - the same pivot can carry several degrees; they stack by degree and the
    finer one sits closer to the bar
  - the wave path is a thin grey polyline that breaks at session gaps

Input : the JSON written by __tests__/elliott-scan.test.ts
Output: a PNG

Usage:
  python3 scripts/elliott-nested.py /tmp/tasi30m.json /tmp/nested.png
"""
import json
import sys
import datetime

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
PATH = "#5b6472"

# Size per degree. In the reference the outer count is the biggest type and
# the finest is the smallest, so the eye reads the structure outside-in:
#   (iv) (iii)   big      the outer, parenthesised count
#   (A) (B) (C)  medium   the correction, ringed
#   a b c        small    the correction inside that
#   i ii iii iv v small   the finest impulse
DEGREE_SIZE = {"major": 12, "minor": 12, "sub": 10, "deep": 15}
# How far from the bar each degree sits, in units of the price range.
DEGREE_OFFSET = {"deep": 0.075, "major": 0.048, "minor": 0.030, "sub": 0.013}
DEGREE_RANK = {"major": 0, "minor": 1, "sub": 2, "deep": 3}

# The reference writes the outer impulse in parenthesised lowercase roman —
# "(iv)", "(iii)" — not "(4)", "(3)". The engine labels that level with
# digits, so the glyph is restyled here for the drawing only.
DEEP_RENUMBER = {"(1)": "(i)", "(2)": "(ii)", "(3)": "(iii)",
                 "(4)": "(iv)", "(5)": "(v)"}

# Only the capitalised corrective counts get a ring in the reference — the
# parenthesised impulse labels sit as plain text.
RINGED = set(["(A)", "(B)", "(C)"])

# Glyph families, used to tell an impulse from a correction.
IMULSE = set("12345") | set(["I", "II", "III", "IV", "V"]) | \
    set(["i", "ii", "iii", "iv", "v"]) | set(["(1)", "(2)", "(3)", "(4)", "(5)"])
CORRECTIVE = set("ABC") | set(["(A)", "(B)", "(C)"]) | \
    set("abc") | set(["(a)", "(b)", "(c)"])


def riyadh(ts):
    if isinstance(ts, str):
        return ts
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc)


def is_ringed(label):
    """The reference rings the parenthesised counts."""
    return label.startswith("(") and label.endswith(")")


def main():
    src, out = sys.argv[1], sys.argv[2]
    d = json.load(open(src))

    candles = d["candles"]
    labels = d["labels"]
    n = len(candles)
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    closes = [c["close"] for c in candles]
    times = [c["time"] for c in candles]
    span = max(highs) - min(lows)

    # ---- collect the labels, preferring the nested levels ----
    by_degree = {}
    levels = d.get("levels")
    if levels:
        for lv in levels:
            for l in lv["labels"]:
                if not l.get("alternate"):
                    by_degree.setdefault(lv["degree"], []).append(l)
    else:
        for l in labels:
            if not l.get("alternate"):
                by_degree.setdefault(l["degree"], []).append(l)
    for lst in by_degree.values():
        lst.sort(key=lambda x: x["index"])

    # ---- split each degree into impulse / correction runs ----
    structures = []
    for degree, lst in by_degree.items():
        run, run_kind = [], None
        for l in lst:
            if l["label"] in IMULSE:
                kind = "impulse"
            elif l["label"] in CORRECTIVE:
                kind = "corrective"
            else:
                kind = run_kind or "impulse"
            if run and kind != run_kind:
                structures.append((degree, run_kind, run))
                run = []
            run_kind = kind
            run.append(l)
        if run:
            structures.append((degree, run_kind, run))

    fig = plt.figure(figsize=(19, 9.5), facecolor=BG)
    ax = fig.add_axes([0.045, 0.085, 0.925, 0.785], facecolor=BG)
    axv = fig.add_axes([0.045, 0.015, 0.925, 0.048], facecolor=BG)

    # ---- candles ----
    for i, c in enumerate(candles):
        col = UP if c["close"] >= c["open"] else DOWN
        ax.plot([i, i], [c["low"], c["high"]], color=col, lw=0.85, zorder=2)
        body = abs(c["close"] - c["open"]) or 0.01
        base = min(c["open"], c["close"])
        ax.add_patch(Rectangle((i - 0.33, base), 0.66, body,
                               facecolor=col, edgecolor=col, lw=0, zorder=3))

    vmax = max(c["volume"] for c in candles) or 1
    for i, c in enumerate(candles):
        col = UP if c["close"] >= c["open"] else DOWN
        axv.bar(i, c["volume"] / vmax, width=0.66, color=col, alpha=0.4, lw=0)

    # ---- wave paths ----
    # The reference barely draws them: thin, faint stubs that tie a label to
    # the next pivot. A heavy line would fight the candles.
    for degree, kind, run in structures:
        if len(run) < 2:
            continue
        xs = [l["index"] for l in run]
        ys = [l["price"] if l["price"] is not None else closes[l["index"]] for l in run]
        seg_x, seg_y = [xs[0]], [ys[0]]
        for k in range(1, len(xs)):
            if xs[k] - xs[k - 1] > 12:
                if len(seg_x) > 1:
                    ax.plot(seg_x, seg_y, color=PATH, lw=0.7, alpha=0.45, zorder=4)
                seg_x, seg_y = [xs[k]], [ys[k]]
            else:
                seg_x.append(xs[k])
                seg_y.append(ys[k])
        if len(seg_x) > 1:
            ax.plot(seg_x, seg_y, color=PATH, lw=0.7, alpha=0.45, zorder=4)

    # ---- dotted projection from the wave-2 level ----
    # The reference draws a SHORT dashed stub at the wave-2 level, not a line
    # across the chart: it marks that level, it is not a target.
    minor = by_degree.get("minor", [])
    wave2 = None
    for k, l in enumerate(minor):
        if l["label"] == "2" and k + 1 < len(minor) and minor[k + 1]["label"] in ("3", "4", "5"):
            wave2 = l
    if wave2 is None:
        for l in minor:
            if l["label"] == "2":
                wave2 = l
    if wave2 is not None:
        y2 = wave2["price"] if wave2["price"] is not None else closes[wave2["index"]]
        i2 = wave2["index"]
        ax.plot([i2 - 1, i2 + 7], [y2, y2], color="#6b7280", lw=1.0,
                ls=(0, (3, 3)), alpha=0.9, zorder=4)

    # ---- labels ----
    # Every degree keeps its own label on the pivot; the finer degree sits
    # closer to the bar, so a stack reads outside-in.
    per_bar = {}
    for degree, lst in by_degree.items():
        for l in lst:
            per_bar.setdefault(l["index"], []).append(l)

    for idx, group in per_bar.items():
        by_deg = {}
        for l in group:
            by_deg.setdefault(l["degree"], l)
        # deep (the outer, parenthesised count) is the biggest type and sits
        # furthest from the bar; the finest plain label sits closest to it.
        ordered = sorted(by_deg.items(), key=lambda kv: -DEGREE_RANK.get(kv[0], 9))
        above = group[0]["position"] == "aboveBar"
        has_ring = any(
            l["label"] in RINGED
            or (l["degree"] in ("major", "minor") and l["label"] in ("A", "B", "C"))
            for _, l in ordered
        )
        for slot, (degree, l) in enumerate(ordered):
            p = l["price"] if l["price"] is not None else closes[idx]
            size = DEGREE_SIZE.get(degree, 11)
            off = span * DEGREE_OFFSET.get(degree, 0.020)
            # push outwards as the stack grows, never inwards
            off += slot * span * 0.022
            y = p + off if above else p - off
            va = "bottom" if above else "top"
            txt = l["label"]
            if degree == "deep":
                txt = DEEP_RENUMBER.get(txt, txt)
            if degree in ("major", "minor") and txt in ("A", "B", "C"):
                # The capitalised corrective is written in parentheses and
                # ringed, the way the reference does it.
                txt = f"({txt})"
            if txt in RINGED:
                ax.text(idx, y, txt, fontsize=size, color=TEXT, ha="center",
                        va=va, zorder=7, fontweight="bold",
                        bbox=dict(facecolor="none", edgecolor=TEXT, lw=0.9,
                                  boxstyle="circle,pad=0.26"))
            else:
                # A bare label sitting under a ring reads as part of it. The
                # reference sets such labels beside the ring, not beneath it.
                dx = 0.0
                if has_ring and len(txt) <= 2:
                    dx = 4.2
                ax.text(idx + dx, y, txt, fontsize=size, color=TEXT, ha="center",
                        va=va, zorder=7, fontweight="bold")

    ax.set_xlim(-4, n + 4)
    lo, hi = min(lows), max(highs)
    ax.set_ylim(lo - (hi - lo) * 0.13, hi + (hi - lo) * 0.16)
    ax.grid(alpha=0.22, color=GRID, lw=0.6)
    ax.set_facecolor(BG)
    for s in ax.spines.values():
        s.set_color(GRID)
    ax.tick_params(colors=FAINT, labelsize=8)
    ax.set_ylabel("TASI (SAR)", color=FAINT, fontsize=9)

    step = max(1, n // 15)
    ticks, names = [], []
    for i in range(0, n, step):
        t = riyadh(times[i])
        names.append(t if isinstance(t, str) else t.strftime("%d %b %H:%M"))
        ticks.append(i)
    ax.set_xticks(ticks)
    ax.set_xticklabels(names, color=FAINT, fontsize=8)
    axv.set_xticks(ticks)
    axv.set_xticklabels(names, color=FAINT, fontsize=8)
    axv.set_yticks([])
    axv.grid(alpha=0.18, color=GRID, lw=0.6)
    for s in axv.spines.values():
        s.set_color(GRID)
    axv.tick_params(colors=FAINT, labelsize=8)

    ax.set_title(
        f"TASI Index  ·  {d.get('rangeId','30m')}  ·  OpenStock Elliott engine v{d.get('engine','2.1.0')}  ·  dev {d.get('dev',0):.3f}%\n"
        f"{n} real bars  ·  last close {closes[-1]:.2f} SAR  ·  delayed Yahoo data  ·  study only, not advice",
        color=TEXT, fontsize=11, loc="left", pad=14)

    fig.savefig(out, dpi=115, facecolor=BG)
    print("wrote", out)
    for deg, kind, run in structures:
        print(f"  {deg:6s} {kind:11s} {' '.join(l['label'] for l in run)}")


if __name__ == "__main__":
    main()
