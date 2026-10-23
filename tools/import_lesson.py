#!/usr/bin/env python3
"""Chuyển một trang bài học 200Lab đã lưu (Ctrl+S trong trình duyệt) thành một file
HTML gọn trong thư mục lessons/, rồi cập nhật danh sách bài ở lessons/lessons.js.

Cách dùng:
    python3 tools/import_lesson.py "duong-dan/bai-hoc.html" [--order 2] [--id sd1-23]
    python3 tools/import_lesson.py --rebuild      # chỉ dựng lại lessons/lessons.js

Cần: pip install beautifulsoup4
"""
import argparse
import html
import json
import re
import shutil
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Comment

ROOT = Path(__file__).resolve().parent.parent
LESSONS = ROOT / "lessons"
IMG_DIR = LESSONS / "img"

# Thuộc tính giữ lại trên các thẻ nội dung; class chỉ giữ những class mà style.css dùng.
KEEP_ATTRS = {"href", "src", "alt", "width", "height", "id", "colspan", "rowspan", "title"}
KEEP_CLASSES = {"callout", "callout-title", "lesson-table-scroll", "el-figure", "el-diagram"}


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
    course = ""
    bc = soup.find("nav", attrs={"aria-label": "Đường dẫn bài học"})
    if bc:
        parts = [p.get_text(" ", strip=True) for p in bc.find_all(["a", "span", "li"]) if p.get_text(strip=True)]
        parts = [p for p in dict.fromkeys(parts) if p not in ("Khóa học", title)]
        course = parts[0] if parts else ""
    return article, {"title": title, "description": desc, "readTime": read_time, "course": course, "source": url}


def clean_body(article, lesson_id, src_path):
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
            dest = IMG_DIR / lesson_id
            dest.mkdir(parents=True, exist_ok=True)
            ext = local.suffix or ".webp"
            target = dest / (local.stem[:16] + ext)
            shutil.copyfile(local, target)
            img["src"] = f"img/{lesson_id}/{target.name}"
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
            if attr not in KEEP_ATTRS and attr not in ("loading", "decoding"):
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
  <meta name="lesson:course" content="{course_e}">
  <meta name="lesson:read-time" content="{read_e}">
  <meta name="lesson:source" content="{source_e}">
  <script>try{{var t=localStorage.getItem("sd-theme");if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
  <link rel="stylesheet" href="../assets/style.css">
</head>
<body class="lesson-page">
  <header class="topbar">
    <a class="brand" href="../index.html">← Tất cả bài học</a>
    <button class="theme-toggle" type="button" aria-label="Đổi giao diện sáng/tối">◐</button>
  </header>
  <main class="lesson-layout">
    <article class="lesson">
      <header class="lesson-head">
        <p class="eyebrow">{course_h}</p>
        <h1>{title_h}</h1>
        <p class="lead">{desc_h}</p>
        <p class="meta">{read_h}{source_link}</p>
      </header>
      {toc}
      <div class="prose">
{body}
      </div>
      <footer class="lesson-nav" data-lesson-id="{id_e}"></footer>
    </article>
  </main>
  <script src="lessons.js"></script>
  <script src="../assets/app.js"></script>
</body>
</html>
"""


def write_lesson(meta, lesson_id, order, body_html):
    e = lambda s: html.escape(s, quote=True)
    source_link = f' · <a href="{e(meta["source"])}" target="_blank" rel="noopener">Bài gốc trên 200Lab</a>' if meta["source"] else ""
    out = TEMPLATE.format(
        title_e=e(meta["title"]), desc_e=e(meta["description"]), id_e=e(lesson_id), order=order,
        course_e=e(meta["course"]), read_e=e(meta["readTime"]), source_e=e(meta["source"]),
        course_h=html.escape(meta["course"]), title_h=html.escape(meta["title"]),
        desc_h=html.escape(meta["description"]), read_h=html.escape(meta["readTime"]),
        source_link=source_link, toc=build_toc(body_html), body=body_html,
    )
    path = LESSONS / f"{lesson_id}.html"
    path.write_text(out, encoding="utf-8")
    return path


def rebuild_manifest():
    lessons = []
    for f in sorted(LESSONS.glob("*.html")):
        soup = BeautifulSoup(f.read_text(encoding="utf-8"), "html.parser")
        meta = lambda n: (soup.find("meta", attrs={"name": n}) or {}).get("content", "")
        lessons.append({
            "id": meta("lesson:id") or f.stem,
            "file": f.name,
            "order": float(meta("lesson:order") or 9999),
            "title": soup.find("h1").get_text(" ", strip=True),
            "description": meta("description"),
            "course": meta("lesson:course"),
            "readTime": meta("lesson:read-time"),
        })
    lessons.sort(key=lambda x: (x["order"], x["id"]))
    for l in lessons:
        l["order"] = int(l["order"]) if l["order"].is_integer() else l["order"]
    js = "// File này được sinh tự động bởi tools/import_lesson.py — đừng sửa tay.\nwindow.LESSONS = " + json.dumps(lessons, ensure_ascii=False, indent=2) + ";\n"
    (LESSONS / "lessons.js").write_text(js, encoding="utf-8")
    return lessons


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", nargs="?", help="file .html đã lưu từ trang bài học")
    ap.add_argument("--id", help="mã bài (mặc định lấy từ URL gốc, ví dụ sd1-23)")
    ap.add_argument("--order", type=float, help="thứ tự hiển thị trong danh sách (mặc định: cuối danh sách)")
    ap.add_argument("--rebuild", action="store_true", help="chỉ dựng lại lessons/lessons.js")
    args = ap.parse_args()

    LESSONS.mkdir(exist_ok=True)
    if args.rebuild or not args.source:
        if not args.rebuild:
            ap.print_help()
            return
        print(f"Đã cập nhật lessons.js ({len(rebuild_manifest())} bài)")
        return

    src = Path(args.source)
    text = src.read_text(encoding="utf-8")
    soup = BeautifulSoup(text, "html.parser")
    article, meta = read_meta(soup, text)
    lesson_id = args.id or (meta["source"].rstrip("/").rsplit("/", 1)[-1] if meta["source"] else "") or src.stem
    lesson_id = re.sub(r"[^A-Za-z0-9_-]+", "-", lesson_id).strip("-").lower()

    existing = LESSONS / f"{lesson_id}.html"
    order = args.order
    if order is None and existing.is_file():
        m = re.search(r'name="lesson:order" content="([^"]+)"', existing.read_text(encoding="utf-8"))
        order = float(m.group(1)) if m else None
    if order is None:
        order = len(list(LESSONS.glob("*.html"))) + 1
    order = int(order) if float(order).is_integer() else order

    body = clean_body(article, lesson_id, src)
    path = write_lesson(meta, lesson_id, order, body)
    total = len(rebuild_manifest())
    print(f"Đã tạo {path.relative_to(ROOT)} — \"{meta['title']}\" (thứ tự {order}, tổng {total} bài)")


if __name__ == "__main__":
    main()
