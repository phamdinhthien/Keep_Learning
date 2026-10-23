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
    if (text) n.textContent = text;
    return n;
  }

  // Trang bài học: liên kết bài trước / bài sau.
  var nav = document.querySelector(".lesson-nav");
  if (nav) {
    var idx = lessons.findIndex(function (l) { return l.id === nav.dataset.lessonId; });
    [[idx - 1, "prev", "← Bài trước"], [idx + 1, "next", "Bài tiếp theo →"]].forEach(function (p) {
      var l = idx >= 0 && lessons[p[0]];
      if (!l) return;
      var a = el("a", p[1]);
      a.href = l.file;
      a.appendChild(el("small", "", p[2]));
      a.appendChild(document.createTextNode(l.title));
      nav.appendChild(a);
    });
  }

  // Trang danh sách: nhóm theo khóa học, có ô tìm kiếm.
  var list = document.getElementById("lessons");
  if (!list) return;
  var search = document.getElementById("search");
  var count = document.getElementById("count");
  var fold = function (s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase(); };

  function render() {
    var q = fold(search.value.trim());
    var shown = lessons.filter(function (l) {
      return !q || fold(l.title + " " + l.description + " " + l.id).indexOf(q) >= 0;
    });
    list.textContent = "";
    count.textContent = lessons.length + " bài";
    if (!shown.length) { list.appendChild(el("p", "empty", lessons.length ? "Không có bài nào khớp." : "Chưa có bài học nào.")); return; }
    var groups = {};
    shown.forEach(function (l) { (groups[l.course || "Khác"] = groups[l.course || "Khác"] || []).push(l); });
    Object.keys(groups).forEach(function (course) {
      list.appendChild(el("h2", "course-title", course));
      var ul = el("ul", "lesson-list");
      groups[course].forEach(function (l) {
        var li = el("li");
        var a = el("a", "lesson-card");
        a.href = "lessons/" + l.file;
        a.appendChild(el("span", "num", String(lessons.indexOf(l) + 1)));
        a.appendChild(el("span", "t", l.title));
        if (l.description) a.appendChild(el("span", "d", l.description));
        a.appendChild(el("span", "m", [l.id, l.readTime].filter(Boolean).join(" · ")));
        li.appendChild(a);
        ul.appendChild(li);
      });
      list.appendChild(ul);
    });
  }
  search.addEventListener("input", render);
  render();
})();
