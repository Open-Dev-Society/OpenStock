#!/usr/bin/env python3
"""Scan screen stocks: Elliott (strict) + Fibonacci + RSI(14) + hypothetical scenarios.

Per symbol:
  1) primary count  = first valid impulse (0-5) else first valid ABC
  2) "next" count   = first valid structure AFTER the primary count's last pivot
  3) "tail" count   = the UNFINISHED structure at the right edge, labelled in progress
                      (0/1/2/3 on confirmed pivots + live leg as '4?' or A/B/C?)
  4) Fibonacci levels of the last significant leg
  5) two hypothetical scenarios (?) — never predictions

Rules mirrored from lib/indicators.ts (zigzag + labelImpulse): alternating pivots,
distinct bars, wave2 holds start, wave4 no overlap, wave3 exceeds w1 & not shortest.
ABC: B retrace 10-100% of A; C takes out A (classic) or >=10% of B (running).
"""
import json, os, urllib.request, datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
import arabic_reshaper
from bidi.algorithm import get_display

C_IMP = '#2962FF'   # primary impulse
C_ABC = '#8E24AA'   # primary ABC
C_NIM = '#00897B'   # next impulse
C_NAB = '#C2185B'   # next ABC
C_TIM = '#00ACC1'   # tail impulse (in progress)
C_TAB = '#AD1457'   # tail ABC (in progress)
C_ASK = '#455A64'   # unresolved '?'


def ar_text(s):
    """Correct RTL rendering for Arabic labels in matplotlib."""
    return get_display(arabic_reshaper.reshape(s))


def fetch(sym):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=1y"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    d = json.load(urllib.request.urlopen(req, timeout=25))
    r = d['chart']['result'][0]
    q = r['indicators']['quote'][0]
    rows = []
    for i, t in enumerate(r['timestamp']):
        o, h, l, c = q['open'][i], q['high'][i], q['low'][i], q['close'][i]
        if None in (o, h, l, c):
            continue
        dt = datetime.datetime.fromtimestamp(t, datetime.timezone.utc) + datetime.timedelta(hours=3)
        rows.append((dt.strftime('%Y-%m-%d'), o, h, l, c))
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
                    pivs.append((eLi, eL, 'low'))
                pivs.append((eHi, eH, 'high'))
                trend, eL, eLi = -1, L[i], i
                continue
        if trend <= 0:
            if L[i] < eL:
                eL, eLi = L[i], i
            if (H[i] - eL) / eL * 100 >= dev:
                pivs.append((eLi, eL, 'low'))
                trend, eH, eHi = 1, H[i], i
    if trend > 0:
        pivs.append((eHi, eH, 'high'))
    elif trend < 0:
        pivs.append((eLi, eL, 'low'))
    else:
        pivs.append((n - 1, C[-1], 'low'))
    return [p for j, p in enumerate(pivs) if j == 0 or p[0] != pivs[j - 1][0]]


def merge(pivs):
    mp = []
    for p in pivs:
        if mp and mp[-1][2] == p[2]:
            if p[2] == 'high' and p[1] > mp[-1][1]:
                mp[-1] = p
            elif p[2] == 'low' and p[1] < mp[-1][1]:
                mp[-1] = p
        else:
            mp.append(p)
    return mp


def test6(w):
    if len(w) < 6:
        return None
    p = w[:6]
    if not all(p[i][2] != p[i - 1][2] for i in range(1, 6)):
        return None
    if any(p[i][0] == p[i - 1][0] for i in range(1, 6)):
        return None
    up = p[1][1] > p[0][1]
    if up and p[0][2] != 'low':
        return None
    if not up and p[0][2] != 'high':
        return None
    l1, l3, l5 = abs(p[1][1] - p[0][1]), abs(p[3][1] - p[2][1]), abs(p[5][1] - p[4][1])
    if up:
        if p[2][1] <= p[0][1] or p[4][1] <= p[1][1] or p[3][1] <= p[1][1]:
            return None
    else:
        if p[2][1] >= p[0][1] or p[4][1] >= p[1][1] or p[3][1] >= p[1][1]:
            return None
    if not (l3 >= min(l1, l5)):
        return None
    return {'up': up}


def test_abc(p):
    if len(p) < 4:
        return None
    if not all(p[i][2] != p[i - 1][2] for i in range(1, 4)):
        return None
    if any(p[i][0] == p[i - 1][0] for i in range(1, 4)):
        return None
    p0, p1, p2, p3 = p[:4]
    dn = p0[2] == 'high'
    if dn:
        # A = p0->p1 (down), B = p1->p2 (up): B must retrace 10-100% of A's length
        span = p0[1] - p1[1]
        if span <= 0:
            return None
        rb = (p2[1] - p1[1]) / span
    else:
        # A = p0->p1 (up), B = p1->p2 (down): B must retrace 10-100% of A's length
        span = p1[1] - p0[1]
        if span <= 0:
            return None
        rb = (p1[1] - p2[1]) / span
    if not (0.1 <= rb <= 1.0):
        return None
    classic = (p3[1] < p1[1]) if dn else (p3[1] > p1[1])
    c = abs(p3[1] - p2[1]); b = abs(p2[1] - p1[1])
    running = b > 0 and c >= 0.1 * b
    if not (classic or running):
        return None
    return {'down': dn, 'kind': 'classic' if classic else 'running'}


