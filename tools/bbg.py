"""Vẽ sơ đồ phong cách tech-architecture-diagram (khối pastel, icon phẳng, mũi tên đánh số)
cho các hình trong bài học, và chèn CSS + defs dùng chung vào trang.

    from bbg import *
    s = svg(1100, 460, "mô tả", node(...) + arrow(...) + badge(...))
    replace_fig(path, index, s, legend=[...])
"""
import re
from html import escape as _e
from pathlib import Path

COLORS = {
    "blue": ("#dbeafe", "#3b82f6"), "green": ("#dcfce7", "#16a34a"), "yellow": ("#fef9c3", "#ca8a04"),
    "orange": ("#ffedd5", "#ea580c"), "purple": ("#ede9fe", "#7c3aed"), "pink": ("#fce7f3", "#db2777"),
    "gray": ("#f1f5f9", "#94a3b8"), "red": ("#fee2e2", "#dc2626"), "teal": ("#ccfbf1", "#0d9488"),
}
INK, MUTED, LINE = "#1e293b", "#64748b", "#334155"

CSS = """<!-- bbg:css -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
  /* Hình vẽ theo phong cách tech-architecture-diagram: card trắng như một tấm ảnh trên nền tối */
  .fig.bbg{width:min(1060px,calc(100vw - 32px));position:relative;left:50%;transform:translateX(-50%);}
  .example-box .fig.bbg{width:auto;left:0;transform:none;}
  .bbg-card{background:#fff;border-radius:18px;box-shadow:0 14px 36px rgba(0,0,0,.35);padding:16px clamp(10px,2vw,22px) 12px;color:#1e293b;}
  .bbg-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 16px;margin:0 0 8px;font:500 12.5px/1.4 Inter,system-ui,sans-serif;color:#64748b;}
  .bbg-legend span{display:inline-flex;align-items:center;gap:7px}
  .bbg-legend .sw{width:14px;height:14px;border-radius:4px;border:2px solid}
  .bbg-legend .lnk{width:26px;height:0;border-top:2.2px solid #334155}
  .bbg-legend .lnk.d{border-top-style:dashed}
  .bbg-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .fig.bbg svg.bbg-svg{width:100%;min-width:760px;height:auto;display:block}
  .bbg svg text{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:12px;letter-spacing:0}
  .bbg svg text{white-space:pre}
  .bbg svg text:not([fill]){fill:#1e293b}
  .bbg svg text.bb-l{font-size:16px;font-weight:700}
  .bbg svg text.bb-s{font-size:11.5px;font-weight:500} .bbg svg text.bb-s:not([fill]){fill:#64748b}
  .bbg svg text.bb-m{font-family:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;font-size:12px;font-weight:500}
  .bbg svg text.bb-a:not([fill]){fill:#334155} .bbg svg text.bb-a{font-size:12px;font-weight:600;paint-order:stroke;stroke:#fff;stroke-width:5px;stroke-linejoin:round}
  .bbg svg text.bb-l.bb-m{font-size:15px;font-weight:700}
  .bbg svg text.bb-n{font-size:15px;font-weight:800}
  .bbg svg .bb-node rect{stroke-width:2.5}
  .bbg svg .bb-ar{fill:none;stroke:#334155;stroke-width:2.2;stroke-linejoin:round}
  .bbg svg .bb-ar.d{stroke-dasharray:7 5}
  .bbg svg .bb-badge circle{fill:#1e293b;stroke:#fff;stroke-width:2.5}
  .bbg svg .bb-badge text{fill:#fff;font-size:13px;font-weight:700}
  .bbg svg .bb-grp{fill:#f8fafc;stroke:#94a3b8;stroke-width:2;stroke-dasharray:9 6}
  .bbg svg .bb-gtag text{fill:#fff;font-size:12px;font-weight:700;letter-spacing:.04em}
</style>
<!-- /bbg:css -->"""

