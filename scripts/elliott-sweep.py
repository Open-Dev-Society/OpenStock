#!/usr/bin/env python3
"""Sweep the sensitivity and report how many degrees the engine finds.

The professional label sets nest like this (TradingView convention):
    major      I II III IV V  and  (A)(B)(C)      <- corrective in parentheses
    minor      1 2 3 4 5       and  A B C
    sub        i ii iii iv v   and  a b c
    deep       (1)(2)..        and  (a)(b)(c)

A good scan shows several tiers at once, so the chart reads as a nested
count instead of a flat list. This tool reports the tier depth per
sensitivity so the best threshold can be chosen deliberately (never silently).

Usage:  python3 scripts/elliott-sweep.py /tmp/scan_<dev>.json
"""
import json
import sys
from collections import Counter


def main():
    d = json.load(open(sys.argv[1]))
    labels = [l for l in d["labels"] if not l.get("alternate")]
    counts = Counter(l["degree"] for l in labels)
    order = ["major", "minor", "sub", "deep"]
    tiers = sum(1 for dg in order if counts.get(dg))
    dev = d.get("dev")
    print(f"dev={dev:.3f}  bars={len(d['candles'])}  labels={len(labels)}  "
          f"tiers={tiers}  " +
          "  ".join(f"{dg}={counts.get(dg,0)}" for dg in order))


if __name__ == "__main__":
    main()
