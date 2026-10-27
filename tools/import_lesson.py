#!/usr/bin/env python3
"""Thêm một bài học vào site, xếp theo Category => Khóa => Bài học:

    lessons/<category>/<khóa>/<mã-bài>.html

rồi cập nhật danh sách bài ở lessons/lessons.js. Nhận hai loại file:

  * Trang HTML tự chứa (infographic, ghi chú...): giữ nguyên trang, chỉ chèn thanh điều hướng.
  * Trang bài học 200Lab đã lưu (Ctrl+S): trích nội dung và dựng lại theo giao diện site.

Cách dùng:
    python3 tools/import_lesson.py bai.html --lop "Tên khóa" --id sd1-23 --title "Tên bài" --order 2
    python3 tools/import_lesson.py --rebuild      # chỉ dựng lại lessons/lessons.js

Với trang 200Lab, Khóa và mã bài tự lấy từ trang. Cần: pip install beautifulsoup4
"""
import argparse
import html
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

from bs4 import BeautifulSoup, Comment

ROOT = Path(__file__).resolve().parent.parent
LESSONS = ROOT / "lessons"
DEFAULT_KHOA = "System Design"

# Thuộc tính giữ lại trên các thẻ nội dung; class chỉ giữ những class mà style.css dùng.
KEEP_ATTRS = {"href", "src", "alt", "width", "height", "id", "colspan", "rowspan", "title", "loading", "decoding"}
KEEP_CLASSES = {"callout", "callout-title", "lesson-table-scroll", "el-figure", "el-diagram"}


def slugify(text):
    text = unicodedata.normalize("NFD", text.replace("đ", "d").replace("Đ", "D"))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def read_meta(soup, src_text):
    m = re.search(r"saved from url=\(\d+\)(\S+)", src_text)
    url = m.group(1).strip() if m else ""
    article = soup.find("article", attrs={"data-lesson-reader": True})
    if article is None:
        sys.exit("Không tìm thấy <article data-lesson-reader> — file này có phải trang bài học 200Lab?")
    header = article.find("header")
    title = header.find("h1").get_text(" ", strip=True)
    desc_el = header.find("p", class_=lambda c: c and "line-clamp-2" in c)
    desc = desc_el.get_text(" ", strip=True) if desc_el else ""
    read_time = ""
    for span in header.find_all("span"):
        t = span.get_text(" ", strip=True)
        if "phút đọc" in t:
            read_time = t
    lop = ""
    bc = soup.find("nav", attrs={"aria-label": "Đường dẫn bài học"})
    if bc:
        parts = [p.get_text(" ", strip=True) for p in bc.find_all(["a", "span", "li"]) if p.get_text(strip=True)]
        parts = [p for p in dict.fromkeys(parts) if p not in ("Khóa học", title)]
        lop = parts[0] if parts else ""
    m = re.search(r"/courses/([^/]+)/", url)
    lop_slug = m.group(1) if m else ""
    return article, {"title": title, "description": desc, "readTime": read_time,
                     "lop": lop, "lopSlug": lop_slug, "source": url}


def clean_body(article, img_dir, img_prefix, src_path):
    body = article.find("div", class_="lesson-html")
    if body is None:
        sys.exit("Không tìm thấy phần nội dung (div.lesson-html).")

    for c in body.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    # Sơ đồ mermaid: giữ SVG đã render, bỏ mã nguồn mermaid.
    for fig in body.find_all("figure", class_="el-diagram"):
        for d in fig.find_all("details"):
            d.decompose()
    # Ảnh nằm trong <button> mở lightbox: gỡ button, giữ ảnh.
    for btn in body.find_all("button"):
        btn.unwrap()
    for div in body.find_all("div", class_="contents"):
        div.unwrap()

    files_dir = src_path.with_name(src_path.stem + "_files")
    for img in body.find_all("img"):
        full = img.get("data-full-src") or ""
        local_name = Path(html.unescape(img.get("src", ""))).name
        local = files_dir / local_name
        if local_name and local.is_file():
            img_dir.mkdir(parents=True, exist_ok=True)
            target = img_dir / (local.stem[:16] + (local.suffix or ".webp"))
            shutil.copyfile(local, target)
            img["src"] = f"{img_prefix}/{target.name}"
        elif full:
            img["src"] = full
        img["loading"] = "lazy"
        img["decoding"] = "async"

    for tag in body.find_all(True):
        if tag.name == "svg" or tag.find_parent("svg") is not None:
            continue  # SVG cần nguyên thuộc tính để hiển thị đúng
        classes = [c for c in tag.get("class", []) if c in KEEP_CLASSES]
        if tag.name == "aside":
            classes = ["callout"]
        for attr in list(tag.attrs):
            if attr not in KEEP_ATTRS:
                del tag[attr]
        if classes:
            tag["class"] = classes
        if tag.name == "a" and tag.get("href", "").startswith("http"):
            tag["target"] = "_blank"
            tag["rel"] = "noopener"

    return body.decode_contents().strip()


