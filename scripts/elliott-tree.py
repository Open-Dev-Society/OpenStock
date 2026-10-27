#!/usr/bin/env python3
"""Print every Elliott count the engine found, as a hierarchical tree.

The reference chart style (professional packages) nests the degrees: the
minute count sits inside the corrective, the corrective inside the impulse.
This tool shows the nesting so the structure can be read at a glance and
checked against a hand count.

Usage:  python3 scripts/elliott-tree.py /tmp/tasi30m.json
"""
import json
import sys
import datetime

DEGREE_RANK = {"major": 0, "minor": 1, "sub": 2, "deep": 3}


def riyadh(ts):
    if isinstance(ts, str):
        return ts
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc)


def main():
    d = json.load(open(sys.argv[1]))
    candles = d["candles"]
    labels = [l for l in d["labels"] if not l.get("alternate")]

    def price(l):
        return l["price"] if l["price"] is not None else candles[l["index"]]["close"]

    by_degree = {}
    for l in labels:
        by_degree.setdefault(l["degree"], []).append(l)
    for lst in by_degree.values():
        lst.sort(key=lambda x: x["index"])

    print("=== counts per degree ===")
    for degree in sorted(by_degree, key=lambda x: DEGREE_RANK.get(x, 9)):
        lst = by_degree[degree]
        seq = " ".join(l["label"] for l in lst)
        print(f"\n{degree}  ({len(lst)})   {seq}")
        for l in lst:
            t = riyadh(candles[l["index"]]["time"])
            t = t if isinstance(t, str) else t.strftime("%m-%d %H:%M")
            print(f"    {l['label']:6s} {price(l):9.2f}  {t}")

    # Structure: split each degree's labels into runs of impulses (1..5) and
    # corrections (A..C), so the nesting reads top-down.
    print("\n=== structure (impulse runs / correction runs) ===")
    for degree in sorted(by_degree, key=lambda x: DEGREE_RANK.get(x, 9)):
        lst = by_degree[degree]
        runs, cur = [], []
        for l in lst:
            is_imp = l["label"] in ("1", "2", "3", "4", "5", "I", "II", "III", "IV", "V",
                                    "i", "ii", "iii", "iv", "v", "(1)", "(2)", "(3)", "(4)", "(5)")
            if cur and is_imp != cur[0][1]:
                runs.append(cur)
                cur = []
            cur.append((l, is_imp))
        if cur:
            runs.append(cur)
        parts = []
        for run in runs:
            kind = "impulse" if run[0][1] else "corrective"
            parts.append(f"{kind}[{' '.join(l['label'] for l, _ in run)}]")
        print(f"  {degree:6s}  " + "  ->  ".join(parts))


if __name__ == "__main__":
    main()
