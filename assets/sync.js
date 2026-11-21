// Đăng nhập Google và đồng bộ tiến độ học (bài đã xem, bài gần nhất) qua Firebase.
// Chưa điền FIREBASE_CONFIG thì file này không làm gì: site chạy như cũ, tiến độ chỉ lưu trong trình duyệt.
//
// Cách bật: xem mục "Đăng nhập Google" trong README.md.
// Config Firebase của web app là thông tin công khai (không phải secret); quyền truy cập dữ liệu
// do Firestore rules ở firebase/firestore.rules quyết định.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDjsRgtVQnbKmUHkkn9MqqQe5KGG0HXALM",
  authDomain: "keeplearnin-892ec.firebaseapp.com",
  projectId: "keeplearnin-892ec",
  storageBucket: "keeplearnin-892ec.firebasestorage.app",
  messagingSenderId: "910972746194",
  appId: "1:910972746194:web:992f2da42e419b5ea9b00b"
};

const SDK = "https://www.gstatic.com/firebasejs/13.4.0/";
const SEEN = "kl:seen", LAST = "kl:last", LATER = "kl:authLater";

function readLocal() {
  try { return JSON.parse(localStorage.getItem(SEEN) || "{}") || {}; } catch (e) { return {}; }
}
function writeLocal(seen) {
  try {
    localStorage.setItem(SEEN, JSON.stringify(seen));
    const last = latest(seen);
    if (last) localStorage.setItem(LAST, last);
  } catch (e) {}
}
// Bài gần nhất = bài có thời điểm xem mới nhất.
function latest(seen) {
  let best = null, t = -1;
  for (const p in seen) if (seen[p] > t) { t = seen[p]; best = p; }
  return best;
}
// Gộp hai bản tiến độ, giữ thời điểm xem mới hơn của từng bài.
function merge(a, b) {
  const out = Object.assign({}, a);
  for (const p in b) if (typeof b[p] === "number" && !(out[p] >= b[p])) out[p] = b[p];
  return out;
}

const CSS = `
.kl-auth{margin-left:auto;display:inline-flex;align-items:center;gap:8px;font:500 12px/1 Inter,ui-sans-serif,system-ui,sans-serif;position:relative}
.kl-auth button{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;border:1px solid #2a2a30;border-radius:8px;background:#17171a;color:#ededf0;font:inherit;cursor:pointer;transition:border-color .2s}
.kl-auth button:hover{border-color:#5eead4}
.kl-auth button:focus-visible{outline:2px solid #5eead4;outline-offset:2px}
.kl-auth button[disabled]{opacity:.6;cursor:wait}
.kl-auth .g{width:14px;height:14px;flex:none}
.kl-auth .av{width:22px;height:22px;border-radius:50%;flex:none;background:#2a2a30;object-fit:cover}
.kl-auth .who{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kl-auth .st{color:#9a9aa5;font-size:11px;white-space:nowrap}
.kl-auth .st.ok{color:#86efac}.kl-auth .st.err{color:#fb7185}
.kl-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:70;min-width:220px;padding:12px;border:1px solid #2a2a30;border-radius:10px;background:#17171a;box-shadow:0 16px 40px -12px rgb(0 0 0 / .6);display:grid;gap:10px}
.kl-menu[hidden]{display:none}
.kl-menu p{margin:0;color:#9a9aa5;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
.kl-menu p b{display:block;color:#ededf0;font-size:13px}
.kl-menu button{justify-content:center}
.kl-prompt{position:fixed;left:20px;bottom:20px;z-index:80;width:min(360px,calc(100vw - 32px));padding:18px 18px 16px;border:1px solid #2a2a30;border-radius:14px;background:#17171a;color:#ededf0;box-shadow:0 24px 60px -16px rgb(0 0 0 / .7),0 0 0 1px rgb(94 234 212 / .08);font:14px/1.5 Inter,ui-sans-serif,system-ui,sans-serif;animation:kl-in .25s ease-out both}
.kl-prompt b{display:block;font-size:15px;font-weight:700;margin:0 28px 6px 0}
.kl-prompt p{margin:0 0 14px;color:#9a9aa5;font-size:13px}
.kl-prompt .acts{display:flex;gap:8px;flex-wrap:wrap}
.kl-prompt button{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:36px;padding:0 14px;border:1px solid #2a2a30;border-radius:8px;background:transparent;color:#ededf0;font:500 13px/1 Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;white-space:nowrap;transition:border-color .2s,background .2s}
.kl-prompt button:hover{border-color:#5eead4}
.kl-prompt button:focus-visible{outline:2px solid #5eead4;outline-offset:2px}
.kl-prompt button[disabled]{opacity:.6;cursor:wait}
.kl-prompt .go{background:#fff;color:#1f1f1f;border-color:#fff;font-weight:600}
.kl-prompt .go:hover{background:#eef2f1;border-color:#5eead4}
.kl-prompt .later{color:#9a9aa5}
.kl-prompt .x{position:absolute;top:8px;right:8px;width:30px;height:30px;padding:0;border:0;font-size:20px;color:#9a9aa5}
.kl-prompt .g{width:16px;height:16px;flex:none}
@keyframes kl-in{from{opacity:0;transform:translateY(10px)}}
@media (prefers-reduced-motion:reduce){.kl-prompt{animation:none}}
@media (max-width:560px){.kl-auth .who,.kl-auth .st{display:none}.kl-prompt{left:16px;bottom:16px}.kl-prompt .go{flex:1}}
`;
const G_ICON = '<svg class="g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

