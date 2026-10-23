/* ============================================================
   赛证通 · 主逻辑 v2
   模块：登录身份认证 / 首页分类联动 / 详情增强（材料+图片轮播）
        校内通知（筛选+报名登记+教师发布管理）/ 社区（头像私信
        +全局搜索+教师辅助）/ 我的（已完成分类+教师端）
        AI 助手 / 好友私信群聊 / 消息提醒
   ============================================================ */

/* ================= 版本与自动更新 =================
   手机浏览器/微信对 HTML 缓存很顽固，改版后用户可能还在跑旧 JS。
   页面加载后静默拉一次线上 index.html（绕缓存）对比版本号，
   若服务端已发新版则自动刷新一次（sessionStorage 防死循环）。 */
const APP_VERSION = "3.0.2";
(function autoUpdateCheck() {
  try {
    if (sessionStorage.getItem("szt_autoupd_" + APP_VERSION)) return; // 本次会话已检查/已刷新过
    fetch("index.html?_chk=" + Date.now(), { cache: "no-store" })
      .then(r => r.ok ? r.text() : "")
      .then(html => {
        if (!html) return;
        const m = html.match(/app\.js\?v=([\w.]+)/);
        const latest = m ? m[1] : "";
        if (latest && latest !== APP_VERSION) {
          sessionStorage.setItem("szt_autoupd_" + APP_VERSION, "1");
          location.reload();   // 拉到最新 HTML 与资源
        } else {
          sessionStorage.setItem("szt_autoupd_" + APP_VERSION, "1");
        }
      })
      .catch(() => {});        // 本地 file:// 打开等场景 fetch 会失败，静默忽略
  } catch (e) { /* 忽略 */ }
})();

/* ================= 全局状态 ================= */
const STORE_KEY = "szt_state_v2";
let state = {
  user: JSON.parse(JSON.stringify(DB.initUser)),
  favs: DB.initFavs.slice(),
  done: [],
  myPosts: [],
  likes: [],
  msgs: DB.initMsgs.slice(),
  chats: {},
  myGroups: [],
  friends: DB.friends.map(f => f.id),
  myNotices: [],          // 教师发布的通知
  signups: {},            // {noticeId: [{name, major, phone, time}]}
  guideList: [],           // 教师指导赛事 [{id, note}]
  recs: [],                // 教师推荐赛事 [{evId, teacher, school, note, time}]
  joinedGroups: [],        // 已加入的教师指导群 id
  remindOff: [],           // 已关闭提醒的预赛项目 id
  scoreAuth: false,        // 学生成绩查看授权（指导老师可见）
  pinnedGroups: [],        // 置顶群聊 id
  doneDismiss: []          // 忽略自动归档的赛事 id
};
let currentCtx = { page: "home" };
let detailTab = "intro";
let catFilter = { kind: "all", major: "不限专业", year: "all" };
let commFilter = { channel: "public", topic: "", schoolTab: "posts", province: "" };
let homeFilter = { kind: "comp", host: "all" };
let schoolFilter = { cat: "all", major: "" };
let schoolNoticeOpen = false;
let doneTab = "comp";
let viewerData = { list: [], idx: 0, captions: "" };

/* ================= 持久化 ================= */
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      state = Object.assign(state, s);
      state.user = Object.assign({}, DB.initUser, s.user || {});
      if (!state.msgs || !state.msgs.length) state.msgs = DB.initMsgs.slice();
      if (!state.friends || !state.friends.length) state.friends = DB.friends.map(f => f.id);
      if (!state.recs) state.recs = [];
      if (!state.joinedGroups) state.joinedGroups = [];
      if (!state.remindOff) state.remindOff = [];
      if (!state.scoreAuth) state.scoreAuth = false;
      if (!state.pinnedGroups) state.pinnedGroups = [];
      if (!state.doneDismiss) state.doneDismiss = [];
      if (!state.favsVer || state.favsVer < 2) {
        /* 老数据升级：补充新演示预赛项（含已结束赛事，体验成绩自动归档） */
        state.favs = Array.from(new Set((state.favs || []).concat(DB.initFavs)));
        state.favsVer = 2;
      }
    }
  } catch (e) { /* ignore */ }
}

/* ================= 工具 ================= */
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }
function parseDate(str) { const p = (str || "").split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function today() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function dayDiff(a, b) { return Math.round((b - a) / 86400000); }
function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>"); }
function nowTime() { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function copyText(t) {
  const done = () => toast("已复制：" + t);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(done, () => fallbackCopy(t, done));
  } else fallbackCopy(t, done);
}
function fallbackCopy(t, done) {
  const ta = document.createElement("textarea");
  ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { }
  ta.remove();
  if (ok) done(); else toast("复制失败，请手动记录：" + t);
}

/* 图片压缩（上传前统一压缩，控制本地存储体积） */
function compressImage(file, maxW, cb) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const w = Math.min(maxW || 480, img.width);
      const h = Math.round(img.height * w / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* 头像渲染：优先用户上传图 → 预设表情头像 → 首字+颜色 */
function avatarHtml(user, size) {
  size = size || 38;
  const u = user || {};
  if (u.avatarUrl) {
    return '<img class="avatar avatar-img" style="width:' + size + "px;height:" + size + 'px" src="' + u.avatarUrl + '" alt="头像">';
  }
  const bg = u.avatar || "#2B5CFF";
  const label = u.avatarEmoji || esc(String((u.nick || u.name || "?")).charAt(0));
  const fs = Math.round(size * 0.46);
  return '<div class="avatar" style="width:' + size + "px;height:" + size + "px;background:" + bg + ";font-size:" + fs + 'px">' + label + "</div>";
}
/* 打开系统图片选择器 */
function pickImage(maxW, cb) {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*";
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast("图片过大，请选择 8MB 以内"); return; }
    compressImage(f, maxW || 480, cb);
  };
  inp.click();
}

/* 事件状态机 */
function evStatus(ev) {
  const t = today();
  const s = ev.signStart ? parseDate(ev.signStart) : null;
  const e = ev.signEnd ? parseDate(ev.signEnd) : null;
  const d = parseDate(ev.eventDate);
  if (s && t < s) {
    const days = dayDiff(t, s);
    return { code: "soon", sign: false, days, text: days + "天后开始报名", daysNote: days + "天后开放报名，可提前加入预赛" };
  }
  if (e && t <= e) {
    const days = dayDiff(t, e);
    return { code: "sign", sign: true, days, text: days <= 0 ? "报名今天截止" : "报名中·剩" + days + "天", daysNote: days <= 3 ? "⛔ 仅剩 " + days + " 天，抓紧报名！" : "距报名截止还有 " + days + " 天" };
  }
  if (t < d) {
    const days = dayDiff(t, d);
    return { code: "prep", sign: false, days, text: (ev.kind === "exam" ? "备考中·剩" : "备赛中·剩") + days + "天", daysNote: "距" + (ev.kind === "exam" ? "考试" : "比赛") + "还有 " + days + " 天" };
  }
  return { code: "end", sign: false, days: 0, text: "已结束·可查往届", daysNote: "本届已结束，可查看往届数据与作品" };
}

function levelBadge(ev) {
  return '<span class="badge ' + (DB.levelBadge[ev.level] || "b-national") + '">' + ev.level + "</span>";
}
function kindBadge(ev) {
  return '<span class="badge ' + (ev.kind === "comp" ? "b-type-comp" : "b-type-exam") + '">' + (ev.kind === "comp" ? "竞赛" : "考试") + "</span>";
}
function stBadge(st) {
  const cls = st.code === "sign" ? "st-sign" : st.code === "soon" ? "st-soon" : st.code === "prep" ? "st-prep" : "st-end";
  return '<span class="badge ' + cls + '">' + st.text + "</span>";
}
function roleTag() {
  if (state.user.role === "teacher") return '<span class="role-tag role-teacher">🎓 教师认证</span>';
  if (state.user.role === "student") return '<span class="role-tag role-student">✓ 学生认证</span>';
  return "";
}

/* ================= 图标 ================= */
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-4v-6h-4v6H6a2 2 0 0 1-2-2z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l10 5-10 5L2 8z"/><path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/><path d="M22 8v6"/></svg>',
  comm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a8 8 0 0 1-8 8H4l2.5-2.5A8 8 0 1 1 21 12z"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.8 6.2 20.8l1.1-6.4L2.6 9.8l6.5-.9z"/></svg>',
  starF: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.8 6.2 20.8l1.1-6.4L2.6 9.8l6.5-.9z"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3a7 7 0 0 0-7 7v4l-2 3h18l-2-3v-4a7 7 0 0 0-7-7zM9.5 20a2.5 2.5 0 0 0 5 0"/></svg>',
  medal: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="14" r="6"/><path d="M8 3h8l-2.5 6h-3z"/></svg>',
  users: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 5a3.5 3.5 0 0 1 0 7M18.5 14.5c2.3.7 3.5 2.6 3.5 5.5"/></svg>',
  chat: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a8 8 0 0 1-8 8H4l2.5-2.5A8 8 0 1 1 21 12z"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3.4 20.4 20.9 12 3.4 3.6l.02 6.53L14 12l-10.58 1.87z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>',
  arrowR: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="9"/><path d="M8 15s1.5-2 4-2 4 2 4 2M9 9.5h.01M15 9.5h.01"/></svg>'
};

/* ================= 登录与身份认证 ================= */
function showLogin() {
  const old = document.getElementById("login-wrap");
  loginCtx = { role: "student", data: {} };
  if (old) old.remove();
  const w = document.createElement("div");
  w.id = "login-wrap"; w.className = "login-wrap";
  w.innerHTML =
    '<div class="login-logo">🏅</div>' +
    '<div class="login-title">赛证通</div>' +
    '<div class="login-sub">大学生竞赛与证书考试查询助手<br>选择你的身份开始使用</div>' +
    '<div class="login-cards">' +
      '<div class="login-card" onclick="showAuthForm(\'student\')">' +
        '<div class="lc-icon lc-student">🎓</div><b>学生身份</b>' +
        "<p>查询赛事考证<br>组队找队友<br>绑定学校收通知</p>" +
      "</div>" +
      '<div class="login-card" onclick="showAuthForm(\'teacher\')">' +
        '<div class="lc-icon lc-teacher">👩‍🏫</div><b>教师身份</b>' +
        "<p>发布校内通知<br>管理赛事报名<br>指导学生参赛</p>" +
      "</div>" +
    "</div>";
  document.getElementById("app").appendChild(w);
}

let loginCtx = { role: "student", data: {} };
function showAuthForm(role) {
  loginCtx.role = role;
  const isT = role === "teacher";
  const d = loginCtx.data || {};
  const w = document.getElementById("login-wrap");
  w.innerHTML =
    '<div class="login-step">' +
      "<h3>" + (isT ? "教师身份认证" : "学生身份认证") + "</h3>" +
      '<div class="ls-sub">填写信息完成认证，即可绑定学校</div>' +
      '<div class="form-row"><label class="form-label">姓名</label><input class="form-input" id="lg-name" placeholder="请输入真实姓名" value="' + esc(d.name || "") + '"></div>' +
      '<div class="form-row"><label class="form-label">' + (isT ? "工号" : "学号") + '</label><input class="form-input" id="lg-no" placeholder="如 ' + (isT ? "045112" : "2026310124") + '" value="' + esc(d.no || "") + '"></div>' +
      '<div class="form-row"><label class="form-label">选择学校</label>' +
        '<div style="display:flex;gap:8px">' +
          '<input class="form-input" id="lg-school" placeholder="点击右侧选择（支持搜索）" readonly value="' + esc(d.school || "") + '">' +
          '<button class="btn-ghost" style="flex:none;padding:0 14px" onclick="pickSchoolForLogin()">选择</button>' +
        "</div></div>" +
      (isT
        ? '<div class="form-row"><label class="form-label">院系 / 部门</label><input class="form-input" id="lg-dept" placeholder="如 计算机学院" value="' + esc(d.dept || "") + '"></div>' +
          '<div class="form-row"><label class="form-label">职称</label><select class="form-select" id="lg-title">' + ["助教", "讲师", "副教授", "教授"].map(t => '<option ' + ((d.title || "讲师") === t ? "selected" : "") + ">" + t + "</option>").join("") + '</select></div>' +
          '<div class="form-row"><label class="form-label">联系电话（将附在通知中）</label><input class="form-input" id="lg-phone" placeholder="如 0451-8641xxxx" value="' + esc(d.phone || "") + '"></div>' +
          '<div class="form-row"><label class="form-label">擅长指导方向（可多选）</label>' +
            '<div style="display:flex;flex-wrap:wrap;gap:7px" id="lg-dirs">' +
            DB.majorList.filter(m => m !== "不限专业").map(m => '<button class="' + ((d.dirs || []).includes(m) ? "tag-pill" : "tag-add") + '" onclick="this.classList.toggle(\'tag-pill\');this.classList.toggle(\'tag-add\')">' + m + "</button>").join("") +
            "</div></div>"
        : '<div class="form-row"><label class="form-label">专业</label><select class="form-select" id="lg-major">' +
          DB.majorList.filter(m => m !== "不限专业").map(m => '<option ' + ((d.major || "计算机") === m ? "selected" : "") + ">" + m + "</option>").join("") +
          "</select></div>") +
      '<button class="btn-main" style="width:100%;margin-top:6px" onclick="submitAuth(\'' + role + '\')">提交认证</button>' +
      '<button style="width:100%;margin-top:10px;font-size:12.5px;color:var(--t3)" onclick="showLogin()">‹ 返回重新选择身份</button>' +
    "</div>";
}

/* 登录页内嵌学校搜索选择（避免被登录层遮挡） */
function pickSchoolForLogin() {
  const g = id => { const el = document.getElementById(id); return el ? el.value : ""; };
  loginCtx = {
    role: loginCtx.role || "student",
    data: {
      name: g("lg-name"), no: g("lg-no"), school: g("lg-school"),
      dept: g("lg-dept"), title: g("lg-title"), phone: g("lg-phone"), major: g("lg-major"),
      dirs: [...document.querySelectorAll("#lg-dirs .tag-pill")].map(b => b.textContent.trim())
    }
  };
  showSchoolPickInLogin();
}
function showSchoolPickInLogin() {
  const w = document.getElementById("login-wrap");
  w.innerHTML =
    '<div class="login-step" style="max-width:370px">' +
      "<h3>选择学校</h3>" +
      '<div class="ls-sub">支持关键词搜索，如「大庆」「师范」「学院」</div>' +
      '<div class="school-search-bar login-search">' + I.search +
      '<input id="lg-school-kw" placeholder="搜索学校名称 / 简称" oninput="renderLoginSchoolList(this.value)"></div>' +
      '<div id="lg-school-list" style="max-height:300px;overflow-y:auto;margin-top:6px;padding-bottom:10px"></div>' +
      '<button style="width:100%;margin-top:14px;font-size:12.5px;color:var(--t3)" onclick="showAuthForm(loginCtx.role)">‹ 返回认证表单（已填信息保留）</button>' +
    "</div>";
  renderLoginSchoolList("");
  setTimeout(() => { const el = document.getElementById("lg-school-kw"); if (el) el.focus(); }, 60);
}
function renderLoginSchoolList(kw) {
  const k = (kw || "").trim();
  const list = DB.schools.filter(s => !k || s.name.includes(k) || s.short.includes(k));
  document.getElementById("lg-school-list").innerHTML = list.length
    ? list.map(s => '<div class="pick-item" onclick="pickSchoolDone(\'' + s.name + '\')">' + esc(s.name) + "<small>" + esc(s.short) + "</small></div>").join("")
    : '<div style="text-align:center;font-size:12px;color:var(--t3);padding:18px 0">没有找到「' + esc(k) + '」相关学校</div>';
}
function pickSchoolDone(name) {
  loginCtx.data.school = name;
  showAuthForm(loginCtx.role);
  toast("已选择 " + name);
}

function submitAuth(role) {
  const name = document.getElementById("lg-name").value.trim();
  const no = document.getElementById("lg-no").value.trim();
  const school = document.getElementById("lg-school").value.trim();
  if (!name || !no || !school) { toast("请完整填写姓名、学号/工号和学校"); return; }
  state.user.role = role;
  state.user.nick = name;
  state.user.school = school;
  if (role === "teacher") {
    state.user.teacherNo = no;
    state.user.title = document.getElementById("lg-title").value;
    state.user.dept = document.getElementById("lg-dept").value.trim() || "院系";
    state.user.phoneT = document.getElementById("lg-phone").value.trim();
    state.user.guideDirs = [...document.querySelectorAll("#lg-dirs .tag-pill")].map(b => b.textContent.trim());
    state.user.bio = state.user.title + " · " + state.user.dept;
  } else {
    state.user.studentNo = no;
    state.user.major = document.getElementById("lg-major").value;
    state.user.bio = "在校生 · " + state.user.major;
  }
  save();
  showAuthOk(role);
}

function showAuthOk(role) {
  const w = document.getElementById("login-wrap");
  w.innerHTML =
    '<div class="login-step"><div class="auth-ok">' +
      '<div class="ao-icon">✓</div>' +
      "<h3>认证成功</h3>" +
      '<div class="ls-sub" style="margin-top:6px">' + (role === "teacher" ? "教师" : "学生") + "身份已认证 · 已绑定 " + esc(state.user.school) + "</div>" +
      '<button class="btn-main" style="width:100%;margin-top:16px" onclick="enterApp()">进入赛证通</button>' +
    "</div></div>";
}

function enterApp() {
  const w = document.getElementById("login-wrap");
  if (w) w.remove();
  initApp();
}

function switchRole() {
  modal("<h3>切换身份</h3><p style=\"font-size:12.5px;color:var(--t2);line-height:1.8;text-align:center\">退出当前身份并重新选择身份登录。<br>收藏、记录、通知等数据会保留。</p>" +
    '<div class="modal-actions"><button class="m-cancel" onclick="closeModal()">取消</button>' +
    '<button class="m-ok" onclick="confirmSwitchRole()">确认切换</button></div>');
}
function confirmSwitchRole() {
  state.user.role = "";
  save(); closeModal();
  location.reload();
}

/* ================= 学校选择（带搜索，常规绑定用） ================= */
function openSchoolPickerEx() {
  document.getElementById("overlay-root").innerHTML = overlayHtml("选择学校",
    '<div class="school-search-bar">' + I.search +
    '<input id="school-kw" placeholder="输入学校名称关键词，如「大庆」" oninput="renderSchoolList(this.value)"></div>' +
    '<div class="form-card" id="school-list"></div>');
  renderSchoolList("");
}
function renderSchoolList(kw) {
  const list = DB.schools.filter(s => !kw || s.name.includes(kw.trim()) || s.short.includes(kw.trim()));
  document.getElementById("school-list").innerHTML = list.length
    ? list.map(s => '<div class="pick-item" onclick="applySchoolPick(\'' + s.name + '\')">' + esc(s.name) + "<small>" + esc(s.short) + "</small></div>").join("")
    : '<div class="empty">' + I.empty + "<p>没有找到相关学校</p></div>";
}
function applySchoolPick(name) {
  state.user.school = name;
  save(); closeOverlay();
  toast("已绑定 " + name);
  refreshCurrent();
}
function openSchoolPicker() { openSchoolPickerEx(); }
function bindSchool(name) { state.user.school = name; save(); toast("已绑定 " + name); refreshCurrent(); }

/* ================= 事件卡片 ================= */
function evCard(ev, opt) {
  opt = opt || {};
  const st = evStatus(ev);
  const favOn = state.favs.includes(ev.id);
  const isPast = !!opt.pastYear;
  const pastTag = isPast ? '<span class="badge b-school">' + opt.pastYear + "届 · 往届</span>" : "";
  const stHtml = isPast ? '<span class="badge st-end">可查 ' + opt.pastYear + " 届数据</span>" : stBadge(st);
  const urgent = !isPast && st.code === "sign" && st.days <= 7;
  return '<div class="ev-item" onclick="openDetail(\'' + ev.id + "'," + (opt.pastYear ? "'" + opt.pastYear + "'" : "null") + ')">' +
    '<div class="ev-top">' +
      '<div style="flex:1">' +
        '<div class="ev-name">' + esc(ev.name) + "</div>" +
        '<div class="ev-badges">' + pastTag + levelBadge(ev) + kindBadge(ev) + stHtml +
          (state.user.role !== "teacher" ? recBadge(ev.id) : "") + "</div>" +
        '<div class="ev-meta">' +
          '<span class="m-item">' + I.cal + (isPast ? opt.pastYear + " 届 · 数据与作品" : (st.sign ? "报名至 " + ev.signEnd : (ev.kind === "comp" ? "比赛 " : "考试 ") + ev.eventDate)) + "</span>" +
          '<span class="m-item">' + I.clock + esc(ev.category.replace(/类$/, "")) + "类</span>" +
        "</div>" +
        (urgent ? '<div class="ev-remind">🔔 ' + st.daysNote + "</div>" : "") +
        '<div style="margin-top:9px">' +
          (ev.applyUrl
            ? '<button class="apply-btn" onclick="event.stopPropagation();copyText(\'' + ev.applyUrl + '\')">🔗 官网报名 · 一键复制链接</button>'
            : '<span class="apply-btn school">🏫 校内渠道报名</span>') +
        "</div>" +
      "</div>" +
      (opt.noFav ? "" : '<button class="ev-fav ' + (favOn ? "on" : "") + '" onclick="event.stopPropagation();toggleFav(\'' + ev.id + '\')" aria-label="收藏">' + (favOn ? I.starF : I.star) + "</button>") +
    "</div></div>";
}

function toggleFav(id) {
  const i = state.favs.indexOf(id);
  if (i >= 0) { state.favs.splice(i, 1); toast("已移出我的预赛"); }
  else {
    state.favs.push(id);
    const ev = DB.events.find(e => e.id === id);
    const st = evStatus(ev);
    toast("已加入我的预赛" + (st.sign ? "，将在截止前提醒你" : ""));
    checkReminders();
  }
  save(); refreshCurrent();
}

/* ================= 路由 ================= */
function switchTab(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
  document.querySelectorAll(".tab-item").forEach(t => t.classList.toggle("active", t.dataset.page === page));
  currentCtx = { page: page };
  const titles = { home: "赛证通", category: "分类查询", school: "校内", community: "社区广场", me: "我的" };
  setTopbar(titles[page], false);
  if (page === "community") currentCtx = { page: "community", topic: commFilter.topic };
  const fab = document.getElementById("fab-post-btn");
  if (fab && page !== "community") fab.remove();
  if (page === "home") renderHome();
  if (page === "category") renderCategory();
  if (page === "school") renderSchool();
  if (page === "me") renderMe();
  if (page === "community") renderCommunity();
  refreshTabBadge();
}
function setTopbar(title, back) {
  document.getElementById("tb-title").textContent = title;
  document.getElementById("tb-left").innerHTML = back ? '<button class="tb-back" onclick="closeOverlay()">‹ 返回</button>' : "";
}
function refreshCurrent() {
  const p = document.querySelector(".page.active");
  if (!p) return;
  const page = p.id.replace("page-", "");
  if (page === "home") renderHome();
  if (page === "category") renderCategory();
  if (page === "school") renderSchool();
  if (page === "community") renderCommunity();
  if (page === "me") renderMe();
  if (currentCtx.page === "detail" && currentCtx.detailId) renderDetailBody();
  refreshTabBadge();
}

/* ================= 底部导航 ================= */
function renderTabbar() {
  const tabs = [
    { page: "home", label: "首页", icon: I.home },
    { page: "category", label: "分类", icon: I.grid },
    { page: "school", label: "校内", icon: I.school },
    { page: "community", label: "社区", icon: I.comm },
    { page: "me", label: "我的", icon: I.me }
  ];
  document.getElementById("tabbar").innerHTML = tabs.map(t =>
    '<button class="tab-item" data-page="' + t.page + '" onclick="switchTab(\'' + t.page + '\')">' + t.icon + "<span>" + t.label + "</span></button>"
  ).join("");
}
function refreshTabBadge() {
  const unread = state.msgs.filter(m => !m.read).length;
  const msgDot = document.getElementById("msg-dot");
  if (msgDot) msgDot.hidden = unread === 0;
  const meTab = document.querySelector('.tab-item[data-page="me"]');
  if (meTab && unread > 0) {
    let b = meTab.querySelector(".tab-badge");
    if (!b) { b = document.createElement("span"); b.className = "tab-badge"; meTab.appendChild(b); }
    b.textContent = unread;
  } else { const b = meTab && meTab.querySelector(".tab-badge"); if (b) b.remove(); }
}