def find_next(mp, after_bar):
    """First valid structure (impulse, else ABC) strictly AFTER a given bar index."""
    rest = [p for p in mp if p[0] > after_bar]
    for s in range(len(rest) - 5):
        r = test6(rest[s:s + 6])
        if r:
            return ('impulse', rest[s:s + 6], r)
    for s in range(len(rest) - 3):
        r = test_abc(rest[s:s + 4])
        if r:
            return ('abc', rest[s:s + 4], r)
    return None


def live_extreme(after_bar, ctx_up, H, L, C, n):
    """Current live swing extreme after a pivot: highest high (up ctx) or lowest low."""
    if after_bar >= n - 1:
        return (n - 1, C[-1])
    seg = range(after_bar + 1, n)
    if ctx_up:
        i = max(seg, key=lambda k: H[k])
        return (i, H[i])
    i = min(seg, key=lambda k: L[k])
    return (i, L[i])


def tail_labels(rem, ctx_up, H, L, C, n):
    """Label the UNFINISHED structure at the right edge.

    Convention: rem[i] ends wave i (rem[0] = '0' origin). The live leg is drawn at
    the LAST CLOSE with a '?' because it is still forming. If price has already
    pushed beyond the last pivot in the direction of the wave that was supposed to
    end there, that pivot was only intermediate -> it is marked 'i' and the wave
    number stays open (e.g. '1?' instead of a finished '1' + '2?').
    """
    if not rem:
        return []
    close = C[-1]
    k = min(len(rem), 4)

    def imp_dir(w):          # direction of impulse wave w (1-based)
        if ctx_up:
            return +1 if w % 2 == 1 else -1
        return -1 if w % 2 == 1 else +1

    def corr_dir(w):         # direction of correction wave w (1=A, 2=B, 3=C)
        if ctx_up:            # correction runs against an up-impulse => down first
            return -1 if w % 2 == 1 else +1
        return +1 if w % 2 == 1 else -1

    # ---- impulse in progress ----
    ok = True
    if ctx_up:
        if k >= 3 and rem[2][1] <= rem[0][1]:
            ok = False
        if k >= 4 and rem[3][1] <= rem[1][1]:
            ok = False
    else:
        if k >= 3 and rem[2][1] >= rem[0][1]:
            ok = False
        if k >= 4 and rem[3][1] >= rem[1][1]:
            ok = False
    if ok and k >= 4:
        seg_lo = min(L[rem[3][0]:n]); seg_hi = max(H[rem[3][0]:n])
        if ctx_up and seg_lo <= rem[0][1]:
            ok = False
        if (not ctx_up) and seg_hi >= rem[0][1]:
            ok = False

    if ok:
        labs = [(rem[i][0], rem[i][1], str(i), 'imp') for i in range(k)]
        if k == 1:
            labs.append((n - 1, close, '1?', 'imp'))
            return labs
        W = k - 1                      # waves 1..W considered finished
        last = rem[k - 1]
        live_dir = +1 if close > last[1] else -1
        if live_dir == imp_dir(W):    # last wave never ended -> pivot was intermediate
            labs[-1] = (last[0], last[1], 'i', 'imp')
            labs.append((n - 1, close, f'{W}?', 'imp'))
        else:
            labs.append((n - 1, close, f'{W + 1}?', 'imp'))
        return labs

    # ---- correction in progress (A-B-C) ----
    labs = []
    if k >= 2:
        labs.append((rem[1][0], rem[1][1], 'A', 'abc'))
    if k >= 3:
        labs.append((rem[2][0], rem[2][1], 'B', 'abc'))
    if k == 1:
        labs.append((n - 1, close, 'A?', 'abc'))
        return labs
    W = k - 1                          # A..W finished
    last = rem[k - 1]
    live_dir = +1 if close > last[1] else -1
    if live_dir == corr_dir(W + 1):   # next wave started at the last pivot
        labs.append((n - 1, close, f'{"ABCD"[min(W, 3)]}?', 'abc'))
    else:                             # last wave still running -> pivot intermediate
        if labs:
            labs[-1] = (labs[-1][0], labs[-1][1], labs[-1][2] + '?', 'abc')
        labs.append((n - 1, close, f'{W}?', 'abc'))
    return labs


def ma(vals, p):
    out, s = [], 0.0
    for i, v in enumerate(vals):
        s += v
        if i >= p:
            s -= vals[i - p]
        out.append(s / min(i + 1, p) if i + 1 >= p else None)
    return out


def rsi(C, p=14):
    """Wilder RSI, mirrors lib/indicators.ts rsi()."""
    if len(C) <= p:
        return [None] * len(C)
    gains = losses = 0.0
    for i in range(1, p + 1):
        ch = C[i] - C[i - 1]
        gains += max(ch, 0); losses += max(-ch, 0)
    ag, al = gains / p, losses / p
    out = [None] * p
    out.append(100 - 100 / (1 + (ag / al if al else 1e9)))
    for i in range(p + 1, len(C)):
        ch = C[i] - C[i - 1]
        ag = (ag * (p - 1) + max(ch, 0)) / p
        al = (al * (p - 1) + max(-ch, 0)) / p
        out.append(100 - 100 / (1 + (ag / al if al else 1e9)))
    return out


def _dir(a, b):
    return +1 if b > a else -1