function h(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

async function main() {
  if (!FIREBASE_CONFIG) return;
  const host = document.querySelector(".topbar, .sdn-bar");
  if (!host) return;

  const style = h("style"); style.textContent = CSS; document.head.appendChild(style);
  const box = h("div", "kl-auth");
  host.appendChild(box);

  const [{ initializeApp }, A] = await Promise.all([
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-auth.js")
  ]);
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = A.getAuth(app);
  let F = null, db = null;
  async function store() {
    if (!F) { F = await import(SDK + "firebase-firestore.js"); db = F.getFirestore(app); }
    return F;
  }

  async function signIn(btns) {
    btns.forEach((x) => { x.disabled = true; });
    const provider = new A.GoogleAuthProvider();
    try { await A.signInWithPopup(auth, provider); }
    catch (e) {
      if (e && e.code === "auth/popup-blocked") return A.signInWithRedirect(auth, provider);
      btns.forEach((x) => { x.disabled = false; });
      if (!(e && /popup-closed|cancelled-popup/.test(e.code || ""))) alert("Đăng nhập không thành công: " + ((e && e.code) || e));
    }
  }
  function gButton(label) {
    const b = h("button");
    b.type = "button";
    b.innerHTML = G_ICON;
    b.appendChild(document.createTextNode(label));
    return b;
  }

  function signedOut() {
    box.textContent = "";
    const b = gButton("Đăng nhập");
    b.title = "Đăng nhập Google để đồng bộ tiến độ học giữa các thiết bị";
    b.addEventListener("click", () => signIn([b]));
    box.appendChild(b);
  }

  // Gợi ý đăng nhập khi mở trang mà chưa đăng nhập. Bấm "Để sau" thì 7 ngày sau mới hỏi lại.
  let prompt = null;
  function closePrompt() { if (prompt) { prompt.remove(); prompt = null; } }
  function showPrompt() {
    try { if (Date.now() - Number(localStorage.getItem(LATER) || 0) < 7 * 864e5) return; } catch (e) {}
    const card = h("div", "kl-prompt");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-labelledby", "kl-prompt-t");
    const x = h("button", "x", "×");
    x.type = "button";
    x.setAttribute("aria-label", "Đóng");
    const t = h("b", "", "Lưu tiến độ học của bạn");
    t.id = "kl-prompt-t";
    const done = Object.keys(readLocal()).length;
    const p = h("p", "", (done ? "Bạn đã xem " + done + " bài trên trình duyệt này. " : "") +
      "Đăng nhập Google để lưu tiến độ theo tài khoản và học tiếp trên máy khác.");
    const go = gButton("Đăng nhập với Google");
    go.className = "go";
    const later = h("button", "later", "Để sau");
    later.type = "button";
    const dismiss = () => { try { localStorage.setItem(LATER, String(Date.now())); } catch (e) {} closePrompt(); };
    x.addEventListener("click", dismiss);
    later.addEventListener("click", dismiss);
    go.addEventListener("click", () => signIn([go]));
    const acts = h("div", "acts");
    acts.appendChild(go); acts.appendChild(later);
    card.appendChild(x); card.appendChild(t); card.appendChild(p); card.appendChild(acts);
    document.body.appendChild(card);
    prompt = card;
  }

  function signedIn(user) {
    box.textContent = "";
    const b = h("button");
    b.type = "button";
    b.setAttribute("aria-haspopup", "true");
    b.setAttribute("aria-expanded", "false");
    const av = h("img", "av");
    av.alt = ""; av.referrerPolicy = "no-referrer";
    if (user.photoURL) av.src = user.photoURL;
    b.appendChild(av);
    b.appendChild(h("span", "who", user.displayName || user.email || "Tài khoản"));
    const st = h("span", "st", "đang đồng bộ…");
    b.appendChild(st);
    const menu = h("div", "kl-menu");
    menu.hidden = true;
    const info = h("p");
    info.appendChild(h("b", "", user.displayName || "Tài khoản Google"));
    info.appendChild(document.createTextNode(user.email || ""));
    menu.appendChild(info);
    const note = h("p", "", "Tiến độ học được lưu theo tài khoản này và tự đồng bộ giữa các thiết bị.");
    menu.appendChild(note);
    const out = h("button", "", "Đăng xuất");
    out.type = "button";
    out.addEventListener("click", () => A.signOut(auth));
    menu.appendChild(out);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      b.setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.addEventListener("click", (e) => { if (!box.contains(e.target)) { menu.hidden = true; b.setAttribute("aria-expanded", "false"); } });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") menu.hidden = true; });
    box.appendChild(b);
    box.appendChild(menu);
    return (text, kind) => { st.textContent = text; st.className = "st" + (kind ? " " + kind : ""); };
  }

  // Tải tiến độ trên server, gộp với tiến độ trong trình duyệt, ghi lại cả hai nơi.
  async function sync(user, status) {
    try {
      const { doc, getDoc, setDoc } = await store();
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      const remote = (snap.exists() && snap.data().seen) || {};
      const local = readLocal();
      const merged = merge(remote, local);
      writeLocal(merged);
      const changed = Object.keys(merged).some((p) => remote[p] !== merged[p]);
      if (changed) await setDoc(ref, { seen: merged, last: latest(merged), updatedAt: Date.now() }, { merge: true });
      status("đã đồng bộ", "ok");
      if (Object.keys(merged).some((p) => local[p] !== merged[p]) && window.KL && window.KL.rerender) window.KL.rerender();
    } catch (e) {
      console.warn("[sync]", e);
      status("lỗi đồng bộ", "err");
    }
  }

  let first = true;
  A.onAuthStateChanged(auth, (user) => {
    if (user) { closePrompt(); sync(user, signedIn(user)); }
    else { signedOut(); if (first) showPrompt(); }
    first = false;
  });
}

main().catch((e) => console.warn("[sync]", e));