ICONS = {
    "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    "browser": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
    "phone": '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
    "cloud": '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z"/>',
    "lb": '<circle cx="12" cy="5" r="3"/><path d="M12 8v8M5 19v-3h14v3"/><circle cx="5" cy="20" r="1.5"/><circle cx="12" cy="20" r="1.5"/><circle cx="19" cy="20" r="1.5"/>',
    "server": '<rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/><path d="M7 6.5h.01M7 17.5h.01"/>',
    "db": '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    "cache": '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    "queue": '<rect x="2" y="7" width="5" height="10" rx="1"/><rect x="9.5" y="7" width="5" height="10" rx="1"/><rect x="17" y="7" width="5" height="10" rx="1"/>',
    "gear": '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    "cpu": '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    "gauge": '<path d="M3.5 17a9 9 0 1 1 17 0"/><path d="M12 14l4-5"/><circle cx="12" cy="14" r="1.6" fill="currentColor"/>',
    "flag": '<path d="M5 22V3"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
    "lock": '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    "key": '<circle cx="8" cy="15" r="4"/><path d="M11 12 20 3M17 6l3 3M15 8l2 2"/>',
    "doc": '<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4M9 12h6M9 16h6"/>',
    "box": '<path d="M12 2 21 7v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "alert": '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h.01"/>',
    "check": '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    "x": '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    "chart": '<path d="M4 20V4M4 20h16"/><path d="m7 15 4-4 3 3 5-6"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    "image": '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    "copy": '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    "split": '<path d="M12 3v6M12 9 5 15v6M12 9l7 6v6"/>',
    "layers": '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    "link": '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    "bot": '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/>',
    "cart": '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11L21 7H6"/>',
    "list": '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    "thread": '<path d="M4 6h16M4 12h10M4 18h13"/>',
    "money": '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
    "disk": '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 12h.01"/>',
    "net": '<path d="M2 12h20M7 7l-5 5 5 5M17 7l5 5-5 5"/>',
    "people": '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M22 20c0-3-2-4.8-5-5.3"/>',
    "terminal": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
    "shield": '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>',
    "target": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
}

DEFS = ("<!-- bbg:defs -->\n<svg width=\"0\" height=\"0\" style=\"position:absolute\" aria-hidden=\"true\"><defs>\n"
        '  <marker id="bb-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#334155"/></marker>\n'
        + "".join(f'  <marker id="bb-ah-{k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{v[1]}"/></marker>\n' for k, v in COLORS.items())
        + '  <pattern id="bb-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#fee2e2"/><line x1="0" y1="0" x2="0" y2="9" stroke="#ef4444" stroke-width="3"/></pattern>\n'
        + "".join(f'  <symbol id="bi-{k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{v}</symbol>\n' for k, v in ICONS.items())
        + "</defs></svg>\n<!-- /bbg:defs -->")


def t(x, y, s, cls="", anchor="middle", fill=None, weight=None, size=None, raw=False):
    a = f' class="{cls}"' if cls else ""
    st = []
    if fill:
        a += f' fill="{fill}"'
        st.append(f"fill:{fill}")
    if weight: st.append(f"font-weight:{weight}")
    if size: st.append(f"font-size:{size}px")
    if st: a += f' style="{";".join(st)}"'
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}"{a}>{s if raw else _e(s)}</text>'


def node(x, y, color, icon, label, sub=None, w=180, h=96, stack=False, dash=False, sub2=None, mono=False, lfill=None, sfill=None):
    f, s = COLORS[color]
    da = ' stroke-dasharray="8 5"' if dash else ""
    r = ""
    if stack:
        r += f'<rect x="10" y="-10" width="{w}" height="{h}" rx="14" fill="{f}" stroke="{s}"/><rect x="5" y="-5" width="{w}" height="{h}" rx="14" fill="{f}" stroke="{s}"/>'
    r += f'<rect width="{w}" height="{h}" rx="14" fill="{f}" stroke="{s}"{da}/>'
    cx = w / 2
    lines = 1 + (sub is not None) + (sub2 is not None)
    if icon and (h - 24 - 22 - 16 * (lines - 1)) / 2 < 5:
        icon = None
    if icon:
        isz = 34 if h - 16 * (lines - 1) >= 76 else 24
        top = (h - isz - 22 - 16 * (lines - 1)) / 2
        r += f'<use href="#bi-{icon}" x="{cx - isz / 2}" y="{top:.0f}" width="{isz}" height="{isz}" style="color:{s}"/>'
        ly = top + isz + 20
    else:
        ly = (h - 16 * (lines - 1)) / 2 + 6
    r += t(cx, f"{ly:.0f}", label, "bb-l" + (" bb-m" if mono else ""), fill=lfill)
    if sub is not None:
        r += t(cx, f"{ly + 18:.0f}", sub, "bb-s", fill=sfill)
    if sub2 is not None:
        r += t(cx, f"{ly + 34:.0f}", sub2, "bb-s")
    return f'<g class="bb-node" transform="translate({x},{y})">{r}</g>'


def box(x, y, w, h, color, rx=10, dash=False, fill=None):
    f, s = COLORS[color]
    da = ' stroke-dasharray="7 5"' if dash else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill or f}" stroke="{s}" stroke-width="2"{da}/>'


def chip(x, y, w, h, color, label, sub=None, mono=False, dash=False, lfill=None, size=13):
    r = box(x, y, w, h, color, dash=dash)
    cy = y + h / 2 + (4.5 if sub is None else -3)
    cls = "bb-m" if mono else ""
    r += t(x + w / 2, f"{cy:.0f}", label, cls, fill=lfill or INK, weight=700, size=size)
    if sub is not None:
        r += t(x + w / 2, f"{cy + 16:.0f}", sub, "bb-s")
    return r