def build_toc(body_html):
    items = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body_html, flags=re.S)
    if not items:
        return ""
    lis = "\n".join(
        f'        <li><a href="#{html.escape(i, quote=True)}">{re.sub(r"<[^>]+>", "", t)}</a></li>' for i, t in items
    )
    return f'<nav class="toc" aria-label="Trong bài này">\n      <p class="toc-title">Trong bài này</p>\n      <ol>\n{lis}\n      </ol>\n    </nav>'


FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700'
         '&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">')

TEMPLATE = """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title_e} · System Design Notes</title>
  <meta name="description" content="{desc_e}">
{meta_tags}
  {fonts}
  <link rel="stylesheet" href="{root}assets/style.css">
</head>
<body class="lesson-page" data-root="{root}">
  <header class="topbar">
    <a class="brand" href="{root}index.html">System Design Notes</a>
  </header>
  <main class="lesson-layout">
    <nav class="crumbs" aria-label="Đường dẫn">
      {crumbs}
    </nav>
    <article class="lesson">
      <header class="lesson-head">
        <h1>{title_h}</h1>
        <p class="lead">{desc_h}</p>
        <p class="meta">{read_h}{source_link}</p>
      </header>
      {toc}
      <div class="prose">
{body}
      </div>
      <footer class="lesson-nav" data-lesson-id="{path_e}"></footer>
    </article>
  </main>
  {manifest}
  <script src="{root}assets/app.js"></script>
</body>
</html>
"""


def meta_tags(info):
    rows = [("lesson:id", info["id"]), ("lesson:title", info["title"]), ("lesson:description", info["description"]),
            ("lesson:order", info["order"]), ("lesson:khoa", info["khoa"]), ("lesson:lop", info["lop"]),
            ("lesson:lop-order", info["lopOrder"]), ("lesson:read-time", info["readTime"]),
            ("lesson:source", info["source"])]
    return "\n".join(f'  <meta name="{n}" content="{html.escape(str(v), quote=True)}">' for n, v in rows)


def manifest_script(root):
    """Nạp lessons.js kèm ?t=<thời điểm> để trình duyệt không dùng bản cũ trong cache (thiếu bài mới)."""
    return (f"<script>document.write('<script src=\"{root}lessons/lessons.js?t=' + Date.now() + "
            f"'\"><\\/script>')</script>")


def crumbs_html(info, root):
    e = lambda s: html.escape(s, quote=True)
    return (f'<a href="{root}index.html">Category</a><span>›</span>'
            f'<a href="{root}index.html#/{info["khoaSlug"]}">{e(info["khoa"])}</a><span>›</span>'
            f'<a href="{root}index.html#/{info["khoaSlug"]}/{info["lopSlug"]}">{e(info["lop"])}</a>')


def render_article(info, body, root):
    """Bài import từ trang 200Lab đã lưu: dựng lại thành bài viết theo giao diện của site."""
    e = lambda s: html.escape(s, quote=True)
    source_link = f' · <a href="{e(info["source"])}" target="_blank" rel="noopener">Bài gốc trên 200Lab</a>' if info["source"] else ""
    return TEMPLATE.format(
        root=root, title_e=e(info["title"]), desc_e=e(info["description"]), meta_tags=meta_tags(info), fonts=FONTS,
        crumbs=crumbs_html(info, root), title_h=html.escape(info["title"]), desc_h=html.escape(info["description"]),
        read_h=html.escape(info["readTime"]), source_link=source_link, path_e=e(info["path"]),
        toc=build_toc(body), body=body, manifest=manifest_script(root),
    )


SDN_BLOCK = re.compile(r"\n<!-- sdn:(head|bar|foot) -->.*?<!-- /sdn:\1 -->\n", re.S)


