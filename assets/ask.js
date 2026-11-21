// "Hỏi AI" trên trang bài học: Gemini qua Firebase AI Logic (Gemini Developer API, gói miễn phí).
// sync.js nạp file này khi có config Firebase và đang ở trang bài học. Chỉ người đã đăng nhập mới hỏi được.

// Model thử lần lượt: model đầu không có (bị đổi tên / ngừng) thì dùng model sau.
const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
const DAILY_LIMIT = 40;          // số câu hỏi mỗi người mỗi ngày (giới hạn mềm, đếm trong trình duyệt)
const MAX_CONTEXT = 40000;       // số ký tự nội dung bài gửi kèm
// App Check: chỉ request đến từ site này (có token reCAPTCHA v3) mới gọi được Gemini.
// Site key là thông tin công khai; secret key chỉ dán trong Firebase console › App Check.
const RECAPTCHA_SITE_KEY = "6Lc6JCsuAAAAAN4iBFKNnlNJbeVrgxTl4pvm69dC";

const CSS = `
.kl-ask-fab{position:fixed;right:18px;bottom:74px;z-index:56;display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 16px;border:1px solid rgb(94 234 212 / .45);border-radius:22px;background:#17171a;color:#ededf0;font:600 13px/1 Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;box-shadow:0 12px 30px -12px rgb(94 234 212 / .45);transition:border-color .2s,transform .2s}
.kl-ask-fab:hover{border-color:#5eead4;transform:translateY(-2px)}
.kl-ask-fab:focus-visible,.kl-ask button:focus-visible,.kl-ask textarea:focus-visible{outline:2px solid #5eead4;outline-offset:2px}
.kl-ask-fab svg{width:18px;height:18px;color:#5eead4}
.kl-ask{margin:0;padding:0;position:fixed;right:18px;bottom:18px;z-index:90;width:min(420px,calc(100vw - 36px));height:min(640px,calc(100vh - 90px));display:flex;flex-direction:column;border:1px solid #2a2a30;border-radius:16px;background:#121214;color:#ededf0;box-shadow:0 30px 80px -20px rgb(0 0 0 / .8);font:14px/1.6 Inter,ui-sans-serif,system-ui,sans-serif;overflow:hidden;animation:kl-in .2s ease-out both}
.kl-ask[hidden],.kl-ask [hidden],.kl-ask-fab[hidden]{display:none!important}
.kl-ask *{box-sizing:border-box}
.kl-ask .hd{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #2a2a30;background:#17171a}
.kl-ask .hd b{font-size:14px}
.kl-ask .hd span{flex:1;min-width:0;color:#9a9aa5;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kl-ask .hd button{width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:#9a9aa5;font-size:20px;cursor:pointer}
.kl-ask .hd button:hover{background:#2a2a30;color:#ededf0}
.kl-ask .log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:12px;overscroll-behavior:contain}
.kl-ask .msg{max-width:92%;padding:10px 12px;border-radius:12px;overflow-wrap:anywhere}
.kl-ask .msg.me{align-self:flex-end;background:#1f3b38;border:1px solid rgb(94 234 212 / .25)}
.kl-ask .msg.ai{align-self:flex-start;background:#1b1b1f;border:1px solid #2a2a30}
.kl-ask .msg.err{align-self:stretch;max-width:none;background:#2a1418;border:1px solid rgb(251 113 133 / .35);color:#fecdd3;font-size:13px}
.kl-ask .msg p{margin:0 0 8px}.kl-ask .msg p:last-child{margin:0}
.kl-ask .msg ul,.kl-ask .msg ol{margin:0 0 8px;padding-left:20px}
.kl-ask .msg code{font:12.5px/1.5 "IBM Plex Mono",ui-monospace,Menlo,monospace;background:#0d0d0f;border:1px solid #2a2a30;border-radius:4px;padding:0 4px}
.kl-ask .msg pre{margin:0 0 8px;padding:10px;background:#0d0d0f;border:1px solid #2a2a30;border-radius:8px;overflow-x:auto}
.kl-ask .msg pre code{border:0;padding:0;background:none}
.kl-ask .msg h4{margin:4px 0 6px;font-size:14px}
.kl-ask .dots::after{content:"…";animation:kl-blink 1s steps(2) infinite}
@keyframes kl-blink{50%{opacity:.2}}
.kl-ask .intro{color:#9a9aa5;font-size:13px}
.kl-ask .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.kl-ask .chips button{padding:6px 10px;border:1px solid #2a2a30;border-radius:16px;background:#17171a;color:#ededf0;font:500 12px/1.3 Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;text-align:left}
.kl-ask .chips button:hover{border-color:#5eead4}
.kl-ask form{display:flex;gap:8px;padding:10px;border-top:1px solid #2a2a30;background:#17171a}
.kl-ask textarea{flex:1;min-height:40px;max-height:140px;resize:none;padding:9px 12px;border:1px solid #2a2a30;border-radius:10px;background:#0d0d0f;color:#ededf0;font:14px/1.5 Inter,ui-sans-serif,system-ui,sans-serif}
.kl-ask form button,.kl-ask .gate button{height:40px;padding:0 14px;border:1px solid #5eead4;border-radius:10px;background:#5eead4;color:#0d0d0f;font:600 13px/1 Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.kl-ask form button[disabled]{opacity:.5;cursor:not-allowed}
.kl-ask .gate{flex:1;display:grid;place-content:center;gap:12px;padding:24px;text-align:center;color:#9a9aa5;font-size:13px}
.kl-ask .gate b{color:#ededf0;font-size:15px}
.kl-ask .gate button{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#fff;border-color:#fff;color:#1f1f1f}
.kl-ask .gate .g{width:16px;height:16px}
.kl-ask .foot{padding:0 12px 8px;background:#17171a;color:#6b6b75;font-size:11px}
@media (max-width:560px){
  .kl-ask-fab{right:16px;bottom:72px}
  .kl-ask{inset:0;width:auto;height:auto;border-radius:0;border:0}
}
@media (prefers-reduced-motion:reduce){.kl-ask,.kl-ask-fab{animation:none;transition:none}}
`;
const SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
const SUGGEST = ["Tóm tắt bài này trong 5 ý", "Giải thích lại ý khó nhất cho người mới", "Cho mình 3 câu hỏi ôn tập kèm đáp án", "Áp dụng kiến thức này vào dự án thực tế thế nào?"];