/* ================= 首页（比赛/考试一级分类 + 主办细分联动） ================= */
function renderHome() {
  const page = document.getElementById("page-home");
  const favNear = state.favs.map(id => DB.events.find(e => e.id === id)).filter(Boolean)
    .map(ev => ({ ev, st: evStatus(ev) }))
    .filter(x => ["sign", "soon"].includes(x.st.code))   // 已结束/备赛中的项目不占用首页报名提醒位
    .sort((a, b) => a.st.days - b.st.days)[0];
  const opening = DB.events.filter(ev => evStatus(ev).code === "sign").length;
  const compN = DB.events.filter(e => e.kind === "comp").length;
  const examN = DB.events.filter(e => e.kind === "exam").length;
  const hero = DB.events.find(e => e.id === "c04") || DB.events[0];
  const heroSt = evStatus(hero);
  const kind = homeFilter.kind;
  const host = homeFilter.host;
  const hostList = DB.hostTypes[kind];
  let list = DB.events.filter(e => e.kind === kind);
  if (host !== "all") list = list.filter(e => e.hostType === host);
  const hostLabel = (hostList.find(h => h.key === host) || {}).label || "全部";

  page.innerHTML =
    '<div class="search-bar" onclick="goSearch()">' + I.search + '<span class="ph">搜索竞赛 / 证书考试，如「蓝桥杯」</span></div>' +
    (favNear && ["sign", "soon"].includes(favNear.st.code)
      ? '<div class="alert-banner" onclick="openMyEvents(\'comp\')">' +
        '<div class="ab-icon">' + I.bell + "</div>" +
        '<div><div class="ab-title">' + esc(favNear.ev.short) + (favNear.st.code === "sign" ? " 报名剩 " + favNear.st.days + " 天" : " " + favNear.st.days + " 天后开始报名") + "</div>" +
        '<div class="ab-desc">来自「我的预赛」的自动提醒 · 截止 ' + favNear.ev.signEnd + "</div></div>" +
        '<button class="ab-btn">去处理</button></div>'
      : '<div class="alert-banner" onclick="switchTab(\'category\')">' +
        '<div class="ab-icon">' + I.bell + "</div>" +
        '<div><div class="ab-title">今日有 ' + opening + " 个项目正在报名</div>" +
        '<div class="ab-desc">去分类页看看，别让机会溜走</div></div>' +
        '<button class="ab-btn">看看</button></div>') +
    '<div class="kind-seg">' +
      '<button class="kind-btn ' + (kind === "comp" ? "on" : "") + '" onclick="setHomeKind(\'comp\')"><span class="kb-icon">🏆</span>比赛<small>' + compN + " 项赛事</small></button>" +
      '<button class="kind-btn ' + (kind === "exam" ? "on" : "") + '" onclick="setHomeKind(\'exam\')"><span class="kb-icon">📄</span>考试<small>' + examN + " 类考证</small></button>" +
    "</div>" +
    '<div class="host-chips">' + hostList.map(h =>
      '<button class="host-chip ' + (host === h.key ? "on" : "") + '" onclick="setHomeHost(\'' + h.key + '\')">' + h.label + "</button>").join("") +
    "</div>" +
    '<div class="hero-card" onclick="openDetail(\'c04\')">' +
      '<div class="hero-eyebrow">★ 顶流赛事 · 保研利器</div>' +
      '<div class="hero-name">' + esc(hero.name) + "</div>" +
      '<div class="hero-info"><span>🏆 ' + hero.level + "</span><span>📅 校赛报名 " + hero.signStart + " 起</span><span>👥 " + hero.majors.slice(0, 3).join(" / ") + "</span></div>" +
      '<div class="hero-tag">' + heroSt.text + " · 点击查看详情</div>" +
    "</div>" +
    '<div class="card"><div class="card-title">' + (kind === "comp" ? "🏆 热门比赛" : "📄 热门考试") + " · " + hostLabel +
      '<span class="more" onclick="switchTab(\'category\')">更多 ' + I.arrowR + "</span></div>" +
      (list.length ? list.map(e => evCard(e)).join("") : emptyBox("该分类下暂无项目，看看其他分类", "setHomeHost('all')", "查看全部")) +
    "</div>" +
    '<div style="text-align:center;font-size:11px;color:var(--t3);padding:10px 0 4px">— 数据为演示用途，以主办方官网为准 —</div>';
}
function setHomeKind(kind) { homeFilter.kind = kind; if (!DB.hostTypes[kind].some(h => h.key === homeFilter.host)) homeFilter.host = "all"; renderHome(); }
function setHomeHost(host) { homeFilter.host = host; renderHome(); }
function more(fn) { return '<span class="more" onclick="' + fn + '">更多 ' + I.arrowR + "</span>"; }

/* ================= 分类页 ================= */
function yearsList() { return ["all", 2027, 2026, 2025, 2024, 2023]; }
function countYear(y) {
  let n = 0;
  DB.events.forEach(ev => { if (ev.eventYear === y) n++; (ev.past || []).forEach(p => { if (p.year === y) n++; }); });
  return n;
}
function renderCategory() {
  const page = document.getElementById("page-category");
  const kindTabs = [["all", "全部"], ["comp", "竞赛"], ["exam", "考试"]];
  const list = filterEventsFor(catFilter);
  page.innerHTML =
    '<div class="search-bar" onclick="goSearch()">' + I.search + '<span class="ph">按名称 / 类别 / 关键词检索</span></div>' +
    '<div class="cat-tabs">' + kindTabs.map(k =>
      '<button class="cat-tab ' + (catFilter.kind === k[0] ? "on" : "") + '" onclick="setCat(\'kind\',\'' + k[0] + '\')">' + k[1] + "</button>").join("") +
    "</div>" +
    '<div class="major-scroll">' + DB.majorList.map(m =>
      '<button class="major-chip ' + (catFilter.major === m ? "on" : "") + '" onclick="setCat(\'major\',\'' + m + '\')">' + m + "</button>").join("") +
    "</div>" +
    '<div class="year-layout">' +
      '<div class="year-col">' + yearsList().map(y => {
        const isAll = y === "all";
        const n = isAll ? DB.events.length : countYear(y);
        return '<button class="year-btn ' + (String(catFilter.year) === String(y) ? "on" : "") + '" onclick="setCat(\'year\',\'' + y + '\')">' +
          (isAll ? "全部" : y) + "<small>" + n + " 项</small></button>";
      }).join("") + "</div>" +
      '<div class="year-content">' +
        '<div style="font-size:11.5px;color:var(--t3);margin:2px 0 10px">已为你筛选出 ' + list.length + " 个项目（含往届数据）</div>" +
        (list.length ? list.map(x => evCard(x.ev, { pastYear: x.pastYear })).join("") :
          emptyBox("该条件下暂无项目，换个专业或年份试试", "setCat('year','all')", "查看全部")) +
      "</div></div>";
}
function setCat(key, val) {
  catFilter[key] = key === "year" && val !== "all" ? +val : val;
  if (key === "year" && val === "all") catFilter.year = "all";
  renderCategory();
}
function filterEventsFor(f) {
  let base = DB.events.slice();
  if (f.kind && f.kind !== "all") base = base.filter(e => e.kind === f.kind);
  if (f.major && f.major !== "不限专业") base = base.filter(e => e.majors.includes(f.major));
  if (f.year && f.year !== "all") {
    const Y = +f.year;
    const out = [];
    base.forEach(ev => {
      if (ev.eventYear === Y) out.push({ ev });
      else if ((ev.past || []).some(p => p.year === Y)) out.push({ ev, pastYear: Y });
    });
    return out;
  }
  const order = { sign: 0, soon: 1, prep: 2, end: 3 };
  return base.map(ev => ({ ev })).sort((a, b) => order[evStatus(a.ev).code] - order[evStatus(b.ev).code] || a.ev.signEnd.localeCompare(b.ev.signEnd));
}

/* ================= 详情页（材料 + 图片轮播 + 现场图） ================= */
function openDetail(id, pastYear) {
  const ev = DB.events.find(e => e.id === id);
  if (!ev) return;
  currentCtx = { page: "detail", detailId: id };
  detailTab = pastYear ? "past" : "intro";
  const st = evStatus(ev);
  const favOn = state.favs.includes(ev.id);
  const root = document.getElementById("overlay-root");
  root.innerHTML =
    '<div class="overlay">' +
      '<header id="topbar" style="position:absolute;top:0;left:0;right:0;z-index:40">' +
        '<div class="tb-left"><button class="tb-back" onclick="closeOverlay()">‹ 返回</button></div>' +
        '<div class="tb-title">' + esc(ev.short) + "</div>" +
        '<div class="tb-right"></div>' +
      "</header>" +
      '<div class="overlay-content" id="detail-scroll" style="padding-top:56px">' +
        '<div class="detail-head">' +
          '<div class="detail-name">' + esc(ev.name) + "</div>" +
          '<div class="detail-badges">' + levelBadge(ev) + kindBadge(ev) + stBadge(st) +
            '<span class="badge" style="background:rgba(255,255,255,.22);color:#fff">' + esc(ev.category.replace(/类$/, "")) + "类</span></div>" +
          '<div class="detail-org">主办方：' + esc(ev.organizer) + " ｜ 适合：" + ev.majors.join(" · ") + "</div>" +
        "</div>" +
        "<div class='detail-info-grid'>" +
          dgCell("报名开始", ev.signStart || "—") +
          dgCell("报名截止", ev.signEnd || "—", st.code === "sign" && st.days <= 7 ? "hot" : "") +
          dgCell(ev.kind === "comp" ? "比赛时间" : "考试时间", ev.eventDate, st.code === "prep" && st.days <= 30 ? "hot" : "") +
          dgCell("状态", st.text, st.code === "sign" ? "ok" : "") +
        "</div>" +
        (state.user.role
          ? '<div class="ai-brief-card" onclick="openAiBrief(\'' + ev.id + '\')">' +
            '<div class="ai-brief-ico">' + (state.user.role === "teacher" ? "🎓" : "🎯") + "</div>" +
            '<div class="ai-brief-txt"><div class="ai-brief-title">' + (state.user.role === "teacher" ? "教师指导方向" : "本赛赛点解读") + "</div>" +
            '<div class="ai-brief-sub">' + (state.user.role === "teacher" ? "小赛告诉你如何指导学生冲击奖项" : "小赛告诉你本赛的赛点与注意事项") + "</div></div>" +
            '<span class="ai-brief-go">让小赛讲解 →</span></div>'
          : "") +
        (state.user.role !== "teacher" && recForEvent(ev.id)
          ? '<div class="rec-detail-card" onclick="showRecNote(\'' + ev.id + '\')"><span class="rec-ico">🌟</span>' +
            '<div class="rec-detail-txt"><div class="rec-detail-title">教师推荐 · ' + esc(recForEvent(ev.id).teacher) + "</div>" +
            '<div class="rec-detail-note">' + esc(recForEvent(ev.id).note) + "</div></div>" +
            '<span class="rec-go">查看 →</span></div>'
          : "") +
        (st.code === "sign" ? '<div style="margin:-2px 14px 10px"><div class="alert-banner" style="margin:0"><div class="ab-icon">' + I.bell + '</div><div><div class="ab-title">报名进行中</div><div class="ab-desc">' + st.daysNote + "</div></div></div></div>" : "") +
        ((ev.scenePhotos || []).length
          ? '<div style="margin:12px 14px 0"><div class="card-title" style="font-size:14px">📷 比赛现场</div>' +
            '<div class="scene-scroll">' + ev.scenePhotos.map((p, i) =>
              '<img class="scene-img" src="' + p + '" onclick="openViewer(' + jsArr(ev.scenePhotos) + "," + i + ',\'' + esc(ev.short) + ' 现场记录\')" alt="现场图">').join("") +
            "</div></div>"
          : "") +
        '<div class="sub-tabs">' +
          '<button class="sub-tab" id="dt-intro" onclick="setDetailTab(\'intro\')">赛事介绍</button>' +
          '<button class="sub-tab" id="dt-past" onclick="setDetailTab(\'past\')">往届数据</button>' +
          '<button class="sub-tab" id="dt-works" onclick="setDetailTab(\'works\')">往届作品</button>' +
        "</div>" +
        '<div class="detail-body" id="detail-body"></div>' +
      "</div>" +
      '<div class="detail-footer">' +
        '<button class="' + (favOn ? "btn-fav-circle" : "btn-fav-circle off") + '" onclick="toggleFav(\'' + ev.id + '\')" aria-label="收藏">' + (favOn ? I.starF : I.star) + "</button>" +
        '<button class="btn-ghost" onclick="askAIAbout(\'' + ev.id + '\')">🤖 让小赛分析</button>' +
        (state.user.role === "teacher"
          ? '<button class="btn-ghost" onclick="openRecommend(\'' + ev.id + '\')">🌟 推荐</button>'
          : '<button class="btn-ghost" onclick="shareEvent(\'' + ev.id + '\')">📤 发给好友</button>') +
        (ev.applyUrl
          ? '<button class="btn-main" onclick="openApply(\'' + ev.applyUrl + '\')">前往官方报名</button>'
          : '<button class="btn-main" onclick="toast(\'本赛事通过校内渠道报名，请留意校内通知\')">校内报名</button>') +
      "</div>" +
    "</div>";
  renderDetailBody();
}
/* 数组转 JS 字面量（供 onclick 使用） */
function jsArr(arr) { return "[" + arr.map(x => "'" + x + "'").join(",") + "]"; }
function dgCell(label, value, cls) {
  return '<div class="dg-cell"><div class="dg-label">' + label + '</div><div class="dg-value ' + (cls || "") + '">' + esc(value) + "</div></div>";
}
function setDetailTab(tab) { detailTab = tab; renderDetailBody(); }
function renderDetailBody() {
  const id = currentCtx.detailId;
  const ev = DB.events.find(e => e.id === id);
  if (!ev || !document.getElementById("detail-body")) return;
  ["intro", "past", "works"].forEach(t => { const el = document.getElementById("dt-" + t); if (el) el.className = "sub-tab" + (detailTab === t ? " on" : ""); });
  const body = document.getElementById("detail-body");
  if (detailTab === "intro") {
    body.innerHTML = '<div class="intro-text">' + md(ev.intro) + "</div>" +
      (ev.ruleChange ? '<div class="rule-box"><div class="rb-t">📌 规则变动解读</div><p>' + esc(ev.ruleChange) + "</p></div>" : "") +
      ((ev.materials || []).length
        ? '<div class="card" style="margin-top:12px;display:flex;align-items:center;gap:10px" onclick="openMaterials(\'' + ev.id + '\')">' +
          '<span class="mi-icon qi-orange" style="width:36px;height:36px;font-size:16px">📋</span>' +
          '<div style="flex:1"><div class="myev-title" style="font-size:13.5px">报名材料准备</div>' +
          '<div style="font-size:11px;color:var(--t3);margin-top:2px">共 ' + ev.materials.length + " 项 · 点击查看清单与虚拟样表</div></div>" +
          '<span style="color:var(--c-primary);font-weight:700">查看 →</span></div>'
        : "") +
      '<div class="card" style="margin-top:12px"><div class="card-title" style="margin-bottom:6px">🏷 赛道标签</div><div class="post-tags">' +
        (ev.tags || []).map(t => '<span class="badge b-cat" style="font-size:12px;padding:5px 12px">' + esc(t) + "</span>").join(" ") + "</div></div>";
  } else if (detailTab === "past") {
    body.innerHTML = (ev.past && ev.past.length
      ? '<table class="past-table"><tr><th>年份</th><th>参赛规模</th><th>获奖情况</th><th>备注</th><th>准备</th><th>评分标准</th></tr>' +
        ev.past.map(p => "<tr><td>" + p.year + "</td><td>" + esc(p.scale) + "</td><td>" + esc(p.award) + "</td><td>" + esc(p.note) + "</td>" +
          '<td><button class="notice-view-btn" onclick="openMaterials(\'' + ev.id + '\')">材料</button></td>' +
          '<td><button class="notice-view-btn" style="color:var(--c-primary);font-weight:700" onclick="openScoreCharts(\'' + ev.id + "'," + p.year + ')">评分标准</button></td></tr>').join("") + "</table>" +
        '<div style="font-size:11px;color:var(--t3);margin-top:8px">提示：往届数据供参考，以主办方当年公示为准；「材料」查看报名材料与虚拟样表，「评分标准」查看该届评分标准图（左右切换各届）。</div>'
      : emptyBox("该赛事暂无往届数据收录"));
  } else {
    body.innerHTML = (ev.works && ev.works.length
      ? '<div class="works-grid">' + ev.works.map((w, wi) =>
          '<div class="work-photo-card" onclick="viewWork(\'' + ev.id + "'," + wi + ')">' +
          '<img src="' + ((w.photos || [])[0] || "img/works-cert.jpg") + '" alt="作品图">' +
          '<div class="wpc-info"><div class="wpc-title">' + esc(w.title) + "</div>" +
          '<div class="wpc-desc">' + esc((w.desc || "").slice(0, 42)) + (w.desc && w.desc.length > 42 ? "…" : "") + "</div>" +
          '<div class="wpc-award">🏅 ' + esc(w.award || "获奖作品") + " · " + w.year + "</div></div></div>").join("") + "</div>" +
        '<div style="font-size:11px;color:var(--t3);margin-top:10px">点击作品卡片可查看实拍大图与作品说明，支持左右切换。</div>'
      : emptyBox("暂无往届作品收录，可让小赛帮你检索同类赛事的优秀作品"));
  }
}

/* 材料清单 + 单一样表（去重复入口） */
function openMaterials(id) {
  const ev = DB.events.find(e => e.id === id);
  if (!ev || !ev.materials) return;
  modal("<h3>📋 " + esc(ev.short) + " 报名材料</h3>" +
    '<div style="max-height:280px;overflow-y:auto;padding:0 2px">' +
    ev.materials.map((m, i) =>
      '<div class="mat-item" style="align-items:flex-start"><span class="mat-no" style="flex:none">' + (i + 1) + "</span>" +
      '<div><div class="mat-name">' + esc(m.name) + "</div>" +
      '<div class="mat-desc">' + esc(m.desc) + "</div></div></div>").join("") +
    "</div>" +
    '<div style="font-size:11px;color:var(--t3);margin-top:6px">样表为虚拟演示表单，实际以主办方当年要求为准。</div>' +
    '<div class="modal-actions" style="gap:8px">' +
    '<button class="m-cancel" onclick="viewSample(\'' + ev.id + '\',\'报名信息样表\')">查看虚拟样表</button>' +
    '<button class="m-ok" onclick="copyMaterialList(\'' + ev.id + '\')">复制清单</button></div>');
}
function copyMaterialList(id) {
  const ev = DB.events.find(e => e.id === id);
  copyText(ev.short + "报名材料：" + ev.materials.map((m, i) => (i + 1) + "." + m.name).join("、"));
  closeModal();
}
function viewSample(evId, name) {
  const ev = DB.events.find(e => e.id === evId) || DB.events[0];
  modal("<h3>📄 " + esc(name) + "</h3>" +
    '<div style="background:#fff;border-radius:12px;padding:12px;border:1px solid var(--line)">' +
    '<table class="sample-table"><tr><th colspan="2">' + esc(name) + "</th></tr>" +
    "<tr><td>姓名</td><td>" + esc(state.user.nick || "（填写）") + "</td></tr>" +
    "<tr><td>" + (state.user.role === "teacher" ? "工号" : "学号") + "</td><td>" + esc(state.user.role === "teacher" ? (state.user.teacherNo || "（填写）") : (state.user.studentNo || "（填写）")) + "</td></tr>" +
    "<tr><td>学校</td><td>" + esc(state.user.school || "（填写）") + "</td></tr>" +
    "<tr><td>院系/专业</td><td>" + esc(state.user.role === "teacher" ? (state.user.dept || "（填写）") : state.user.major) + "</td></tr>" +
    "<tr><td>联系电话</td><td>（填写）</td></tr>" +
    "<tr><td>参赛项目</td><td>" + esc(ev.short) + "</td></tr>" +
    "<tr><td>指导教师</td><td>（填写）</td></tr>" +
    "<tr><td>本人承诺以上信息真实</td><td>签名：______</td></tr></table>" +
    "</div>" +
    '<div style="font-size:11px;color:var(--t3);margin-top:10px">虚拟样表仅供演示，实际表单以主办方官网下载版本为准。</div>' +
    '<div class="modal-actions"><button class="m-ok" onclick="closeModal()">知道了</button></div>');
}

/* 前往官方报名：打开官网 + 复制链接 */
function openApply(url) {
  copyText(url);
  try { window.open(url, "_blank"); } catch (e) { }
  toast("已打开官网并复制报名链接");
}

/* ================= 比赛评分标准图（往届数据 · 本地生成，可左右切换各届） ================= */
const SCORE_DIST_TPL = {
  "创新创业类": [["项目创新性", 30], ["商业价值与落地", 25], ["团队协作与执行", 20], ["展示答辩", 15], ["文档规范", 10]],
  "学科竞赛类": [["解题与算法能力", 40], ["代码实现质量", 25], ["测试通过率", 20], ["工程与注释规范", 15]],
  "数理": [["模型假设与建模", 35], ["求解与算法", 30], ["论文写作规范", 25], ["创新性", 10]],
  "机电": [["方案创新性", 30], ["实物完成度", 30], ["现场演示", 25], ["设计文档", 15]],
  "exam": [["客观题得分", 60], ["主观题得分", 40]],
  "default": [["创新性", 30], ["技术实现", 35], ["现场展示", 20], ["文档规范", 15]]
};
function scoreDistFor(ev, p) {
  if (p && p.scores && p.scores.length) return p.scores;
  if (ev.kind === "exam") return SCORE_DIST_TPL.exam;
  return SCORE_DIST_TPL[ev.category] || SCORE_DIST_TPL.default;
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapCN(ctx, text, x, y, maxW, lh) {
  let line = "", yy = y;
  for (const ch of String(text)) {
    if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, x, yy); line = ch; yy += lh; }
    else line += ch;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}
function drawScoreChart(ev, p) {
  const dist = scoreDistFor(ev, p);
  const meta = [["获奖比例", p.award], ["参赛规模", p.scale], ["备注", p.note]].filter(m => m[1]);
  const W = 720, H = Math.max(560, 150 + dist.length * 62 + 40 + 60 + meta.length * 76 + 60);
  const cv = document.createElement("canvas");
  cv.width = W * 2; cv.height = H * 2;
  const ctx = cv.getContext("2d");
  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#2B5CFF"); grad.addColorStop(1, "#5B8CFF");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 96);
  ctx.fillStyle = "#fff";
  ctx.font = "800 30px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText(ev.short + " · " + p.year + " 届", 32, 44);
  ctx.font = "500 19px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.globalAlpha = .92;
  ctx.fillText("评分标准与成绩构成（演示数据）", 32, 76);
  ctx.globalAlpha = 1;
  const bx = 32, bw = W - 210, rowH = 62, y0 = 150;
  dist.forEach((d, i) => {
    const y = y0 + i * rowH;
    ctx.fillStyle = "#1F2A44";
    ctx.font = "700 22px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(d[0], bx, y + 20);
    ctx.fillStyle = "#EEF2F8";
    rrect(ctx, bx, y + 30, bw, 16, 8); ctx.fill();
    const w2 = bw * d[1] / 100;
    const g2 = ctx.createLinearGradient(bx, 0, bx + Math.max(w2, 24), 0);
    g2.addColorStop(0, "#2B5CFF"); g2.addColorStop(1, "#7C9BFF");
    ctx.fillStyle = g2;
    rrect(ctx, bx, y + 30, Math.max(w2, 24), 16, 8); ctx.fill();
    ctx.fillStyle = "#2B5CFF";
    ctx.font = "800 22px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(d[1] + " 分", bx + bw + 14, y + 46);
  });
  const iy = y0 + dist.length * rowH + 30;
  const metaRows = meta.map(m => m[0] + "：" + m[1]);
  ctx.font = "500 19px 'PingFang SC','Microsoft YaHei',sans-serif";
  let lineCount = 0;
  metaRows.forEach(t => { let l = 1, s = ""; for (const ch of t) { if (ctx.measureText(s + ch).width > W - 110) { l++; s = ch; } else s += ch; } lineCount += l; });
  const bh = 34 + lineCount * 32 + 14;
  ctx.fillStyle = "#F7F9FC";
  rrect(ctx, 32, iy, W - 64, bh, 16); ctx.fill();
  ctx.fillStyle = "#5A6B85";
  let ty = iy + 40;
  metaRows.forEach(t => { ty = wrapCN(ctx, t, 52, ty, W - 104, 32) + 18; });
  ctx.fillStyle = "#9AA7BC";
  ctx.font = "500 16px 'PingFang SC','Microsoft YaHei',sans-serif";
  ctx.fillText("赛证通 · 数据基于公开信息整理，以主办方当年公示为准", 32, H - 26);
  return cv.toDataURL("image/png");
}
function openScoreCharts(evId, year) {
  const ev = DB.events.find(e => e.id === evId);
  if (!ev || !ev.past || !ev.past.length) { toast("该赛事暂无往届评分数据"); return; }
  const list = ev.past.map(p => drawScoreChart(ev, p));
  const idx = Math.max(0, ev.past.findIndex(p => p.year === year));
  openViewer(list, idx, ev.short + " · 评分标准图（左右切换查看各届）");
}

/* 作品大图 */
function viewWork(id, wi) { openWorkDetail(id, wi); }
function openWorkDetail(id, wi) {
  const ev = DB.events.find(e => e.id === id);
  if (!ev || !ev.works || !ev.works[wi]) return;
  const w = ev.works[wi];
  const photos = w.photos && w.photos.length ? w.photos : ["img/works-cert.jpg"];
  currentCtx = { page: "work", evId: id, wi: wi };
  document.getElementById("overlay-root").innerHTML = overlayHtml("作品详情",
    '<div style="background:#fff;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)">' +
    '<div style="position:relative"><img src="' + photos[0] + '" style="width:100%;max-height:280px;object-fit:cover;cursor:zoom-in;display:block" onclick="openViewer(' + jsArr(photos) + ",0,'作品实拍大图')" + '" alt="作品实拍">' +
    '<span class="work-year" style="position:absolute;top:10px;left:10px">' + w.year + " 届</span></div>" +
    '<div style="padding:14px">' +
    '<div class="ev-badges"><span class="badge b-school">' + w.year + " 届作品</span>" +
    '<span style="background:#FFF8E6;color:#B88A00;border-radius:10px;padding:3px 10px;font-size:11px;font-weight:700">🏅 ' + esc(w.award || "获奖作品") + "</span></div>" +
    '<div class="myev-title" style="font-size:16px;margin-top:10px">' + esc(w.title) + "</div>" +
    '<div style="margin-top:10px;font-size:13px;color:var(--t2);line-height:1.85;background:var(--bg);border-radius:12px;padding:12px">' + esc(w.desc) + "</div>" +
    '<div style="font-size:11.5px;color:var(--t3);margin-top:10px">所属赛事：' + esc(ev.short) + " · 图片为公开报道整理，仅作学习参考。</div>" +
    "</div></div>" +
    (photos.length > 1 ? '<div class="card" style="margin-top:12px"><div class="card-title">更多实拍</div><div class="scene-scroll">' + photos.map((ph, i) => '<img class="scene-img" src="' + ph + '" onclick="openViewer(' + jsArr(photos) + "," + i + ",'作品实拍大图')" + '" alt="实拍图">').join("") + "</div></div>" : "") +
    '<button class="btn-main" style="width:100%;margin-top:12px" onclick="closeOverlay();openDetail(\'' + ev.id + '\')">返回赛事详情</button>');
}

/* 通用图片查看器 */
function openViewer(list, idx, caption) {
  closeViewer();
  viewerData = { list: list, idx: idx || 0, captions: caption };
  const v = document.createElement("div");
  v.id = "photo-viewer"; v.className = "photo-viewer";
  v.onclick = e => { if (e.target === v) closeViewer(); };
  v.innerHTML =
    '<button class="pv-close" onclick="closeViewer()">×</button>' +
    '<img class="pv-img" id="pv-img" src="' + list[idx || 0] + '">' +
    '<div class="pv-caption" id="pv-caption"></div>' +
    (list.length > 1 ? '<button class="pv-nav pv-prev" onclick="viewerNav(-1)">‹</button><button class="pv-nav pv-next" onclick="viewerNav(1)">›</button>' : "") +
    (list.length > 1 ? '<div class="pv-count" id="pv-count"></div>' : "");
  document.getElementById("app").appendChild(v);
  renderViewer();
}
function renderViewer() {
  const v = document.getElementById("photo-viewer");
  if (!v) return;
  document.getElementById("pv-img").src = viewerData.list[viewerData.idx];
  document.getElementById("pv-caption").textContent = viewerData.captions;
  const c = document.getElementById("pv-count");
  if (c) c.textContent = (viewerData.idx + 1) + " / " + viewerData.list.length;
}
function viewerNav(d) {
  const n = viewerData.list.length;
  viewerData.idx = (viewerData.idx + d + n) % n;
  renderViewer();
}
function closeViewer() { const v = document.getElementById("photo-viewer"); if (v) v.remove(); }