def render_standalone(info, text, root):
    """Bài là một trang HTML tự chứa (infographic...): giữ nguyên trang, chỉ chèn thanh điều hướng của site.
    Phần chèn nằm giữa các dấu <!-- sdn:... --> nên import lại bao nhiêu lần cũng không bị lặp."""
    e = lambda s: html.escape(s, quote=True)
    text = SDN_BLOCK.sub("", text)
    head = (f'\n<!-- sdn:head -->\n{meta_tags(info)}\n'
            f'  <link rel="stylesheet" href="{root}assets/shell.css">\n<!-- /sdn:head -->\n')
    bar = (f'\n<!-- sdn:bar -->\n<nav class="sdn-bar" aria-label="Điều hướng">'
           f'<a class="sdn-brand" href="{root}index.html">System Design Notes</a>'
           f'<span class="sdn-crumbs">{crumbs_html(info, root)}</span></nav>\n<!-- /sdn:bar -->\n')
    foot = (f'\n<!-- sdn:foot -->\n<nav class="sdn-nav" aria-label="Bài trước, bài sau" '
            f'data-root="{root}" data-lesson-id="{e(info["path"])}"></nav>\n'
            f'{manifest_script(root)}\n<script src="{root}assets/app.js"></script>\n'
            f'<!-- /sdn:foot -->\n')
    if not re.search(r"</head>", text, re.I) or not re.search(r"<body[^>]*>", text, re.I):
        sys.exit("Trang HTML cần có đủ <head> và <body>.")
    text = re.sub(r"</head>", lambda m: head + m.group(0), text, count=1, flags=re.I)
    text = re.sub(r"<body[^>]*>", lambda m: m.group(0) + bar, text, count=1, flags=re.I)
    i = text.lower().rfind("</body>")
    return text[:i] + foot + text[i:] if i >= 0 else text + foot


def standalone_meta(soup):
    """Đoán tiêu đề, mô tả, thời gian đọc cho trang HTML tự chứa (đều ghi đè được bằng tham số)."""
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    desc_el = soup.find("meta", attrs={"name": "description"})
    desc = desc_el.get("content", "") if desc_el else ""
    if not desc:
        sub = soup.find(class_="sub") or soup.find("p")
        desc = re.sub(r"\s+", " ", sub.get_text()).strip() if sub else ""
    body = soup.body or soup
    for t in body.find_all(["script", "style", "svg"]):
        t.decompose()
    words = len(body.get_text(" ", strip=True).split())
    return {"title": title, "description": desc, "readTime": f"{max(1, round(words / 200))} phút đọc", "source": ""}


def rebuild_manifest():
    lessons = []
    for f in sorted(LESSONS.rglob("*.html")):
        soup = BeautifulSoup(f.read_text(encoding="utf-8"), "html.parser")
        meta = lambda n: (soup.find("meta", attrs={"name": n}) or {}).get("content", "")
        rel = f.relative_to(LESSONS)
        if len(rel.parts) != 3:
            print(f"Bỏ qua {rel}: bài phải nằm ở lessons/<category>/<khóa>/<bài>.html")
            continue
        lessons.append({
            "id": meta("lesson:id") or f.stem,
            "path": rel.as_posix(),
            "khoa": meta("lesson:khoa"),
            "khoaSlug": rel.parts[0],
            "lop": meta("lesson:lop"),
            "lopSlug": rel.parts[1],
            "lopOrder": float(meta("lesson:lop-order") or 9999),
            "order": float(meta("lesson:order") or 9999),
            "title": meta("lesson:title") or soup.find("h1").get_text(" ", strip=True),
            "description": meta("lesson:description") or meta("description"),
            "readTime": meta("lesson:read-time"),
        })
    lessons.sort(key=lambda x: (x["khoa"], x["lopOrder"], x["lop"], x["order"], x["id"]))
    for l in lessons:
        for k in ("order", "lopOrder"):
            l[k] = int(l[k]) if l[k].is_integer() else l[k]
    js = ("// File này được sinh tự động bởi tools/import_lesson.py — đừng sửa tay.\n"
          "// Mỗi phần tử là một bài học; trang chủ nhóm lại theo khoa (Category) => lop (Khóa).\n"
          "window.LESSONS = " + json.dumps(lessons, ensure_ascii=False, indent=2) + ";\n")
    (LESSONS / "lessons.js").write_text(js, encoding="utf-8")
    return lessons


def existing_meta(path, name):
    if not path.is_file():
        return None
    m = re.search(rf'name="lesson:{name}" content="([^"]+)"', path.read_text(encoding="utf-8"))
    return m.group(1) if m else None


