(function () {
  var root = document.documentElement;
  var lessons = window.LESSONS || [];

  // Nút đổi giao diện sáng/tối, nhớ lựa chọn trong trình duyệt.
  var toggle = document.querySelector(".theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var dark = root.dataset.theme
        ? root.dataset.theme === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("sd-theme", root.dataset.theme); } catch (e) {}
    });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function minutes(list) {
    return list.reduce(function (s, l) { return s + (parseInt(l.readTime, 10) || 0); }, 0);
  }
  // Gom bài theo một khóa (giữ thứ tự xuất hiện trong lessons.js).
  function groupBy(list, key, nameKey) {
    var groups = [];
    list.forEach(function (l) {
      var g = groups.find(function (x) { return x.slug === l[key]; });
      if (!g) groups.push(g = { slug: l[key], name: l[nameKey], lessons: [] });
      g.lessons.push(l);
    });
    return groups;
  }

  // ---------- Trang bài học: bài trước / bài sau trong cùng Môn ----------
  var nav = document.querySelector(".lesson-nav");
  if (nav) {
    var base = document.body.dataset.root || "";
    var me = lessons.find(function (l) { return l.path === nav.dataset.lessonId; });
    var same = me ? lessons.filter(function (l) { return l.khoaSlug === me.khoaSlug && l.monSlug === me.monSlug; }) : [];
    var idx = same.indexOf(me);
    [[idx - 1, "prev", "← Bài trước"], [idx + 1, "next", "Bài tiếp theo →"]].forEach(function (p) {
      var l = idx >= 0 && same[p[0]];
      if (!l) return;
      var a = el("a", p[1]);
      a.href = base + "lessons/" + l.path;
      a.appendChild(el("small", "", p[2]));
      a.appendChild(document.createTextNode(l.title));
      nav.appendChild(a);
    });
    return;
  }

  // ---------- Trang chủ: #/ → Khóa, #/<khóa> → Môn, #/<khóa>/<môn> → Bài ----------
  var view = document.getElementById("view");
  if (!view) return;
  var fold = function (s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase(); };

  function crumbs(parts) {
    var n = el("nav", "crumbs");
    n.setAttribute("aria-label", "Đường dẫn");
    parts.forEach(function (p, i) {
      if (i) n.appendChild(el("span", "", "›"));
      if (p.href) { var a = el("a", "", p.name); a.href = p.href; n.appendChild(a); }
      else n.appendChild(el("b", "", p.name));
    });
    return n;
  }
  function card(href, num, title, desc, meta, kind) {
    var li = el("li");
    var a = el("a", "card card-" + kind);
    a.href = href;
    a.appendChild(el("span", "num", num));
    a.appendChild(el("span", "t", title));
    if (desc) a.appendChild(el("span", "d", desc));
    if (meta) a.appendChild(el("span", "m", meta));
    li.appendChild(a);
    return li;
  }
  function header(kicker, title, sub) {
    var h = el("header", "page-head");
    if (kicker) h.appendChild(el("p", "kicker", kicker));
    h.appendChild(el("h1", "", title));
    if (sub) h.appendChild(el("p", "sub", sub));
    return h;
  }
  function lessonList(list, showPath) {
    var ul = el("ul", "list");
    list.forEach(function (l, i) {
      var meta = [showPath ? l.khoa + " › " + l.mon : "", l.readTime].filter(Boolean).join(" · ");
      ul.appendChild(card("lessons/" + l.path, String(i + 1), l.title, l.description, meta, "lesson"));
    });
    return ul;
  }

  function renderHome(q) {
    view.appendChild(header("", "Khóa học", "Ghi chép bài học từ 200Lab, xếp theo Khóa › Môn › Bài giảng."));
    var input = el("input", "search");
    input.type = "search";
    input.placeholder = "Tìm bài giảng (gõ không dấu cũng được)…";
    input.setAttribute("aria-label", "Tìm bài giảng");
    input.value = q || "";
    view.appendChild(input);
    var results = el("div");
    view.appendChild(results);
    function draw() {
      results.textContent = "";
      var query = fold(input.value.trim());
      if (query) {
        var hits = lessons.filter(function (l) { return fold([l.title, l.description, l.mon, l.khoa, l.id].join(" ")).indexOf(query) >= 0; });
        results.appendChild(el("h2", "section-title", hits.length + " bài giảng khớp"));
        if (hits.length) results.appendChild(lessonList(hits, true));
        return;
      }
      var khoas = groupBy(lessons, "khoaSlug", "khoa");
      if (!khoas.length) { results.appendChild(el("p", "empty", "Chưa có bài học nào.")); return; }
      var ul = el("ul", "list grid");
      khoas.forEach(function (k, i) {
        var mons = groupBy(k.lessons, "monSlug", "mon");
        ul.appendChild(card("#/" + k.slug, String(i + 1), k.name, "",
          mons.length + " môn · " + k.lessons.length + " bài giảng · " + minutes(k.lessons) + " phút đọc", "khoa"));
      });
      results.appendChild(ul);
    }
    input.addEventListener("input", function () {
      history.replaceState(null, "", input.value ? "#?q=" + encodeURIComponent(input.value) : "#/");
      draw();
    });
    draw();
  }

  function renderKhoa(k) {
    var mons = groupBy(k.lessons, "monSlug", "mon");
    view.appendChild(crumbs([{ name: "Khóa học", href: "#/" }, { name: k.name }]));
    view.appendChild(header("Khóa", k.name, mons.length + " môn · " + k.lessons.length + " bài giảng"));
    var ul = el("ul", "list");
    mons.forEach(function (m, i) {
      ul.appendChild(card("#/" + k.slug + "/" + m.slug, String(i + 1), m.name, "",
        m.lessons.length + " bài giảng · " + minutes(m.lessons) + " phút đọc", "mon"));
    });
    view.appendChild(ul);
  }

  function renderMon(k, m) {
    view.appendChild(crumbs([{ name: "Khóa học", href: "#/" }, { name: k.name, href: "#/" + k.slug }, { name: m.name }]));
    view.appendChild(header("Môn · " + k.name, m.name, m.lessons.length + " bài giảng · " + minutes(m.lessons) + " phút đọc"));
    view.appendChild(lessonList(m.lessons, false));
  }

  function route() {
    view.textContent = "";
    var hash = decodeURIComponent(location.hash.slice(1));
    if (hash.indexOf("?q=") === 0) return renderHome(hash.slice(3));
    var parts = hash.replace(/^\//, "").split("/").filter(Boolean);
    var k = parts[0] && groupBy(lessons, "khoaSlug", "khoa").find(function (x) { return x.slug === parts[0]; });
    var m = k && parts[1] && groupBy(k.lessons, "monSlug", "mon").find(function (x) { return x.slug === parts[1]; });
    if (m) renderMon(k, m);
    else if (k) renderKhoa(k);
    else renderHome("");
    document.title = (m ? m.name : k ? k.name : "Khóa học") + " · System Design Notes";
  }
  window.addEventListener("hashchange", function () { route(); window.scrollTo(0, 0); });
  route();
})();
