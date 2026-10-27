#!/usr/bin/env python3
"""Render the OpenStock Elliott count (from lib/indicators.ts) on real candles.

Style follows the professional charting convention: plain white labels with no
boxes, sized by degree (bigger = higher degree), the wave path drawn as thin
polylines, and the count readable at a glance.

Input : the JSON written by __tests__/elliott-scan.test.ts
Output: a PNG with candles, the wave path, and the degree labels.

Usage:
  python3 scripts/render-elliott.py /tmp/tasi30m.json /tmp/tasi30m.png
"""
import json
import sys
import datetime

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from matplotlib.lines import Line2D

BG = "#0a0a0a"
PANEL = "#0f1113"
GRID = "#1a1d21"
UP = "#26a69a"
DOWN = "#ef5350"
TEXT = "#e8eaed"
FAINT = "#8b8f96"

# Degree -> (colour, size, zorder). Higher degrees read larger; the glyph
# itself (i vs 1 vs I vs a vs A) carries the rest of the distinction.
DEGREE_STYLE = {
    "major": ("#e8eaed", 15, 7),
    "minor": ("#e8eaed", 12, 6),
    "sub":   ("#cfd3d8", 10, 5),
    "deep":  ("#b9bec6", 9, 4),
}


def riyadh(ts):
    if isinstance(ts, str):
        return ts
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc)


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

    fig = plt.figure(figsize=(19, 9.5), facecolor=BG)
    ax = fig.add_axes([0.045, 0.075, 0.925, 0.795], facecolor=BG)
    axv = fig.add_axes([0.045, 0.015, 0.925, 0.045], facecolor=BG)

    # ---- candles ----
    for i, c in enumerate(candles):
        col = UP if c["close"] >= c["open"] else DOWN
        ax.plot([i, i], [c["low"], c["high"]], color=col, lw=0.85, zorder=2)
        body = abs(c["close"] - c["open"]) or 0.01
        base = min(c["open"], c["close"])
        ax.add_patch(Rectangle((i - 0.33, base), 0.66, body,
                               facecolor=col, edgecolor=col, lw=0, zorder=3))

    # ---- volume ----
    vmax = max(c["volume"] for c in candles) or 1
    for i, c in enumerate(candles):
        col = UP if c["close"] >= c["open"] else DOWN
        axv.bar(i, c["volume"] / vmax, width=0.66, color=col, alpha=0.4, lw=0)

    by_degree = {}
    for l in labels:
        by_degree.setdefault(l["degree"], []).append(l)

    # Projection line: from the last impulse's wave-2 pivot (the level a
    # continuation must break) to the right edge.
    proj_from = None
    prim_minor = sorted([l for l in by_degree.get("minor", []) if not l.get("alternate")],
                        key=lambda x: x["index"])
    nums = {"1", "2", "3", "4", "5"}
    last_w2 = None
    for k, l in enumerate(prim_minor):
        if l["label"] == "2" and k + 1 < len(prim_minor) and prim_minor[k + 1]["label"] in nums:
            last_w2 = l
    if last_w2 is not None:
        proj_from = (last_w2["index"], last_w2["price"] if last_w2["price"] is not None else closes[last_w2["index"]])

    # ---- wave path: thin polylines through each degree's pivots ----
    for degree, lst in by_degree.items():
        primary = sorted([l for l in lst if not l.get("alternate")], key=lambda x: x["index"])
        if len(primary) < 2:
            continue
        xs = [l["index"] for l in primary]
        ys = [l["price"] if l["price"] is not None else closes[l["index"]] for l in primary]
        # Break the line where the time gap is too wide (a new session), so a
        # leg does not appear to jump across a weekend.
        seg_x, seg_y = [xs[0]], [ys[0]]
        for k in range(1, len(xs)):
            if xs[k] - xs[k - 1] > 12:
                if len(seg_x) > 1:
                    ax.plot(seg_x, seg_y, color="#5b6472", lw=1.1, alpha=0.9, zorder=4)
                seg_x, seg_y = [xs[k]], [ys[k]]
            else:
                seg_x.append(xs[k])
                seg_y.append(ys[k])
        if len(seg_x) > 1:
            ax.plot(seg_x, seg_y, color="#5b6472", lw=1.1, alpha=0.9, zorder=4)

    # ---- labels: plain white, sized by degree ----
    # Two degrees can share one pivot (the engine allows a structure to end
    # where another begins). Stack them by degree and nudge them apart
    # horizontally so no two glyphs ever overlap.
    OFFSET = {"major": 0.030, "minor": 0.016, "sub": 0.006, "deep": 0.001}
    DEGREE_ORDER = {"major": 0, "minor": 1, "sub": 2, "deep": 3}

    by_bar = {}
    for l in labels:
        if l.get("alternate"):
            continue
        by_bar.setdefault(l["index"], []).append(l)

    for i, group in by_bar.items():
        group.sort(key=lambda l: DEGREE_ORDER.get(l["degree"], 9))
        above = group[0]["position"] == "aboveBar"
        for slot, l in enumerate(group):
            p = l["price"] if l["price"] is not None else closes[i]
            color, size, z = DEGREE_STYLE.get(l["degree"], ("#e8eaed", 12, 6))
            off = span * (OFFSET.get(l["degree"], 0.012) + slot * 0.030)
            if above:
                y, va = p + off, "bottom"
            else:
                y, va = p - off, "top"
            dx = 0 if len(group) == 1 else (slot - (len(group) - 1) / 2) * 2.8

            txt = l["label"]
            # Parenthesised corrective glyphs get a thin ring, the way
            # professional packages mark an alternate/parent count.
            if txt.startswith("(") and txt.endswith(")"):
                ax.text(i + dx, y, txt, fontsize=size, color=color, ha="center",
                        va=va, zorder=z, fontweight="bold",
                        bbox=dict(facecolor="none", edgecolor=color, lw=0.9,
                                  boxstyle="circle,pad=0.22"))
            else:
                ax.text(i + dx, y, txt, fontsize=size, color=color, ha="center",
                        va=va, zorder=z, fontweight="bold")

    # ---- projection lines ----
    # A dotted line from a labelled pivot to the right edge marks the level a
    # wave must hold or break. Professional packages draw these; they make the
    # count actionable instead of decorative.
    if proj_from is not None:
        i, p = proj_from
        ax.plot([i, n + 2], [p, p], color="#6b7280", lw=0.9, ls=(0, (4, 4)),
                alpha=0.8, zorder=4)

    # ---- axes ----
    ax.set_xlim(-4, n + 4)
    lo, hi = min(lows), max(highs)
    pad = (hi - lo) * 0.09
    ax.set_ylim(lo - pad, hi + pad)
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

    # ---- legend ----
    handles = [
        Line2D([0], [0], color=UP, lw=6, label="up bar"),
        Line2D([0], [0], color=DOWN, lw=6, label="down bar"),
        Line2D([0], [0], color="#5b6472", lw=1.4, label="wave path"),
    ]
    for degree, lst in by_degree.items():
        if not any(not l.get("alternate") for l in lst):
            continue
        sample = next(l["label"] for l in sorted(lst, key=lambda x: x["index"]) if not l.get("alternate"))
        handles.append(Line2D([0], [0], color="none", marker=r"$\mathregular{%s}$" % sample,
                              ms=9, label=f"{degree} degree", mec="#e8eaed", mfc="none"))
    ax.legend(handles=handles, loc="lower left", fontsize=8.5, ncol=3,
              facecolor=PANEL, edgecolor=GRID, labelcolor=TEXT, framealpha=0.85,
              borderpad=0.6)

    dev = d.get("dev")
    ax.set_title(
        f"TASI Index  ·  {d.get('rangeId','30m')}  ·  OpenStock Elliott engine v{d.get('engine','2.1.0')}  ·  dev {dev:.3f}%\n"
        f"{n} real bars  ·  last close {closes[-1]:.2f} SAR  ·  delayed Yahoo data  ·  study only, not advice",
        color=TEXT, fontsize=11, loc="left", pad=14)

    # ---- live edge ----
    # Read the levels from the labels themselves so the panel is never stale.
    def last_level(names):
        for l in sorted(labels, key=lambda x: x["index"], reverse=True):
            if l.get("alternate"):
                continue
            if l["label"] in names:
                return l["price"] if l["price"] is not None else closes[l["index"]]
        return None

    edge_lines = [f"  last close   {closes[-1]:.2f}"]
    for names, title in ((set("abc") | {"(a)", "(b)", "(c)"}, "last corrective"),
                          (set("12345") | {"I", "II", "III", "IV", "V"}, "last impulse")):
        lv = last_level(names)
        if lv is not None:
            edge_lines.append(f"  {title:12s} {lv:.2f}   ({closes[-1]-lv:+.2f})")
    tail = candles[-10:]
    edge_lines.append(f"  last 10 bars {min(x['low'] for x in tail):.2f} – {max(x['high'] for x in tail):.2f}")

    ax.text(
        0.995, 0.985, "LIVE EDGE\n" + "\n".join(edge_lines),
        transform=ax.transAxes, ha="right", va="top",
        fontsize=8.5, color="#b9bec6", family="monospace", zorder=8,
        bbox=dict(facecolor=PANEL, edgecolor=GRID, boxstyle="round,pad=0.6", alpha=0.9))

    fig.savefig(out, dpi=115, facecolor=BG)
    print("wrote", out)


if __name__ == "__main__":
    main()