def num(x):
    x = float(x)
    return int(x) if x.is_integer() else x


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", nargs="?", help="file .html: trang 200Lab đã lưu, hoặc một trang HTML tự chứa")
    ap.add_argument("--khoa", default=DEFAULT_KHOA, help=f'tên Category (mặc định "{DEFAULT_KHOA}")')
    ap.add_argument("--lop", help="tên Khóa (trang 200Lab: mặc định lấy từ breadcrumb)")
    ap.add_argument("--lop-order", type=float, help="thứ tự của Khóa trong Category")
    ap.add_argument("--id", help="mã bài, cũng là tên file (trang 200Lab: mặc định lấy từ URL gốc, ví dụ sd1-23)")
    ap.add_argument("--order", type=float, help="thứ tự của bài trong Khóa (mặc định: cuối danh sách)")
    ap.add_argument("--title", help="tên bài học hiển thị trong danh sách")
    ap.add_argument("--description", help="mô tả ngắn của bài")
    ap.add_argument("--read-time", help='thời gian đọc, ví dụ "16 phút đọc"')
    ap.add_argument("--rebuild", action="store_true", help="chỉ dựng lại lessons/lessons.js")
    args = ap.parse_args()

    LESSONS.mkdir(exist_ok=True)
    if not args.source:
        if args.rebuild:
            print(f"Đã cập nhật lessons.js ({len(rebuild_manifest())} bài)")
        else:
            ap.print_help()
        return

    src = Path(args.source)
    text = src.read_text(encoding="utf-8")
    soup = BeautifulSoup(text, "html.parser")
    is_200lab = soup.find("article", attrs={"data-lesson-reader": True}) is not None
    if is_200lab:
        article, meta = read_meta(soup, text)
    else:
        article, meta = None, standalone_meta(BeautifulSoup(text, "html.parser"))
        meta.update(lop="", lopSlug="")
    for key, val in (("title", args.title), ("description", args.description), ("readTime", args.read_time)):
        if val:
            meta[key] = val

    lop = args.lop or meta["lop"] or "Chưa phân khóa"
    lesson_id = args.id or (meta["source"].rstrip("/").rsplit("/", 1)[-1] if meta["source"] else "") or src.stem
    lesson_id = slugify(lesson_id)
    khoa_slug = slugify(args.khoa)
    lop_slug = slugify(meta["lopSlug"]) if (meta["lopSlug"] and not args.lop) else slugify(lop)

    lop_dir = LESSONS / khoa_slug / lop_slug
    out = lop_dir / f"{lesson_id}.html"
    siblings = [f for f in lop_dir.glob("*.html") if f != out] if lop_dir.is_dir() else []

    order = args.order if args.order is not None else existing_meta(out, "order")
    if order is None:
        order = max([float(existing_meta(f, "order") or 0) for f in siblings] + [0]) + 1
    lop_order = args.lop_order if args.lop_order is not None else existing_meta(out, "lop-order")
    if lop_order is None and siblings:
        lop_order = existing_meta(siblings[0], "lop-order")
    if lop_order is None:
        khoa_dir = LESSONS / khoa_slug
        lop_order = len([d for d in khoa_dir.iterdir() if d.is_dir()]) + 1 if khoa_dir.is_dir() else 1

    info = dict(meta, id=lesson_id, order=num(order), khoa=args.khoa, khoaSlug=khoa_slug, lop=lop,
                lopSlug=lop_slug, lopOrder=num(lop_order), path=out.relative_to(LESSONS).as_posix())
    root = "../../../"
    lop_dir.mkdir(parents=True, exist_ok=True)
    if is_200lab:
        body = clean_body(article, lop_dir / "img" / lesson_id, f"img/{lesson_id}", src)
        page = render_article(info, body, root)
    else:
        page = render_standalone(info, text, root)
    out.write_text(page, encoding="utf-8")
    total = len(rebuild_manifest())
    print(f"Đã tạo {out.relative_to(ROOT)} ({'trang 200Lab' if is_200lab else 'trang HTML tự chứa'})\n"
          f"  Category: {args.khoa}\n  Khóa:     {lop} (thứ tự {info['lopOrder']})\n"
          f"  Bài:  {info['title']} (thứ tự {info['order']})\nTổng cộng {total} bài.")


if __name__ == "__main__":
    main()