def partial_labels(pivs, H, L, C, n):
    """Label an unfinished structure (confirmed pivots only).

    pivs[0] = origin (NOT labelled — the wave that starts there is wave 1).
    pivs[1] ends wave 1 -> '1', pivs[2] ends wave 2 -> '2', ...
    The live leg is drawn at the LAST CLOSE with '?' because it is still forming.
    If price is still travelling in the direction of the last labelled wave, that
    wave never ended: its pivot is only intermediate ('i') and the number stays
    open (e.g. '2?').

    Both readings are validated with the strict rules:
      impulse : wave 2 holds the start, wave 3 exceeds wave 1, wave 4 no overlap
      ABC     : B retraces 10-100% of A, C takes out A (classic) or runs (>=10% of B)
    If neither reading validates, only the origin and a '?' are returned.
    """
    if not pivs:
        return []
    close = C[-1]
    if len(pivs) > 4:                      # keep the origin + the 3 newest pivots
        pivs = [pivs[0]] + list(pivs[-3:])
    if len(pivs) == 1:                    # only the origin: wave 1 is running
        return [(pivs[0][0], pivs[0][1], '', 'imp'), (n - 1, close, '1?', 'imp')]

    d = _dir(pivs[0][1], pivs[1][1])          # direction of the first leg
    k = min(len(pivs), 4)
    sub = pivs[:k]
    o = sub[0][1]

    # ---------------- impulse reading ----------------
    imp_ok = True
    if d > 0:
        if k >= 3 and sub[2][1] <= o:               # wave 2 must hold the origin
            imp_ok = False
        if k >= 4 and sub[3][1] <= sub[1][1]:       # wave 3 must exceed wave 1
            imp_ok = False
    else:
        if k >= 3 and sub[2][1] >= o:
            imp_ok = False
        if k >= 4 and sub[3][1] >= sub[1][1]:
            imp_ok = False
    if imp_ok and k >= 4:
        # the live wave (4) must not overlap wave 1
        seg_lo = min(L[sub[3][0]:n]); seg_hi = max(H[sub[3][0]:n])
        if d > 0 and seg_lo <= sub[1][1]:
            imp_ok = False
        if d < 0 and seg_hi >= sub[1][1]:
            imp_ok = False

    if imp_ok:
        labs = [(sub[0][0], sub[0][1], '', 'imp')]          # origin, unlabelled
        labs += [(sub[i][0], sub[i][1], str(i), 'imp') for i in range(1, k)]
        W = k - 1                                          # waves 1..W finished
        last = sub[-1]
        live_dir = _dir(last[1], close)
        wave_dir = (lambda w: d if w % 2 == 1 else -d)
        still_running = live_dir == wave_dir(W)
        W_live = W if still_running else W + 1
        # the live leg must obey the rule of the wave it belongs to
        ext_hi = max(H[last[0]:n]); ext_lo = min(L[last[0]:n])
        w1_end = sub[1][1] if len(sub) > 1 else o
        if W_live == 2:
            live_ok = (ext_lo > o) if d > 0 else (ext_hi < o)
        elif W_live == 3:
            live_ok = (ext_hi > w1_end) if d > 0 else (ext_lo < w1_end)
        elif W_live == 4:
            live_ok = (ext_lo > w1_end) if d > 0 else (ext_hi < w1_end)
        else:
            live_ok = True
        if not live_ok:
            imp_ok = False
        else:
            if still_running:                             # that wave never ended
                labs[-1] = (last[0], last[1], 'i', 'imp')
                labs.append((n - 1, close, f'{W}?', 'imp'))
            else:
                labs.append((n - 1, close, f'{W + 1}?', 'imp'))
            return labs

    # ---------------- correction reading (A-B-C) ----------------
    letters = ['A', 'B', 'C']
    abc_ok = False
    labs = []
    if k >= 2:
        A_len = abs(sub[1][1] - o)
        if A_len > 0:
            if k >= 3:
                rb = abs(sub[2][1] - sub[1][1]) / A_len
                abc_ok = 0.1 <= rb <= 1.0
            else:
                abc_ok = True
    if abc_ok:
        labs = [(sub[0][0], sub[0][1], '', 'abc')]             # origin, unlabelled
        labs += [(sub[i][0], sub[i][1], letters[i - 1], 'abc') for i in range(1, min(k, 4))]
        W = len(labs) - 1
        if W == 0:
            labs.append((n - 1, close, 'A?', 'abc'))
            return labs
        last = sub[W]
        live_dir = _dir(last[1], close)
        corr_dir = (lambda w: d if w % 2 == 1 else -d)
        if W >= 2:
            # C must take out A (classic) or run (>=10% of B)
            A_end = sub[1][1]
            c_len = abs(close - last[1])
            b_len = abs(sub[2][1] - sub[1][1])
            classic = (close > A_end) if d > 0 else (close < A_end)
            running = b_len > 0 and c_len >= 0.1 * b_len
            if not (classic or running):
                abc_ok = False
        if abc_ok and W == 3 and live_dir == corr_dir(W + 1):
            # A-B-C complete -> what follows is a FRESH impulse (not a "D" wave)
            labs = [(last[0], last[1], '', 'imp'), (n - 1, close, '1?', 'imp')]
            return labs
        if abc_ok:
            nxt = letters[W] if W < 3 else 'D'
            if live_dir == corr_dir(W + 1):
                labs.append((n - 1, close, f'{nxt}?', 'abc'))
            else:
                labs[-1] = (labs[-1][0], labs[-1][1], 'i', 'abc')
                labs.append((n - 1, close, f'{letters[W - 1]}?', 'abc'))
            return labs

    # ---------------- neither reading validates ----------------
    return [(pivs[0][0], pivs[0][1], '', 'imp'), (n - 1, close, '?', 'imp')]