function askAIAbout(id) {
  const ev = DB.events.find(e => e.id === id);
  closeOverlay();
  openAI();
  aiPush("user", "帮我分析一下「" + ev.short + "」");
  aiReply(AI.analyzePage({ page: "detail", detailId: id }));
}

/* ---------- 身份化赛事速读：学生/教师点击「小赛讲解」卡片时弹窗 ---------- */
function openAiBrief(id) {
  const ev = DB.events.find(e => e.id === id);
  if (!ev) return;
  const role = state.user.role === "teacher" ? "teacher" : "student";
  if (!aiOpen) openAI();
  // 清空旧对话，直接以身份化速读呈现，避免欢迎语干扰
  const box = document.getElementById("ai-msgs");
  if (box) box.innerHTML = "";
  aiPush("user", role === "teacher"
    ? "老师视角：给我讲讲怎么指导「" + ev.short + "」这个比赛"
    : "帮我解读一下「" + ev.short + "」的赛点和注意事项");
  aiReply(AI.eventBrief(ev, role));
}

/* ---------- 赛事分享给好友：选择好友 → 私信发送赛事卡片 ---------- */
function shareEvent(id) {
  const ev = DB.events.find(e => e.id === id);
  if (!ev) return;
  const friends = state.friends.map(fid => DB.users.find(x => x.id === fid)).filter(Boolean);
  if (!friends.length) {
    modal('<h3>📤 分享赛事</h3><p style="font-size:12.5px;color:var(--t2);line-height:1.8">你还没有好友，先去「我的 → 我的好友」添加，或在社区搜索用户加好友，就能把赛事推荐给伙伴了。</p>' +
      '<div class="modal-actions"><button class="m-ok" onclick="closeModal()">知道了</button></div>');
    return;
  }
  modal('<h3>📤 分享「' + esc(ev.short) + '」</h3>' +
    '<p style="font-size:12px;color:var(--t3);margin-bottom:10px">选择要发送的好友：</p>' +
    '<div style="max-height:280px;overflow-y:auto">' +
    friends.map(f =>
      '<div class="pick-item" onclick="sendEventShare(\'' + ev.id + '\',\'' + f.id + '\')"><span style="display:flex;align-items:center;gap:10px">' + avatarHtml(f, 32) +
      '<span>' + esc(f.name) + (f.teacher ? ' <span class="teacher-flag">🎓</span>' : "") + "</span></span>" +
      '<button class="notice-view-btn">发送</button></div>').join("") +
    "</div>");
}
/* 执行发送：打开与该好友的私信，并推送赛事分享消息 */
function sendEventShare(evId, fid) {
  const ev = DB.events.find(e => e.id === evId);
  const f = DB.users.find(x => x.id === fid);
  if (!ev || !f) { closeModal(); return; }
  closeModal();
  const st = evStatus(ev);
  currentCtx = { page: "chat", peerId: fid };
  if (!state.chats[fid]) state.chats[fid] = [];
  state.chats[fid].push({
    from: "me", type: "event", evId, time: nowTime(),
    text: "推荐你看看这个：" + ev.short + "（" + ev.level + " · " + st.text + "）"
  });
  save();
  document.getElementById("overlay-root").innerHTML = chatOverlayHTML(esc(f.name), esc(f.school), "chat-body", "chat");
  renderChat();
  toast("已发送给 " + f.name);
  setTimeout(() => {
    state.chats[fid].push({ from: "other", text: "这个比赛看着不错！我也加个预赛提醒。", time: nowTime() });
    save(); renderChat();
  }, 1300);
}

/* ================= 二级页容器 ================= */
function overlayHtml(title, inner, foot) {
  return '<div class="overlay">' +
    '<header id="topbar"><div class="tb-left"><button class="tb-back" onclick="closeOverlay()">‹ 返回</button></div>' +
    '<div class="tb-title">' + title + "</div>" +
    '<div class="tb-right"><button class="tb-icon-btn" style="visibility:hidden">×</button></div></header>' +
    '<div class="overlay-content">' + inner + "</div>" + (foot || "") + "</div>";
}
function closeOverlay() {
  document.getElementById("overlay-root").innerHTML = "";
  const p = document.querySelector(".page.active");
  currentCtx = { page: p ? p.id.replace("page-", "") : "home" };
  const titles = { home: "赛证通", category: "分类查询", school: "校内", community: "社区广场", me: "我的" };
  setTopbar(titles[currentCtx.page] || "赛证通", false);
}

/* ================= 搜索 ================= */
let searchKind = "all";
function goSearch(kind) {
  searchKind = kind || "all";
  currentCtx = { page: "search" };
  document.getElementById("overlay-root").innerHTML = overlayHtml("搜索",
    '<div class="search-page-bar"><span style="color:var(--t3)">' + I.search + "</span>" +
    '<input id="search-input" placeholder="输入竞赛 / 考试 / 关键词" oninput="runSearch(this.value)">' +
    '<button class="sp-btn" onclick="runSearch(document.getElementById(\'search-input\').value)">搜索</button></div>' +
    '<div id="search-hot"><div class="card-title" style="padding:2px 4px">🔥 大家都在搜</div>' +
    DB.hotWords.map((w, i) => '<span class="hot-word" onclick="hotWordClick(\'' + w + '\')"><b>' + (i < 3 ? ["1", "2", "3"][i] : "·") + "</b>" + w + "</span>").join("") + "</div>" +
    '<div id="search-result"></div>');
  setTimeout(() => { const el = document.getElementById("search-input"); if (el) el.focus(); }, 80);
}
function hotWordClick(w) {
  document.getElementById("search-input").value = w;
  runSearch(w);
}
function runSearch(q) {
  q = (q || "").trim();
  const box = document.getElementById("search-result");
  const hot = document.getElementById("search-hot");
  if (!q) { hot.style.display = ""; box.innerHTML = ""; return; }
  hot.style.display = "none";
  let list = DB.events.filter(ev => (ev.name + ev.short + ev.category + ev.level + (ev.tags || []).join("")).includes(q));
  if (searchKind !== "all") list = list.filter(ev => ev.kind === searchKind);
  box.innerHTML = '<div style="font-size:11.5px;color:var(--t3);margin:2px 2px 10px">找到 ' + list.length + ' 个结果</div>' +
    (list.length ? list.map(ev => evCard(ev)).join("") : emptyBox("没找到「" + esc(q) + "」相关项目，换个关键词试试"));
}

/* ================= 我的预赛 ================= */
function openMyEvents(kind) {
  currentCtx = { page: "myevents" };
  const k = kind || "comp";
  document.getElementById("overlay-root").innerHTML = overlayHtml("我的预赛",
    '<div style="font-size:12px;color:var(--t2);margin:0 2px 10px;line-height:1.7">已收藏的意向项目会在这里按时间排列，<b style="color:var(--c-danger)">临近报名节点时自动亮起提醒标识</b>，并推送消息通知。<b>点击条目可直接查看赛事详情。</b></div>' +
    '<div class="seg-tabs">' +
      '<button class="seg-tab ' + (k === "comp" ? "on" : "") + '" onclick="openMyEvents(\'comp\')">比赛</button>' +
      '<button class="seg-tab ' + (k === "exam" ? "on" : "") + '" onclick="openMyEvents(\'exam\')">考试</button>' +
    "</div>" +
    '<div id="myev-list"></div>' +
    '<div style="height:76px"></div>');
  renderMyEvents(k);
}
function renderMyEvents(kind) {
  const items = state.favs.map(id => DB.events.find(e => e.id === id)).filter(Boolean)
    .filter(e => e.kind === kind).map(ev => ({ ev, st: evStatus(ev) }))
    .sort((a, b) => ((a.st.code === "sign" ? 0 : a.st.code === "soon" ? 1 : a.st.code === "prep" ? 2 : 3) - (b.st.code === "sign" ? 0 : b.st.code === "soon" ? 1 : b.st.code === "prep" ? 2 : 3)) || a.st.days - b.st.days);
  const box = document.getElementById("myev-list");
  if (!box) return;
  const allList = state.favs.map(id => DB.events.find(e => e.id === id)).filter(Boolean);
  const compCount = allList.filter(e => e.kind === "comp").length;
  const nearCount = allList.filter(e => { const st = evStatus(e); return st.code === "sign" && st.days <= 7 && !state.remindOff.includes(e.id); }).length;
  const stat = (icon, num, label, color) => '<div class="me-stat"><i>' + icon + "</i><b" + (color ? ' style="color:' + color + '"' : "") + ">" + num + "</b><span>" + label + "</span></div>";
  box.innerHTML =
    '<div class="me-stats" style="margin:0 0 12px">' +
      stat("📋", allList.length, "全部预赛", "") +
      stat("🏆", compCount, "比赛", "var(--c-primary)") +
      stat("📄", allList.length - compCount, "考试", "#FF8A3D") +
      '<div class="me-stat st-near' + (nearCount ? " hot" : "") + '"><i>🔔</i><b style="color:var(--c-danger)">' + nearCount + "</b><span>临近提醒</span></div>" +
    "</div>" +
    (items.length
      ? items.map(it => {
      const ev = it.ev, st = it.st;
      const remindOn = !state.remindOff.includes(ev.id);
      const urgent = st.code === "sign" ? st.days <= 7 : (st.code === "soon" ? st.days <= 7 : st.code === "prep" && st.days <= 30);
      const calDate = (st.code === "prep" || st.code === "end") ? (ev.eventDate || ev.signEnd) : (ev.signEnd || ev.eventDate);
      const cp = (calDate || "").split("-");
      const cal = '<div class="myev-cal' + (ev.kind === "exam" ? " exam" : "") + '">' +
        '<span class="cal-m">' + (cp[1] ? +cp[1] + "月" : "待定") + "</span>" +
        "<b>" + (cp[2] ? +cp[2] : "?") + "</b>" +
        '<span class="cal-w">' + (calDate ? ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][parseDate(calDate).getDay()] : "") + "</span></div>";
      const row = (icon, label, valueHtml, tgl, tglFn) =>
        '<div class="myev-row' + (tgl ? " tgl" : "") + '"' + (tgl ? ' onclick="event.stopPropagation();' + tglFn + '"' : "") + ">" +
          '<span class="r-l">' + icon + " " + label + "</span>" + valueHtml + "</div>";
      const dlDanger = st.sign && st.days <= 7 && remindOn;
      const rows =
        '<div class="myev-rows">' +
        row("📅", "报名截止", ev.signEnd ? '<b class="' + (dlDanger ? "v-danger" : "") + '">' + ev.signEnd + "</b>" : '<span class="v-mute">待公布</span>') +
        row(ev.kind === "comp" ? "🏁" : "✏️", ev.kind === "comp" ? "比赛时间" : "考试时间", "<b>" + (ev.eventDate || "待公布") + "</b>") +
        row("🔔", "提醒设置", remindOn ? '<span class="v-primary">开启 ›</span>' : '<span class="v-mute">已关闭 ›</span>', true, "toggleRemind('" + ev.id + "')") +
        "</div>";
      return '<div class="myev-card" onclick="openDetail(\'' + ev.id + '\')">' +
        cal +
        '<div class="myev-body">' +
          '<div class="myev-head"><div class="myev-title">' + esc(ev.name) + "</div>" +
            '<button class="fav-chip" onclick="event.stopPropagation();unfavConfirm(\'' + ev.id + '\')">⭐ 已收藏</button></div>' +
          '<div class="myev-badges">' + levelBadge(ev) + kindBadge(ev) + stBadge(st) + "</div>" +
          rows +
          (urgent && remindOn ? '<div class="ev-remind" style="margin-top:8px">🔔 ' + st.daysNote + "</div>" : "") +
          '<div class="myev-actions">' +
            (ev.applyUrl
              ? '<button class="apply-btn" onclick="event.stopPropagation();copyText(\'' + ev.applyUrl + '\')">🔗 官网报名</button>'
              : '<span class="apply-btn school">🏫 校内渠道报名</span>') +
            '<button class="myev-go" onclick="event.stopPropagation();openDetail(\'' + ev.id + '\')">查看详情 →</button>' +
          "</div>" +
        "</div></div>";
    }).join("")
      : emptyBox(kind === "comp" ? "还没有收藏比赛，去首页看看热门赛事吧" : "还没有收藏考试，去搜索证书考试吧", "closeOverlay();goSearch('" + kind + "')", "去逛逛"));
}
function removeFav(id) {
  state.favs = state.favs.filter(f => f !== id);
  state.remindOff = state.remindOff.filter(f => f !== id);
  save(); toast("已移出预赛");
  const tabs = document.querySelectorAll(".seg-tab");
  renderMyEvents(tabs[0] && tabs[0].classList.contains("on") ? "comp" : "exam");
  refreshTabBadge();
}
/* 已收藏 → 弹窗确认后移出我的预赛 */
function unfavConfirm(evId) {
  const ev = DB.events.find(e => e.id === evId);
  if (!ev) return;
  modal('<h3>移出我的预赛</h3>' +
    '<div style="font-size:12.5px;color:var(--t2);line-height:1.9">把「<b>' + esc(ev.name) + '</b>」移出我的预赛？<br>移出后将不再收到该项目的报名与截止提醒。</div>' +
    '<div class="modal-actions"><button class="m-cancel" onclick="closeModal()">继续保留</button>' +
    '<button class="m-ok" onclick="closeModal();removeFav(\'' + evId + '\')">移出预赛</button></div>');
}
/* 单个项目提醒开关 */
function toggleRemind(id) {
  const i = state.remindOff.indexOf(id);
  if (i >= 0) { state.remindOff.splice(i, 1); toast("已恢复该项目提醒"); }
  else { state.remindOff.push(id); toast("已关闭该项目提醒，临近提醒不再统计"); }
  save();
  const tabs = document.querySelectorAll(".seg-tab");
  renderMyEvents(tabs[0] && tabs[0].classList.contains("on") ? "comp" : "exam");
}

/* ================= 已完成（比赛/考试分类切换） ================= */
function openDone(tab) {
  currentCtx = { page: "done" };
  doneTab = tab || "comp";
  document.getElementById("overlay-root").innerHTML = overlayHtml("已完成",
    '<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn-ghost" style="padding:8px 16px;font-size:12.5px" onclick="openDoneForm()">＋ 录入完成的比赛 / 考试</button></div>' +
    '<div class="seg-tabs">' +
      '<button class="seg-tab ' + (doneTab === "comp" ? "on" : "") + '" onclick="openDone(\'comp\')">🏆 比赛</button>' +
      '<button class="seg-tab ' + (doneTab === "exam" ? "on" : "") + '" onclick="openDone(\'exam\')">📄 考试</button>' +
    "</div>" +
    '<div id="done-list"></div>');
  renderDone();
}
function renderDone() {
  const box = document.getElementById("done-list");
  if (!box) return;
  const evOf = d => DB.events.find(e => e.id === d.evId);
  const manual = state.done.filter(d => d.kind === doneTab);
  const auto = autoDoneList().filter(d => d.kind === doneTab);
  box.innerHTML = (manual.length + auto.length)
    ? manual.map(d => doneItemHTML(d, evOf(d), true)).join("") +
      auto.map(d => doneItemHTML(d, evOf(d), false)).join("")
    : emptyBox(doneTab === "comp" ? "还没有比赛记录，完成比赛后记得回来归档成绩" : "还没有考试记录，考完试后记得回来归档成绩", "openDoneForm()", "立即录入");
}
/* 自动归档：我的预赛中已结束（比赛/考试日期已过）且尚未归档的项目，自动出现在「已完成」待归档 */
function autoDoneList() {
  const t = today();
  return (state.favs || []).map(fid => DB.events.find(e => e.id === fid)).filter(Boolean)
    .filter(ev => parseDate(ev.eventDate) < t)
    .filter(ev => !state.done.some(d => d.evId === ev.id))
    .filter(ev => !(state.doneDismiss || []).includes(ev.id))
    .map(ev => ({ auto: true, evId: ev.id, name: ev.name, kind: ev.kind, date: ev.eventDate }));
}
function doneItemHTML(d, ev, showDel) {
  let style = "db-gray", label = d.auto ? "待归档" : "已完成";
  if (!d.auto) {
    if (/特等奖|一等奖|优秀|金牌|9[0-9]|100/.test(d.result || "")) { style = "db-gold"; label = "优秀"; }
    else if (/二等奖|三等奖|通过|合格|[6-8][0-9]/.test(d.result || "")) { style = "db-blue"; label = "通过"; }
  }
  return '<div class="done-item' + (d.auto ? " done-auto" : "") + '"' + (d.auto ? ' onclick="openDoneFormAuto(\'' + d.evId + '\')" style="cursor:pointer"' : "") + ">" +
    '<div class="done-badge ' + (d.auto ? "db-orange" : style) + '"><span class="big">' + (d.kind === "comp" ? "🏆" : "✓") + "</span>" + label + "</div>" +
    '<div class="my-ev-main"><div class="my-ev-name">' + esc(d.name) + "</div>" +
    '<div class="my-ev-time">' + esc(d.date) + " · " + (d.kind === "comp" ? "比赛" : "考试") + (ev ? " · " + ev.level : "") + "</div>" +
    (d.auto ? '<div class="my-ev-time">系统已自动归档 · 点击录入成绩与名次</div>' : "") +
    (!d.auto && d.result ? '<div class="my-ev-time" style="color:var(--c-primary);font-weight:700">成绩：' + esc(d.result) + (d.rank ? ' · 名次：' + esc(d.rank) : "") + "</div>" : "") +
    "</div>" +
    (showDel
      ? '<button class="del-btn" onclick="event.stopPropagation();delDone(\'' + d.evId + "','" + esc(d.date) + '\')">✕</button>'
      : '<button class="del-btn" title="不归档" onclick="event.stopPropagation();ignoreAutoDone(\'' + d.evId + '\')">✕</button>') +
    "</div>";
}
function ignoreAutoDone(evId) {
  state.doneDismiss.push(evId); save();
  toast("已忽略该项目的自动归档");
  renderDone();
}
function openDoneForm(preEv) {
  const isAuto = !!preEv;
  document.getElementById("overlay-root").innerHTML = overlayHtml("录入成绩",
    (isAuto ? '<div class="alert-banner" style="margin:0 0 12px"><div class="ab-icon">⚡</div><div><div class="ab-title">系统已自动归档该项目</div><div class="ab-desc">已按比赛日期自动带入，补充成绩与名次后即正式归档</div></div></div>' : "") +
    '<div class="form-card">' +
    '<div class="form-row"><label class="form-label">选择项目</label>' +
    '<select class="form-select" id="df-ev" onchange="dfKindSync()"><option value="">— 自定义名称 —</option>' +
    DB.events.map(e => '<option value="' + e.id + '"' + (isAuto && preEv.id === e.id ? " selected" : "") + ">" + esc(e.short) + "</option>").join("") + "</select></div>" +
    '<div class="form-row"><label class="form-label">或手动输入名称</label><input class="form-input" id="df-name" placeholder="例如：校级英语词汇竞赛"></div>' +
    '<div class="form-row"><label class="form-label">类型</label><select class="form-select" id="df-kind"><option value="comp" ' + (doneTab === "comp" ? "selected" : "") + '>比赛</option><option value="exam" ' + (doneTab === "exam" ? "selected" : "") + ">考试</option></select></div>" +
    '<div class="form-row"><label class="form-label">完成日期</label><input class="form-input" id="df-date" type="date" value="' + (isAuto ? preEv.eventDate : "") + '"></div>' +
    '<div class="form-row"><label class="form-label">成绩 / 奖项</label><input class="form-input" id="df-result" placeholder="例如：省赛二等奖 / 92分（优秀）"></div>' +
    '<div class="form-row"><label class="form-label">名次 / 排名</label><input class="form-input" id="df-rank" placeholder="例如：全省第 8 名 / 校内第 3（选填）"></div>' +
    '<div class="form-row"><label class="form-label">备注</label><textarea class="form-textarea" id="df-note" placeholder="心得、后续计划…（选填）"></textarea></div>' +
    '<button class="btn-main" style="width:100%" onclick="saveDone()">保存归档</button>' +
    "</div>");
  if (isAuto) { try { dfKindSync(); } catch (e) { } }
}
function openDoneFormAuto(evId) {
  const ev = DB.events.find(e => e.id === evId);
  if (ev) openDoneForm(ev);
}
function dfKindSync() {
  const id = document.getElementById("df-ev").value;
  if (id) document.getElementById("df-kind").value = DB.events.find(e => e.id === id).kind;
}
function saveDone() {
  const evId = document.getElementById("df-ev").value;
  const name = document.getElementById("df-name").value.trim() ||
    (evId ? (DB.events.find(e => e.id === evId) || {}).name : "");
  if (!name) { toast("请选择或输入项目名称"); return; }
  state.done.unshift({
    evId: evId || "", name,
    kind: document.getElementById("df-kind").value,
    date: document.getElementById("df-date").value || today().toLocaleDateString("zh-CN"),
    result: document.getElementById("df-result").value.trim(),
    rank: document.getElementById("df-rank").value.trim(),
    note: document.getElementById("df-note").value.trim()
  });
  save(); toast("已归档到「已完成」");
  doneTab = state.done[0].kind;
  openDone(doneTab);
}
function delDone(evId, date) {
  const i = state.done.findIndex(d => d.evId === evId && d.date === date);
  if (i >= 0) state.done.splice(i, 1);
  save(); renderDone();
}

/* ================= 消息中心 ================= */
function openMessages() {
  currentCtx = { page: "messages" };
  document.getElementById("overlay-root").innerHTML = overlayHtml("消息提醒", '<div id="msg-list"></div>');
  renderMessages();
}
function renderMessages() {
  const box = document.getElementById("msg-list");
  if (!box) return;
  box.innerHTML = state.msgs.length
    ? state.msgs.map(m =>
      '<div class="msg-item" onclick="readMsg(\'' + m.id + "')\">" +
      '<div class="msg-icon ' + m.icon + '">' + (m.kind === "sys" ? "🤖" : "🔔") + "</div>" +
      '<div style="flex:1;min-width:0"><div class="msg-title">' + (m.read ? "" : '<span class="unread-dot"></span>') + esc(m.title) +
      '<span class="msg-time">' + esc(m.time) + "</span></div>" +
      '<div class="msg-desc">' + esc(m.desc) + "</div>" +
      (m.ref ? '<span class="msg-go">查看详情 ' + I.arrowR + "</span>" : "") + "</div></div>"
    ).join("")
    : emptyBox("暂无消息，把赛事加入预赛后会收到提醒");
}
function readMsg(id) {
  const m = state.msgs.find(x => x.id === id);
  if (m) { m.read = true; save(); refreshTabBadge(); }
  if (m && m.ref) { openDetail(m.ref); return; }
  renderMessages();
}
function checkReminders() {
  let added = false;
  const scan = list => {
    list.forEach(id => {
      const ev = DB.events.find(e => e.id === id);
      if (!ev) return;
      const st = evStatus(ev);
      if (st.code === "sign" && st.days <= 7) {
        const key = "cut-" + ev.id + "-" + ev.signEnd;
        if (!state.msgs.some(m => m.key === key)) {
          state.msgs.unshift({
            id: "m" + Date.now() + Math.random().toString(16).slice(2, 6), key,
            kind: "sign", time: "刚刚", read: false, icon: "mi-red",
            title: "【预赛提醒】" + ev.short + "报名" + (st.days <= 1 ? "明天" : "还有 " + st.days + " 天") + "截止",
            desc: "报名截止 " + ev.signEnd + "，" + st.daysNote + "。可在详情页直达官网报名通道。",
            ref: ev.id
          });
          added = true;
        }
      }
      if (st.code === "prep" && st.days <= 14) {
        const key = "evt-" + ev.id + "-" + ev.eventDate;
        if (!state.msgs.some(m => m.key === key)) {
          state.msgs.unshift({
            id: "m" + Date.now() + Math.random().toString(16).slice(2, 6), key,
            kind: "sign", time: "刚刚", read: false, icon: "mi-orange",
            title: "【预赛提醒】" + ev.short + (ev.kind === "comp" ? "比赛" : "考试") + "还有 " + st.days + " 天",
            desc: (ev.kind === "comp" ? "比赛" : "考试") + "时间 " + ev.eventDate + "。准考证 / 参赛凭证请提前准备。",
            ref: ev.id
          });
          added = true;
        }
      }
    });
  };
  if (state.user.role !== "teacher") scan(state.favs);
  else scan(state.guideList.map(g => g.id));
  if (added) { save(); refreshTabBadge(); }
}

