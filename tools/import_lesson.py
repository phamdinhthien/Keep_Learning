#!/usr/bin/env python3
"""Chuyển một trang bài học 200Lab đã lưu (Ctrl+S trong trình duyệt) thành một file
HTML gọn, xếp theo Khóa => Môn => Bài giảng:

    lessons/<khóa>/<môn>/<mã-bài>.html

rồi cập nhật danh sách bài ở lessons/lessons.js.

Cách dùng:
    python3 tools/import_lesson.py "bai-hoc.html" --khoa "System Design" [--order 2]
    python3 tools/import_lesson.py --rebuild      # chỉ dựng lại lessons/lessons.js

Môn mặc định lấy từ breadcrumb của trang 200Lab (tên khóa học trên 200Lab).
Cần: pip install beautifulsoup4
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
    mon = ""
    bc = soup.find("nav", attrs={"aria-label": "Đường dẫn bài học"})
    if bc:
        parts = [p.get_text(" ", strip=True) for p in bc.find_all(["a", "span", "li"]) if p.get_text(strip=True)]
        parts = [p for p in dict.fromkeys(parts) if p not in ("Khóa học", title)]
        mon = parts[0] if parts else ""
    m = re.search(r"/courses/([^/]+)/", url)
    mon_slug = m.group(1) if m else ""
    return article, {"title": title, "description": desc, "readTime": read_time,
                     "mon": mon, "monSlug": mon_slug, "source": url}


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


TEMPLATE = """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title_e} · System Design Notes</title>
  <meta name="description" content="{desc_e}">
  <meta name="lesson:id" content="{id_e}">
  <meta name="lesson:order" content="{order}">
  <meta name="lesson:khoa" content="{khoa_e}">
  <meta name="lesson:mon" content="{mon_e}">
  <meta name="lesson:mon-order" content="{mon_order}">
  <meta name="lesson:read-time" content="{read_e}">
  <meta name="lesson:source" content="{source_e}">
  <script>try{{var t=localStorage.getItem("sd-theme");if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
  <link rel="stylesheet" href="{root}assets/style.css">
</head>
<body class="lesson-page" data-root="{root}">
  <header class="topbar">
    <a class="brand" href="{root}index.html">System Design Notes</a>
    <button class="theme-toggle" type="button" aria-label="Đổi giao diện sáng/tối">◐</button>
  </header>
  <main class="lesson-layout">
    <nav class="crumbs" aria-label="Đường dẫn">
      <a href="{root}index.html">Khóa học</a><span>›</span><a href="{root}index.html#/{khoa_slug}">{khoa_h}</a><span>›</span><a href="{root}index.html#/{khoa_slug}/{mon_slug}">{mon_h}</a>
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
  <script src="{root}lessons/lessons.js"></script>
  <script src="{root}assets/app.js"></script>
</body>
</html>
"""


def rebuild_manifest():
    lessons = []
    for f in sorted(LESSONS.rglob("*.html")):
        soup = BeautifulSoup(f.read_text(encoding="utf-8"), "html.parser")
        meta = lambda n: (soup.find("meta", attrs={"name": n}) or {}).get("content", "")
        rel = f.relative_to(LESSONS)
        if len(rel.parts) != 3:
            print(f"Bỏ qua {rel}: bài phải nằm ở lessons/<khóa>/<môn>/<bài>.html")
            continue
        lessons.append({
            "id": meta("lesson:id") or f.stem,
            "path": rel.as_posix(),
            "khoa": meta("lesson:khoa"),
            "khoaSlug": rel.parts[0],
            "mon": meta("lesson:mon"),
            "monSlug": rel.parts[1],
            "monOrder": float(meta("lesson:mon-order") or 9999),
            "order": float(meta("lesson:order") or 9999),
            "title": soup.find("h1").get_text(" ", strip=True),
            "description": meta("description"),
            "readTime": meta("lesson:read-time"),
        })
    lessons.sort(key=lambda x: (x["khoa"], x["monOrder"], x["mon"], x["order"], x["id"]))
    for l in lessons:
        for k in ("order", "monOrder"):
            l[k] = int(l[k]) if l[k].is_integer() else l[k]
    js = ("// File này được sinh tự động bởi tools/import_lesson.py — đừng sửa tay.\n"
          "// Mỗi phần tử là một bài giảng; trang chủ nhóm lại theo khoa (Khóa) => mon (Môn).\n"
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
    ap.add_argument("source", nargs="?", help="file .html đã lưu từ trang bài học")
    ap.add_argument("--khoa", default=DEFAULT_KHOA, help=f'tên Khóa (mặc định "{DEFAULT_KHOA}")')
    ap.add_argument("--mon", help="tên Môn (mặc định lấy từ breadcrumb trang 200Lab)")
    ap.add_argument("--mon-order", type=float, help="thứ tự của Môn trong Khóa")
    ap.add_argument("--id", help="mã bài (mặc định lấy từ URL gốc, ví dụ sd1-23)")
    ap.add_argument("--order", type=float, help="thứ tự của bài trong Môn (mặc định: cuối danh sách)")
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
    article, meta = read_meta(soup, text)
    mon = args.mon or meta["mon"] or "Chưa phân môn"
    lesson_id = args.id or (meta["source"].rstrip("/").rsplit("/", 1)[-1] if meta["source"] else "") or src.stem
    lesson_id = slugify(lesson_id)
    khoa_slug = slugify(args.khoa)
    mon_slug = slugify(meta["monSlug"]) if (meta["monSlug"] and not args.mon) else slugify(mon)

    mon_dir = LESSONS / khoa_slug / mon_slug
    out = mon_dir / f"{lesson_id}.html"
    siblings = list(mon_dir.glob("*.html")) if mon_dir.is_dir() else []

    order = args.order if args.order is not None else existing_meta(out, "order")
    if order is None:
        order = len(siblings) + 1
    mon_order = args.mon_order if args.mon_order is not None else existing_meta(out, "mon-order")
    if mon_order is None and siblings:
        mon_order = existing_meta(siblings[0], "mon-order")
    if mon_order is None:
        khoa_dir = LESSONS / khoa_slug
        mon_order = len([d for d in khoa_dir.iterdir() if d.is_dir()]) + 1 if khoa_dir.is_dir() else 1
    order, mon_order = num(order), num(mon_order)

    root = "../../../"
    body = clean_body(article, mon_dir / "img" / lesson_id, f"img/{lesson_id}", src)
    e = lambda s: html.escape(s, quote=True)
    source_link = f' · <a href="{e(meta["source"])}" target="_blank" rel="noopener">Bài gốc trên 200Lab</a>' if meta["source"] else ""
    mon_dir.mkdir(parents=True, exist_ok=True)
    out.write_text(TEMPLATE.format(
        root=root, title_e=e(meta["title"]), desc_e=e(meta["description"]), id_e=e(lesson_id),
        order=order, mon_order=mon_order, khoa_e=e(args.khoa), mon_e=e(mon),
        read_e=e(meta["readTime"]), source_e=e(meta["source"]),
        khoa_slug=khoa_slug, mon_slug=mon_slug, khoa_h=html.escape(args.khoa), mon_h=html.escape(mon),
        title_h=html.escape(meta["title"]), desc_h=html.escape(meta["description"]),
        read_h=html.escape(meta["readTime"]), source_link=source_link,
        path_e=e(out.relative_to(LESSONS).as_posix()), toc=build_toc(body), body=body,
    ), encoding="utf-8")
    total = len(rebuild_manifest())
    print(f"Đã tạo {out.relative_to(ROOT)}\n  Khóa: {args.khoa}\n  Môn:  {mon} (thứ tự {mon_order})\n"
          f"  Bài:  {meta['title']} (thứ tự {order})\nTổng cộng {total} bài.")


if __name__ == "__main__":
    main()