def auto_dev_pct(H, L, C):
    """Same formula as lib/indicators.ts autoDevPct: ATR% * 2.5, clamped 0.2-6."""
    n = len(C)
    if n < 2 or not C[-1] > 0:
        return 5
    s = cnt = 0
    for i in range(max(0, n - 200), n):
        r = H[i] - L[i]
        if r <= 0:
            continue
        s += r
        cnt += 1
    if not cnt:
        return 5
    atr_pct = (s / cnt / C[-1]) * 100
    return min(6, max(0.2, atr_pct * 2.5))


def recent_count(H, L, C, n, window=90, min_span_pct=4.0):
    """Most recent structure for a focused chart.

    Tries several zigzag sensitivities and keeps the count that is (a) valid on
    both parts, (b) non-trivial in size, (c) explains the most structure (most
    labelled waves) — ties go to the bigger move, then the more recent one.
    A hand count on the daily frame works on 3-5% legs, so fine sensitivities
    are included (the app's own autoDevPct is used as the centre of the search).
    """
    auto = auto_dev_pct(H, L, C)
    devs = {2, 3, 4, 5, 6, 8, 10, 12}
    for k in (0.5, 0.7, 1.0, 1.3, 1.6):
        devs.add(round(auto * k, 1))
    best = None
    for dev in sorted(devs):
        rc = _count_at_dev(H, L, C, n, dev, window)
        if not rc:
            continue
        if rc['span_pct'] < min_span_pct:
            continue
        key = (rc['n_labels'], rc['span_pct'], rc['last_bar'], -dev)
        if best is None or key > best[0]:
            best = (key, rc)
    if best:
        return best[1]
    return _count_at_dev(H, L, C, n, 6, window) or dict(prev=None, live=None,
                                                       win_start=max(0, n - window),
                                                       dev=6, last_bar=-1, span_pct=0,
                                                       n_labels=0)


def _count_at_dev(H, L, C, n, dev, window=90):
    """Structure for one zigzag sensitivity (see recent_count)."""
    mp = merge(zigzag(H, L, C, dev))
    confirmed = [p for p in mp if p[0] < n - 1]   # last bar's extreme is running
    recent = [p for p in confirmed if p[0] >= n - window]
    if len(recent) < 2:
        return None
    imp = abc = None
    for s in range(len(recent) - 5):
        if test6(recent[s:s + 6]):
            imp = recent[s:s + 6]
    for s in range(len(recent) - 3):
        if test_abc(recent[s:s + 4]):
            abc = recent[s:s + 4]
    prev = None
    if imp and abc:
        prev = ('impulse', imp) if imp[-1][0] >= abc[-1][0] else ('abc', abc)
    elif imp:
        prev = ('impulse', imp)
    elif abc:
        prev = ('abc', abc)

    if prev:
        kind, pts = prev
        if kind == 'impulse':
            label_pts, labels = pts[1:], ['1', '2', '3', '4', '5'][:len(pts) - 1]
        else:
            label_pts, labels = [pts[1], pts[2], pts[3]], ['A', 'B', 'C']
        prev_out = dict(kind=kind, pts=[(p[0], p[1]) for p in pts],
                        label_pts=[(p[0], p[1], p[2]) for p in label_pts],
                        labels=labels, dev=dev)
        base = pts[-1]
        win_start = pts[0][0]
    else:
        prev_out = None
        base = None
        win_start = recent[0][0]

    after = [p for p in confirmed if base is None or p[0] > base[0]]
    if base is not None:
        seq = [base] + after[-3:]
    else:
        seq = recent[-4:]
    live_out = None
    labs = partial_labels(seq, H, L, C, n) if seq else []
    if labs:
        labelled = [t for t in labs if t[2]]
        live_out = dict(kind='impulse' if labs[0][3] == 'imp' else 'abc',
                        pts=[(t[0], t[1]) for t in labs],
                        label_pts=[(t[0], t[1], 'low' if t[1] < C[-1] else 'high') for t in labelled],
                        labels=[t[2] for t in labelled], dev=dev)
        win_start = min(win_start, seq[0][0])
    if not (prev_out or live_out):
        return None

    # recency of the last CONFIRMED pivot + size of the move it explains
    bars = [p[0] for p in confirmed if p[0] >= win_start]
    last_bar = max(bars) if bars else -1
    prices = [p[1] for p in confirmed if p[0] >= win_start] + [C[-1]]
    span_pct = (max(prices) - min(prices)) / C[-1] * 100 if prices else 0
    n_labels = len(prev_out['labels']) if prev_out else 0
    if live_out:
        n_labels += len(live_out['labels'])
    return dict(prev=prev_out, live=live_out, win_start=max(0, win_start - 3), dev=dev,
                last_bar=last_bar, span_pct=span_pct, n_labels=n_labels)


def tail_labels(rem, ctx_up, H, L, C, n):
    """Back-compat wrapper: labels the tail pivots (kept for scan_waves.analyze)."""
    return partial_labels(list(rem), H, L, C, n)



def market_open_now(now=None):
    """Tadawul hours: Sun-Thu 10:00-15:00 Asia/Riyadh (UTC+3)."""
    import datetime as _dt
    now = now or _dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(hours=3)
    wd = now.weekday()          # Mon=0 .. Sun=6
    if wd == 4:                 # Friday
        return False
    t = now.hour + now.minute / 60
    return 10 <= t < 15