/* ================= 校内页 ================= */
function schoolNotices() {
  const sch = DB.schools.find(s => s.name === state.user.school);
  const base = sch ? sch.notices.map((n, i) => Object.assign({ source: "school", id: "sc-" + sch.id + "-" + i }, n)) : [];
  const isMine = state.user.role === "teacher";
  const mine = state.myNotices.filter(n => n.school === state.user.school && n.online !== false)
    .map(n => Object.assign({ source: isMine ? "mine" : "teacher", tagColor: n.typeCat === "比赛类" ? "" : "green" }, n));
  return mine.concat(base);
}
function renderSchool() {
  const page = document.getElementById("page-school");
  const u = state.user;
  if (!u.school) {
    page.innerHTML =
      '<div class="school-bind-card"><h3>🏫 绑定你的学校</h3>' +
      "<p>绑定后可第一时间收到<b>校内竞赛、校内考试</b>通知，<br>以及本校学生可参与的校外竞赛推荐，<br>并直接查看指导老师联系方式。</p>" +
      '<button class="btn-white" onclick="openSchoolPicker()">绑定学校</button></div>' +
      '<div class="card"><div class="card-title">绑定后你能获得</div>' +
      ["校内官方通知实时推送（支持分类与专业筛选）", "校级赛事优先知晓，抢先报名", "竞赛指导老师一键联系、查看主页", "本校学长学姐的组队邀请"].map(t =>
        '<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--t2);padding:7px 0"><span style="color:var(--c-ok);font-weight:800">✓</span>' + t + "</div>").join("") +
      "</div>" +
      '<div class="card"><div class="card-title">未绑定也能用</div><div style="font-size:12.5px;color:var(--t2);line-height:1.8">分类页的省级、国家级、国际级赛事与全部证书考试不受影响，随时可以查询。</div></div>';
    return;
  }
  const sch = DB.schools.find(s => s.name === u.school);
  const all = schoolNotices();
  /* 筛选 */
  let list = all.filter(n =>
    (schoolFilter.cat === "all" || n.typeCat === schoolFilter.cat) &&
    (!schoolFilter.major || (n.majors || []).includes(schoolFilter.major) || (n.majors || []).includes("不限专业")));
  const isTeacher = u.role === "teacher";
  const shown = isTeacher || schoolNoticeOpen ? list : list.slice(0, 3);
  const schoolEvents = DB.events.filter(e => e.school === u.school);
  const recEvents = DB.events.filter(e => e.hot && !e.school && (e.majors.includes(u.major) || e.majors.includes("不限专业"))).slice(0, 3);

  page.innerHTML =
    '<div class="school-head"><div class="school-logo">' + esc(sch ? sch.short[0] : "校") + "</div>" +
    '<div><div class="school-name">' + esc(u.school) + "</div>" +
    '<div class="school-sub">✅ 已绑定 · 官方通知实时推送到「消息」</div></div>' +
    '<button class="change-bind" onclick="openSchoolPicker()">更换</button></div>' +

    (isTeacher
      ? '<div class="t-manage-head" onclick="openMyNotices()"><div style="flex:1"><h4>📌 我发布的通知</h4>' +
        '<p>发布校内通知 · 管理报名名单 · 查看浏览量</p></div>' +
        '<button class="btn-white" style="padding:8px 14px;font-size:12.5px" onclick="event.stopPropagation();openNoticeForm()">＋ 发布通知</button></div>'
      : "") +

    '<div class="filter-rows">' +
      '<div class="filter-row"><span class="filter-label">类型</span>' +
        '<div class="filter-scroll">' +
        [["all", "全部"], ["比赛类", "比赛类"], ["考试类", "考试类"]].map(c =>
          '<button class="filter-chip ' + (schoolFilter.cat === c[0] ? "on" : "") + '" onclick="setSchoolFilter(\'cat\',\'' + c[0] + '\')">' + c[1] + "</button>").join("") +
        "</div></div>" +
      '<div class="filter-row"><span class="filter-label">专业</span>' +
        '<div class="filter-scroll">' +
        '<button class="filter-chip ' + (schoolFilter.major === "" ? "on" : "") + '" onclick="setSchoolFilter(\'major\',\'\')">全部专业</button>' +
        DB.majorList.filter(m => m !== "不限专业").map(m =>
          '<button class="filter-chip ' + (schoolFilter.major === m ? "on" : "") + '" onclick="setSchoolFilter(\'major\',\'' + m + '\')">' + m + "</button>").join("") +
        "</div></div>" +
    "</div>" +

    '<div class="card"><div class="card-title">📢 学校官方通知' +
      (shown.length < list.length ? '<span class="notice-view-btn" onclick="toggleNoticesMore()">展开全部 ' + list.length + " 条 ▾</span>" : "") +
      (schoolNoticeOpen && list.length > 3 ? '<span class="notice-view-btn" onclick="toggleNoticesMore()">收起 ▴</span>' : "") +
      "</div>" +
      (shown.length ? shown.map(n => noticeCard(n)).join("") : emptyBox("当前筛选条件下暂无通知，换个类型或专业试试")) +
      "</div>" +

    (schoolEvents.length ? '<div class="card"><div class="card-title">🏫 校内赛事</div>' + schoolEvents.map(e => evCard(e)).join("") + "</div>" : "") +
    '<div class="card"><div class="card-title">🎓 适合' + esc(u.major) + "专业参加的校外竞赛" + '<span class="more" onclick="switchTab(\'category\')">更多 ' + I.arrowR + "</span></div>" + recEvents.map(e => evCard(e)).join("") + "</div>";
}
function setSchoolFilter(key, val) { schoolFilter[key] = val; renderSchool(); }
function toggleNoticesMore() { schoolNoticeOpen = !schoolNoticeOpen; renderSchool(); }

function noticeCard(n) {
  const signupN = n.source === "mine" || n.source === "teacher" ? ((state.signups[n.id] || []).length) : 0;
  return '<div class="notice-item" style="box-shadow:none;padding:10px 2px;margin:0;border-radius:0;border-bottom:1px solid var(--line);cursor:pointer" onclick="viewSchoolNotice(\'' + n.id + '\')">' +
    '<div><span class="notice-tag ' + (n.tagColor || "") + '">' + esc(n.typeCat || n.type) + "</span>" +
    (n.source === "mine" ? ' <span class="teacher-flag">我发布</span> <span style="font-size:10px;color:var(--t3)">👁 ' + (n.views || 0) + " 浏览</span>" : "") +
    (n.source === "teacher" ? ' <span class="teacher-flag">教师发布</span> <span style="font-size:10px;color:var(--t3)">👁 ' + (n.views || 0) + " 浏览</span>" : "") +
    (signupN > 0 ? ' <span style="font-size:10px;color:var(--c-ok);font-weight:700"> ✓ 已报名 ' + signupN + " 人</span>" : "") +
    (n.online === false ? ' <span style="font-size:10px;color:var(--t3)">（已下架）</span>' : "") +
    '<div class="notice-title">' + esc(n.title) + "</div>" +
    '<div class="notice-desc">' + esc(n.desc) + "</div>" +
    ((n.majors || []).length ? '<div class="notice-majors">适配专业：' + n.majors.map(m => '<span class="nm-chip">' + esc(m) + "</span>").join(" ") + "</div>" : "") +
    '<div class="teacher-box"><span class="t-label">指导老师</span><span class="t-info">' + esc(n.teacher) + " ｜ " + esc(n.phone) + (n.email ? " ｜ " + esc(n.email) : "") + "</span>" +
    (n.qa ? '<span class="t-label" style="margin-left:8px">答疑</span><span class="t-info">' + esc(n.qa) + "</span>" : "") + "</div>" +
    '<div style="display:flex;align-items:center;gap:10px;margin-top:8px">' +
    '<span style="font-size:10.5px;color:var(--t3)">' + esc(n.time) + "</span>" +
    (n.source === "mine"
      ? '<button class="notice-view-btn" onclick="event.stopPropagation();editNotice(\'' + n.id + '\')">编辑</button>' +
        '<button class="notice-view-btn" style="color:var(--c-danger);background:#FFF0F0" onclick="event.stopPropagation();toggleNoticeOnline(\'' + n.id + '\')">' + (n.online === false ? "重新上架" : "下架") + "</button>" +
        (signupN ? '<button class="notice-view-btn" style="background:#F0EBFF;color:var(--lv-intl)" onclick="event.stopPropagation();openSignupList(\'' + n.id + '\')">报名名单 ' + signupN + "</button>" : "")
      : (n.source === "mine" ? "" : '<button class="notice-view-btn" onclick="event.stopPropagation();viewNoticeTeacher(\'' + esc(n.teacher) + '\')">老师主页</button>')) +
    "</div>" +
    ((n.source === "mine" && n.signup && state.user.role !== "teacher") || (n.source === "school" && false)
      ? '<button class="notice-signup-btn" onclick="openSignupForm(\'' + n.id + '\')">✋ 立即报名登记</button>' : "") +
    "</div></div>";
}

/* 通知详情（学生视角，含浏览量统计与报名） */
function viewNotice(nid) {
  const n = state.myNotices.find(x => x.id === nid);
  if (n) { n.views = (n.views || 0) + 1; save(); }
  currentCtx = { page: "notice" };
  document.getElementById("overlay-root").innerHTML = overlayHtml("通知详情",
    '<div class="card"><span class="notice-tag ' + (n.typeCat === "考试类" ? "green" : "") + '">' + esc(n.typeCat) + "</span>" +
    '<div class="notice-title" style="margin-top:8px">' + esc(n.title) + "</div>" +
    '<div class="notice-desc">' + esc(n.desc) + "</div>" +
    '<div class="notice-majors">适配专业：' + (n.majors || []).map(m => '<span class="nm-chip">' + esc(m) + "</span>").join(" ") + "</div>" +
    '<div class="teacher-box"><span class="t-label">发布老师</span><span class="t-info">' + esc(n.teacher) + " ｜ " + esc(n.phone) + "</span></div>" +
    (n.qa ? '<div style="font-size:12px;color:var(--t2);margin-top:8px">🕐 答疑安排：' + esc(n.qa) + "</div>" : "") +
    '<div style="font-size:10.5px;color:var(--t3);margin-top:8px">发布于 ' + esc(n.time) + " · 👁 " + (n.views || 1) + " 次浏览</div>" +
    (n.signup && state.user.role !== "teacher" ? '<button class="notice-signup-btn" style="margin-top:12px" onclick="openSignupForm(\'' + n.id + '\')">✋ 立即报名登记</button>' : "") +
    "</div>");
}
/* 校内官方通知详情：支持点击整条通知查看详情，并关联到平台收录的对应赛事 */
function viewSchoolNotice(nid) {
  const n = schoolNotices().find(x => x.id === nid);
  if (!n) { toast("通知不存在或已更新，请刷新重试"); return; }
  currentCtx = { page: "notice" };
  const ev = matchNoticeEvent(n);
  document.getElementById("overlay-root").innerHTML = overlayHtml("通知详情",
    '<div class="card">' +
    '<span class="notice-tag ' + (n.tagColor || (n.typeCat === "考试类" ? "green" : "")) + '">' + esc(n.typeCat || n.type) + "</span>" +
    (n.source === "teacher" ? ' <span class="teacher-flag">教师发布</span>' : "") +
    '<div class="notice-title" style="margin-top:8px">' + esc(n.title) + "</div>" +
    '<div class="notice-desc">' + esc(n.desc) + "</div>" +
    ((n.majors || []).length ? '<div class="notice-majors">适配专业：' + n.majors.map(m => '<span class="nm-chip">' + esc(m) + "</span>").join(" ") + "</div>" : "") +
    '<div class="teacher-box"><span class="t-label">发布老师</span><span class="t-info">' + esc(n.teacher) + " ｜ " + esc(n.phone) + (n.email ? " ｜ " + esc(n.email) : "") + "</span>" +
    (n.qa ? '<span class="t-label" style="margin-left:8px">答疑</span><span class="t-info">' + esc(n.qa) + "</span>" : "") + "</div>" +
    '<div style="font-size:10.5px;color:var(--t3);margin-top:8px">发布于 ' + esc(n.time) + (n.source === "mine" ? " · 👁 " + (n.views || 1) + " 次浏览" : "") + "</div>" +
    (ev ? '<button class="btn-main" style="width:100%;margin-top:14px" onclick="closeOverlay();openDetail(\'' + ev.id + '\')">🎯 查看相关赛事：' + esc(ev.short) + "</button>" : "") +
    (n.source === "mine" ? '<button class="btn-ghost" style="width:100%;margin-top:10px" onclick="editNotice(\'' + n.id + '\')">编辑通知</button>' : "") +
    "</div>");
}
/* 根据通知标题/描述匹配平台已收录的赛事 */
function matchNoticeEvent(n) {
  const text = (n.title || "") + " " + (n.desc || "");
  let best = null, bestLen = 0;
  DB.events.forEach(ev => {
    [ev.name, ev.short, ...(ev.tags || [])].forEach(x => {
      if (x && x.length >= 2 && text.includes(x) && x.length > bestLen) { best = ev; bestLen = x.length; }
    });
  });
  return best;
}
function viewNoticeTeacher(name) {
  const parts = (name || "").split(" · ");
  const tName = (parts[0] || "").trim();
  const tDept = (parts[1] || "").trim();
  const t = DB.users.find(u => u.teacher && u.name === tName);
  if (t) { openProfile(t.id); return; }
  /* 未注册教师：从各校通知池收集该老师的联系方式与答疑信息，生成虚拟教师主页 */
  let phone = "", email = "", qa = "", school = state.user.school;
  DB.schools.forEach(s => (s.notices || []).forEach(x => {
    if ((x.teacher || "").split(" · ")[0] === tName && !phone) {
      phone = x.phone || ""; email = x.email || ""; qa = x.qa || ""; school = s.name;
    }
  }));
  (state.myNotices || []).forEach(x => {
    if ((x.teacher || "").split(" · ")[0] === tName && !phone) { phone = x.phone || ""; email = x.email || ""; qa = x.qa || ""; school = x.school || school; }
  });
  openProfile({
    id: "vt-" + tName, name: tName, teacher: true, vt: true,
    school: school, dept: tDept, title: "校内通知发布教师",
    avatar: "#7C5CFF", account: "通知发布渠道",
    phone: phone, email: email,
    dirs: tDept ? [tDept] : [],
    intro: tName + "，" + (tDept || "校内部门") + "教师，通过校内通知发布赛事与考试信息。"
      + (qa ? "答疑安排：" + qa + "。" : "") + "（该教师暂未开通社区账号，可通过电话或邮件咨询）"
  });
}

/* ---------- 教师端：通知发布管理 ---------- */
function openMyNotices() {
  currentCtx = { page: "myNotices" };
  const mine = state.myNotices;
  document.getElementById("overlay-root").innerHTML = overlayHtml("我发布的通知",
    '<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn-ghost" style="padding:8px 16px;font-size:12.5px" onclick="openNoticeForm()">＋ 发布新通知</button></div>' +
    (mine.length ? mine.map(n => noticeCard(Object.assign({ source: "mine" }, n))).join("") :
      emptyBox("还没有发布过通知。发布后学生会立即在校内页看到，可附联系方式、开启报名登记。", "openNoticeForm()", "发布第一条通知")) +
    '<div style="font-size:11px;color:var(--t3);margin-top:10px;line-height:1.7">提示：发布无需审批；支持编辑、下架；开启「报名登记」后自动汇总名单并可批量提醒。</div>');
}
function openNoticeForm(editId) {
  const n = editId ? state.myNotices.find(x => x.id === editId) : null;
  const u = state.user;
  document.getElementById("overlay-root").innerHTML = overlayHtml(n ? "编辑通知" : "发布校内通知",
    '<div class="form-card">' +
    (!n ? '<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn-ghost" style="padding:6px 14px;font-size:12px" onclick="fillNoticeDemo()">📋 一键填入示例</button></div>' : "") +
    '<div class="form-row"><label class="form-label">通知标题</label><input class="form-input" id="nf-title" placeholder="如：蓝桥杯校内集训队选拔报名" value="' + (n ? esc(n.title) : "") + '"></div>' +
    '<div class="form-row"><label class="form-label">通知分类</label><select class="form-select" id="nf-cat"><option ' + (n && n.typeCat === "比赛类" ? "selected" : "") + '>比赛类</option><option ' + (n && n.typeCat === "考试类" ? "selected" : "") + '>考试类</option></select></div>' +
    '<div class="form-row"><label class="form-label">通知内容</label><textarea class="form-textarea" id="nf-desc" style="height:90px" placeholder="说明赛事安排、报名要求、时间地点等">' + (n ? esc(n.desc) : "") + "</textarea></div>" +
    '<div class="form-row"><label class="form-label">适配专业（可多选）</label>' +
    '<div style="display:flex;flex-wrap:wrap;gap:7px" id="nf-majors">' +
    DB.majorList.filter(m => m !== "不限专业").map(m =>
      '<button class="' + (n && n.majors.includes(m) ? "tag-pill" : "tag-add") + '" onclick="this.classList.toggle(\'tag-pill\');this.classList.toggle(\'tag-add\')">' + m + "</button>").join("") +
    '<button class="' + (n && n.majors.includes("不限专业") ? "tag-pill" : "tag-add") + '" onclick="this.classList.toggle(\'tag-pill\');this.classList.toggle(\'tag-add\')">不限专业</button>' +
    "</div></div>" +
    '<div class="form-row"><label class="form-label">联系方式（一键附上）</label>' +
    '<div style="display:flex;gap:8px"><input class="form-input" id="nf-phone" placeholder="电话" value="' + (n ? esc(n.phone) : esc(u.phoneT || "")) + '">' +
    '<input class="form-input" id="nf-email" placeholder="邮箱（选填）" value="' + (n ? esc(n.email || "") : "") + '">' +
    '<button class="btn-ghost" style="flex:none;padding:0 12px;font-size:11.5px" onclick="attachContact()">附上我的</button></div></div>' +
    '<div class="form-row"><label class="form-label">答疑时间 / 地点（选填）</label><input class="form-input" id="nf-qa" placeholder="如：每周三 19:00-20:30，活动中心 201" value="' + (n ? esc(n.qa || "") : "") + '"></div>' +
    '<div class="form-row" style="display:flex;align-items:center;gap:10px"><label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer">' +
    '<input type="checkbox" id="nf-signup" ' + (n && n.signup ? "checked" : "") + ' style="width:17px;height:17px;accent-color:var(--c-primary)">开启报名登记（学生可一键报名，自动汇总名单）</label></div>' +
    '<button class="btn-main" style="width:100%" onclick="submitNotice(' + (n ? "'" + n.id + "'" : "null") + ')">' + (n ? "保存修改" : "发布通知") + "</button>" +
    "</div>");
}
function attachContact() {
  const u = state.user;
  document.getElementById("nf-phone").value = u.phoneT || u.nick;
  toast("已附上你的联系方式");
}
function fillNoticeDemo() {
  document.getElementById("nf-title").value = "「挑战杯」校内选拔赛报名（示例）";
  document.getElementById("nf-cat").value = "比赛类";
  document.getElementById("nf-desc").value = "第十九届「挑战杯」校赛报名启动：11 月 15 日截止，需提交 2000 字作品简介与 3 分钟展示视频。校赛优胜团队将获学院竞赛基金支持并推荐省赛，报名后材料提交节点自动提醒。";
  document.getElementById("nf-phone").value = state.user.phoneT || "0451-8641xxxx";
  document.getElementById("nf-email").value = (state.user.nick || "teacher") + "@example.edu.cn";
  document.getElementById("nf-qa").value = "每周三 19:00-20:30，活动中心 201";
  document.querySelectorAll("#nf-majors button").forEach(b => {
    b.className = ["综合类", "计算机", "机电"].includes(b.textContent.trim()) ? "tag-pill" : "tag-add";
  });
  document.getElementById("nf-signup").checked = true;
  toast("已填入示例内容，可直接发布或修改");
}
function submitNotice(editId) {
  const title = document.getElementById("nf-title").value.trim();
  const desc = document.getElementById("nf-desc").value.trim();
  const majors = [...document.querySelectorAll("#nf-majors .tag-pill")].map(b => b.textContent.trim());
  if (!title || !desc) { toast("标题和内容都要填哦"); return; }
  if (!majors.length) { toast("请选择至少一个适配专业"); return; }
  const u = state.user;
  const data = {
    typeCat: document.getElementById("nf-cat").value,
    desc, majors,
    phone: document.getElementById("nf-phone").value.trim(),
    email: document.getElementById("nf-email").value.trim(),
    qa: document.getElementById("nf-qa").value.trim(),
    signup: document.getElementById("nf-signup").checked
  };
  if (editId) {
    const n = state.myNotices.find(x => x.id === editId);
    Object.assign(n, data);
    toast("通知已更新");
  } else {
    state.myNotices.unshift(Object.assign({
      id: "n" + Date.now(), source: "mine", school: u.school,
      teacher: u.nick + " · " + (u.dept || ""), title,
      time: "刚刚", views: 0, online: true,
      type: data.typeCat === "比赛类" ? "校内竞赛" : "校内考试", tagColor: data.typeCat === "比赛类" ? "" : "green"
    }, data));
    toast("通知已发布，学生端立即可见");
  }
  save();
  if (state.user.role === "teacher") openMyNotices(); else { closeOverlay(); renderSchool(); }
}
function editNotice(nid) { openNoticeForm(nid); }
function toggleNoticeOnline(nid) {
  const n = state.myNotices.find(x => x.id === nid);
  if (!n) return;
  n.online = n.online === false ? true : false;
  save(); toast(n.online === false ? "通知已下架，学生端不再显示" : "通知已重新上架");
  if (document.querySelector(".overlay")) { openMyNotices(); } else renderSchool();
}

/* ---------- 学生报名 + 教师名单 ---------- */
function openSignupForm(nid) {
  const n = state.myNotices.find(x => x.id === nid);
  if (!n) return;
  if ((state.signups[nid] || []).some(s => s.name === state.user.nick)) { toast("你已报名过该通知登记的项目"); return; }
  document.getElementById("overlay-root").innerHTML = overlayHtml("报名登记",
    '<div class="card" style="margin-bottom:12px"><span class="notice-tag">' + esc(n.typeCat) + "</span>" +
    '<div class="notice-title" style="margin-top:8px">' + esc(n.title) + "</div>" +
    '<div class="notice-desc">' + esc(n.desc) + "</div></div>" +
    '<div class="form-card">' +
    '<div class="form-row"><label class="form-label">姓名（已自动填充）</label><input class="form-input" id="su-name" value="' + esc(state.user.nick) + '"></div>' +
    '<div class="form-row"><label class="form-label">专业</label><input class="form-input" id="su-major" value="' + esc(state.user.major) + '"></div>' +
    '<div class="form-row"><label class="form-label">联系电话</label><input class="form-input" id="su-phone" placeholder="方便老师联络你"></div>' +
    '<button class="btn-main" style="width:100%" onclick="submitSignup(\'' + nid + '\')">确认报名</button>' +
    "</div>");
}
function submitSignup(nid) {
  const name = document.getElementById("su-name").value.trim();
  if (!name) { toast("请填写姓名"); return; }
  if (!state.signups[nid]) state.signups[nid] = [];
  state.signups[nid].push({
    name, major: document.getElementById("su-major").value.trim(),
    phone: document.getElementById("su-phone").value.trim(), time: nowTime()
  });
  save();
  toast("报名成功！老师可在名单中看到你");
  closeOverlay(); renderSchool();
}
function openSignupList(nid) {
  const n = state.myNotices.find(x => x.id === nid);
  const list = state.signups[nid] || [];
  currentCtx = { page: "signupList" };
  document.getElementById("overlay-root").innerHTML = overlayHtml("报名名单 · " + esc(n.title.length > 12 ? n.title.slice(0, 12) + "…" : n.title),
    '<div style="font-size:12px;color:var(--t2);margin:0 2px 10px">共 <b style="color:var(--c-primary)">' + list.length + "</b> 名学生报名（系统自动汇总，替代传统收 Excel）</div>" +
    (list.length
      ? '<table class="t-signup-table"><tr><th>姓名</th><th>专业</th><th>联系电话</th><th>报名时间</th></tr>' +
        list.map(s => "<tr><td><b>" + esc(s.name) + "</b></td><td>" + esc(s.major) + "</td><td>" + esc(s.phone || "—") + "</td><td>" + esc(s.time) + "</td></tr>").join("") + "</table>" +
        '<button class="btn-main" style="width:100%;margin-top:14px" onclick="batchRemind(\'' + nid + '\')">📨 批量发送提醒（' + list.length + " 人）</button>" +
        '<div style="font-size:11px;color:var(--t3);margin-top:10px">提醒将通过 APP 消息推送给全部已报名学生（材料提交、赛前培训等）。</div>'
      : emptyBox("还没有学生报名，把通知分享出去吧")));
}
function batchRemind(nid) {
  const n = state.myNotices.find(x => x.id === nid);
  const list = state.signups[nid] || [];
  state.msgs.unshift({
    id: "m" + Date.now(), kind: "sys", time: "刚刚", read: false, icon: "mi-blue",
    title: "【批量提醒已发送】" + n.title.slice(0, 16) + "…",
    desc: "已向 " + list.length + " 名报名学生推送提醒：" + list.map(s => s.name).join("、") + "。内容：请关注材料提交截止与赛前培训安排（演示消息）。",
    ref: ""
  });
  save(); refreshTabBadge();
  toast("已向 " + list.length + " 名学生发送提醒（与消息推送打通）");
}

