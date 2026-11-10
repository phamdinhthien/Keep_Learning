(function () {
  var lessons = window.LESSONS || [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function minutes(list) {
    return list.reduce(function (s, l) { return s + (parseInt(l.readTime, 10) || 0); }, 0);
  }
  // Gom bài theo một category (giữ thứ tự xuất hiện trong lessons.js).
  function groupBy(list, key, nameKey) {
    var groups = [];
    list.forEach(function (l) {
      var g = groups.find(function (x) { return x.slug === l[key]; });
      if (!g) groups.push(g = { slug: l[key], name: l[nameKey], lessons: [] });
      g.lessons.push(l);
    });
    return groups;
  }

  var ICON = {
    go: '<path d="M9 6l6 6-6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5"/>',
    "system-design": '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-2a2 2 0 012-2h8a2 2 0 012 2v2"/>',
    ai: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 10h4v4h-4zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>'
  };
  function icon(name, cls) {
    var w = document.createElement("span");
    w.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[name] || ICON.book) + "</svg>";
    var svg = w.firstChild;
    if (cls) svg.setAttribute("class", cls);
    return svg;
  }
  // Bài đã xem: lưu trong trình duyệt của người đọc, mất cũng không sao.
  var store = {
    read: function () { try { return JSON.parse(localStorage.getItem("kl:seen") || "{}"); } catch (e) { return {}; } },
    mark: function (path) { try { var s = store.read(); s[path] = Date.now(); localStorage.setItem("kl:seen", JSON.stringify(s)); localStorage.setItem("kl:last", path); } catch (e) {} },
    last: function () { try { return localStorage.getItem("kl:last"); } catch (e) { return null; } }
  };
  var seen = store.read();
  function seenCount(list) { return list.filter(function (l) { return seen[l.path]; }).length; }
  function bar(done, total) {
    var b = el("span", "bar"), i = el("i");
    i.style.width = (total ? Math.round(done / total * 100) : 0) + "%";
    b.appendChild(i);
    return b;
  }

  // ---------- Trang bài học: bài trước / bài sau trong cùng Khóa ----------
  var nav = document.querySelector(".lesson-nav, .sdn-nav");
  if (nav) {
    var base = nav.dataset.root || document.body.dataset.root || "";
    var me = lessons.find(function (l) { return l.path === nav.dataset.lessonId; });
    var same = me ? lessons.filter(function (l) { return l.khoaSlug === me.khoaSlug && l.lopSlug === me.lopSlug; }) : [];
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
    if (me) store.mark(me.path);
    // Thanh tiến độ đọc và nút lên đầu trang
    var prog = el("div", "sdn-progress");
    var top = el("button", "sdn-top");
    top.type = "button";
    top.setAttribute("aria-label", "Lên đầu trang");
    top.appendChild(icon("up"));
    top.addEventListener("click", function () {
      var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
    });
    document.body.appendChild(prog);
    document.body.appendChild(top);
    var ticking = false;
    function onScroll() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
      top.classList.toggle("on", window.scrollY > 600);
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    return;
  }

  // ---------- Trang chủ: #/ → Category, #/<category> → Khóa, #/<category>/<khóa> → Bài học ----------
  var view = document.getElementById("view");
  if (!view) return;
  var fold = function (s) { return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase(); };

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
  var ACCENTS = ["#5eead4", "#60a5fa", "#c084fc", "#f5a524", "#fb7185"];
  function card(href, num, title, desc, meta, kind, opt) {
    opt = opt || {};
    var li = el("li");
    var a = el("a", "card card-" + kind + (opt.seen ? " seen" : ""));
    a.href = href;
    if (opt.accent) a.style.setProperty("--acc", opt.accent);
    var n = el("span", "num");
    if (opt.icon) n.appendChild(icon(opt.icon)); else n.textContent = num;
    a.appendChild(n);
    a.appendChild(el("span", "t", title));
    if (desc) a.appendChild(el("span", "d", desc));
    if (meta) a.appendChild(el("span", "m", meta));
    if (opt.chips) {
      var c = el("span", "chips");
      opt.chips.forEach(function (x) { c.appendChild(el("span", "chip" + (x.ok ? " ok" : ""), x.text)); });
      a.appendChild(c);
    }
    if (opt.progress) a.appendChild(bar(opt.progress[0], opt.progress[1]));
    a.appendChild(icon("go", "go"));
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
      var chips = [{ text: l.readTime }];
      if (seen[l.path]) chips.push({ text: "Đã xem", ok: true });
      ul.appendChild(card("lessons/" + l.path, String(i + 1), l.title, l.description, showPath ? l.khoa + " › " + l.lop : "", "lesson",
        { seen: !!seen[l.path], icon: seen[l.path] ? "check" : "", chips: chips, accent: "#f5a524" }));
    });
    return ul;
  }

  function renderHome(q) {
    var head = header("Keep Learning", "");
    var h1 = head.querySelector("h1");
    h1.appendChild(document.createTextNode("Thư viện "));
    h1.appendChild(el("span", "grad", "bài học"));
    view.appendChild(head);
    var allLops = groupBy(lessons, "lopSlug", "lop").length;
    var st = el("ul", "stats");
    [[groupBy(lessons, "khoaSlug", "khoa").length, "category"], [allLops, "khóa"], [lessons.length, "bài học"], [minutes(lessons), "phút đọc"]].forEach(function (x) {
      var li = el("li"); li.appendChild(el("b", "", String(x[0]))); li.appendChild(el("span", "", x[1])); st.appendChild(li);
    });
    view.appendChild(st);
    var wrap = el("div", "search-wrap");
    var input = el("input", "search");
    input.type = "search";
    input.placeholder = "Tìm bài học (gõ không dấu cũng được)…";
    input.setAttribute("aria-label", "Tìm bài học");
    input.value = q || "";
    wrap.appendChild(input);
    wrap.appendChild(icon("search"));
    wrap.appendChild(el("kbd", "", "/"));
    view.appendChild(wrap);
    searchInput = input;
    var results = el("div");
    view.appendChild(results);
    function draw() {
      results.textContent = "";
      var query = fold(input.value.trim());
      if (query) {
        var hits = lessons.filter(function (l) { return fold([l.title, l.description, l.lop, l.khoa, l.id].join(" ")).indexOf(query) >= 0; });
        results.appendChild(el("h2", "section-title", hits.length + " bài học khớp"));
        if (hits.length) results.appendChild(lessonList(hits, true));
        else results.appendChild(el("p", "empty", "Không tìm thấy bài nào. Thử từ khóa ngắn hơn, hoặc gõ không dấu."));
        return;
      }
      var last = lessons.find(function (l) { return l.path === store.last(); });
      if (last) {
        var same = lessons.filter(function (l) { return l.khoaSlug === last.khoaSlug && l.lopSlug === last.lopSlug; });
        var next = same[same.indexOf(last) + 1];
        var target = next && !seen[next.path] ? next : last;
        var r = card("lessons/" + target.path, "", target.title, "", target === last ? "Đọc lại bài gần nhất" : "Học tiếp", "lesson resume", { icon: "play" });
        var box = el("ul", "list resume-wrap"); box.appendChild(r);
        results.appendChild(box);
        var m = r.querySelector(".m"); if (m) r.firstChild.insertBefore(m, r.querySelector(".t"));
      }
      results.appendChild(el("h2", "section-title", "Category"));
      var khoas = groupBy(lessons, "khoaSlug", "khoa");
      if (!khoas.length) { results.appendChild(el("p", "empty", "Chưa có bài học nào.")); return; }
      var ul = el("ul", "list grid");
      khoas.forEach(function (k, i) {
        var lops = groupBy(k.lessons, "lopSlug", "lop");
        ul.appendChild(card("#/" + k.slug, String(i + 1), k.name, "",
          lops.length + " khóa · " + k.lessons.length + " bài học · " + minutes(k.lessons) + " phút đọc", "khoa",
          { icon: ICON[k.slug] ? k.slug : "book", accent: ACCENTS[i % ACCENTS.length], progress: [seenCount(k.lessons), k.lessons.length] }));
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
    var lops = groupBy(k.lessons, "lopSlug", "lop");
    view.appendChild(crumbs([{ name: "Category", href: "#/" }, { name: k.name }]));
    view.appendChild(header("Category", k.name, lops.length + " khóa · " + k.lessons.length + " bài học"));
    var ul = el("ul", "list");
    lops.forEach(function (m, i) {
      var done = seenCount(m.lessons);
      ul.appendChild(card("#/" + k.slug + "/" + m.slug, String(i + 1), m.name, "",
        m.lessons.length + " bài học · " + minutes(m.lessons) + " phút đọc · đã xem " + done + "/" + m.lessons.length, "lop",
        { accent: "#60a5fa", progress: [done, m.lessons.length] }));
    });
    view.appendChild(ul);
  }

  function renderLop(k, m) {
    view.appendChild(crumbs([{ name: "Category", href: "#/" }, { name: k.name, href: "#/" + k.slug }, { name: m.name }]));
    view.appendChild(header("Khóa · " + k.name, m.name, m.lessons.length + " bài học · " + minutes(m.lessons) + " phút đọc"));
    var done = seenCount(m.lessons);
    var ph = el("div", "progress-head");
    ph.appendChild(el("span", "", "Đã xem " + done + "/" + m.lessons.length));
    ph.appendChild(bar(done, m.lessons.length));
    view.appendChild(ph);
    view.appendChild(lessonList(m.lessons, false));
  }

  var searchInput = null;
  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName || "")) return;
    if (searchInput && document.body.contains(searchInput)) { e.preventDefault(); searchInput.focus(); }
  });
  function route() {
    seen = store.read();
    view.textContent = "";
    var hash = decodeURIComponent(location.hash.slice(1));
    if (hash.indexOf("?q=") === 0) return renderHome(hash.slice(3));
    var parts = hash.replace(/^\//, "").split("/").filter(Boolean);
    var k = parts[0] && groupBy(lessons, "khoaSlug", "khoa").find(function (x) { return x.slug === parts[0]; });
    var m = k && parts[1] && groupBy(k.lessons, "lopSlug", "lop").find(function (x) { return x.slug === parts[1]; });
    if (m) renderLop(k, m);
    else if (k) renderKhoa(k);
    else renderHome("");
    document.title = (m ? m.name : k ? k.name : "Category") + " · System Design Notes";
  }
  window.addEventListener("hashchange", function () { route(); window.scrollTo(0, 0); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) route(); });
  route();
})();