def hand_count(H, L, C, n, dev=3.0, window=110, include_last=None):
    """Rule-checked count on a fine zigzag (3%).

    EVERY candidate window is validated with the iron rules before it can be
    drawn, so a short wave 3 or an overlapping wave 4 is never labelled:
      impulse 1-5      : wave 2 holds the start, wave 3 exceeds wave 1, wave 4
                         does not overlap wave 1, wave 3 is never the shortest
      impulse 1-4 + 5? : same checks on the confirmed waves
      A-B-C            : B retraces 10-100% of A, C takes out A (classic) or runs
    The most recent VALID window wins. What follows it is labelled as the
    correction ('A?') after an impulse, or the new impulse ('1?') after a
    correction. If nothing validates, nothing is labelled (no forced counts).
    """
    mp = merge(zigzag(H, L, C, dev))
    # while the market is open today's bar is still forming: its extreme is a
    # running value, not a confirmed pivot
    confirmed = list(mp) if (include_last if include_last is not None else not market_open_now()) \
        else [p for p in mp if p[0] < n - 1]
    recent = [p for p in confirmed if p[0] >= n - window]
    if len(recent) < 4:
        recent = confirmed[-4:]
    if len(recent) < 3:
        return None

    def alt(seq):
        return all(seq[i][2] != seq[i - 1][2] for i in range(1, len(seq)))

    def impulse5(seq):        # 6 pivots: origin + waves 1..5
        if len(seq) < 6 or not alt(seq):
            return False
        d = _dir(seq[0][1], seq[1][1])
        if d > 0:
            if seq[2][1] <= seq[0][1] or seq[3][1] <= seq[1][1] or seq[4][1] <= seq[1][1]:
                return False
        else:
            if seq[2][1] >= seq[0][1] or seq[3][1] >= seq[1][1] or seq[4][1] >= seq[1][1]:
                return False
        l1 = abs(seq[1][1] - seq[0][1]); l3 = abs(seq[3][1] - seq[2][1])
        l5 = abs(seq[5][1] - seq[4][1])
        return l3 >= min(l1, l5)                    # wave 3 is never the shortest

    def impulse4(seq):        # 5 pivots: origin + waves 1..4 (wave 5 is live)
        if len(seq) < 5 or not alt(seq):
            return False
        d = _dir(seq[0][1], seq[1][1])
        if d > 0:
            if seq[2][1] <= seq[0][1] or seq[3][1] <= seq[1][1] or seq[4][1] <= seq[1][1]:
                return False
        else:
            if seq[2][1] >= seq[0][1] or seq[3][1] >= seq[1][1] or seq[4][1] >= seq[1][1]:
                return False
        l1 = abs(seq[1][1] - seq[0][1]); l3 = abs(seq[3][1] - seq[2][1])
        return l3 > l1

    def abc4(seq):            # 4 pivots: origin + A,B,C
        if len(seq) < 4 or not alt(seq):
            return False
        d = _dir(seq[0][1], seq[1][1])
        if _dir(seq[1][1], seq[2][1]) == d:
            return False
        a_len = abs(seq[1][1] - seq[0][1])
        rb = abs(seq[2][1] - seq[1][1]) / a_len if a_len else 0
        if not (0.1 <= rb <= 1.0):
            return False
        if _dir(seq[2][1], seq[3][1]) != d:
            return False
        classic = (seq[3][1] > seq[1][1]) if d > 0 else (seq[3][1] < seq[1][1])
        c_len = abs(seq[3][1] - seq[2][1]); b_len = abs(seq[2][1] - seq[1][1])
        return classic or (b_len > 0 and c_len >= 0.1 * b_len)

    cands = []
    for s in range(len(recent) - 5):
        seq = recent[s:s + 6]
        if impulse5(seq):
            cands.append(('impulse', seq, ['1', '2', '3', '4', '5']))
    for s in range(len(recent) - 4):
        seq = recent[s:s + 5]
        if impulse4(seq):
            cands.append(('impulse4', seq, ['1', '2', '3', '4']))
    for s in range(len(recent) - 3):
        seq = recent[s:s + 4]
        if abc4(seq):
            cands.append(('abc', seq, ['A', 'B', 'C']))
    if not cands:
        return None

    def live_prefix(after, base, live_kind):
        """Longest prefix of the live structure that obeys the rules."""
        for k in range(min(3, len(after)), 0, -1):
            sub = after[:k]
            ok = True
            if live_kind == 'imp':
                if k >= 2:                       # wave 2 must hold the start
                    if sub[1][1] <= base[1]:
                        ok = False
                    lo = min(L[sub[0][0]:sub[1][0] + 1])
                    if lo <= base[1]:
                        ok = False
                if k >= 3 and sub[2][1] <= sub[0][1]:   # wave 3 exceeds wave 1
                    ok = False
            else:
                if k >= 2:                       # B retraces 10-100% of A
                    a_len = abs(sub[0][1] - base[1])
                    rb = abs(sub[1][1] - sub[0][1]) / a_len if a_len else 0
                    if not (0.1 <= rb <= 1.0):
                        ok = False
            if ok:
                return sub
        return []

    def coverage(seq, live_kind):
        aft = live_prefix([p for p in confirmed if p[0] > seq[-1][0]], seq[-1], live_kind)
        return (aft[-1][0] if aft else seq[-1][0], len(aft))

    # the count that reaches the live edge wins; ties -> the one with the
    # richest live structure, then the most recent window
    def live_kind_of(kind):
        return 'imp' if kind == 'abc' else 'abc'   # after a correction -> impulse

    def sort_key(c):
        kind, seq, labs = c
        lk = live_kind_of(kind)
        cov = coverage(seq, lk)
        return (cov[0], cov[1], seq[-1][0])

    cands.sort(key=sort_key, reverse=True)
    kind, seq, labels = cands[0]
    label_pts = seq[1:]
    base = seq[-1]
    after = live_prefix([p for p in confirmed if p[0] > base[0]], base,
                        'imp' if kind == 'abc' else 'abc')

    prev = dict(kind='impulse' if kind.startswith('impulse') else 'abc',
                pts=[(p[0], p[1]) for p in seq],
                label_pts=[(p[0], p[1], p[2]) for p in label_pts], labels=labels, dev=dev)

    # the live move: a correction after an impulse, a new impulse after a correction
    if kind.startswith('impulse'):
        live_kind, live_labels = 'abc', ['A', 'B', 'C']
    else:
        live_kind, live_labels = 'imp', ['1', '2', '3']
    live_pts = [(base[0], base[1])]
    live_lbl_pts = []
    live_labs = []
    close = C[-1]
    for i, p in enumerate(after[:3]):
        live_pts.append((p[0], p[1]))
        live_lbl_pts.append((p[0], p[1], p[2]))
        live_labs.append(live_labels[i] if i < len(live_labels) else '?')
    if live_labs:
        # a wave that ends on today's bar is still forming (it may extend) -> '?'
        if live_pts[-1][0] >= n - 1:
            live_labs[-1] = live_labs[-1] + '?'
    else:
        live_pts.append((n - 1, close))
        live_lbl_pts.append((n - 1, C[-1], 'high' if C[-1] >= base[1] else 'low'))
        live_labs.append(('1?' if live_kind == 'imp' else 'A?'))
    live = dict(kind='impulse' if live_kind == 'imp' else 'abc', pts=live_pts,
                label_pts=live_lbl_pts, labels=live_labs, dev=dev)

    return dict(prev=prev, live=live, win_start=max(0, seq[0][0] - 3), dev=dev, flags=[],
                last_bar=seq[-1][0],
                span_pct=(max(p[1] for p in seq) - min(p[1] for p in seq)) / C[-1] * 100,
                n_labels=len(labels) + len(live_labs))