/* ================= 社区 ================= */
function allPosts() { return state.myPosts.concat(DB.posts); }
function renderCommunity() {
  const page = pageEl("community");
  const u = state.user;
  const isTeacher = u.role === "teacher";
  const inSchool = commFilter.channel === "school";
  const tab = commFilter.schoolTab || "posts";
  let list = allPosts().filter(p => commFilter.channel === "public" ? p.channel === "public" : (p.channel === "school" && (!p.school || !u.school || p.school === u.school)));
  if (commFilter.channel === "public" && commFilter.province) list = list.filter(p => postProvince(p) === commFilter.province);
  if (commFilter.topic) list = list.filter(p => (p.tags || []).some(t => t.includes(commFilter.topic)));
  if (isTeacher && inSchool && tab === "posts") {
    /* 教师查看本校组队帖：突出组队需求并支持专业筛选 */
    if (commFilter.teacherMajor) list = list.filter(p => p.need === "组队" || p.need === "官方召集");
  }
  const topics = ["全部"].concat([...new Set(allPosts().flatMap(p => p.tags || []))].slice(0, 9));
  page.innerHTML =
    '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      '<div class="search-bar" style="flex:1;margin:0" onclick="openCommSearch()">' + I.search + '<span class="ph">搜索帖子 / 话题 / 用户</span></div>' +
    "</div>" +
    '<div class="channel-tabs">' +
    '<button class="channel-tab ' + (commFilter.channel === "public" ? "on" : "") + '" onclick="setChannel(\'public\')">🌐 公共频道</button>' +
    '<button class="channel-tab ' + (inSchool ? "on" : "") + '" onclick="setChannel(\'school\')">🏫 ' + (isTeacher ? "本校组队指导" : "校内频道") + "</button>" +
    "</div>" +
    (inSchool
      ? '<div class="sub-tabs" style="margin:0 0 10px">' +
        '<button class="sub-tab ' + (tab === "posts" ? "on" : "") + '" onclick="setSchoolTab(\'posts\')">📝 帖子</button>' +
        '<button class="sub-tab ' + (tab === "groups" ? "on" : "") + '" onclick="setSchoolTab(\'groups\')">👥 指导群聊</button>' +
        '<button class="sub-tab ' + (tab === "recs" ? "on" : "") + '" onclick="setSchoolTab(\'recs\')">🌟 教师推荐</button>' +
        "</div>"
      : "") +
    (inSchool && tab === "groups" ? renderSchoolGuideGroups() :
     inSchool && tab === "recs" ? renderSchoolRecPosts() :
    (isTeacher && inSchool && tab === "posts"
      ? '<div class="filter-rows"><div class="filter-row"><span class="filter-label">按专业</span><div class="filter-scroll">' +
        '<button class="filter-chip ' + (!commFilter.teacherMajor ? "on" : "") + '" onclick="setTeacherMajor(\'\')">全部</button>' +
        DB.majorList.filter(m => m !== "不限专业").map(m =>
          '<button class="filter-chip ' + (commFilter.teacherMajor === m ? "on" : "") + '" onclick="setTeacherMajor(\'' + m + '\')">' + m + "</button>").join("") +
        '</div></div><div style="font-size:11px;color:var(--t3);padding-top:8px">教师视角：可查看本校学生全部组队帖、在帖下留言指导，或发布官方组队召集帖（校队选拔 / 项目组队）。</div></div>'
      : "") +
    (!inSchool
      ? '<div class="topic-scroll" style="margin-bottom:6px">' +
        ["全部"].concat([...new Set(allPosts().filter(p => p.channel === "public").map(postProvince))].sort()).map(pv =>
          '<button class="topic-chip ' + ((pv === "全部" && !commFilter.province) || commFilter.province === pv ? "on" : "") + '" onclick="setProvince(\'' + (pv === "全部" ? "" : pv) + '\')">📍 ' + (pv === "全部" ? "全部省份" : pv) + "</button>").join("") + "</div>"
      : "") +
    '<div class="topic-scroll">' + topics.map(t =>
      '<button class="topic-chip ' + ((t === "全部" && !commFilter.topic) || commFilter.topic === t ? "on" : "") + '" onclick="setTopic(\'' + (t === "全部" ? "" : t) + '\')"># ' + t + "</button>").join("") + "</div>" +
    '<div id="post-list">' +
    (list.length ? list.map(p => postCard(p)).join("") : emptyBox(commFilter.channel === "public" && commFilter.province ? "该省份暂时还没有帖子，换个省份或发第一帖吧" : (u.school ? "该频道还没有帖子，发第一帖找队友吧" : "校内频道需要先绑定学校，公共频道更热闹哦"), "openPostCreate()", "发布组队帖")) +
    "</div>");
  const old = document.getElementById("fab-post-btn");
  if (old) old.remove();
  const showFab = (!inSchool || tab === "posts") && document.querySelector(".page.active") && document.querySelector(".page.active").id === "page-community";
  if (showFab) {
    const fab = document.createElement("button");
    fab.id = "fab-post-btn"; fab.className = "fab-post";
    fab.innerHTML = I.plus + (isTeacher ? " 官方召集帖" : " 发帖");
    fab.onclick = openPostCreate;
    document.getElementById("app").appendChild(fab);
  }
}
function pageEl(p) { return document.getElementById("page-" + p); }
function setChannel(c) { commFilter.channel = c; if (c !== "school") commFilter.schoolTab = "posts"; renderCommunity(); }
function setSchoolTab(t) { commFilter.schoolTab = t; renderCommunity(); }

/* ---------- 公共频道省份筛选 ---------- */
function schoolToProvince(school) {
  if (!school) return "";
  if (DB.schoolProvince[school]) return DB.schoolProvince[school];
  const s = DB.schools.find(x => x.name === school || x.short === school);
  return s ? (DB.schoolProvince[s.short] || "黑龙江") : "其他";
}
function postProvince(p) { return p.province || schoolToProvince(p.author.school) || "黑龙江"; }
function setProvince(pv) { commFilter.province = pv; renderCommunity(); }

/* ---------- 本校频道 · 指导群聊（教师为比赛/考试组建，学生可加入） ---------- */
function schoolGuideGroups() {
  const u = state.user;
  return DB.groups.filter(g => g.kind === "guide" && g.school === u.school);
}
function renderSchoolGuideGroups() {
  const u = state.user;
  const gs = schoolGuideGroups();
  return '<div style="font-size:11.5px;color:var(--t3);margin:0 2px 10px;line-height:1.7">这里是本校老师为<b>比赛 / 考试</b>专门组建的指导群聊，加入后可在「我的 → 我的群聊」中找到，群内同步训练安排、材料清单与答疑。</div>' +
    (gs.length
      ? '<div id="guide-group-list">' + gs.map(g => {
        const ev = g.evId ? DB.events.find(e => e.id === g.evId) : null;
        const joined = (state.joinedGroups || []).includes(g.id);
        const lastMsg = (g.msgs[g.msgs.length - 1] || {}).text || "新群聊";
        return '<div class="post-card gg-card" onclick="' + (joined ? "openGroup('" + g.id + "')" : "joinGuideGroup('" + g.id + "')") + '">' +
          '<div class="post-head">' +
          '<div class="avatar" style="width:38px;height:38px;font-size:15px;background:' + g.avatar + '">' + esc(g.name[0]) + "</div>" +
          '<div class="post-author"><div class="post-name">' + esc(g.name) + ' <span class="need-tag">指导群</span></div>' +
          '<div class="post-school">🎓 ' + esc(g.teacher) + "</div></div>" +
          (joined
            ? '<button class="mini-btn mini-primary" onclick="event.stopPropagation();openGroup(\'' + g.id + '\')">进入群聊</button>'
            : '<button class="mini-btn mini-ghost" onclick="event.stopPropagation();joinGuideGroup(\'' + g.id + '\')">＋ 加入群聊</button>') +
          "</div>" +
          '<div class="post-content" style="font-size:12.5px">' + esc(g.desc || "") + "</div>" +
          (ev ? '<div class="gg-ev" onclick="event.stopPropagation();openDetail(\'' + ev.id + '\')">🏆 关联赛事：' + esc(ev.short) + " · " + esc(evStatus(ev).text) + "，点击查看详情 →</div>" : "") +
          '<div class="post-foot"><span class="pf-item">👥 ' + g.members + " 人</span>" +
          '<span class="pf-item">💬 ' + esc(lastMsg).slice(0, 18) + (lastMsg.length > 18 ? "…" : "") + "</span>" +
          (joined ? '<span class="pf-item" style="color:var(--c-ok)">✓ 已加入</span>' : "") +
          "</div></div>";
      }).join("") + "</div>"
      : emptyBox(u.school ? "本校老师还没有组建指导群，可以先关注校内通知" : "绑定学校后可看到本校老师的指导群", "openSchoolPicker()", "去绑定学校"));
}
function joinGuideGroup(gid) {
  const g = DB.groups.find(x => x.id === gid);
  if (!g) return;
  if (!state.joinedGroups) state.joinedGroups = [];
  if (state.joinedGroups.includes(gid)) { openGroup(gid); return; }
  state.joinedGroups.push(gid);
  save();
  toast("已加入「" + g.name + "」，可在 我的 → 我的群聊 找到");
  renderCommunity();
}

/* ---------- 本校频道 · 教师推荐（以帖子形式展示，点击跳转赛事详情） ---------- */
function schoolRecList() {
  const u = state.user;
  return studentRecs().filter(r => r.school === u.school);
}
/* 教师推荐帖：点击头像 → 教师主页（卡片其余区域仍跳赛事详情） */
function openRecTeacher(tid, name, school) {
  const t = (tid && DB.users.find(x => x.id === tid)) ||
    DB.users.find(x => x.teacher && x.name === name && x.school === school) ||
    DB.users.find(x => x.teacher && x.name === name);
  if (t) { openProfile(t.id); return; }
  /* 未注册教师：生成虚拟教师主页 */
  openProfile({
    id: "vt-rec-" + name, name: name, teacher: true, vt: true,
    school: school || "", title: "指导教师", avatar: "#7C5CFF", account: "教师推荐渠道",
    intro: name + "，" + (school || "本校") + "教师，为本校学生推荐赛事与考试，详情可查看推荐卡片或校内通知。"
  });
}
function renderSchoolRecPosts() {
  const u = state.user;
  const recs = schoolRecList();
  return '<div style="font-size:11.5px;color:var(--t3);margin:0 2px 10px;line-height:1.7">本校老师推荐的<b>比赛 / 考试</b>，附推荐理由，点击卡片可查看赛事详情。</div>' +
    (recs.length
      ? '<div id="school-rec-list">' + recs.map(r => {
        const ev = DB.events.find(e => e.id === r.evId);
        if (!ev) return "";
        const st = evStatus(ev);
        const t = (DB.users.find(x => x.id === r.teacherId) || {});
        const tUser = { name: r.teacher, school: r.school, avatar: t.avatar || "#7C5CFF", teacher: true, dept: t.dept || "" };
        return '<div class="post-card rec-post-card" onclick="openDetail(\'' + ev.id + '\')">' +
          '<div class="post-head">' +
          '<div class="avatar-click" onclick="event.stopPropagation();openRecTeacher(\'' + (r.teacherId || "") + '\',\'' + esc(r.teacher) + '\',\'' + esc(r.school) + '\')">' + avatarHtml(tUser, 38) + "</div>" +
          '<div class="post-author"><div class="post-name">' + esc(r.teacher) + ' <span class="teacher-flag">🎓 教师</span> <span class="need-tag">推荐赛事</span></div>' +
          '<div class="post-school">' + esc(r.school) + (tUser.dept ? " · " + esc(tUser.dept) : "") + "</div></div>" +
          '<span class="post-time">' + esc(r.time || "") + "</span></div>" +
          '<div class="post-content">' + esc(r.note) + "</div>" +
          '<div class="rec-ev-box">🏆 ' + esc(ev.name) + "<br>" + esc(ev.level) + " · " + esc(st.text) + (st.sign ? " · 报名截止 " + ev.signEnd : "") + ' <span class="rec-ev-go">查看详情 →</span></div>' +
          "</div>";
      }).join("") + "</div>"
      : emptyBox(u.school ? "本校老师还没有推荐赛事" : "绑定学校后可看到本校老师的推荐", "openSchoolPicker()", "去绑定学校"));
}
function setTopic(t) { commFilter.topic = t; currentCtx = { page: "community", topic: t }; renderCommunity(); }
function setTeacherMajor(m) { commFilter.teacherMajor = m; renderCommunity(); }
function likePost(id) {
  const i = state.likes.indexOf(id);
  if (i >= 0) state.likes.splice(i, 1); else state.likes.push(id);
  save(); renderCommunity();
}
/* 头像点击 → 个人主页 */
function avatarChat(uid, name) {
  if (!uid) { toast("该用户暂未开通主页（演示）"); return; }
  openProfile(uid);
}
/* 群聊头像点击 → 成员主页 */
function memberProfile(name) {
  if (!name || name === "我" || name === "me") return;
  const u = DB.users.find(x => x.name === name);
  if (u) { openProfile(u.id); return; }
  if (/老师$/.test(name)) { viewNoticeTeacher(name); return; }
  toast("该成员暂未开通主页（演示）");
}
function chatAuthor(pid) {
  const p = allPosts().find(x => x.id === pid);
  if (p.author.uid) openProfile(p.author.uid);
  else toast("已向 " + p.author.name + " 发起私信（演示）");
}
function postCard(p) {
  const isTeacherPost = p.need === "官方召集" || p.author.teacher;
  return '<div class="post-card" onclick="openPostDetail(\'' + p.id + '\')">' +
    '<div class="post-head">' +
    '<div class="avatar-click" style="cursor:pointer" onclick="event.stopPropagation();avatarChat(\'' + (p.author.uid || "") + '\',\'' + esc(p.author.name) + '\')">' + avatarHtml(p.author, 38) + "</div>" +
    '<div class="post-author"><div class="post-name">' + esc(p.author.name) +
    (p.author.teacher ? ' <span class="teacher-flag">🎓 教师</span>' : "") +
    (isTeacherPost ? ' <span class="need-tag">' + esc(p.need || "组队") + "</span>" : ' <span class="need-tag">' + esc(p.need || "组队") + "</span>") +
    "</div>" +
    '<div class="post-school">' + esc(p.author.school) + "</div></div>" +
    '<span class="post-time">' + esc(p.time) + "</span></div>" +
    '<div class="post-content">' + esc(p.content) + "</div>" +
    ((p.photos || []).length
      ? '<div class="post-imgs">' + p.photos.map((ph, i) =>
          '<img src="' + ph + '" class="post-img" onclick="event.stopPropagation();openViewer(' + jsArr(p.photos) + "," + i + ',\'' + esc(p.author.name) + ' 发布的图片\')" alt="图片">').join("") + "</div>"
      : "") +
    '<div class="post-tags">' + (p.tags || []).map(t => '<span class="p-tag">#' + esc(t) + "</span>").join("") + "</div>" +
    '<div class="post-foot">' +
    '<span class="pf-item ' + (state.likes.includes(p.id) ? "on" : "") + '" onclick="event.stopPropagation();likePost(\'' + p.id + '\')">👍 ' + (p.likes + (state.likes.includes(p.id) ? 1 : 0)) + "</span>" +
    '<span class="pf-item">💬 ' + (p.comments ? p.comments.length : 0) + "</span>" +
    '<span class="pf-item" onclick="event.stopPropagation();chatAuthor(\'' + p.id + '\')">私信作者</span>' +
    "</div></div>";
}

/* 社区全局搜索（帖子 / 用户） */
let commSearchTab = "posts";
function openCommSearch() {
  currentCtx = { page: "commSearch" };
  commSearchTab = "posts";
  document.getElementById("overlay-root").innerHTML = overlayHtml("社区搜索",
    '<div class="search-page-bar"><span style="color:var(--t3)">' + I.search + "</span>" +
    '<input id="cs-kw" placeholder="搜索帖子内容 / #话题 / 用户昵称 / 手机号 / 账号" oninput="runCommSearch(this.value)">' +
    '<button class="sp-btn" onclick="runCommSearch(document.getElementById(\'cs-kw\').value)">搜索</button></div>' +
    '<div class="sr-tabs">' +
    '<button class="sr-tab ' + (commSearchTab === "posts" ? "on" : "") + '" id="cst-posts" onclick="setCommSearchTab(\'posts\')">搜帖子</button>' +
    '<button class="sr-tab ' + (commSearchTab === "users" ? "on" : "") + '" id="cst-users" onclick="setCommSearchTab(\'users\')">搜用户</button>' +
    "</div>" +
    '<div style="font-size:11.5px;color:var(--t3);margin:0 2px 10px">支持搜索帖子内容与话题标签；用户可通过昵称、手机号、APP 账号（如 SZT-A1024）搜索，搜索后可添加好友、发起聊天。</div>' +
    '<div id="cs-result"></div>');
}
function setCommSearchTab(t) {
  commSearchTab = t;
  document.getElementById("cst-posts").className = "sr-tab" + (t === "posts" ? " on" : "");
  document.getElementById("cst-users").className = "sr-tab" + (t === "users" ? " on" : "");
  runCommSearch(document.getElementById("cs-kw").value);
}
function runCommSearch(q) {
  q = (q || "").trim().replace(/^#/, "");
  const box = document.getElementById("cs-result");
  if (!q) { box.innerHTML = ""; return; }
  if (commSearchTab === "posts") {
    const list = allPosts().filter(p => (p.content + (p.tags || []).join(" ") + p.author.name).includes(q));
    box.innerHTML = '<div style="font-size:11.5px;color:var(--t3);margin:0 2px 10px">找到 ' + list.length + " 条相关帖子</div>" +
      (list.length ? list.map(p => postCard(p)).join("") : emptyBox("没有找到相关帖子，换个关键词试试"));
  } else {
    const list = DB.users.filter(u => (u.name + u.phone + u.account + u.school + u.major).includes(q));
    box.innerHTML = '<div style="font-size:11.5px;color:var(--t3);margin:0 2px 10px">找到 ' + list.length + " 位用户</div>" +
      (list.length ? list.map(u => {
        const isFriend = state.friends.includes(u.id);
        return '<div class="sr-user-item">' +
          '<div class="avatar-click" style="cursor:pointer" onclick="openProfile(\'' + u.id + '\')">' + avatarHtml(u, 38) + "</div>" +
          '<div style="flex:1"><div class="friend-name">' + esc(u.name) + (u.teacher ? ' <span class="teacher-flag">🎓 教师</span>' : "") + ' <span class="online-flag ' + (u.online ? "" : "off") + '"></span></div>' +
          '<div class="sr-user-sub">' + esc(u.school) + " · " + esc(u.major) + " · 账号 " + esc(u.account) + " · " + esc(u.phone) + "</div></div>" +
          '<div class="sr-actions">' +
          (isFriend ? "" : '<button class="mini-btn mini-ghost" onclick="addUserFriend(\'' + u.id + '\')">+ 好友</button>') +
          '<button class="mini-btn mini-primary" onclick="openChat(\'' + u.id + '\')">私信</button>' +
          "</div></div>";
      }).join("") : emptyBox("没有找到该用户，试试账号或手机号搜索"));
  }
}
function addUserFriend(uid) {
  if (!state.friends.includes(uid)) {
    state.friends.push(uid); save();
    const u = DB.users.find(x => x.id === uid);
    toast(u.name + " 已通过你的好友申请");
    const csEl = document.getElementById("cs-kw");
    if (csEl) runCommSearch(csEl.value);
    else openProfile(uid);
  }
}

/* 发帖 */
function openPostCreate() {
  const u = state.user;
  const isTeacher = u.role === "teacher";
  const tagPool = ["数学建模", "挑战杯", "蓝桥杯", "英语", "专升本", "教师资格", "组队", "校队选拔"];
  document.getElementById("overlay-root").innerHTML = overlayHtml(isTeacher ? "发布官方召集帖" : "发布帖子",
    '<div class="form-card">' +
    '<div class="form-row"><label class="form-label">发布频道</label>' +
    '<select class="form-select" id="pf-channel"><option value="public">公共频道</option>' +
    '<option value="school" ' + (u.school ? (isTeacher ? "selected" : "") : "disabled") + ">校内频道" + (u.school ? "（" + esc(u.school) + "）" : "（需先绑定学校）") + "</option></select></div>" +
    '<div class="form-row"><label class="form-label">帖子类型</label>' +
    '<select class="form-select" id="pf-need">' +
    (isTeacher ? '<option selected>官方召集</option><option>通知</option>' : "<option>组队</option><option>打卡组</option><option>交流</option><option>通知</option>") +
    "</select></div>" +
    '<div class="form-row"><label class="form-label">内容</label><textarea class="form-textarea" id="pf-content" style="height:120px" placeholder="' + (isTeacher ? "如：校队选拔要求、项目方向、联系方式、训练安排…" : "介绍你的情况、找什么方向的队友、目标成绩…") + '"></textarea></div>' +
    '<div class="form-row"><label class="form-label">添加图片（最多 3 张）</label>' +
    '<div id="pf-photos" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"></div>' +
    '<button class="tag-add" onclick="pfAddPhoto()">📷 选择图片</button></div>' +
    '<div class="form-row"><label class="form-label">话题标签（点击添加）</label><div class="tag-edit-list" id="pf-tags">' +
    '<button class="tag-add" onclick="addPickTag(this)">＋ 自定义</button></div>' +
    "</div>" +
    '<div style="display:flex;gap:8px;margin:4px 0 12px;flex-wrap:wrap">' +
    tagPool.map(t => '<button class="tag-add" style="border-style:solid;border-color:var(--c-primary)" onclick="togglePickTag(this,\'' + t + '\')"># ' + t + "</button>").join("") +
    "</div>" +
    '<button class="btn-main" style="width:100%" onclick="submitPost()">发布</button>' +
    "</div>");
  window._pickTags = [];
  window._pickPhotos = [];
}
/* 发帖选图 */
function pfAddPhoto() {
  if ((window._pickPhotos || []).length >= 3) { toast("最多添加 3 张图片"); return; }
  pickImage(520, data => {
    window._pickPhotos.push(data);
    const box = document.getElementById("pf-photos");
    const thumb = document.createElement("div");
    thumb.style.cssText = "position:relative;width:76px;height:76px;border-radius:12px;overflow:hidden";
    thumb.innerHTML = '<img src="' + data + '" style="width:100%;height:100%;object-fit:cover">' +
      '<button onclick="this.parentElement.remove();window._pickPhotos.splice(' + (window._pickPhotos.indexOf(data)) + ',1)" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.55);color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;line-height:18px">×</button>';
    box.appendChild(thumb);
  });
}
function togglePickTag(btn, tag) {
  const i = window._pickTags.indexOf(tag);
  if (i >= 0) { window._pickTags.splice(i, 1); btn.classList.remove("tag-pill"); btn.classList.add("tag-add"); btn.textContent = "# " + tag; }
  else { window._pickTags.push(tag); btn.classList.remove("tag-add"); btn.classList.add("tag-pill"); btn.textContent = "# " + tag; }
}
function addPickTag() {
  const t = prompt("输入自定义话题：");
  if (t && t.trim()) { window._pickTags.push(t.trim()); toast("已添加话题 #" + t.trim()); }
}
function submitPost() {
  const content = document.getElementById("pf-content").value.trim();
  if (!content) { toast("写点内容再发布吧"); return; }
  const channel = document.getElementById("pf-channel").value;
  const need = document.getElementById("pf-need").value;
  state.myPosts.unshift({
    id: "up" + Date.now(), channel, need,
    school: state.user.school,
    province: channel === "public" ? (schoolToProvince(state.user.school) || "黑龙江") : "",
    photos: (window._pickPhotos || []).slice(),
    author: { name: state.user.nick + (state.user.role === "teacher" ? " 老师" : ""), school: (DB.schools.find(s => s.name === state.user.school) || {}).short || state.user.school || "未绑定", avatar: state.user.role === "teacher" ? "#7C5CFF" : "#2B5CFF", uid: "", teacher: state.user.role === "teacher" },
    time: "刚刚", content, tags: (window._pickTags || []).slice(0, 6),
    likes: 0, comments: []
  });
  save(); commFilter.channel = channel;
  closeOverlay(); switchTab("community");
  toast("发布成功" + (state.user.role === "teacher" ? "，学生可在本校组队区看到你的召集帖" : "，祝早日集齐队友！"));
}

/* 帖子详情 */
function openPostDetail(pid) {
  const p = allPosts().find(x => x.id === pid);
  if (!p) return;
  currentCtx = { page: "post", topic: (p.tags[0] || "") };
  document.getElementById("overlay-root").innerHTML = overlayHtml("帖子详情",
    '<div class="post-card" style="cursor:default">' +
    '<div class="post-head">' +
    '<div class="avatar-click" style="cursor:pointer" onclick="avatarChat(\'' + (p.author.uid || "") + '\',\'' + esc(p.author.name) + '\')">' + avatarHtml(p.author, 38) + "</div>" +
    '<div class="post-author"><div class="post-name">' + esc(p.author.name) +
    (p.author.teacher ? ' <span class="teacher-flag">🎓 教师</span>' : "") +
    ' <span class="need-tag">' + esc(p.need) + "</span></div>" +
    '<div class="post-school">' + esc(p.author.school) + " · " + esc(p.time) + "</div></div></div>" +
    '<div class="post-content" style="margin-top:12px;font-size:14px">' + esc(p.content) + "</div>" +
    ((p.photos || []).length
      ? '<div class="post-imgs" style="margin-top:10px">' + p.photos.map((ph, i) =>
          '<img src="' + ph + '" class="post-img" onclick="openViewer(' + jsArr(p.photos) + "," + i + ',\'' + esc(p.author.name) + ' 发布的图片\')" alt="图片">').join("") + "</div>"
      : "") +
    '<div class="post-tags">' + (p.tags || []).map(t => '<span class="p-tag" onclick="closeOverlay();setTopic(\'' + t + '\')">#' + esc(t) + "</span>").join("") + "</div>" +
    '<div class="post-foot"><span class="pf-item ' + (state.likes.includes(p.id) ? "on" : "") + '" onclick="likePost(\'' + p.id + '\');openPostDetail(\'' + p.id + '\')">👍 点赞 ' + (p.likes + (state.likes.includes(p.id) ? 1 : 0)) + "</span>" +
    '<span class="pf-item" onclick="chatAuthor(\'' + p.id + '\')">💬 私信作者</span></div></div>' +
    '<div class="card"><div class="card-title">评论 ' + ((p.comments || []).length) + "</div>" +
    ((p.comments || []).map(c =>
      '<div class="comment-item"><div class="avatar" style="width:30px;height:30px;font-size:12px;background:#C9D4F5;color:#3B4A6B">' + esc(c.name[0]) + '</div><div style="flex:1"><div class="c-name">' + esc(c.name) + (c.teacher ? ' <span class="teacher-flag">指导教师</span>' : "") + '</div><div class="c-text">' + esc(c.text) + "</div></div></div>"
    ).join("") || '<div style="font-size:12px;color:var(--t3);padding:6px 0">还没有评论，坐个沙发？</div>') +
    "</div>" +
    '<div style="height:70px"></div>',
    '<div class="detail-footer"><input id="comment-input" class="form-input" style="flex:1;border-radius:24px" placeholder="友善评论，发表你的看法…">' +
    '<button class="btn-main" style="flex:none;padding:12px 22px" onclick="submitComment(\'' + p.id + '\')">发送</button></div>');
}
function submitComment(pid) {
  const p = allPosts().find(x => x.id === pid);
  const v = document.getElementById("comment-input").value.trim();
  if (!v) return;
  p.comments = p.comments || [];
  p.comments.push({ name: state.user.nick + (state.user.role === "teacher" ? " 老师" : ""), text: v, teacher: state.user.role === "teacher" });
  save(); toast("评论成功");
  openPostDetail(pid);
}

/* ================= 我的页面（学生/教师双视角） ================= */
function renderMe() {
  const page = pageEl("me");
  const u = state.user;
  const isTeacher = u.role === "teacher";
  const favComp = state.favs.map(id => DB.events.find(e => e.id === id)).filter(e => e && e.kind === "comp").length;
  const favExam = state.favs.length - favComp;

  page.innerHTML =
    '<div class="me-head" onclick="openProfileEdit()">' +
    avatarHtml(u, 58) +
    '<div style="flex:1"><div class="me-nick">' + esc(u.nick) + " " + roleTag() + ' <span class="me-edit">编辑资料</span></div>' +
    '<div class="me-tags">' +
    (u.school ? '<span class="me-tag">🏫 ' + esc(u.school) + "</span>" : '<span class="me-tag">🏫 未绑定学校</span>') +
    (isTeacher
      ? '<span class="me-tag">💼 ' + esc(u.title || "教师") + (u.dept ? " · " + esc(u.dept) : "") + "</span>" +
        (u.teacherNo ? '<span class="me-tag">🆔 工号 ' + esc(u.teacherNo) + "</span>" : "")
      : '<span class="me-tag">📚 ' + esc(u.major) + "</span>" +
        (u.studentNo ? '<span class="me-tag">🆔 学号 ' + esc(u.studentNo) + "</span>" : "")) +
    "</div>" +
    (isTeacher && (u.guideDirs || []).length
      ? '<div class="me-tags" style="margin-top:7px">' + u.guideDirs.map(d => '<span class="me-tag">🎯 指导 ' + esc(d) + "</span>").join("") + "</div>" : "") +
    (!isTeacher && (u.skills || []).length
      ? '<div class="me-tags" style="margin-top:7px">' + u.skills.map(s => '<span class="me-tag">✨ ' + esc(s) + "</span>").join("") + "</div>" : "") +
    "</div>" + I.arrowR.replace("currentColor", "rgba(255,255,255,.8)") + "</div>" +

    '<div class="me-stats">' +
    (isTeacher
      ? '<div class="me-stat" onclick="openMyNotices()"><b>' + state.myNotices.length + "</b><span>发布通知</span></div>" +
        '<div class="me-stat" onclick="openAllSignups()"><b>' + Object.keys(state.signups).reduce((s, k) => s + (state.signups[k] || []).length, 0) + "</b><span>报名登记</span></div>" +
        '<div class="me-stat" onclick="openGuideList()"><b>' + state.guideList.length + "</b><span>指导赛事</span></div>" +
        '<div class="me-stat" onclick="openFriends()"><b>' + state.friends.length + "</b><span>好友</span></div>"
      : '<div class="me-stat" onclick="openMyEvents()"><b>' + favComp + "</b><span>预赛·比赛</span></div>" +
        '<div class="me-stat" onclick="openMyEvents(\'exam\')"><b>' + favExam + "</b><span>预赛·考试</span></div>" +
        '<div class="me-stat" onclick="openDone()"><b>' + state.done.length + "</b><span>已完成</span></div>" +
        '<div class="me-stat" onclick="openFriends()"><b>' + state.friends.length + "</b><span>好友</span></div>") +
    "</div>" +

    (isTeacher
      ? '<div class="menu-label">📌 教学管理</div>' +
        '<div class="menu-group">' +
        mi("openMyNotices()", "qi-cyan", "📢", "发布公告", state.myNotices.length + " 条 · 含示例") +
        mi("openAllSignups()", "qi-orange", "📋", "报名名单汇总", "系统自动汇总") +
        mi("openGuideList()", "qi-purple", "🎯", "我指导的赛事", "时间节点自动提醒") +
        mi("openStudentScores()", "qi-blue", "📊", "学生成绩单", "仅显示已授权学生") +
        "</div>" +
        '<div class="menu-label">👤 个人中心</div>' +
        '<div class="menu-group">' +
        mi("openTeacherHome()", "qi-blue", "🏠", "教师主页", "学生可发起咨询") +
        mi("openProfileEdit()", "qi-green", "✏️", "编辑资料 / 换头像", "") +
        "</div>"
      : '<div class="menu-label">🎒 我的竞赛</div>' +
        '<div class="menu-group">' +
        mi("openMyEvents()", "qi-orange", I.starF, "我的预赛", "点击条目直达详情") +
        mi("openDone()", "qi-blue", I.medal, "已完成的比赛 / 考试", "成绩名次自动归档") +
        mi("openScoreAuth()", "qi-green", "🛡", "成绩查看授权", state.scoreAuth ? "已开放给指导老师" : "未开放（隐私保护）") +
        "</div>") +
    '<div class="menu-label">💬 社交互动</div>' +
    '<div class="menu-group">' +
    mi("openMessages()", "qi-red", I.bell, "消息提醒", state.msgs.filter(m => !m.read).length + " 条未读") +
    mi("openFriends()", "qi-cyan", I.users, "我的好友", "") +
    mi("openGroupList()", "qi-blue", I.chat, "我的群聊", "组队群 " + (DB.groups.length + state.myGroups.length) + " 个") +
    mi("openChatList()", "qi-purple", I.send, "私信", "") +
    mi("openSchoolPicker()", "qi-green", "🏫", "绑定学校", u.school || "未绑定") +
    "</div>" +
    '<div class="menu-label">⚙️ 设置</div>' +
    '<div class="menu-group">' +
    mi("aboutApp()", "qi-blue", "ⓘ", "关于赛证通", "v2.0 演示版") +
    mi("switchRole()", "qi-red", "🔄", "切换身份", isTeacher ? "当前：教师" : "当前：学生") +
    "</div>";
}
/* ================= 学生成绩查看授权 + 教师端学生成绩单 ================= */
function openScoreAuth() {
  currentCtx = { page: "scoreAuth" };
  const on = !!state.scoreAuth;
  document.getElementById("overlay-root").innerHTML = overlayHtml("成绩查看授权",
    '<div class="form-card" style="text-align:center;padding:26px 18px">' +
      '<div style="font-size:46px">' + (on ? "🔓" : "🔒") + "</div>" +
      '<div style="font-size:17px;font-weight:800;margin:8px 0 4px">' + (on ? "已开放成绩查看" : "未开放成绩查看") + "</div>" +
      '<div style="font-size:12px;color:var(--t3);line-height:1.9">你的指导老师（本校教师及所加入指导群的群主老师）' + (on ? "<b>可以</b>查看" : "<b>无法</b>查看") + "你的比赛 / 考试成绩与名次</div>" +
      '<button class="' + (on ? "btn-ghost" : "btn-main") + '" style="width:100%;margin-top:18px" onclick="toggleScoreAuth()">' + (on ? "🔒 关闭授权" : "🔓 开放给我的指导老师") + "</button>" +
    "</div>" +
    '<div class="form-card" style="margin-top:12px">' +
      '<div class="card-title" style="font-size:13.5px">授权说明</div>' +
      '<div style="font-size:12px;color:var(--t2);line-height:2;text-align:left">' +
      "· 开启后，老师可在「我的 → 教学管理 → 学生成绩单」中查看你的归档成绩、名次与备注<br>" +
      "· 仅限成绩数据，不涉及私信、社区帖子等其他内容<br>" +
      "· 可随时关闭，关闭后老师立即无法再查看<br>" +
      "· 默认关闭，是否开放完全由你自主决定</div>" +
    "</div>");
}
function toggleScoreAuth() {
  state.scoreAuth = !state.scoreAuth;
  save();
  toast(state.scoreAuth ? "已开放成绩查看，指导老师可在教学管理中查看" : "已关闭授权，成绩单对老师隐藏");
  openScoreAuth();
}
function teacherStudents() {
  const t = state.user;
  const list = [];
  if (state.done && state.done.length) {
    list.push({ me: true, name: state.user.nick + "（当前账号）", school: state.user.school || "—", major: state.user.major, avatar: "#2B5CFF", auth: !!state.scoreAuth, scores: state.done });
  }
  DB.users.filter(u => !u.teacher && schoolMatch(u.school, t.school)).forEach(u => {
    list.push({ id: u.id, name: u.name, school: u.school, major: u.major, avatar: u.avatar, auth: !!(DB.demoScoreAuth || {})[u.id], scores: (DB.demoScores || {})[u.id] || [] });
  });
  return list;
}
function schoolMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const sa = DB.schools.find(x => x.name === a || x.short === a);
  const sb = DB.schools.find(x => x.name === b || x.short === b);
  return !!(sa && sb && (sa.id === sb.id || sa.name === sb.name || sa.short === sb.short));
}
function openStudentScores() {
  currentCtx = { page: "studentScores" };
  const list = teacherStudents();
  document.getElementById("overlay-root").innerHTML = overlayHtml("学生成绩单",
    '<div style="font-size:11.5px;color:var(--t3);margin:0 2px 10px;line-height:1.7">仅显示<b>已授权</b>学生的成绩；学生关闭授权后立即不可见。是否授权由学生自主决定，默认关闭。</div>' +
    (list.length ? list.map(s => {
      const n = s.me ? s.scores.length : (DB.demoScores[s.id] || []).length;
      return '<div class="friend-item" onclick="' + (s.auth ? "openScoreCardView('" + (s.me ? "__me__" : s.id) + "')" : "toast('该学生未开放成绩查看')") + '">' +
        '<div class="avatar" style="background:' + s.avatar + '">' + esc(s.name[0]) + "</div>" +
        '<div style="flex:1"><div class="friend-name">' + esc(s.name) + (s.auth ? ' <span class="auth-tag ok">已授权</span>' : ' <span class="auth-tag off">未授权</span>') + '</div>' +
        '<div class="friend-sub">' + esc(s.school) + " · " + esc(s.major || "") + (s.auth ? " · " + n + " 条归档" : "") + "</div></div>" +
        '<span class="post-time">' + (s.auth ? "查看 →" : "🔒") + "</span></div>";
    }).join("") : emptyBox("本校暂无学生成绩数据（演示）")));
}
function openScoreCardView(key) {
  const s = teacherStudents().find(x => (x.me ? "__me__" : x.id) === key);
  if (!s || !s.auth) { toast("该学生未开放成绩查看"); return; }
  const scores = s.me ? s.scores : (DB.demoScores[s.id] || []);
  const comp = scores.filter(d => d.kind === "comp"), exam = scores.filter(d => d.kind === "exam");
  const block = (arr, title) => '<div class="card-title" style="font-size:13.5px;margin:16px 0 8px">' + title + "（" + arr.length + "）</div>" +
    (arr.length ? arr.map(d => doneItemHTML(d, DB.events.find(e => e.id === d.evId), false)).join("") : '<div style="font-size:12px;color:var(--t3)">暂无归档记录</div>');
  document.getElementById("overlay-root").innerHTML = overlayHtml("成绩单 · " + s.name,
    '<div class="form-card" style="text-align:center">' +
      '<div class="avatar" style="width:56px;height:56px;font-size:20px;background:' + s.avatar + ';margin:0 auto 10px">' + esc(s.name[0]) + "</div>" +
      '<div style="font-size:16.5px;font-weight:800">' + esc(s.name) + "</div>" +
      '<div style="font-size:12px;color:var(--t3);margin:4px 0 10px">' + esc(s.school) + " · " + esc(s.major || "") + "</div>" +
      '<span class="auth-tag ok">学生已授权查看</span>' +
    "</div>" +
    '<div class="form-card" style="margin-top:12px">' + block(comp, "🏆 比赛") + block(exam, "📄 考试") + "</div>" +
    '<div style="font-size:11px;color:var(--t3);margin-top:10px;text-align:center">该成绩单由学生自主授权开放，仅用于教学指导参考</div>');
}