function h(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
// Markdown tối giản và an toàn: escape trước rồi mới thêm thẻ.
function md(src) {
  const blocks = [];
  let s = esc(src).replace(/```[\w-]*\n?([\s\S]*?)(```|$)/g, (_, code) => { blocks.push(code); return "\u0000" + (blocks.length - 1) + "\u0000"; });
  const inline = (t) => t.replace(/`([^`\n]+)`/g, "<code>$1</code>").replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>");
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push("</" + list + ">"); list = null; } };
  s.split("\n").forEach((line) => {
    const code = line.match(/^\u0000(\d+)\u0000$/);
    if (code) { close(); out.push("<pre><code>" + blocks[+code[1]].replace(/\n$/, "") + "</code></pre>"); return; }
    const ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/), hd = line.match(/^#{1,4}\s+(.*)/);
    if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      if (list !== kind) { close(); out.push("<" + kind + ">"); list = kind; }
      out.push("<li>" + inline((ul || ol)[1]) + "</li>");
    } else if (hd) { close(); out.push("<h4>" + inline(hd[1]) + "</h4>"); }
    else if (line.trim()) { close(); out.push("<p>" + inline(line) + "</p>"); }
    else close();
  });
  close();
  return out.join("").replace(/\u0000(\d+)\u0000/g, (_, i) => "<pre><code>" + blocks[+i] + "</code></pre>");
}

function lessonText() {
  const c = document.body.cloneNode(true);
  c.querySelectorAll("script,style,svg,nav.sdn-bar,.sdn-nav,.lesson-nav,.sdn-progress,.sdn-top,.kl-auth,.kl-prompt,.kl-ask,.kl-ask-fab").forEach((n) => n.remove());
  c.querySelectorAll("p,div,li,h1,h2,h3,h4,tr,section,header,footer,pre,br").forEach((n) => n.append("\n"));
  return c.textContent.replace(/[ \t ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, MAX_CONTEXT);
}
function used() {
  try { const d = JSON.parse(localStorage.getItem("kl:askCount") || "{}"); return d.day === new Date().toDateString() ? d.n : 0; } catch (e) { return 0; }
}
function bump() {
  try { localStorage.setItem("kl:askCount", JSON.stringify({ day: new Date().toDateString(), n: used() + 1 })); } catch (e) {}
}

export function init({ app, auth, A, SDK, signIn, G_ICON }) {
  const style = h("style"); style.textContent = CSS; document.head.appendChild(style);
  const title = (document.querySelector("h1") || {}).textContent || document.title;

  const fab = h("button", "kl-ask-fab");
  fab.type = "button";
  fab.innerHTML = SPARK;
  fab.appendChild(document.createTextNode("Hỏi AI"));
  fab.setAttribute("aria-haspopup", "dialog");
  document.body.appendChild(fab);

  const panel = h("div", "kl-ask");
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Hỏi AI về bài học");
  const head = h("div", "hd");
  head.innerHTML = SPARK.replace("<svg", '<svg style="width:18px;height:18px;color:#5eead4;flex:none"');
  head.appendChild(h("b", "", "Hỏi AI"));
  head.appendChild(h("span", "", title.trim()));
  const x = h("button", "", "×"); x.type = "button"; x.setAttribute("aria-label", "Đóng");
  head.appendChild(x);
  const body = h("div", "log");
  const form = h("form");
  const ta = h("textarea"); ta.rows = 1; ta.placeholder = "Hỏi về bài này…"; ta.setAttribute("aria-label", "Câu hỏi");
  const send = h("button", "", "Gửi"); send.type = "submit";
  form.appendChild(ta); form.appendChild(send);
  const foot = h("div", "foot", "Gemini trả lời dựa trên nội dung bài; có thể sai, nên đối chiếu lại với bài.");
  const gate = h("div", "gate");
  panel.appendChild(head); panel.appendChild(gate); panel.appendChild(body); panel.appendChild(form); panel.appendChild(foot);
  document.body.appendChild(panel);

  const open = () => { panel.hidden = false; fab.hidden = true; (me ? ta : gate.querySelector("button") || x).focus(); };
  const close = () => { panel.hidden = true; fab.hidden = false; fab.focus(); };
  fab.addEventListener("click", open);
  x.addEventListener("click", close);
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  function renderGate(user) {
    gate.hidden = !!user; body.hidden = form.hidden = foot.hidden = !user;
    gate.textContent = "";
    if (user) return;
    gate.appendChild(h("b", "", "Đăng nhập để hỏi AI"));
    gate.appendChild(h("span", "", "Hỏi đáp với Gemini về nội dung bài đang đọc. Miễn phí, chỉ cần đăng nhập Google."));
    const b = h("button"); b.type = "button"; b.innerHTML = G_ICON; b.appendChild(document.createTextNode("Đăng nhập với Google"));
    b.addEventListener("click", () => signIn([b]));
    gate.appendChild(b);
  }
  let me = null;
  A.onAuthStateChanged(auth, (user) => { me = user; renderGate(user); });

  function intro() {
    const d = h("div", "intro", "Mình đã đọc bài này. Bạn muốn hỏi gì? Ví dụ:");
    const chips = h("div", "chips");
    SUGGEST.forEach((q) => { const b = h("button", "", q); b.type = "button"; b.addEventListener("click", () => ask(q)); chips.appendChild(b); });
    d.appendChild(chips);
    body.appendChild(d);
  }
  intro();

  let chat = null, modelIdx = 0, busy = false, appCheckReady = false;
  const history = [];
  async function makeChat() {
    if (RECAPTCHA_SITE_KEY && !appCheckReady) {
      const { initializeAppCheck, ReCaptchaV3Provider } = await import(SDK + "firebase-app-check.js");
      initializeAppCheck(app, { provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
      appCheckReady = true;
    }
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import(SDK + "firebase-ai.js");
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, {
      model: MODELS[modelIdx],
      systemInstruction: "Bạn là trợ giảng cho trang học \"Keep Learning\". Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, dùng markdown đơn giản " +
        "(đoạn văn, gạch đầu dòng, **in đậm**, `code`). Dựa chủ yếu vào nội dung bài học bên dưới; nếu câu hỏi vượt ra ngoài bài, " +
        "vẫn trả lời bằng kiến thức chung nhưng nói rõ phần đó không có trong bài. Không bịa số liệu.\n\n" +
        "=== BÀI HỌC: " + title.trim() + " ===\n" + lessonText()
    });
    return model.startChat({ history: history.slice() });
  }

  function bubble(cls, text) {
    const m = h("div", "msg " + cls);
    if (text != null) m.textContent = text;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  }

  async function ask(q) {
    q = q.trim();
    if (!q || busy) return;
    if (!me) return renderGate(null);
    if (used() >= DAILY_LIMIT) { bubble("err", "Hôm nay bạn đã hỏi " + DAILY_LIMIT + " câu, giới hạn mỗi ngày. Mai hỏi tiếp nhé."); return; }
    busy = true; send.disabled = true; ta.value = ""; ta.style.height = "";
    const intro = body.querySelector(".intro"); if (intro) intro.remove();
    bubble("me", q);
    const out = bubble("ai"); out.innerHTML = '<span class="dots">Đang nghĩ</span>';
    let text = "";
    for (;;) {
      try {
        if (!chat) chat = await makeChat();
        const res = await chat.sendMessageStream(q);
        for await (const chunk of res.stream) {
          text += chunk.text();
          out.innerHTML = md(text);
          body.scrollTop = body.scrollHeight;
        }
        history.push({ role: "user", parts: [{ text: q }] }, { role: "model", parts: [{ text }] });
        bump();
        break;
      } catch (e) {
        console.warn("[ask]", e);
        const msg = String((e && e.message) || e);
        // Model không tồn tại hoặc đã ngừng: thử model kế tiếp.
        // Model không tồn tại, đã ngừng, hoặc không có hạn mức miễn phí (429, limit 0): thử model kế tiếp.
        if (!text && /\b404\b|not.?found|not supported|deprecated|retired|\b429\b|quota|resource.?exhausted|rate.?limit/i.test(msg) && modelIdx < MODELS.length - 1) { modelIdx++; chat = null; continue; }
        out.remove();
        if (text) { const o = bubble("ai"); o.innerHTML = md(text); }
        const err = bubble("err", /\b429\b|quota|resource.?exhausted|rate.?limit/i.test(msg) ? "AI đang quá tải hoặc đã hết lượt miễn phí. Thử lại sau ít phút."
          : /app.?check|attestation|recaptcha/i.test(msg) ? "Không xác minh được trình duyệt (App Check). Tải lại trang rồi thử lại; nếu vẫn lỗi, báo chủ site."
          : /api.?not.?enabled|\b40[13]\b|permission|billing/i.test(msg) ? "AI chưa được bật cho site này (Firebase AI Logic). Báo chủ site nhé."
          : "Không hỏi được.");
        const det = h("details"); det.style.marginTop = "6px";
        det.appendChild(h("summary", "", "Chi tiết lỗi"));
        det.appendChild(h("code", "", "[" + MODELS[modelIdx] + "] " + msg.slice(0, 600)));
        err.appendChild(det);
        chat = null; modelIdx = 0;
        break;
      }
    }
    busy = false; send.disabled = false; ta.focus();
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); ask(ta.value); });
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(ta.value); } });
  ta.addEventListener("input", () => { ta.style.height = ""; ta.style.height = Math.min(140, ta.scrollHeight) + "px"; });
}