def analyze(rows):
    dates = [r[0] for r in rows]; O = [r[1] for r in rows]
    H = [r[2] for r in rows]; L = [r[3] for r in rows]; C = [r[4] for r in rows]
    n = len(rows)
    imp = abc = nxt = None
    pivs = tail = None
    for dev in (6, 8, 10, 12):
        mp = merge(zigzag(H, L, C, dev))
        f_imp = f_abc = None
        for s in range(len(mp) - 5):
            r = test6(mp[s:s + 6])
            if r:
                f_imp = (dev, mp[s:s + 6], r)
                break
        if not f_imp:
            for s in range(len(mp) - 3):
                r = test_abc(mp[s:s + 4])
                if r:
                    f_abc = (dev, mp[s:s + 4], r)
                    break
        if not (f_imp or f_abc):
            continue
        pivs = mp
        if f_imp:
            imp = f_imp
        else:
            abc = f_abc
        last_bar = (imp or abc)[1][-1][0]
        nx = find_next(mp, last_bar)
        if nx:
            nxt = (dev,) + nx
            last_bar = max(last_bar, nx[1][-1][0])
        rem = [p for p in mp if p[0] > last_bar]
        ctx_up = mp[-1][2] == 'low' if mp else True
        if rem:
            tl = tail_labels(rem, ctx_up, H, L, C, n)
            if tl:
                tail = tl
        break
    return dict(dates=dates, O=O, H=H, L=L, C=C, n=n, imp=imp, abc=abc, nxt=nxt,
                pivs=pivs, tail=tail, rsi=rsi(C))


def label_pivots(ax, w, labs, color, H, L):
    """Draw pivot badges, nudging labels that would overlap a previous one."""
    rng = max(H) - min(L)
    placed = []
    cands = [(0, 0), (0.9, 0), (-0.9, 0), (1.8, 0), (-1.8, 0), (0, 0.035), (0, -0.035),
             (1.2, 0.035), (-1.2, -0.035), (2.4, 0), (-2.4, 0), (0, 0.07), (0, -0.07)]
    for (ix, px, typ), lab in zip(w, labs):
        base = rng * 0.022 * (1 if typ == 'high' else -1)
        tx, ty = ix, px + base
        for dx, dy in cands:
            cx, cy = ix + dx, px + base + dy * rng
            if not any(abs(cx - qx) < 2.2 and abs(cy - qy) < rng * 0.05 for qx, qy in placed):
                tx, ty = cx, cy
                break
        placed.append((tx, ty))
        ax.text(tx, ty, lab, fontsize=11, fontweight='bold', color='white', ha='center', zorder=6,
                bbox=dict(facecolor=color, edgecolor='black', boxstyle='circle,pad=0.3'))