function openAllSignups() {
  const rows = state.myNotices.filter(n => n.signup);
  currentCtx = { page: "allSignups" };
  document.getElementById("overlay-root").innerHTML = overlayHtml("报名名单汇总",
    rows.length
      ? rows.map(n => {
        const list = state.signups[n.id] || [];
        return '<div class="friend-item" onclick="openSignupList(\'' + n.id + '\')"><div class="avatar" style="background:#7C5CFF;font-size:13px">' + esc(n.typeCat === "考试类" ? "试" : "赛") + "</div>" +
          '<div style="flex:1"><div class="friend-name">' + esc(n.title.slice(0, 24)) + '</div><div class="friend-sub">' + list.length + " 人报名 · " + esc(n.typeCat) + "</div></div>" +
          '<span class="post-time">查看名单</span></div>';
      }).join("")
      : emptyBox("还没有报名登记。发布通知时勾选「开启报名登记」，学生即可一键报名、自动汇总名单。"));
}
function mi(fn, cls, icon, name, note) {
  return '<div class="menu-item" onclick="' + fn + '"><span class="mi-icon ' + cls + '">' + icon + "</span>" + name +
    (note ? '<span class="menu-note">' + note + "</span>" : "") + '<span class="menu-arrow">' + I.arrowR + "</span></div>";
}
function aboutApp() {
  modal('<h3>赛证通 v2.0</h3><p style="font-size:12.5px;color:var(--t2);line-height:1.8">面向大学生的竞赛与证书考试查询 APP。<br>功能演示版：赛事数据基于真实赛程规律编排；<br>AI 助手「小赛」为本地规则引擎演示，可无缝接入大模型 API。<br><br>中国电信「电信杯」校园智能体应用创新大赛 · 参赛作品</p>' +
    '<div class="modal-actions"><button class="m-ok" onclick="closeModal()">知道了</button></div>');
}

/* ================= 个人主页（学生用户 / 教师用户通用，从头像/老师入口进入） ================= */
function openProfile(uid) {
  const u = (typeof uid === "object" && uid !== null) ? uid : DB.users.find(x => x.id === uid);
  if (!u) { toast("该用户暂无主页（演示）"); return; }
  const isT = !!u.teacher;
  const isFriend = state.friends.includes(u.id);
  const myPosts = allPosts().filter(p => p.author.uid === u.id);
  currentCtx = { page: "userProfile", uid: u.id };
  document.getElementById("overlay-root").innerHTML = overlayHtml(isT ? "教师主页" : "个人主页",
    '<div class="me-head" style="' + (isT ? "background:linear-gradient(135deg,#7C5CFF,#9B7DFF)" : "") + '">' +
    avatarHtml(u, 58) +
    '<div style="flex:1"><div class="me-nick">' + esc(u.name) + (isT ? ' <span class="role-tag role-teacher">🎓 教师认证</span>' : "") +
    (u.online !== undefined ? ' <span class="online-flag ' + (u.online ? "" : "off") + '" style="display:inline-block;vertical-align:middle"></span>' : "") + "</div>" +
    '<div class="me-tags">' +
    (u.school ? '<span class="me-tag">🏫 ' + esc(u.school) + "</span>" : "") +
    (isT
      ? '<span class="me-tag">💼 ' + esc(u.title || "教师") + (u.dept ? " · " + esc(u.dept) : "") + "</span>"
      : '<span class="me-tag">📚 ' + esc(u.major) + "</span>") +
    (u.account ? '<span class="me-tag">🆔 ' + esc(u.account) + "</span>" : "") +
    "</div>" +
    ((u.dirs || []).length ? '<div class="me-tags" style="margin-top:7px">' + u.dirs.map(d => '<span class="me-tag">🎯 ' + esc(d) + "</span>").join("") + "</div>" : "") +
    "</div></div>" +
    '<div class="card"><div class="card-title">' + (isT ? "🎓 教师简介" : "👤 个人简介") + "</div>" +
    '<div style="font-size:12.5px;color:var(--t2);line-height:1.8">' + esc(u.intro || (u.name + "，来自" + (u.school || "校园") + (isT ? "，欢迎就赛事问题咨询。" : "，欢迎一起组队交流。"))) + "</div>" +
    (u.phone ? '<div class="teacher-box" style="margin-top:10px"><span class="t-label">联系方式</span><span class="t-info">' + esc(u.phone) + "</span></div>" : "") +
    "</div>" +
    (isT && teacherRecsOf(u).length
      ? '<div class="menu-label">🌟 推荐赛事（' + teacherRecsOf(u).length + "）</div>" +
        teacherRecsOf(u).map(r => {
          const ev = DB.events.find(e => e.id === r.evId);
          if (!ev) return "";
          const st = evStatus(ev);
          return '<div class="guide-item" onclick="openDetail(\'' + ev.id + '\')">' +
            '<div style="flex:1"><div class="my-ev-name">' + esc(ev.name) + "</div>" +
            '<div class="my-ev-time">💬 ' + esc(r.note) + "</div>" +
            '<div class="my-ev-time">' + st.text + " · " + (ev.kind === "comp" ? "比赛 " : "考试 ") + ev.eventDate + "</div></div>" +
            I.arrowR.replace("currentColor", "var(--c-primary)") + "</div>";
        }).join("")
      : "") +
    (myPosts.length ? '<div class="menu-label">📝 发布内容（' + myPosts.length + "）</div>" + myPosts.slice(0, 4).map(p => postCard(p)).join("") : "") +
    '<div style="height:80px"></div>',
    '<div class="detail-footer">' +
    (u.vt
      ? '<button class="btn-ghost" onclick="toast(\'' + (u.phone ? "电话：" + u.phone : "通知内未附电话") + '\')">📞 电话咨询</button>' +
        '<button class="btn-main" onclick="toast(\'' + (u.email ? "邮箱：" + u.email : "可通过校内通知联系") + '\')">✉️ 邮件联系</button>'
      : (isFriend ? "" : '<button class="btn-ghost" onclick="addUserFriend(\'' + u.id + '\')">＋ 加好友</button>') +
        '<button class="btn-main" onclick="closeOverlay();openChat(\'' + u.id + '\')">💬 私信' + (isT ? "咨询" : "") + "</button>") +
    "</div>");
}

/* ================= 教师主页（自己查看） ================= */
function openTeacherHome() {
  const u = state.user;
  const guides = state.guideList.map(g => DB.events.find(e => e.id === g.id)).filter(Boolean);
  currentCtx = { page: "teacherHome" };
  document.getElementById("overlay-root").innerHTML = overlayHtml("教师主页",
    '<div class="me-head" style="background:linear-gradient(135deg,#7C5CFF,#9B7DFF)">' +
    avatarHtml(u, 58) +
    '<div style="flex:1"><div class="me-nick">' + esc(u.nick) + ' <span class="role-tag role-teacher">🎓 教师认证</span></div>' +
    '<div class="me-tags"><span class="me-tag">' + esc(u.title || "教师") + "</span>" +
    (u.dept ? '<span class="me-tag">' + esc(u.dept) + "</span>" : "") +
    (u.school ? '<span class="me-tag">' + esc(u.school) + "</span>" : "") + "</div></div></div>" +
    '<div class="card"><div class="card-title">🎯 擅长指导方向</div>' +
    ((u.guideDirs || []).length ? '<div class="tag-edit-list">' + u.guideDirs.map(d => '<span class="tag-pill">' + esc(d) + "</span>").join("") + "</div>" : '<div style="font-size:12px;color:var(--t3)">编辑资料可添加指导方向</div>') +
    (u.phoneT ? '<div class="teacher-box" style="margin-top:10px"><span class="t-label">联系方式</span><span class="t-info">' + esc(u.phoneT) + "</span></div>" : "") +
    "</div>" +
    '<div class="card"><div class="card-title">🏆 我指导的赛事（' + guides.length + "）" +
    '<span class="more" onclick="openGuideList()">管理 ' + I.arrowR + "</span></div>" +
    (guides.length ? guides.map(ev => {
      const st = evStatus(ev);
      return '<div class="guide-item" onclick="openDetail(\'' + ev.id + '\')"><div style="flex:1"><div class="my-ev-name">' + esc(ev.name) + "</div>" +
        '<div class="my-ev-time">' + st.text + " · " + (ev.kind === "comp" ? "比赛 " : "考试 ") + ev.eventDate + "</div></div>" + I.arrowR.replace("currentColor", "var(--c-primary)") + "</div>";
    }).join("") : '<div style="font-size:12px;color:var(--t3)">暂未收录指导赛事，去「我指导的赛事」添加</div>') +
    "</div>" +
    '<div class="card"><div class="card-title">🌟 我推荐的赛事（' + teacherRecs().length + "）" +
    '<span class="more" onclick="openMyRecs()">管理 ' + I.arrowR + "</span></div>" +
    (teacherRecs().length
      ? teacherRecs().map(r => {
        const ev = DB.events.find(e => e.id === r.evId);
        if (!ev) return "";
        return '<div class="guide-item" onclick="openDetail(\'' + ev.id + '\')"><div style="flex:1"><div class="my-ev-name">' + esc(ev.name) + "</div>" +
          '<div class="my-ev-time">💬 ' + esc(r.note) + "</div></div>" +
          '<button class="del-btn" onclick="event.stopPropagation();removeRec(\'' + ev.id + '\')">✕</button></div>';
      }).join("")
      : '<div style="font-size:12px;color:var(--t3)">还没有推荐赛事，去赛事详情页点「🌟 推荐」并写下评语，学生搜索时即可看到</div>') +
    "</div>" +
    '<div class="card"><div class="card-title">💬 学生咨询</div>' +
    '<div style="font-size:12.5px;color:var(--t2);line-height:1.8">学生可在校内通知、组队帖中点击你的名字发起咨询。<br>当前收到咨询：<b style="color:var(--c-primary)">' + Math.max(state.msgs.filter(m => m.kind === "sys").length, 2) + "</b> 条（演示数据）</div>" +
    '<button class="btn-main" style="width:100%;margin-top:12px" onclick="closeOverlay();openChatList()">查看私信会话</button></div>');
}

/* ================= 教师指导赛事 ================= */
function openGuideList() {
  currentCtx = { page: "guideList" };
  const guides = state.guideList.map(g => ({ g, ev: DB.events.find(e => e.id === g.id) })).filter(x => x.ev);
  document.getElementById("overlay-root").innerHTML = overlayHtml("我指导的赛事",
    '<div style="font-size:12px;color:var(--t2);margin:0 2px 10px;line-height:1.7">收录你负责指导的比赛 / 考试，<b>系统自动同步时间节点</b>，临近报名、提交、比赛时间会推送提醒；点击条目直达详情（含往届数据与作品参考）。</div>' +
    '<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn-ghost" style="padding:8px 16px;font-size:12.5px" onclick="openGuidePick()">＋ 添加指导赛事</button></div>' +
    '<div id="guide-list"></div>');
  renderGuideList();
}
function renderGuideList() {
  const guides = state.guideList.map(g => ({ g, ev: DB.events.find(e => e.id === g.id) })).filter(x => x.ev);
  const box = document.getElementById("guide-list");
  if (!box) return;
  box.innerHTML = guides.length
    ? guides.map(({ g, ev }) => {
      const st = evStatus(ev);
      return '<div class="guide-item" onclick="openDetail(\'' + ev.id + '\')">' +
        '<div style="flex:1"><div class="my-ev-name">' + esc(ev.name) + "</div>" +
        '<div class="my-ev-time">' + st.text + " · " + (ev.kind === "comp" ? "比赛 " : "考试 ") + ev.eventDate +
        (st.sign ? " · 报名截止 " + ev.signEnd : "") + "</div>" +
        (st.code === "sign" && st.days <= 7 ? '<span class="remind-flag">🔔 剩' + st.days + "天</span>" : "") +
        "</div>" +
        '<button class="del-btn" onclick="event.stopPropagation();removeGuide(\'' + ev.id + '\')">✕</button>' +
        "</div>";
    }).join("")
    : emptyBox("还没有收录指导赛事，添加后自动跟踪时间节点", "openGuidePick()", "立即添加");
}
function openGuidePick() {
  document.getElementById("overlay-root").innerHTML = overlayHtml("选择指导的赛事",
    '<div class="search-page-bar"><span style="color:var(--t3)">' + I.search + "</span>" +
    '<input id="gp-kw" placeholder="输入赛事名称筛选" oninput="renderGuidePick(this.value)"></div>' +
    '<div id="gp-list"></div>');
  renderGuidePick("");
}
function renderGuidePick(kw) {
  const list = DB.events.filter(e => !state.guideList.some(g => g.id === e.id) && (!kw || (e.name + e.short).includes(kw.trim())));
  document.getElementById("gp-list").innerHTML = list.length
    ? list.map(e => '<div class="pick-item" onclick="addGuide(\'' + e.id + '\')"><span style="flex:1">' + esc(e.name) + "<small>" + esc(e.level) + " · " + esc(e.category) + "</small></span>" + '<button class="notice-view-btn">添加</button></div>').join("")
    : emptyBox("没有更多可添加的赛事");
}
function addGuide(id) {
  state.guideList.push({ id, note: "" });
  save(); checkReminders();
  toast("已添加到指导列表，时间节点将自动提醒");
  openGuideList();
}
function removeGuide(id) {
  state.guideList = state.guideList.filter(g => g.id !== id);
  save(); renderGuideList();
}