def arrow(d, dash=False, both=False, color=None, width=None):
    m = f"url(#bb-ah-{color})" if color else "url(#bb-ah)"
    st = f' style="stroke:{COLORS[color][1]}"' if color else ""
    if width: st = st[:-1] + f';stroke-width:{width}"' if st else f' style="stroke-width:{width}"'
    ms = f' marker-start="{m}"' if both else ""
    return f'<path class="bb-ar{" d" if dash else ""}" d="{d}" marker-end="{m}"{ms}{st}/>'


def line(d, color="gray", dash=True, width=2):
    return f'<path d="{d}" fill="none" stroke="{COLORS[color][1]}" stroke-width="{width}"{" stroke-dasharray=\"6 6\"" if dash else ""}/>'


def badge(x, y, n):
    fs = ' style="font-size:11px"' if len(str(n)) > 1 else ""
    return f'<g class="bb-badge" transform="translate({x},{y})"><circle r="13"/><text y="4.5" text-anchor="middle"{fs}>{n}</text></g>'


def al(x, y, s, anchor="middle", fill=None):
    return t(x, y, s, "bb-a", anchor, fill=fill)


def group(x, y, w, h, tag, tw=None):
    tw = tw or (len(tag) * 8 + 26)
    return (f'<rect class="bb-grp" x="{x}" y="{y}" width="{w}" height="{h}" rx="18"/>'
            f'<g class="bb-gtag" transform="translate({x + 18},{y - 12})"><rect width="{tw}" height="24" rx="12" fill="#1e293b"/>'
            f'<text x="{tw / 2}" y="16.5" text-anchor="middle">{_e(tag)}</text></g>')


def svg(w, h, aria, body, y0=0):
    return (f'<svg class="bbg-svg" viewBox="0 {y0} {w} {h}" style="min-width:{int(w * 0.69)}px" role="img" aria-label="{_e(aria)}">{body}</svg>')


def legend(items):
    """items: list of (kind, color_or_dash, text); kind 'sw' | 'ln'"""
    out = []
    for kind, c, txt in items:
        if kind == "sw":
            f, s = COLORS[c]
            out.append(f'<span><i class="sw" style="background:{f};border-color:{s}"></i>{_e(txt)}</span>')
        else:
            out.append(f'<span><i class="lnk{" d" if c == "dash" else ""}"></i>{_e(txt)}</span>')
    return '<div class="bbg-legend" aria-hidden="true">' + "".join(out) + "</div>"


def ensure_assets(s):
    s = re.sub(r"\n?<!-- bbg:css -->.*?<!-- /bbg:css -->", "", s, flags=re.S)
    s = re.sub(r"\n?<!-- bbg:defs -->.*?<!-- /bbg:defs -->", "", s, flags=re.S)
    s = s.replace("</head>", CSS + "\n</head>", 1)
    m = re.search(r"<!-- /sdn:bar -->", s) or re.search(r"<body[^>]*>", s)
    return s[:m.end()] + "\n" + DEFS + s[m.end():]


def fig_spans(s):
    """(start, end) of the svg inside each top-level .fig div, in document order"""
    out = []
    for m in re.finditer(r'<div class="fig(?: bbg)?"(?: style="[^"]*")?>', s):
        a = s.index("<svg", m.end())
        depth, i = 0, a
        while True:
            o = s.find("<svg", i + 1); c = s.find("</svg>", i + 1)
            if o != -1 and o < c:
                depth += 1; i = o
            else:
                if depth == 0:
                    out.append((m.start(), m.end(), a, c + 6)); break
                depth -= 1; i = c
    return out


def replace_figs(path, figs):
    """figs: dict index(1-based) -> (svg_str, legend_html or '')"""
    p = Path(path)
    s = p.read_text(encoding="utf-8")
    s = ensure_assets(s)
    spans = fig_spans(s)
    for idx in sorted(figs, reverse=True):
        ds, de, a, b = spans[idx - 1]
        body, leg = figs[idx]
        # if already converted, the svg sits inside bbg wrappers: replace whole wrapper
        tag = s[ds:de].replace('class="fig"', 'class="fig bbg"')
        inner_start = s.rfind('<div class="bbg-card">', de, a)
        if inner_start != -1:
            close = s.index("</div></div>", b) + len("</div></div>")
            s = s[:ds] + tag + s[de:inner_start] + f'<div class="bbg-card">{leg}<div class="bbg-scroll">{body}</div></div>' + s[close:]
        else:
            s = s[:ds] + tag + s[de:a] + f'<div class="bbg-card">{leg}<div class="bbg-scroll">{body}</div></div>' + s[b:]
    p.write_text(s, encoding="utf-8")
    return len(spans)