def draw(sym, name, rows, a, outpath, mini=False):
    dates, O, H, L, C, n = a['dates'], a['O'], a['H'], a['L'], a['C'], a['n']
    imp, abc, nxt, pivs, tail = a['imp'], a['abc'], a['nxt'], a['pivs'], a['tail']
    if mini:
        fig, (ax, axr) = plt.subplots(2, 1, figsize=(4.6, 3.3), gridspec_kw={'height_ratios': [3, 1]}, sharex=True)
    else:
        fig, (ax, axr) = plt.subplots(2, 1, figsize=(14, 7.8), gridspec_kw={'height_ratios': [2.5, 1.1]}, sharex=True)
    for i in range(n):
        col = '#26a69a' if C[i] >= O[i] else '#ef5350'
        ax.plot([i, i], [L[i], H[i]], color=col, lw=0.8)
        b = min(O[i], C[i])
        ax.add_patch(Rectangle((i - 0.35, b), 0.7, abs(C[i] - O[i]) or 0.01, facecolor=col, edgecolor=col, lw=0))
    m20 = ma(C, 20); m50 = ma(C, 50)
    ax.plot([i for i in range(n) if m20[i]], [m20[i] for i in range(n) if m20[i]], color='#2962FF', lw=1, alpha=0.5)
    ax.plot([i for i in range(n) if m50[i]], [m50[i] for i in range(n) if m50[i]], color='#EF6C00', lw=1, alpha=0.5)

    tag = ''
    if imp:
        dev, w, r = imp
        ax.plot([p[0] for p in w], [p[1] for p in w], color=C_IMP, lw=1.8, marker='o', ms=3, zorder=5)
        label_pivots(ax, w, list('012345'), C_IMP, H, L)
        tag = f"impulse {'UP' if r['up'] else 'DOWN'} ok (dev={dev}%)"
    elif abc:
        dev, w, r = abc
        ax.plot([p[0] for p in w], [p[1] for p in w], color=C_ABC, lw=1.8, marker='o', ms=3, zorder=5)
        label_pivots(ax, [w[1], w[2], w[3]], ['A', 'B', 'C'], C_ABC, H, L)
        tag = f"ABC {r['kind']} ok (dev={dev}%)"
    else:
        tag = 'no clean impulse/ABC on 1y daily'

    # ---- next structure after the primary count ----
    nxt_tag = 'no structure after primary count'
    if nxt:
        dev, kind, w, r = nxt
        col = C_NIM if kind == 'impulse' else C_NAB
        ax.plot([p[0] for p in w], [p[1] for p in w], color=col, lw=1.8, marker='o', ms=3, zorder=5)
        if kind == 'impulse':
            label_pivots(ax, w, list('012345'), col, H, L)
            nxt_tag = f"next impulse {'UP' if r['up'] else 'DOWN'} ok (dev={dev}%)"
        else:
            label_pivots(ax, [w[1], w[2], w[3]], ['A', 'B', 'C'], col, H, L)
            nxt_tag = f"next ABC {r['kind']} ok (dev={dev}%)"

    # ---- tail: unfinished structure at the right edge (always labelled) ----
    tail_tag = 'tail: unresolved'
    if tail:
        col = C_TIM if tail[0][3] == 'imp' else C_TAB
        ax.plot([t[0] for t in tail], [t[1] for t in tail], color=col, lw=1.6, ls='-',
                marker='o', ms=3, zorder=5)
        label_pivots(ax, [(t[0], t[1], 'high' if t[1] > 0 else 'low') for t in tail],
                     [t[2] for t in tail], col, H, L)
        kind = 'impulse' if tail[0][3] == 'imp' else 'ABC'
        tail_tag = f"tail {kind} in progress"
    elif pivs:
        lp = pivs[-1]
        ax.plot([lp[0]], [lp[1]], marker='D', ms=6, color=C_ASK, zorder=6)
        ax.text(lp[0], lp[1] + (max(H) - min(L)) * 0.03, '?', fontsize=12, fontweight='bold',
                color=C_ASK, ha='center', zorder=6)

    # Fibonacci of last significant leg
    fib_note = ''
    if pivs and len(pivs) >= 2:
        pa, pb = pivs[-2], pivs[-1]
        hi, lo = max(pa[1], pb[1]), min(pa[1], pb[1])
        rng = hi - lo
        if rng > 0:
            for rr, lab in ((0.236, '23.6'), (0.382, '38.2'), (0.5, '50'), (0.618, '61.8')):
                lv = lo + rng * rr if pb[2] == 'low' else hi - rng * rr
                ax.axhline(lv, color='#9E9E9E', ls=':', lw=0.9, alpha=0.8)
                ax.text(n + 0.3, lv, lab, fontsize=7.5, color='#616161', va='center', clip_on=False,
                        bbox=dict(facecolor='white', edgecolor='none', alpha=0.6, pad=0.5))
            fib_note = f"fib last leg {pa[1]:.2f}->{pb[1]:.2f}"

    # Scenarios (hypothetical, always '?')
    close = C[-1]
    tgt_up = tgt_dn = None
    if pivs and len(pivs) >= 2:
        pa, pb = pivs[-2], pivs[-1]
        hi, lo = max(pa[1], pb[1]), min(pa[1], pb[1])
        rng = hi - lo
        if pb[2] == 'low':
            cands = [lo + rng * rr for rr in (0.382, 0.5, 0.618)]
            tgt_up = next((x for x in cands if x > close), hi + rng * 0.272)
            tgt_dn = lo - rng * 0.272 if close <= lo else lo
        else:
            cands = [hi - rng * rr for rr in (0.618, 0.5, 0.382)]
            tgt_up = hi + rng * 0.272 if close >= hi else hi
            tgt_dn = next((x for x in cands if x < close), lo - rng * 0.272)
        if rng > 0 and tgt_up > close > tgt_dn:
            pad = (max(H) - min(L)) * 0.018
            ax.plot([n - 1, n + 4, n + 8], [close, close + (tgt_up - close) * 0.5, tgt_up],
                    color='#2E7D32', lw=1.6, ls='--', marker='o', ms=3, zorder=5)
            ax.text(n + 8.3, tgt_up + pad, f'r?{tgt_up:.2f}', fontsize=8.5, color='white', va='bottom', zorder=6,
                    bbox=dict(facecolor='#2E7D32', edgecolor='black', boxstyle='round,pad=0.2', alpha=0.9))
            ax.plot([n - 1, n + 4, n + 8], [close, close - (close - tgt_dn) * 0.5, tgt_dn],
                    color='#C62828', lw=1.6, ls='--', marker='o', ms=3, zorder=5)
            ax.text(n + 8.3, tgt_dn - pad, f's?{tgt_dn:.2f}', fontsize=8.5, color='white', va='top', zorder=6,
                    bbox=dict(facecolor='#C62828', edgecolor='black', boxstyle='round,pad=0.2', alpha=0.9))

    # ---------- RSI(14) panel ----------
    rv = a['rsi']
    xs = [i for i in range(n) if rv[i] is not None]
    ys = [v for v in rv if v is not None]
    axr.axhspan(70, 100, color='#ef5350', alpha=0.10)
    axr.axhspan(0, 30, color='#26a69a', alpha=0.10)
    axr.axhline(70, color='#ef5350', ls='--', lw=0.9, alpha=0.8)
    axr.axhline(30, color='#26a69a', ls='--', lw=0.9, alpha=0.8)
    axr.axhline(50, color='#9e9e9e', ls=':', lw=0.7, alpha=0.7)
    axr.plot(xs, ys, color='#6A1B9A', lw=1.8)
    axr.fill_between(xs, 30, 70, color='#6A1B9A', alpha=0.06)
    last_r = next((v for v in reversed(rv) if v is not None), None)
    if last_r is not None:
        axr.text(n - 1, last_r, f'RSI14 {last_r:.1f}', fontsize=9, fontweight='bold', color='#6A1B9A',
                 ha='right', va='center', zorder=6,
                 bbox=dict(facecolor='white', edgecolor='#6A1B9A', boxstyle='round,pad=0.25'))
        axr.plot([n - 1], [last_r], marker='o', ms=5, color='#6A1B9A', zorder=6)
    axr.set_ylim(0, 100)
    axr.set_ylabel('RSI 14', fontsize=9, fontweight='bold', color='#6A1B9A')
    axr.grid(alpha=0.25)
    if mini:
        axr.set_xticks([]); axr.set_yticks([30, 50, 70])
        axr.tick_params(labelsize=6)

    if mini:
        short = tag.split(' (')[0].replace(' ok', '')
        nx = ' | ' + nxt_tag.split(' (')[0].replace(' ok', '') if nxt else ''
        tl = ' | ' + tail_tag.split(' ')[1] if tail else ''
        ax.set_title(f"{sym} {name} | {short}{nx}{tl}", fontsize=8.5)
        ax.set_xticks([]); ax.set_yticks([])
    else:
        title = f"{sym} {name} | close {close:.2f} | {tag} | {nxt_tag} | {tail_tag}"
        if fib_note:
            title += f" | {fib_note}"
        ax.set_title(title + ' | Yahoo delayed, scenarios ? hypothetical, study only', fontsize=9.5)
        ax.set_xticks(range(0, n, max(1, n // 8)))
        ax.set_xticklabels([dates[i] for i in range(0, n, max(1, n // 8))], rotation=45, fontsize=8)
        ax.grid(alpha=0.3)
        ax.set_xlim(-3, n + 13)
    fig.tight_layout()
    fig.savefig(outpath, dpi=100)
    plt.close(fig)
    return tag, nxt_tag, tail_tag


if __name__ == '__main__':
    import re
    src = open('lib/tadawul-companies.ts').read()
    names_en = {s + '.SR': n for s, n, a in re.findall(r"symbol: '(\d+)\.SR', name: '([^']+)'(?:, ar: '([^']+)')?", src)}
    raw_names = {s + '.SR': (a or n) for s, n, a in re.findall(r"symbol: '(\d+)\.SR', name: '([^']+)'(?:, ar: '([^']+)')?", src)}
    raw_names.update({
        '2083.SR': 'الطاقة والمياه للصافي والينبع',
        '4142.SR': 'مجموعة الرياض للأسلاك',
    })
    res = json.load(open('/tmp/screen_up3.json'))[:16]
    outdir = '/Users/mishalajmi/Desktop/التحليل/SCAN-10-19'
    os.makedirs(outdir, exist_ok=True)
    summary = []
    minis = []
    for r in res:
        sym = r['sym']
        rows = fetch(sym)
        a = analyze(rows)
        name = ar_text(raw_names.get(sym, names_en.get(sym, ''))[:32])
        fp = os.path.join(outdir, f"{sym}.png")
        tag, nxt_tag, tail_tag = draw(sym, name, rows, a, fp)
        mfp = os.path.join(outdir, f"_{sym}-mini.png")
        draw(sym, name, rows, a, mfp, mini=True)
        minis.append(mfp)
        summary.append((sym, name, tag, nxt_tag, tail_tag))
        print(f"{sym:9} {tag:30} | {nxt_tag:30} | {tail_tag}")

    grid = plt.figure(figsize=(17, 15))
    for i, mfp in enumerate(minis):
        img = plt.imread(mfp)
        axi = grid.add_subplot(4, 4, i + 1)
        axi.imshow(img); axi.axis('off')
    grid.suptitle('Tadawul scan 19-10-2026: Elliott + next + tail + fib + RSI14 + scenarios (?) — Yahoo delayed, study only', fontsize=13)
    grid.tight_layout(rect=[0, 0, 1, 0.97])
    grid.savefig(os.path.join(outdir, '_GRID-16.png'), dpi=100)
    print('grid saved')
    json.dump(summary, open('/tmp/scan_waves_summary.json', 'w'))