/* ================= 教师推荐赛事（推荐 + 评语，学生可见） ================= */
/* 教师可见：自己发布的推荐 */
function teacherRecs() {
  return state.recs.filter(r => r.byMe || r.teacher === state.user.nick);
}
/* 学生可见：本校教师推荐 + 已添加的教师好友推荐（含系统预置） */
function studentRecs() {
  const u = state.user;
  const myTeachers = DB.users.filter(t => t.teacher &&
    (t.school === u.school || state.friends.includes(t.id)));
  const presets = (DB.initRecs || []).filter(r => myTeachers.some(t => t.id === r.teacherId) || r.school === u.school);
  const mine = state.recs.filter(r => r.school === u.school);
  return presets.concat(mine);
}
function recForEvent(evId) {
  const u = state.user;
  if (!u || !u.school) return null;
  const myTeachers = DB.users.filter(x => x.teacher && x.school === u.school);
  // 本校教师新发布的推荐优先（含教师本人/好友教师），其次预置推荐
  const mine = state.recs.find(r => r.evId === evId && r.school === u.school);
  if (mine) return mine;
  const presets = (DB.initRecs || []).find(r => r.evId === evId && myTeachers.some(t => t.id === r.teacherId));
  return presets || null;
}
/* 教师：在详情页点击「推荐」，填写评语 */
function openRecommend(evId) {
  const ev = DB.events.find(e => e.id === evId);
  if (!ev) return;
  const has = state.recs.find(r => r.evId === evId);
  modal('<h3>🌟 推荐「' + esc(ev.short) + '」</h3>' +
    '<p style="font-size:12px;color:var(--t3);margin-bottom:8px">填写推荐评语，学生搜索比赛时可以看到你的推荐（本校学生可见）。</p>' +
    '<textarea class="form-textarea" id="rec-note" style="height:90px" placeholder="例如：推荐计算机专业大二以上同学报名，往届我校拿过省一等奖…">' + esc(has ? has.note : "") + "</textarea>" +
    '<div class="modal-actions">' +
    (has ? '<button class="m-cancel" onclick="removeRec(\'' + evId + '\')">取消推荐</button>' : "") +
    '<button class="m-ok" onclick="submitRecommend(\'' + evId + '\')">发布推荐</button></div>');
}
function submitRecommend(evId) {
  const ev = DB.events.find(e => e.id === evId);
  const note = (document.getElementById("rec-note") || {}).value || "";
  if (!note.trim()) { toast("写一句推荐评语吧"); return; }
  const ex = state.recs.find(r => r.evId === evId);
  if (ex) ex.note = note.trim();
  else state.recs.push({ evId, teacher: state.user.nick, school: state.user.school, note: note.trim(), time: nowTime().slice(0, 5) });
  save(); closeModal();
  toast("已推荐「" + ev.short + "」，学生可在搜索中看到你的推荐与评语");
}
function removeRecommend(evId) {
  state.recs = state.recs.filter(r => r.evId !== evId);
  save(); closeModal();
  toast("已取消推荐");
}
function removeRec(evId) { removeRecommend(evId); }
/* 教师：查看/管理我发布的推荐 */
function openMyRecs() {
  currentCtx = { page: "myRecs" };
  const list = teacherRecs();
  document.getElementById("overlay-root").innerHTML = overlayHtml("我推荐的赛事",
    '<div style="font-size:12px;color:var(--t2);margin:0 2px 10px;line-height:1.7">你推荐的赛事会展示给<b>本校学生</b>，学生搜索比赛时可见「🌟 教师推荐」徽标与你的评语。点击条目可重新编辑评语。</div>' +
    '<div id="myrec-list"></div>');
  document.getElementById("myrec-list").innerHTML = list.length
    ? list.map(r => {
      const ev = DB.events.find(e => e.id === r.evId);
      if (!ev) return "";
      const st = evStatus(ev);
      return '<div class="guide-item" onclick="openRecommend(\'' + ev.id + '\')">' +
        '<div style="flex:1"><div class="my-ev-name">' + esc(ev.name) + "</div>" +
        '<div class="my-ev-time">💬 ' + esc(r.note) + "</div>" +
        '<div class="my-ev-time">' + st.text + " · 推荐于 " + esc(r.time) + "</div></div>" +
        '<button class="del-btn" onclick="event.stopPropagation();removeRec(\'' + ev.id + '\')">✕</button></div>';
    }).join("")
    : emptyBox("还没有推荐赛事，去赛事详情页点「🌟 推荐」写下评语吧", "closeOverlay()", "返回");
}
/* 学生：赛事卡片/详情的教师推荐徽标与评语 */
function recBadge(evId) {
  const r = recForEvent(evId);
  if (!r) return "";
  return '<span class="rec-flag" onclick="event.stopPropagation();showRecNote(\'' + evId + '\')">🌟 教师推荐</span>';
}
/* 某教师的全部推荐（预置 + 本机教师发布），用于教师主页展示 */
function teacherRecsOf(u) {
  const presets = (DB.initRecs || []).filter(r => r.teacherId === u.id || (!r.teacherId && r.teacher === u.name && (!u.school || !r.school || r.school === u.school)));
  const mine = state.recs.filter(r => r.teacher === u.name);
  return presets.concat(mine);
}
function showRecNote(evId) {
  const r = recForEvent(evId);
  if (!r) return;
  modal('<h3>🌟 教师推荐</h3>' +
    '<div class="rec-note-card"><div class="rec-teacher">🎓 ' + esc(r.teacher) + "</div>" +
    '<div class="rec-note-txt">' + esc(r.note) + "</div>" +
    '<div class="rec-time">' + esc(r.time || "") + "</div></div>" +
    '<div class="modal-actions"><button class="m-ok" onclick="closeModal()">知道了</button></div>');
}

/* ================= 资料编辑 ================= */
function openProfileEdit() {
  const u = state.user;
  const isTeacher = u.role === "teacher";
  document.getElementById("overlay-root").innerHTML = overlayHtml("编辑资料",
    '<div class="form-card">' +
    '<div class="form-row"><label class="form-label">头像</label>' +
    '<div style="display:flex;align-items:center;gap:14px">' +
    avatarHtml(u, 56) +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;flex:1">' +
    '<button class="mini-btn mini-primary" onclick="upAvatar()">📷 上传照片</button>' +
    '<button class="mini-btn mini-ghost" onclick="resetAvatar()">恢复默认</button>' +
    "</div></div>" +
    '<div style="display:flex;gap:7px;margin-top:10px">' + AVATAR_PRESETS.map((a, i) =>
      '<button class="avatar" style="width:36px;height:36px;font-size:17px;background:' + a.c + ';cursor:pointer;border:2px solid ' + (u.avatar === a.c && u.avatarEmoji === a.e ? "var(--c-primary)" : "transparent") + '" onclick="pickPresetAvatar(' + i + ')">' + a.e + "</button>").join("") + "</div></div>" +
    '<div class="form-row"><label class="form-label">姓名</label><input class="form-input" id="pe-nick" value="' + esc(u.nick) + '"></div>' +
    '<div class="form-row"><label class="form-label">学校</label><input class="form-input" id="pe-school" value="' + esc(u.school) + '" placeholder="点击下方选择">' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' + DB.schools.slice(0, 8).map(s => '<button class="tag-pill" style="cursor:pointer" onclick="document.getElementById(\'pe-school\').value=\'' + s.name + '\'">' + s.short + "</button>").join("") + '<button class="tag-add" onclick="openSchoolPicker()">更多学校…</button></div></div>' +
    (isTeacher
      ? '<div class="form-row"><label class="form-label">院系 / 部门</label><input class="form-input" id="pe-dept" value="' + esc(u.dept || "") + '"></div>' +
        '<div class="form-row"><label class="form-label">职称</label><select class="form-select" id="pe-title">' + ["助教", "讲师", "副教授", "教授"].map(t => '<option ' + (u.title === t ? "selected" : "") + ">" + t + "</option>").join("") + "</select></div>" +
        '<div class="form-row"><label class="form-label">联系电话（通知中展示）</label><input class="form-input" id="pe-phone" value="' + esc(u.phoneT || "") + '"></div>' +
        '<div class="form-row"><label class="form-label">擅长指导方向（点击移除）</label><div class="tag-edit-list" id="pe-dirs">' +
        (u.guideDirs || []).map(d => '<span class="tag-pill">' + esc(d) + '<button onclick="peDelTag(this,\'guideDirs\',\'' + esc(d) + '\')">×</button></span>').join("") +
        '<button class="tag-add" onclick="peAddTag(\'guideDirs\')">＋ 添加方向</button></div></div>'
      : '<div class="form-row"><label class="form-label">专业方向</label><select class="form-select" id="pe-major">' +
        DB.majorList.filter(m => m !== "不限专业").map(m => '<option ' + (u.major === m ? "selected" : "") + ">" + m + "</option>").join("") + "</select></div>" +
        '<div class="form-row"><label class="form-label">擅长技能 / 方向（点击移除）</label><div class="tag-edit-list" id="pe-skills">' +
        (u.skills || []).map(s => '<span class="tag-pill">' + esc(s) + '<button onclick="peDelTag(this,\'skills\',\'' + esc(s) + '\')">×</button></span>').join("") +
        '<button class="tag-add" onclick="peAddTag(\'skills\')">＋ 添加技能</button></div></div>') +
    '<div class="form-row"><label class="form-label">个人简介</label><textarea class="form-textarea" id="pe-bio">' + esc(u.bio || "") + "</textarea></div>" +
    '<button class="btn-main" style="width:100%" onclick="saveProfile()">保存</button></div>');
}
function peDelTag(btn, field, v) {
  state.user[field] = state.user[field].filter(x => x !== v);
  save(); btn.parentElement.remove();
}
function peAddTag(field) {
  const s = prompt(field === "skills" ? "输入技能，如：Web开发 / 演讲" : "输入指导方向，如：算法竞赛 / 智能车");
  if (s && s.trim()) {
    state.user[field].push(s.trim()); save();
    const span = document.createElement("span");
    span.className = "tag-pill";
    span.innerHTML = esc(s.trim()) + '<button onclick="peDelTag(this,\'' + field + '\',\'' + esc(s.trim()) + '\')">×</button>';
    document.getElementById(field === "skills" ? "pe-skills" : "pe-dirs").insertBefore(span, document.querySelector("#" + (field === "skills" ? "pe-skills" : "pe-dirs") + " .tag-add"));
  }
}
function saveProfile() {
  const u = state.user;
  u.nick = document.getElementById("pe-nick").value.trim() || u.nick;
  u.school = document.getElementById("pe-school").value.trim();
  if (u.role === "teacher") {
    u.dept = document.getElementById("pe-dept").value.trim();
    u.title = document.getElementById("pe-title").value;
    u.phoneT = document.getElementById("pe-phone").value.trim();
    u.bio = u.title + " · " + (u.dept || "");
  } else {
    const sel = document.getElementById("pe-major");
    u.major = sel.value;
    u.bio = "在校生 · " + u.major;
  }
  const bio = document.getElementById("pe-bio");
  if (bio) u.bio = bio.value.trim() || u.bio;
  save(); closeOverlay(); renderMe();
  toast("资料已更新" + (u.role === "student" ? "，小赛会按新标签为你推荐" : ""));
}

/* 头像操作 */
const AVATAR_PRESETS = [
  { e: "🦊", c: "#F59E0B" }, { e: "🐱", c: "#2B5CFF" }, { e: "🐼", c: "#34A853" },
  { e: "🐰", c: "#7C5CFF" }, { e: "🦁", c: "#FF7A59" }, { e: "🐨", c: "#00A8A0" }
];
function upAvatar() {
  pickImage(240, data => {
    state.user.avatarUrl = data;
    state.user.avatarEmoji = "";
    save(); toast("头像已更新");
    openProfileEdit();
  });
}
function resetAvatar() {
  state.user.avatarUrl = "";
  state.user.avatarEmoji = "";
  save(); toast("已恢复默认头像");
  openProfileEdit();
}
function pickPresetAvatar(i) {
  const a = AVATAR_PRESETS[i];
  state.user.avatarEmoji = a.e;
  state.user.avatar = a.c;
  state.user.avatarUrl = "";
  save(); toast("头像已更换");
  openProfileEdit();
}

/* ================= 好友 / 私信 / 群聊 ================= */
function openFriends() {
  currentCtx = { page: "friends" };
  document.getElementById("overlay-root").innerHTML = overlayHtml("我的好友",
    '<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn-ghost" style="padding:8px 16px;font-size:12.5px" onclick="addFriend()">＋ 添加好友</button></div>' +
    state.friends.map(fid => {
      const f = DB.users.find(x => x.id === fid);
      if (!f) return "";
      return '<div class="friend-item"><div class="avatar-click" style="cursor:pointer" onclick="openProfile(\'' + f.id + '\')">' + avatarHtml(f, 38) + '</div>' +
        '<div style="flex:1"><div class="friend-name">' + esc(f.name) + (f.teacher ? ' <span class="teacher-flag">🎓</span>' : "") + ' <span class="online-flag ' + (f.online ? "" : "off") + '"></span></div>' +
        '<div class="friend-sub">' + esc(f.school) + " · " + esc(f.major) + " · " + esc(f.account) + "</div></div>" +
        '<button class="btn-ghost" style="padding:8px 14px" onclick="openChat(\'' + f.id + '\')">私信</button></div>';
    }).join(""));
}
function addFriend() {
  const n = prompt("输入对方昵称 / 手机号 / 账号发送申请：\n（试试：雪梨 / 138****1234 / SZT-F6139）");
  if (!n) return;
  const kw = n.trim();
  const known = DB.users.find(u =>
    (u.name === kw || u.phone === kw || u.account === kw) && !state.friends.includes(u.id));
  if (known) {
    state.friends.push(known.id); save();
    toast(known.name + " 已通过你的好友申请");
    openFriends();
  } else {
    toast("已向「" + kw + "」发送好友申请（演示）");
  }
}
/* ================= 微信式聊天输入栏（私信/群聊共用） ================= */
let chatVoiceMode = false;
let wxPanel = ""; /* "" | "emoji" | "plus" */
const WX_EMOJIS = ["😀", "😄", "😂", "🥹", "😍", "😘", "😎", "🤔", "😅", "😆", "😉", "🙃", "🥳", "😴", "😭", "🤝", "👍", "👏", "🙏", "💪", "🔥", "✅", "⚡", "🎉", "❤️", "🌹", "💯", "🏆", "📌", "🎯", "🚀", "☕"];
/* 拍摄演示图库（内置现场图随机一张） */
const DEMO_SHOTS = ["img/scene-answer.jpg", "img/scene-expo.jpg", "img/scene-lab.jpg", "img/scene-robo.jpg", "img/works-cert.jpg", "img/works-model.jpg", "img/works-team.jpg"];
/* 聊天页骨架：顶栏 + 消息区 + 微信式输入栏（私信/群聊共用） */
function chatOverlayHTML(title, right, bodyId, scene) {
  return '<div class="overlay">' +
    '<header id="topbar"><div class="tb-left"><button class="tb-back" onclick="closeOverlay()">‹ 返回</button></div>' +
    '<div class="tb-title">' + title + '</div>' +
    '<div class="tb-right"><span style="font-size:11px;opacity:.85">' + right + "</span></div></header>" +
    '<div class="chat-body" id="' + bodyId + '"></div>' +
    wxBarHTML(scene) + "</div>";
}
function wxBarHTML(scene) {
  const isChat = scene === "chat";
  const plusItems = isChat
    ? [["album", "📷", "相册"], ["shoot", "🎬", "拍摄"], ["vcall", "📹", "视频通话"], ["call", "📞", "语音通话"],
       ["share", "🏆", "分享赛事"], ["invite", "👥", "邀请好友"], ["loc", "📍", "位置"], ["redp", "🧧", "红包"]]
    : [["album", "📷", "相册"], ["shoot", "🎬", "拍摄"], ["share", "🏆", "分享赛事"], ["notice", "📢", "群公告"],
       ["invite", "👥", "邀请好友"], ["loc", "📍", "位置"], ["redp", "🧧", "红包"], ["vinput", "🎤", "语音输入"]];
  const inpId = isChat ? "chat-input" : "group-input";
  const sendFn = isChat ? "sendChat()" : "sendGroup()";
  return '<div class="wx-bar' + (chatVoiceMode ? " voice-mode" : "") + '" id="wx-bar">' +
    '<button class="wx-ic" onclick="toggleVoiceMode()">' + (chatVoiceMode ? "⌨️" : "🎤") + "</button>" +
    '<div class="wx-input-wrap">' +
      '<input id="' + inpId + '" placeholder="说点什么…" oninput="wxSyncSend(this)" onkeydown="if(event.key===\'Enter\')' + sendFn + '">' +
      '<button class="wx-send" id="wx-send" onclick="' + sendFn + '">发送</button>' +
      '<button class="wx-hold" onmousedown="chatHoldStart()" ontouchstart="chatHoldStart()" onmouseup="chatHoldEnd()" ontouchend="chatHoldEnd()">按住 说话</button>' +
    "</div>" +
    '<button class="wx-ic" onclick="toggleEmojiPanel()">😊</button>' +
    '<button class="wx-ic" onclick="togglePlusPanel()">➕</button>' +
    '<div class="wx-panel" id="wx-emoji"><div class="wx-panel-tip">常用表情 · 点击插入</div>' +
      '<div class="wx-emoji-grid">' + WX_EMOJIS.map(e => '<button data-e="' + e + '" onclick="insertEmoji(this)">' + e + "</button>").join("") + "</div></div>" +
    '<div class="wx-panel" id="wx-plus"><div class="wx-plus-grid">' +
      plusItems.map(p => '<div class="wx-plus-item" onclick="chatPanelAction(\'' + p[0] + '\')"><i>' + p[1] + "</i><span>" + p[2] + "</span></div>").join("") +
      "</div></div></div>";
}
/* 语音模式切换（左键 🎤 ↔ ⌨️，输入框变「按住说话」） */
function toggleVoiceMode() {
  chatVoiceMode = !chatVoiceMode; closeWxPanels();
  const bar = document.getElementById("wx-bar");
  if (!bar) return;
  bar.classList.toggle("voice-mode", chatVoiceMode);
  const ic = bar.querySelector(".wx-ic");
  if (ic) ic.innerHTML = chatVoiceMode ? "⌨️" : "🎤";
}
function chatHoldStart() {
  const h = document.querySelector("#wx-bar .wx-hold");
  if (h) { h.classList.add("on"); h.textContent = "松开 发送"; }
}
function chatHoldEnd() {
  const h = document.querySelector("#wx-bar .wx-hold");
  if (h && h.classList.contains("on")) {
    h.classList.remove("on"); h.textContent = "按住 说话";
    if (currentCtx.page === "group") sendGroupVoice(); else sendChatVoice();
  }
}
/* 表情 / 加号面板开合 */
function setWxPanel(p) {
  wxPanel = wxPanel === p ? "" : p;
  const e = document.getElementById("wx-emoji"), pl = document.getElementById("wx-plus"), bar = document.getElementById("wx-bar");
  if (e) e.classList.toggle("show", wxPanel === "emoji");
  if (pl) pl.classList.toggle("show", wxPanel === "plus");
  if (bar) bar.classList.toggle("panel-open", !!wxPanel);
}
function toggleEmojiPanel() { setWxPanel("emoji"); }
function togglePlusPanel() { setWxPanel("plus"); }
function closeWxPanels() {
  if (!wxPanel) return;
  wxPanel = "";
  const e = document.getElementById("wx-emoji"), pl = document.getElementById("wx-plus"), bar = document.getElementById("wx-bar");
  if (e) e.classList.remove("show");
  if (pl) pl.classList.remove("show");
  if (bar) bar.classList.remove("panel-open");
}
function insertEmoji(btn) {
  const inp = document.getElementById(currentCtx.page === "group" ? "group-input" : "chat-input");
  if (!inp) return;
  inp.value += btn.dataset.e; wxSyncSend(inp); inp.focus();
}
function wxSyncSend(inp) {
  const b = document.getElementById("wx-send");
  if (b) b.classList.toggle("show", inp.value.trim().length > 0);
}
/* 加号九宫格动作（私信/群聊自动分发） */
function chatPanelAction(key) {
  const isGroup = currentCtx.page === "group";
  if (key === "album") { if (isGroup) sendGroupImg(false); else sendChatImg(false); }
  else if (key === "shoot") { if (isGroup) sendGroupImg(true); else sendChatImg(true); }
  else if (key === "call") { startVoiceCall("voice"); }
  else if (key === "vcall") { startVoiceCall("video"); }
  else if (key === "share") { chatShareEvent(); }
  else if (key === "vinput") { closeWxPanels(); if (!chatVoiceMode) toggleVoiceMode(); }
  else if (key === "notice") { closeWxPanels(); toast("群公告功能演示：训练安排以老师通知为准"); }
  else if (key === "invite") { closeWxPanels(); toast("邀请链接已复制，发给同学就能进群（演示）"); }
  else if (key === "loc") { closeWxPanels(); toast("演示环境暂不支持发送位置"); }
  else if (key === "redp") { closeWxPanels(); toast("先专心冲比赛，红包赛后再发 😄"); }
}
/* 聊天内分享赛事：选择赛事 → 发送卡片（私信发给对方 / 群聊发到本群） */
function chatShareEvent() {
  const list = DB.events.map(ev => ({ ev: ev, st: evStatus(ev) }))
    .sort((a, b) => (a.st.code === "sign" ? 0 : 1) - (b.st.code === "sign" ? 0 : 1)).slice(0, 14);
  modal('<h3>🏆 分享赛事</h3>' +
    '<div style="font-size:11px;color:var(--t3);margin-bottom:10px">正在报名的赛事排在前面，点击即发送</div>' +
    '<div style="max-height:320px;overflow-y:auto;margin:0 -4px">' +
    list.map(it => '<div class="se-item" onclick="pickShareEvent(\'' + it.ev.id + '\')">' +
      '<div style="font-size:12.5px;font-weight:700;line-height:1.5">' + esc(it.ev.short || it.ev.name) + "</div>" +
      '<div style="font-size:10.5px;color:var(--t3);margin-top:3px">' + it.ev.level + " · " + it.st.text + "</div></div>").join("") +
    "</div>");
}
function pickShareEvent(evId) {
  closeModal();
  const ev = DB.events.find(e => e.id === evId);
  if (!ev) return;
  const st = evStatus(ev);
  const msg = { from: "me", type: "event", evId: evId, time: nowTime(), text: (currentCtx.page === "group" ? "分享到本群：" : "分享给你：") + ev.short + "（" + ev.level + " · " + st.text + "）" };
  if (currentCtx.page === "group") {
    const g = allGroups().find(x => x.id === currentCtx.groupId);
    if (!g) return;
    g.msgs.push(msg);
    if (state.myGroups.some(x => x.id === g.id)) save();
    renderGroupBody();
    setTimeout(() => {
      g.msgs.push({ from: ["小熊猫", "Celine", "老K", "码上跑"][Math.floor(Math.random() * 4)], text: "这个比赛不错，一起报？", time: nowTime() });
      renderGroupBody();
    }, 1100);
  } else {
    const pid = currentCtx.peerId;
    state.chats[pid].push(msg);
    save(); renderChat();
    setTimeout(() => {
      state.chats[pid].push({ from: "other", text: "看了，正好我也想参加！", time: nowTime() });
      save(); renderChat();
    }, 1100);
  }
  closeWxPanels();
}
/* 统一消息气泡渲染（文本/图片/语音/通话记录/赛事卡片） */
function bubbleHTML(m) {
  if (m.type === "img")
    return '<div class="bubble" style="padding:4px"><img src="' + m.data + '" style="max-width:190px;max-height:220px;border-radius:10px;display:block;cursor:zoom-in" onclick="openViewer([\'' + m.data + '\'],0,\'图片消息\')" alt="图片"></div>';
  if (m.type === "event")
    return '<div class="bubble share-bubble" onclick="closeOverlay();openDetail(\'' + m.evId + '\')"><div class="sb-tag">🏆 赛事分享</div>' +
      '<div class="sb-name">' + esc((DB.events.find(e => e.id === m.evId) || {}).short || "赛事") + "</div>" +
      '<div class="sb-meta">' + esc(m.text) + "</div>" +
      '<div class="sb-btn">查看详情 →</div></div>';
  if (m.type === "voice")
    return '<div class="bubble voice-bubble" onclick="playVoice(this)"><span class="voice-wave">' +
      '<i style="animation-delay:0s"></i><i style="animation-delay:.12s"></i><i style="animation-delay:.24s"></i><i style="animation-delay:.36s"></i>' +
      '</span><span class="voice-dur">' + (m.dur || 3) + '"</span></div>';
  if (m.type === "call")
    return '<div class="bubble call-bubble" onclick="callRecordPopup()"><span class="call-ico">' + (/^视频/.test(m.text) ? "📹" : "📞") + '</span><span class="call-txt">' + esc(m.text) + "</span><span class='call-time'>" + esc(m.time) + "</span></div>";
  return '<div class="bubble">' + esc(m.text) + "</div>";
}
/* 群聊：语音消息 */
function sendGroupVoice() {
  const g = allGroups().find(x => x.id === currentCtx.groupId);
  if (!g) return;
  const dur = 3 + Math.floor(Math.random() * 9);
  g.msgs.push({ from: "me", type: "voice", text: "语音消息", dur: dur, time: nowTime() });
  if (state.myGroups.some(x => x.id === g.id)) save();
  renderGroupBody();
  setTimeout(() => {
    g.msgs.push({ from: ["小熊猫", "Celine", "老K", "码上跑"][Math.floor(Math.random() * 4)], text: "收到你的语音啦，正解！", time: nowTime() });
    renderGroupBody();
  }, 1100);
}
/* 群聊：发图片（相册选图 / 模拟拍摄） */
function sendGroupImg(shoot) {
  const g = allGroups().find(x => x.id === currentCtx.groupId);
  if (!g) return;
  closeWxPanels();
  const send = data => {
    g.msgs.push({ from: "me", type: "img", data: data, time: nowTime() });
    if (state.myGroups.some(x => x.id === g.id)) save();
    renderGroupBody();
    setTimeout(() => {
      g.msgs.push({ from: ["小熊猫", "Celine", "老K", "码上跑"][Math.floor(Math.random() * 4)], text: "图片收到，收藏了！", time: nowTime() });
      renderGroupBody();
    }, 1200);
  };
  if (shoot) { send(DEMO_SHOTS[Math.floor(Math.random() * DEMO_SHOTS.length)]); toast("已发送刚拍摄的照片（演示）"); }
  else pickImage(520, send);
}

function openChatList() {
  currentCtx = { page: "chats" };
  const chats = Object.keys(state.chats);
  document.getElementById("overlay-root").innerHTML = overlayHtml("私信",
    (chats.length ? chats.map(pid => {
      const f = DB.users.find(x => x.id === pid) || { name: "会话", avatar: "#2B5CFF" };
      const last = state.chats[pid][state.chats[pid].length - 1];
      return '<div class="friend-item" onclick="openChat(\'' + pid + '\')"><div class="avatar" style="background:' + f.avatar + '">' + esc(f.name[0]) + "</div>" +
        '<div style="flex:1"><div class="friend-name">' + esc(f.name) + '</div><div class="friend-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(last ? last.text : "") + "</div></div>" +
        '<span class="post-time">' + esc(last ? last.time : "") + "</span></div>";
    }).join("") : emptyBox("还没有私信会话，去社区找队友，或从好友列表发起聊天", "closeOverlay();switchTab('community')", "去社区逛逛")));
}
function openChat(pid) {
  const f = DB.users.find(x => x.id === pid);
  if (!f) { toast("该用户暂不支持私信（演示）"); return; }
  currentCtx = { page: "chat", peerId: pid };
  if (!state.chats[pid]) state.chats[pid] = [];
  chatVoiceMode = false; wxPanel = "";
  document.getElementById("overlay-root").innerHTML = chatOverlayHTML(esc(f.name), esc(f.school), "chat-body", "chat");
  renderChat();
}
function renderChat() {
  const pid = currentCtx.peerId;
  const f = DB.users.find(x => x.id === pid);
  const box = document.getElementById("chat-body");
  if (!box) return;
  box.innerHTML = '<div class="chat-date">今天 ' + nowTime() + "</div>" +
    (state.chats[pid].length
      ? state.chats[pid].map(m =>
        '<div class="bubble-row ' + (m.from === "me" ? "me" : "") + '">' +
        (m.from === "me" ? "" : avatarHtml(f, 32)) +
        bubbleHTML(m) +
        "</div>"
      ).join("")
      : '<div style="text-align:center;font-size:12px;color:var(--t3);padding:20px 0">打个招呼，聊聊组队的事吧～</div>');
  box.scrollTop = box.scrollHeight;
}
/* 语音消息：模拟录制一段语音（演示用，波形动画） */
function sendChatVoice() {
  const pid = currentCtx.peerId;
  const dur = 3 + Math.floor(Math.random() * 9);   // 3-11 秒
  state.chats[pid].push({ from: "me", type: "voice", text: "语音消息", dur, time: nowTime() });
  save(); renderChat();
  setTimeout(() => {
    const d2 = 2 + Math.floor(Math.random() * 6);
    state.chats[pid].push({ from: "other", type: "voice", text: "语音消息", dur: d2, time: nowTime() });
    save(); renderChat();
  }, 1200);
}
/* 语音气泡点击播放/停止（演示动画） */
function playVoice(el) {
  const playing = el.classList.contains("playing");
  document.querySelectorAll(".voice-bubble.playing").forEach(x => x.classList.remove("playing"));
  if (playing) return;
  el.classList.add("playing");
  setTimeout(() => el.classList.remove("playing"), 2600);
}
/* 发起语音/视频通话（演示：接通模拟 + 通话记录） */
function startVoiceCall(kind) {
  const isVideo = kind === "video";
  window._callKind = isVideo ? "video" : "voice";
  const pid = currentCtx.peerId;
  const f = DB.users.find(x => x.id === pid);
  if (!f) { toast("无法发起通话（演示）"); return; }
  modal('<h3 style="text-align:center">' + (isVideo ? "📹 视频通话" : "📞 语音通话") + "</h3>" +
    '<div style="text-align:center;padding:6px 0 2px">' + avatarHtml(f, 56) + "</div>" +
    (isVideo ? '<div style="text-align:center;font-size:11px;color:var(--t3);margin-top:6px">📷 摄像头已开启（演示）</div>' : "") +
    '<div style="text-align:center;font-size:16px;font-weight:800;margin-top:8px">' + esc(f.name) + "</div>" +
    '<div style="text-align:center;font-size:12px;color:var(--t3);margin-top:4px" id="call-state">正在呼叫…</div>' +
    '<div style="text-align:center;font-size:22px;font-weight:700;color:var(--c-primary);margin-top:12px" id="call-timer">00:00</div>' +
    '<div class="modal-actions" style="justify-content:center;gap:18px;margin-top:16px">' +
    '<button class="call-action hangup" onclick="hangupCall()" style="background:var(--c-danger);color:#fff;width:64px;height:64px;border-radius:50%;font-size:22px">📵</button>' +
    '<button class="call-action" style="background:#F2F4F8;width:52px;height:52px;border-radius:50%;font-size:20px" onclick="toast(\'音量已调（演示）\')">🔊</button>' +
    "</div>");
  const st = document.getElementById("call-state");
  const timer = document.getElementById("call-timer");
  let sec = 0;
  const iv = setInterval(() => {
    sec++;
    window._callSec = sec;
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    if (timer) timer.textContent = mm + ":" + ss;
  }, 1000);
  window._callTimer = iv;
  setTimeout(() => { if (st) st.textContent = "已接通 · 通话中"; }, 1400);
  window._callPeer = pid;
}
function hangupCall() {
  const iv = window._callTimer;
  if (iv) { clearInterval(iv); window._callTimer = null; }
  const pid = window._callPeer || currentCtx.peerId;
  const sec = window._callSec || 0;
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  closeModal();
  if (pid) {
    state.chats[pid].push({ from: "me", type: "call", text: (window._callKind === "video" ? "视频通话 " : "语音通话 ") + mm + ":" + ss, time: nowTime() });
    save();
    if (currentCtx.page === "chat" && currentCtx.peerId === pid) renderChat();
  }
  toast("通话已结束");
}
function callRecordPopup() {
  modal('<h3>📞 通话记录</h3>' +
    '<p style="font-size:12.5px;color:var(--t2)">这是一次演示语音通话，点击「回拨」可再次发起通话。</p>' +
    '<div class="modal-actions"><button class="m-cancel" onclick="closeModal()">关闭</button>' +
    '<button class="m-ok" onclick="closeModal();startVoiceCall()">回拨</button></div>');
}
function sendChat() {
  const inp = document.getElementById("chat-input");
  const v = inp.value.trim();
  if (!v) return;
  const pid = currentCtx.peerId;
  state.chats[pid].push({ from: "me", text: v, time: nowTime() });
  inp.value = ""; wxSyncSend(inp); closeWxPanels(); save(); renderChat();
  setTimeout(() => {
    state.chats[pid].push({ from: "other", text: DB.chatReplies[Math.floor(Math.random() * DB.chatReplies.length)], time: nowTime() });
    save(); renderChat();
  }, 1100);
}
function sendChatImg(shoot) {
  closeWxPanels();
  const send = data => {
    const pid = currentCtx.peerId;
    state.chats[pid].push({ from: "me", type: "img", data: data, time: nowTime() });
    save(); renderChat();
    setTimeout(() => {
      state.chats[pid].push({ from: "other", text: shoot ? "这张现场照片拍得不错！" : "收到图片，我看看～（演示回复）", time: nowTime() });
      save(); renderChat();
    }, 1200);
  };
  if (shoot) { send(DEMO_SHOTS[Math.floor(Math.random() * DEMO_SHOTS.length)]); toast("已发送刚拍摄的照片（演示）"); }
  else pickImage(520, send);
}

/* 群聊 */
function openGroupList() {
  currentCtx = { page: "groups" };
  const all = allGroups().slice().sort((a, b) => (state.pinnedGroups.includes(b.id) ? 1 : 0) - (state.pinnedGroups.includes(a.id) ? 1 : 0));
  document.getElementById("overlay-root").innerHTML = overlayHtml("我的群聊",
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<div style="font-size:11.5px;color:var(--t3)">点击 📌 可将班级群 / 组队群置顶</div>' +
      '<button class="btn-ghost" style="padding:8px 16px;font-size:12.5px" onclick="openGroupCreate()">＋ 创建群聊</button></div>' +
    all.map(g => {
      const pinned = state.pinnedGroups.includes(g.id);
      const kindTag = g.kind === "class" ? '<span class="need-tag" style="margin-left:6px;background:#E8F7EF;color:#1D9E5F">班级群</span>' : (g.kind === "guide" ? '<span class="need-tag" style="margin-left:6px">指导群</span>' : "");
      return '<div class="friend-item' + (pinned ? " pinned" : "") + '" onclick="openGroup(\'' + g.id + '\')"><div class="avatar" style="background:' + g.avatar + '">' + esc(g.name[0]) + "</div>" +
        '<div style="flex:1"><div class="friend-name">' + (pinned ? '<span style="margin-right:4px">📌</span>' : "") + esc(g.name) + kindTag + '</div><div class="friend-sub">' + g.members + " 人 · " + esc((g.msgs[g.msgs.length - 1] || {}).text || "新群聊") + "</div></div>" +
        '<button class="pin-btn' + (pinned ? " on" : "") + '" title="置顶/取消置顶" onclick="event.stopPropagation();togglePinGroup(\'' + g.id + '\')">📌</button></div>';
    }).join(""));
}
function togglePinGroup(gid) {
  const i = state.pinnedGroups.indexOf(gid);
  if (i >= 0) state.pinnedGroups.splice(i, 1);
  else state.pinnedGroups.unshift(gid);
  save();
  openGroupList();
  toast(i >= 0 ? "已取消置顶" : "已置顶，该群聊将排在最前");
}
function allGroups() {
  /* 普通组队群默认可见；教师指导群需加入后才出现在「我的群聊」 */
  const joined = state.joinedGroups || [];
  return DB.groups.filter(g => g.kind !== "guide" || joined.includes(g.id)).concat(state.myGroups);
}
function openGroup(gid) {
  const g = allGroups().find(x => x.id === gid);
  if (!g) return;
  currentCtx = { page: "group", groupId: gid };
  chatVoiceMode = false; wxPanel = "";
  document.getElementById("overlay-root").innerHTML = chatOverlayHTML(esc(g.name), g.members + " 人", "group-body", "group");
  renderGroupBody();
}
function renderGroupBody() {
  const g = allGroups().find(x => x.id === currentCtx.groupId);
  const box = document.getElementById("group-body");
  if (!g || !box) return;
  const colors = ["#2B5CFF", "#7C5CFF", "#00A8A0", "#F59E0B", "#34A853", "#FF7A59"];
  box.innerHTML = '<div class="chat-date">组队群聊 · ' + g.members + " 人</div>" +
    g.msgs.map(m => {
      const isMe = m.from === "我" || m.from === "me";
      const c = colors[(m.from || "").length % colors.length];
      return '<div class="bubble-row ' + (isMe ? "me" : "") + '">' +
        (isMe ? "" : '<div class="avatar avatar-click" style="width:32px;height:32px;font-size:13px;background:' + c + '" onclick="memberProfile(\'' + esc(m.from || "") + '\')">' + esc((m.from || "友")[0]) + "</div>") +
        (isMe ? "" : '<div style="font-size:10.5px;color:var(--t3);margin-bottom:3px">' + esc(m.from) + "</div>") +
        bubbleHTML(m) + "</div>";
    }).join("");
  box.scrollTop = box.scrollHeight;
}
function sendGroup() {
  const g = allGroups().find(x => x.id === currentCtx.groupId);
  const inp = document.getElementById("group-input");
  const v = inp.value.trim();
  if (!v || !g) return;
  g.msgs.push({ from: "me", text: v, time: nowTime() });
  inp.value = ""; wxSyncSend(inp); closeWxPanels();
  if (state.myGroups.some(x => x.id === g.id)) save();
  renderGroupBody();
  setTimeout(() => {
    const others = ["小熊猫", "Celine", "老K", "码上跑"].filter(n => n !== "我");
    g.msgs.push({ from: others[Math.floor(Math.random() * others.length)], text: "收到！@" + state.user.nick, time: nowTime() });
    renderGroupBody();
  }, 1200);
}
function openGroupCreate() {
  document.getElementById("overlay-root").innerHTML = overlayHtml("创建群聊",
    '<div class="form-card">' +
    '<div class="form-row"><label class="form-label">群聊名称</label><input class="form-input" id="gc-name" placeholder="例如：数模国赛冲奖小队"></div>' +
    '<div class="form-row"><label class="form-label">选择成员（可多选）</label></div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">' +
    state.friends.map(fid => {
      const f = DB.users.find(x => x.id === fid);
      return f ? '<button class="tag-add" style="border-style:solid;border-color:var(--c-primary)" data-fid="' + f.id + '" onclick="this.classList.toggle(\'tag-pill\');this.classList.toggle(\'tag-add\')">' + esc(f.name) + "</button>" : "";
    }).join("") + "</div>" +
    '<button class="btn-main" style="width:100%" onclick="submitGroup()">创建并进入</button></div>');
}
function submitGroup() {
  const name = document.getElementById("gc-name").value.trim();
  if (!name) { toast("给群聊起个名字吧"); return; }
  const picked = [...document.querySelectorAll("[data-fid].tag-pill")].map(b => b.dataset.fid);
  const g = { id: "ug" + Date.now(), name, members: picked.length + 1, avatar: "#FF7A59", msgs: [{ from: "我", text: "群聊已创建，开始组队吧！", time: nowTime() }] };
  state.myGroups.push(g); save();
  openGroup(g.id);
  toast("群聊「" + name + "」创建成功");
}

/* ================= 弹窗 / 空状态 / Toast ================= */
function modal(html) {
  closeModal();
  const mask = document.createElement("div");
  mask.className = "modal-mask"; mask.id = "modal-mask";
  mask.innerHTML = '<div class="modal-box">' + html + "</div>";
  mask.onclick = e => { if (e.target === mask) closeModal(); };
  document.getElementById("app").appendChild(mask);
}
function closeModal() { const m = document.getElementById("modal-mask"); if (m) m.remove(); }
function emptyBox(text, fn, btn) {
  return '<div class="empty">' + I.empty + "<p>" + text + "</p>" + (fn ? '<span class="e-btn" onclick="' + fn + '">' + (btn || "去看看") + "</span>" : "") + "</div>";
}
let toastTimer = null;
function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ================= AI 助手 ================= */
let aiOpen = false;
function openAI() {
  aiOpen = true;
  const panel = document.getElementById("ai-panel");
  panel.hidden = false;
  renderAIChips();
  const sub = document.querySelector(".ai-sub");
  if (sub && !sub.dataset.verTagged) { sub.dataset.verTagged = "1"; sub.textContent += " · v" + APP_VERSION; }
  if (!document.getElementById("ai-msgs").children.length) {
    aiPush("ai",
      "你好，我是小赛 🤖\n我可以帮你查赛事、找证书考试、按专业推荐，还能**分析你正在看的页面**。\n\n试试点下方快捷指令，或直接问我问题～");
  }
  const box = document.getElementById("ai-msgs");
  box.scrollTop = box.scrollHeight;
}
function closeAI() { aiOpen = false; document.getElementById("ai-panel").hidden = true; }
function renderAIChips() {
  document.getElementById("ai-chips").innerHTML = AI.chips.map((c, i) =>
    '<button class="ai-chip" onclick="aiChip(' + i + ')">' + c.label + "</button>").join("");
}
function aiChip(i) {
  const c = AI.chips[i];
  if (c.act === "page") { aiPush("user", "分析当前页面"); aiReply(AI.analyzePage(currentCtx)); return; }
  if (c.act === "rec") { aiPush("user", "推荐一些适合我的比赛"); aiReply(AI.ask("推荐适合我的比赛")); return; }
  if (c.act === "urgent") {
    const list = DB.events.filter(ev => evStatus(ev).code === "sign").sort((a, b) => evStatus(a).days - evStatus(b).days).slice(0, 5);
    aiPush("user", "报名快截止的有哪些");
    aiReply({ text: "帮你盯了下日历，这些报名进入倒计时：\n\n" + list.map(ev => "· " + ev.short + "（剩 " + evStatus(ev).days + " 天，" + ev.signEnd + " 截止）").join("\n"), events: list });
    return;
  }
  if (c.act && c.act.startsWith("q:")) {
    const q = c.act.slice(2);
    aiPush("user", c.label);
    aiReply(AI.ask(q));
  }
}
function aiAvatarSvg() {
  return '<div class="ai-mini-avatar"><svg viewBox="0 0 64 64" width="20" height="20"><path fill="#fff" d="M32 8a3 3 0 0 1 3 3v2.2c8.6 1.6 15 8.9 15 17.8v9a4 4 0 0 0 4 4 2 2 0 0 1 0 4H10a2 2 0 0 1 0-4 4 4 0 0 0 4-4v-9c0-8.9 6.4-16.2 15-17.8V11a3 3 0 0 1 3-3z"/><circle cx="25" cy="31" r="3.4" fill="#2B5CFF"/><circle cx="39" cy="31" r="3.4" fill="#2B5CFF"/></svg></div>';
}
function aiPush(role, text) {
  const box = document.getElementById("ai-msgs");
  const row = document.createElement("div");
  row.className = "ai-msg " + (role === "user" ? "user" : "");
  row.innerHTML =
    (role === "user"
      ? '<div class="bubble" style="background:var(--c-gradient);color:#fff">' + md(text) + "</div>"
      : aiAvatarSvg() + '<div><div class="bubble">' + md(text) + "</div></div>");
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}
function aiReply(result) {
  const box = document.getElementById("ai-msgs");
  const row = document.createElement("div");
  row.className = "ai-msg";
  row.innerHTML = aiAvatarSvg() + '<div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>';
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
  setTimeout(() => {
    row.innerHTML = aiAvatarSvg() +
      '<div><div class="bubble">' + md(result.text) + "</div>" +
      ((result.events || []).length ? '<div class="ai-event-slot" style="margin-top:8px">' +
        result.events.slice(0, 4).map(ev => {
          const st = evStatus(ev);
          return '<div class="ai-card" onclick="closeAI();openDetail(\'' + ev.id + '\')"><b>' + esc(ev.short) + "</b>" +
            '<div class="ai-c-meta">' + ev.level + " · " + st.text + (st.sign ? " · 截止 " + ev.signEnd : "") + "</div></div>";
        }).join("") + "</div>" : "") +
      "</div>";
    box.scrollTop = box.scrollHeight;
  }, 700);
}
function aiSend() {
  const inp = document.getElementById("ai-input");
  const v = inp.value.trim();
  if (!v) return;
  inp.value = "";
  aiPush("user", v);
  aiReply(AI.ask(v, currentCtx));
}

/* ---------- AI 悬浮球：轻点即开 + 可拖动（pointer/touch/click 三通道手势状态机） ---------- */
(function initFab() {
  const fab = document.getElementById("ai-fab");
  const app = document.getElementById("app");
  const TAP_TOLERANCE = 12;   // 位移 12px 内视为点击，超过视为拖动
  let dragging = false, moved = false;
  let sx = 0, sy = 0, ox = 0, oy = 0;
  let gestureActive = false;  // 当前手势是否由 pointer 链接管（防止 touch 兜底重复触发）
  let fired = false;          // 本手势是否已终结（状态机替代时间窗：杜绝延迟 click 把刚打开的面板关掉）

  function toggle() { if (aiOpen) closeAI(); else openAI(); }

  function startDrag(x, y) {
    dragging = true; moved = false; fired = false; gestureActive = true;
    sx = x; sy = y;
    const r = fab.getBoundingClientRect(), pr = app.getBoundingClientRect();
    ox = r.left - pr.left; oy = r.top - pr.top;
    fab.classList.add("dragging");
  }
  function moveTo(x, y) {
    if (!dragging) return;
    const dx = x - sx, dy = y - sy;
    if (Math.abs(dx) + Math.abs(dy) > TAP_TOLERANCE) moved = true;
    if (moved) {
      const pr = app.getBoundingClientRect();
      const x2 = Math.max(4, Math.min(pr.width - 62, ox + dx));
      const y2 = Math.max(4, Math.min(pr.height - 62, oy + dy));
      fab.style.left = x2 + "px";
      fab.style.top = y2 + "px";
      fab.style.right = "auto";
      fab.style.bottom = "auto";
    }
  }
  function endGesture(treatAsTap) {
    if (!dragging) return;
    dragging = false; gestureActive = false;
    fab.classList.remove("dragging");
    fired = true;                       // 本手势已终结：随后的 click（无论多迟）一律吞掉
    if (treatAsTap && !moved) toggle(); // 轻点：松手立即开合面板，无需任何等待
  }

  /* 通道 1：Pointer 事件（现代浏览器主力） */
  fab.addEventListener("pointerdown", e => {
    startDrag(e.clientX, e.clientY);
    try { fab.setPointerCapture(e.pointerId); } catch (err) { /* 部分内核不支持 capture，忽略 */ }
  });
  fab.addEventListener("pointermove", e => moveTo(e.clientX, e.clientY));
  fab.addEventListener("pointerup", () => endGesture(true));      // 松手即视为点击
  fab.addEventListener("pointercancel", () => endGesture(true));  // 内核手势接管时兜底，同样立即开合

  /* 通道 2：Touch 事件（老内核 / 微信内核 pointerup 迟迟不派发时的兜底）
     若 pointer 链已结束手势（gestureActive=false）则跳过，防止双触发 */
  fab.addEventListener("touchstart", e => {
    if (gestureActive) return;               // pointer 链活着，交由 pointer 事件处理
    const t = e.touches[0];
    if (t) startDrag(t.clientX, t.clientY);  // pointer 事件不可用的老内核从这里进入
  }, { passive: true });
  fab.addEventListener("touchmove", e => {
    if (!dragging || !e.touches[0]) return;
    moveTo(e.touches[0].clientX, e.touches[0].clientY);
    if (moved && e.cancelable) e.preventDefault();  // 拖动时阻止页面滚动
  }, { passive: false });
  fab.addEventListener("touchend", e => {
    // 本手势已由 pointer 链处理（可能刚打开面板）：必须吞掉浏览器即将合成的 click——
    // 面板已展开并覆盖手指位置，该 click 会命中面板背景触发"点背景关闭"，面板刚开就被关
    if (fired) { if (e.cancelable) e.preventDefault(); return; }
    if (!gestureActive) return;
    endGesture(true);                        // 关键兜底：轻点时 pointerup 迟到/不来，touchend 立即开合
    if (e.cancelable) e.preventDefault();    // 同理吞掉合成 click，防止穿透到面板背景
  }, { passive: false });
  fab.addEventListener("touchcancel", () => {
    if (!gestureActive) return;
    endGesture(true);                        // 系统接管手势时兜底，与 pointercancel 行为一致
  });

  /* 通道 3：click（最后兜底）——只在本手势从未被前面通道处理过时才触发。
     不再用 350ms 时间窗：时间窗正是"延迟 click 把刚打开的面板又关掉"的元凶 */
  fab.addEventListener("click", () => {
    if (fired) { fired = false; return; }    // 前面通道已处理（或为拖动手势），吞掉
    gestureActive = false;
    toggle();                                // 极端内核三个通道都缺席时，click 仍能打开
  });
})();

/* ============ 桌面端横向滑动增强（鼠标拖拽 + 滚轮横滚） ============ */
(function initDesktopHScroll() {
  // 从事件目标向上找“可横向滚动且当前确有横向溢出”的祖先容器
  function findHScrollable(el) {
    let node = el;
    while (node && node !== document.body) {
      const st = getComputedStyle(node);
      if ((st.overflowX === "auto" || st.overflowX === "scroll") && node.scrollWidth > node.clientWidth + 1) {
        const vScroll = (st.overflowY === "auto" || st.overflowY === "scroll") && node.scrollHeight > node.clientHeight + 1;
        if (!vScroll) return node;   // 纵向也能滚的容器不劫持
      }
      node = node.parentElement;
    }
    return null;
  }

  let hd = { active: false, box: null, sx: 0, sy: 0, left: 0, moved: false };

  document.addEventListener("pointerdown", e => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;   // 仅鼠标左键，触屏不受影响
    const box = findHScrollable(e.target);
    if (!box) return;
    hd = { active: true, box: box, sx: e.clientX, sy: e.clientY, left: box.scrollLeft, moved: false };
  });

  document.addEventListener("pointermove", e => {
    if (!hd.active) return;
    const dx = e.clientX - hd.sx, dy = e.clientY - hd.sy;
    if (!hd.moved && Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy)) {
      hd.moved = true;
      hd.box.classList.add("dragging-h");
    }
    if (hd.moved) {
      e.preventDefault();            // 拖动时防止选中文本
      hd.box.scrollLeft = hd.left - dx;
    }
  });

  function endHD() {
    if (!hd.active) return;
    hd.active = false;
    if (hd.box) hd.box.classList.remove("dragging-h");
    if (hd.moved) {
      // 拖拽结束后吞掉紧随的 click，避免误触发卡片/按钮
      const kill = ev => { ev.stopPropagation(); ev.preventDefault(); };
      document.addEventListener("click", kill, { capture: true, once: true });
      setTimeout(() => document.removeEventListener("click", kill, true), 120);
    }
  }
  document.addEventListener("pointerup", endHD);
  document.addEventListener("pointercancel", endHD);

  // 悬停横向栏时，滚轮上下滚转为左右滚；到达两端后放行给页面正常滚动
  document.addEventListener("wheel", e => {
    if (e.ctrlKey) return;                                 // Ctrl+滚轮缩放不劫持
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   // 触控板原生横滚不处理
    const box = findHScrollable(e.target);
    if (!box) return;
    const max = box.scrollWidth - box.clientWidth;
    if (max <= 0) return;
    const next = Math.max(0, Math.min(max, box.scrollLeft + e.deltaY));
    if (next === box.scrollLeft) return;                   // 已到边界，放行给页面纵向滚动
    box.scrollLeft = next;
    e.preventDefault();
  }, { passive: false });
})();

/* ================= 启动 ================= */
function seedTeacherNotices() {
  const u = state.user;
  const tName = u.nick + " · " + (u.dept || "");
  const n1 = {
    id: "nt-demo1", source: "mine", school: u.school, typeCat: "比赛类", tagColor: "",
    title: "蓝桥杯校内选拔队报名（示例）",
    desc: "为第十八届蓝桥杯组建校内集训队：软件类 C/C++、Java、Python 三组各招 5 人。报名后自动进入集训名单，12 月起每周集训，材料提交与赛前培训将通过 APP 消息提醒，无需再收 Excel。",
    majors: ["计算机", "电子信息", "数理"],
    teacher: tName, phone: u.phoneT || "0451-8641xxxx", email: u.nick + "@example.edu.cn",
    qa: "每周三 19:00-20:30 活动中心 201", signup: true, views: 136, online: true, time: "3 天前"
  };
  const n2 = {
    id: "nt2", source: "mine", school: u.school, typeCat: "比赛类", tagColor: "",
    title: "ACM 冬训营招募（示例）",
    desc: "面向有算法基础的同学开放 30 个集训名额，12 月 1 日开营，覆盖图论、动态规划、数论专题，结营测试优秀者进入校队梯队。报名请在评论区留言或私信咨询。",
    majors: ["计算机", "数理"],
    teacher: tName, phone: u.phoneT || "0451-8641xxxx", qa: "开营前线上答疑", signup: false, views: 96, online: true, time: "5 天前"
  };
  const n3 = {
    id: "nt3", source: "teacher", school: u.school, typeCat: "考试类", tagColor: "green",
    title: "普通话水平测试校内批次提醒（示例）",
    desc: "11 月 15 日测试，名额 400 人。报考教师资格证的同学请提前完成登记，考前三天发放准考证，请留意消息提醒。",
    majors: ["不限专业", "文法教育"],
    teacher: tName, phone: u.phoneT || "0451-8641xxxx", signup: false, views: 154, online: true, time: "1 周前"
  };
  state.myNotices.push(n1, n2, n3);
  state.signups[n1.id] = [
    { name: "李明", major: "计算机", phone: "138****0123", time: "周一 09:12" },
    { name: "陈静", major: "电子信息", phone: "139****0456", time: "周一 14:30" }
  ];
  save();
}
function initApp() {
  if (state.user.role === "teacher" && !state.myNotices.length) seedTeacherNotices();
  renderTabbar();
  renderHome();
  renderCategory();
  renderSchool();
  renderCommunity();
  renderMe();
  switchTab("home");
  checkReminders();
  refreshTabBadge();
}
(function init() {
  load();
  document.getElementById("btn-messages").onclick = openMessages;
  document.getElementById("ai-close").onclick = closeAI;
  document.getElementById("ai-send").onclick = aiSend;
  document.getElementById("ai-input").addEventListener("keydown", e => { if (e.key === "Enter") aiSend(); });
  // 点面板背景关闭：pointerup + click 双通道（快速连点时浏览器可能吞 click，pointerup 保证可靠；closeAI 幂等，双触发无害）
  const aiPanel = document.getElementById("ai-panel");
  const bgClose = e => { if (e.target.id === "ai-panel") closeAI(); };
  aiPanel.addEventListener("pointerup", bgClose);
  aiPanel.addEventListener("click", bgClose);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { if (aiOpen) closeAI(); else { closeOverlay(); closeViewer(); } } });
  if (!state.user.role) { showLogin(); }
  else {
    initApp();
  }
})();
