(() => {
const NOTES = window.NOTES || [], MODULES = window.MODULES || {};
const LAYERS = [
  ["nen", "Nền tảng (sinh học PT, giải phẫu, sinh lý)"],
  ["trieuchung", "Triệu chứng – tiếp cận"],
  ["benh", "Bệnh học – lâm sàng"],
  ["cls", "Cận lâm sàng – chẩn đoán"],
  ["dieutri", "Điều trị"],
  ["phacdo", "Phác đồ Bộ Y tế"],
];
// Khung các mục của một chuyên khoa (module)
// Các tab của trang bệnh (số nội bộ trong file: 3–9; 10 = "Theo dõi" tách từ mục 8 khi hiển thị)
// Màu của từng tab bệnh (--t1…--t7, --tsum): mỗi tab một màu riêng, không trùng nhau
const SECS = [
  [3, "Tổng quan", "t1"],
  [4, "Triệu chứng học", "t2"],
  [5, "Cận lâm sàng", "t3"],
  [6, "Chẩn đoán", "t4"],
  [7, "Điều trị", "t5"],
  [10, "Theo dõi đánh giá", "t6"],
  [8, "Tiên lượng – Dự phòng", "t7"],
];
const SECNAME = { ...Object.fromEntries(SECS.map(([n, t]) => [n, t])), 9: "Tóm tắt (Pareto)" };
const SECCOL = { ...Object.fromEntries(SECS.map(([n, , c]) => [n, c])), 9: "tsum" };
// Khung thanh công cụ của một chuyên khoa
const MODSECS = [
  [1, "Tổng quan", "Giới thiệu chuyên khoa, mục tiêu cần đạt (thấp đến cao), các bệnh và vấn đề cần học."],
  [2, "Nền tảng", "Cơ chế sinh ung thư, nguyên nhân, giải phẫu bệnh, xâm lấn – di căn, miễn dịch, phòng ngừa và tầm soát."],
  [3, "Triệu chứng học", "Trình bày khái quát: các triệu chứng gợi ý ung thư và cách tiếp cận."],
  [4, "Cận lâm sàng", "Trình bày khái quát các phương tiện và vai trò: hình ảnh, giải phẫu bệnh, dấu ấn, phân giai đoạn."],
  [5, "Bệnh học", "Chi tiết từng bệnh: tổng quan, triệu chứng học, cận lâm sàng, chẩn đoán, điều trị, theo dõi, tiên lượng – dự phòng."],
  [6, "Bệnh án", "Cách làm một bệnh án ung thư: hành chính, bệnh sử, tiền sử, khám, cận lâm sàng, chẩn đoán, điều trị, tiên lượng."],
  [7, "Tóm tắt", "Tổng hợp trong một trang, từng bệnh theo nguyên lý Pareto (20% kiến thức mang 80% điểm)."],
  [8, "Nguồn", "Tài liệu trong nước, văn bản Bộ Y tế và nguồn ngoài đã dùng cho từng bài."],
  [9, "Tự đánh giá", "Các thẻ tự kiểm tra đã tạo (được lưu lại, tạm thời chưa xây dựng thêm)."],
];
// Số hiển thị trong trang bệnh: 5.1–5.7 (số nội bộ 3,4,5,6,7,10,8); 9 = Tóm tắt
const DISPNUM = { 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 10: 6, 8: 7 };
const dnum = n => n === 9 ? "★" : "5." + DISPNUM[n];

// Mục của thanh công cụ (1–9) mà một bài chung thuộc về.
function sectionOfNote(n) {
  if (n.kind === "overview") return 1;
  if (n.kind === "disease") return 5;
  if (n.kind === "sources") return 8;
  if (n.section) return n.section;           // gán trong frontmatter: section: 2, 3, 4 hoặc 6
  return 2;                                  // mặc định: Nền tảng
}

// "Theo dõi" tách khỏi "Tiên lượng – Dự phòng": các tiêu đề ### bắt đầu bằng "Theo dõi"
const FOLLOW_RE = /^theo dõi/i;

// Đổi số mục nội bộ sang số hiển thị: tiêu đề "### 7.1 ..." và chữ "mục 7.3" trong liên kết nội bộ.
function relabel(s) {
  return s
    .replace(/^(#{3,4}\s+)([3-9])\.(\d)(?=\s)/gm, (_, h, x, y) => `${h}${dnum(+x)}.${y}`)
    .replace(/\[([^\]]*?)mục ([3-9])(?:\.(\d))?([^\]]*)\]\(#\/n\//g, (_, pre, x, y, post) => `[${pre}${+x === 9 ? "Tóm tắt" : "mục " + dnum(+x) + (y ? "." + y : "")}${post}](#/n/`);
}

const $ = s => document.querySelector(s);
const byId = Object.fromEntries(NOTES.map(n => [n.id, n]));
const byTitle = Object.fromEntries(NOTES.map(n => [n.title.toLowerCase(), n]));
const resolve = k => { k = k.trim(); return byId[k] || byTitle[k.toLowerCase()]; };
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const css = v => getComputedStyle(document.documentElement).getPropertyValue("--" + v).trim();
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---- liên kết đi (dùng cho sơ đồ liên kết) ----
const out = {};
NOTES.forEach(n => {
  out[n.id] = [...new Set([...n.body.matchAll(/\[\[([^\]|]+)/g)].map(m => resolve(m[1])).filter(Boolean).map(x => x.id))]
    .filter(id => id !== n.id);
});

// ---- markdown mở rộng: hộp màu, đánh dấu, tab, thẻ gập, danh sách lồng ----
const CALL = { key: "Ý chính", warn: "Lưu ý – bẫy thi", tip: "Mẹo nhớ", ext: "Tham khảo ngoài tài liệu", doc: "Theo văn bản Bộ Y tế", note: "Ghi chú", red: "Cấp cứu – nguy hiểm" };
const inline = s => esc(s)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/\*([^*\s][^*]*)\*/g, "<em>$1</em>")
  .replace(/==(.+?)==/g, "<mark>$1</mark>")
  .replace(/\{(r|g|b|o|p)\|([^}]+)\}/g, (_, c, t) => `<span class="c-${c}">${t}</span>`)
  .replace(/\{\{\+([^}]+)\}\}/g, '<span class="src ext" title="Nguồn ngoài tài liệu của bạn">$1</span>')
  .replace(/\{\{([^}]+)\}\}/g, '<span class="src">$1</span>')
  .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, k, label) => {
    const t = resolve(k.replace(/&amp;/g, "&"));
    return t ? `<a class="wl" href="#/n/${t.id}">${label || t.title}</a>` : `<a class="wl broken" title="Chưa có bài này">${label || k}</a>`;
  })
  .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  .replace(/\[([^\]]+)\]\((#\/[^)]+)\)/g, '<a href="$2">$1</a>');

function cardsOf(n) {
  return n.body.split("\n").map(l => l.match(/^[-*]\s*(.+?)\s::\s(.+)$/)).filter(Boolean).map(m => ({ id: n.id + "|" + m[1], q: m[1], a: m[2], note: n.id }));
}

function md(src) { return blocks(src.split("\n")); }

function blocks(L) {
  const h = [];
  let i = 0;
  const stack = [];           // danh sách lồng nhau: {tag, indent}
  const closeLists = (toIndent = -1) => {
    while (stack.length && stack[stack.length - 1].indent > toIndent) { h.push(`</li></${stack.pop().tag}>`); }
  };
  const findEnd = from => {
    let d = 1;
    for (let k = from; k < L.length; k++) {
      const t = L[k].trim();
      if (/^@@(tabs|fold)/.test(t)) d++;
      else if (t === "@@end" && --d === 0) return k;
    }
    return L.length;
  };
  while (i < L.length) {
    const l = L[i], t = l.trim();
    let m;
    if (t === "") { closeLists(); i++; continue; }
    if (/^@@tabs/.test(t)) {
      closeLists();
      const end = findEnd(i + 1), inner = L.slice(i + 1, end), tabs = [];
      let d = 0;
      for (const x of inner) {
        const tx = x.trim();
        if (d === 0 && (m = tx.match(/^@@tab\s+(.+)$/))) { tabs.push({ name: m[1], lines: [] }); continue; }
        if (/^@@(tabs|fold)/.test(tx)) d++; else if (tx === "@@end") d--;
        if (tabs.length) tabs[tabs.length - 1].lines.push(x);
      }
      h.push(`<div class="tabs"><div class="tabbar">${tabs.map((x, k) => `<button class="tabbtn${k ? "" : " on"}" data-t="${k}">${inline(x.name)}</button>`).join("")}</div>` +
        tabs.map((x, k) => `<div class="tabpanel${k ? "" : " on"}" data-t="${k}">${blocks(x.lines)}</div>`).join("") + `</div>`);
      i = end + 1; continue;
    }
    if ((m = t.match(/^@@fold(!?)\s+(.+)$/))) {
      closeLists();
      const end = findEnd(i + 1);
      h.push(`<details class="fold"${m[1] ? " open" : ""}><summary>${inline(m[2])}</summary>${blocks(L.slice(i + 1, end))}</details>`);
      i = end + 1; continue;
    }
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) {
      closeLists();
      // "Tự kiểm tra": khối gập, mặc định đóng; số câu (dòng "- Q :: A") hiện trên tiêu đề
      if (/^tự kiểm tra$/i.test(m[2].trim())) {
        let j = i + 1;
        while (j < L.length && !/^#{1,4}\s/.test(L[j])) j++;
        const cnt = L.slice(i + 1, j).filter(x => / :: /.test(x)).length;
        h.push(`<details class="fold selfcheck"><summary>${inline(m[2])} <small>${cnt} câu</small></summary>${blocks(L.slice(i + 1, j))}</details>`);
        i = j; continue;
      }
      h.push(`<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`); i++; continue;
    }
    if (/^---+$/.test(t)) { closeLists(); h.push("<hr>"); i++; continue; }
    if (t.startsWith("|")) {
      closeLists();
      const rows = [];
      while (i < L.length && L[i].trim().startsWith("|")) rows.push(L[i++].trim());
      // Tách ô theo "|", nhưng giữ nguyên "|" bên trong đánh dấu {x|…} và liên kết [[id|nhãn]]
      const cells = r => r.replace(/^\||\|$/g, "")
        .replace(/\{([rgbop])\|([^}]*)\}/g, (_, col, t) => "{" + col + "\u0001" + t + "}")
        .replace(/\[\[[^\]]*\]\]/g, m => m.replace(/\|/g, "\u0001"))
        .split("|").map(c => c.replace(/\u0001/g, "|").trim());
      h.push('<div class="tw"><table><thead><tr>' + cells(rows[0]).map(c => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>" +
        rows.slice(2).map(r => "<tr>" + cells(r).map(c => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table></div>");
      continue;
    }
    if (l.startsWith(">")) {
      closeLists();
      const q = [];
      while (i < L.length && L[i].startsWith(">")) q.push(L[i++].replace(/^>\s?/, ""));
      const c = q[0].match(/^\[!(\w+)\]\s*(.*)$/);
      if (c) {
        const type = CALL[c[1]] ? c[1] : "note";
        // Tiêu đề trùng nhãn của hộp (ví dụ [!tip] Mẹo nhớ) thì bỏ, nhãn đã hiện sẵn ở trên
        const head = c[2].trim(), dupLabel = head.toLowerCase() === CALL[type].toLowerCase();
        const body = [dupLabel ? "" : head, ...q.slice(1)].filter((x, k) => k || x);
        h.push(`<div class="callout ${type}"><div class="ct">${CALL[type]}</div>${blocks(body)}</div>`);
      } else h.push(`<blockquote>${inline(q.join(" "))}</blockquote>`);
      continue;
    }
    if ((m = l.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/))) {
      const ind = m[1].length, tag = /\d/.test(m[2]) ? "ol" : "ul";
      const top = stack[stack.length - 1];
      if (top && ind > top.indent) { h.push(`<${tag}>`); stack.push({ tag, indent: ind }); }
      else {
        while (stack.length && stack[stack.length - 1].indent > ind) h.push(`</li></${stack.pop().tag}>`);
        const t2 = stack[stack.length - 1];
        if (t2 && t2.indent === ind) h.push("</li>"); else { h.push(`<${tag}>`); stack.push({ tag, indent: ind }); }
      }
      const qa = m[3].match(/^(.+?)\s::\s(.+)$/);
      h.push(qa ? `<li class="qa"><details class="card"><summary>${inline(qa[1])}</summary><div>${inline(qa[2])}</div></details>` : `<li>${inline(m[3])}`);
      i++; continue;
    }
    closeLists();
    h.push(`<p>${inline(l)}</p>`); i++;
  }
  closeLists();
  return h.join("\n");
}

document.addEventListener("click", e => {
  const b = e.target.closest('[data-act="toggleall"]'); if (!b) return;
  const ds = [...document.querySelectorAll(b.dataset.scope || "details.pareto")], open = ds.some(d => !d.open);
  ds.forEach(d => { d.open = open; });
});
// Thanh bên (Nền tảng): bấm một nhóm để mở trang mục và cuộn tới nhóm đó
let jumpTo = null;
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-g]"); if (!a) return;
  e.preventDefault();
  $("#side").classList.remove("open");
  const el = document.getElementById(a.dataset.g);
  if (location.hash === a.getAttribute("href") && el) return el.scrollIntoView({ behavior: "smooth", block: "start" });
  jumpTo = a.dataset.g; location.hash = a.getAttribute("href");
});
// bấm tab trong nội dung
document.addEventListener("click", e => {
  const b = e.target.closest(".tabbtn");
  if (!b) return;
  const box = b.closest(".tabs"), k = b.dataset.t;
  box.querySelectorAll(":scope > .tabbar > .tabbtn").forEach(x => x.classList.toggle("on", x === b));
  box.querySelectorAll(":scope > .tabpanel").forEach(x => x.classList.toggle("on", x.dataset.t === k));
});

// Mục lục bài: đánh id cho các tiêu đề ### (h4) để cuộn tới; không đổi địa chỉ trang
function withToc(html) {
  const items = [];
  const out = html.replace(/<h4>(.*?)<\/h4>/g, (_, t) => { const id = "sec-" + items.length; items.push({ id, t }); return `<h4 id="${id}">${t}</h4>`; });
  return { html: out, items };
}
function tocBox(items) {
  if (items.length < 3) return "";
  return `<details class="toc" open><summary>Nội dung mục</summary><ol>${items.map(x => `<li><a href="#${x.id}" data-jump="${x.id}">${x.t.replace(/<\/?a[^>]*>/g, "")}</a></li>`).join("")}</ol></details>`;
}
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-jump]"); if (!a) return;
  e.preventDefault();
  const t = document.getElementById(a.dataset.jump); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---- thanh bên: mục lục thu gọn theo khung 1–9 ----
const diseases = () => NOTES.filter(n => n.kind === "disease").sort((a, b) => (a.order || 99) - (b.order || 99));
// 4 nhóm của mục Nền tảng: tên trong frontmatter (group), tiêu đề trên trang và tên ở thanh bên
const GROUP_ORDER = ["Cơ chế", "Nguyên nhân", "Giải phẫu bệnh, xâm lấn, di căn, miễn dịch", "Phòng ngừa và tầm soát", "Điều trị và chăm sóc"];
const GROUP_PAGE = { "Giải phẫu bệnh, xâm lấn, di căn, miễn dịch": "Đặc điểm – giải phẫu bệnh, xâm lấn, di căn, miễn dịch" };
const GROUP_SIDE = { "Giải phẫu bệnh, xâm lấn, di căn, miễn dịch": "Đặc điểm" };
const gTitle = g => GROUP_PAGE[g] || g, gSide = g => GROUP_SIDE[g] || g, gId = g => "grp-" + GROUP_ORDER.indexOf(g);
function tree(cur, sec) {
  const mods = [...new Set(NOTES.map(n => n.module))];
  const curN = byId[cur], curSec = curN ? sectionOfNote(curN) : +((location.hash.match(/^#\/m\/[^/]+\/(\d)$/) || [])[1] || 0);   // đang ở trang mục thì mở đúng mục đó
  $("#tree").innerHTML = mods.map(mod => {
    const ns = NOTES.filter(n => n.module === mod), di = diseases().filter(n => n.module === mod);
    const link = (n, s, label, c) => `<a href="#/n/${n.id}${s ? "/" + s : ""}" class="${n.id === cur && (!s || +s === sec) ? "on" : ""}"${c ? ` style="--c:var(--${c})"` : ""}>${esc(label || n.short || n.title)}</a>`;
    const gen = k => ns.filter(n => n.kind === "foundation" && sectionOfNote(n) === k).sort((x, y) => (x.order || 99) - (y.order || 99));
    const isDis = curN && curN.kind === "disease", open = c => c ? " open" : "";
    const sub = (k, title, body, isOpen) => `<details${open(isOpen)} style="--c:var(--s${k})"><summary><b>${k}</b> ${title}</summary>${body}</details>`;
    const top = (k, label, on) => `<a class="top ${on ? "on" : ""}" style="--c:var(--s${k})" href="#/m/${mod}/${k}"><b>${k}</b> ${label}</a>`;
    const ms = h => (location.hash.match(/^#\/m\/[^/]+\/(\d)$/) || [])[1] === String(h);
    return `<details class="mod" open><summary>${esc(MODULES[mod] || mod)}</summary>
      ${top(1, "Tổng quan", curSec === 1 && !ms(8))}
      ${sub(2, "Nền tảng",GROUP_ORDER.filter(g => gen(2).some(n => (n.group || "Khác") === g)).map(g => `<a href="#/m/${mod}/2" data-g="${gId(g)}" class="${curSec === 2 && curN && curN.group === g ? "on" : ""}">${esc(gSide(g))}</a>`).join(""), curSec === 2)}
      ${sub(3, "Triệu chứng học", `<a href="#/m/${mod}/3">Khái quát</a>` + gen(3).map(n => link(n)).join("") + `<div class="lay">Theo bệnh</div>` + di.map(d => link(d, 4, d.short || d.title)).join(""), curSec === 3 || (isDis && sec === 4))}
      ${sub(4, "Cận lâm sàng", `<a href="#/m/${mod}/4">Khái quát phương tiện, vai trò</a>` + gen(4).map(n => link(n)).join("") + `<div class="lay">Theo bệnh</div>` + di.map(d => link(d, 5, d.short || d.title)).join(""), curSec === 4 || (isDis && (sec === 5 || sec === 6)))}
      ${sub(5, "Bệnh học",di.map(d => `<details${open(isDis && curN.id === d.id)}><summary>${esc(d.short || d.title)}</summary>${SECS.map(([num, name]) => link(d, num, dnum(num) + " " + name, SECCOL[num])).join("")}${link(d, 9, "★ Tóm tắt", "tsum")}</details>`).join(""), isDis)}
      ${top(6, "Bệnh án", curSec === 6)}
      ${top(7, "Tóm tắt", curSec === 7)}
      ${top(8, "Nguồn", curSec === 8)}
      ${top(9, "Tự đánh giá", curSec === 9)}
    </details>`;
  }).join("");
}
// ---- thanh công cụ: tìm kiếm, cài đặt hiển thị, điều hướng dưới (điện thoại) ----
const noDia = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
const plain = s => s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, k, label) => label || k).replace(/\{\{\+?[^}]*\}\}/g, "").replace(/==|\*\*|\{[rgbop]\|/g, "").replace(/[{}>@#|\[\]!`]/g, " ").replace(/\s+/g, " ").trim();
NOTES.forEach(n => { n._t = noDia(n.title + " " + (n.short || "")); n._g = noDia(n.tags.join(" ")); n._b = noDia(n.body); });
function secAt(n, pos) {
  if (n.kind !== "disease") return 0;
  let s = 0, m; const re = /^## (\d)\./gm;
  while ((m = re.exec(n.body)) && m.index <= pos) s = +m[1];
  if (s === 8) {   // nằm trong phần "Theo dõi" thì mở tab Theo dõi đánh giá
    const heads = [...n.body.slice(0, pos).matchAll(/^###\s+(.*)$/gm)];
    if (heads.length && FOLLOW_RE.test(heads[heads.length - 1][1]) && n.body.lastIndexOf("## 8.", pos) >= 0) return 10;
  }
  return s;
}
function runSearch(raw) {
  const terms = noDia(raw.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return NOTES.map(n => {
    let sc = 0, first = -1;
    for (const t of terms) {
      const it = n._t.includes(t), ig = n._g.includes(t), ib = n._b.indexOf(t);
      if (!it && !ig && ib < 0) return null;
      sc += (it ? 6 : 0) + (ig ? 3 : 0) + (ib >= 0 ? 1 : 0);
      if (ib >= 0 && first < 0) first = ib;
    }
    return { n, sc, pos: first };
  }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 10);
}
function renderResults() {
  const box = $("#results"), q = $("#q").value;
  if (!q.trim()) { box.hidden = true; box.innerHTML = ""; return; }
  const hits = runSearch(q);
  box.hidden = false;
  box.innerHTML = hits.length ? hits.map(({ n, pos }) => {
    const sec = pos >= 0 ? secAt(n, pos) : 0;
    const href = `#/n/${n.id}${sec ? "/" + sec : ""}`;
    const ms = MODSECS.find(s => s[0] === sectionOfNote(n));
    const where = n.kind === "disease" ? (sec ? `${dnum(sec)} ${SECNAME[sec]}` : "Bệnh học") : (n.kind === "overview" ? "Tổng quan" : (ms ? ms[1] : "Nền tảng"));
    const snip = pos >= 0 ? esc(plain(n.body.slice(Math.max(0, pos - 40), pos + 90))) : "";
    return `<a href="${href}"><b>${esc(n.short || n.title)}</b> <span class="where">${esc(where)}</span>${snip ? `<small>…${snip}…</small>` : ""}</a>`;
  }).join("") : '<div class="none">Không có kết quả.</div>';
}
const qEl = $("#q");
qEl.addEventListener("input", renderResults);
qEl.addEventListener("focus", renderResults);
qEl.addEventListener("keydown", e => {
  if (e.key === "Escape") { $("#results").hidden = true; qEl.blur(); $("#gsearch").classList.remove("open"); }
  if (e.key === "Enter") { const a = $("#results a"); if (a) { location.hash = a.getAttribute("href"); $("#results").hidden = true; qEl.blur(); $("#gsearch").classList.remove("open"); } }
});
$("#results").addEventListener("click", () => { $("#results").hidden = true; $("#gsearch").classList.remove("open"); });
document.addEventListener("keydown", e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "")) || e.target.isContentEditable;
  if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); focusSearch(); }
});
function focusSearch() { $("#gsearch").classList.add("open"); qEl.focus(); qEl.select(); }
document.addEventListener("click", e => {
  if (!e.target.closest(".setwrap")) $("#setPanel").hidden = true;
  if (!e.target.closest("#gsearch") && !e.target.closest("#bnSearch")) { $("#results").hidden = true; $("#gsearch").classList.remove("open"); }
});
// Mục lục bên trái: điện thoại mở như ngăn kéo; máy tính ẩn/hiện và nhớ lựa chọn trên thiết bị này
const narrow = () => matchMedia("(max-width:820px)").matches;
const setSideOff = off => {
  document.documentElement.classList.toggle("side-off", off);
  $("#menuBtn").setAttribute("aria-expanded", String(!off));
};
const toggleSide = () => {
  if (narrow()) return $("#side").classList.toggle("open");
  const off = !document.documentElement.classList.contains("side-off");
  setSideOff(off);
  try { off ? localStorage.setItem("ykkb_side", "off") : localStorage.removeItem("ykkb_side"); } catch {}
};
$("#menuBtn").onclick = toggleSide; $("#bnMenu").onclick = toggleSide;
$("#bnSearch").onclick = e => { e.stopPropagation(); focusSearch(); };
// cỡ chữ và giao diện (lưu trên từng thiết bị)
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } }, lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
function applyPrefs() {
  const fs = parseFloat(lsGet("ykkb_fs")) || 1, th = lsGet("ykkb_theme") || "auto";
  setSideOff(!narrow() && lsGet("ykkb_side") === "off");
  document.documentElement.style.setProperty("--fs", fs);
  if (th === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = th;
  $("#setPanel").querySelectorAll("[data-fs]").forEach(b => b.classList.toggle("on", Math.abs(parseFloat(b.dataset.fs) - fs) < .01));
  $("#setPanel").querySelectorAll("[data-th]").forEach(b => b.classList.toggle("on", b.dataset.th === th));
}
$("#setBtn").onclick = e => { e.stopPropagation(); $("#setPanel").hidden = !$("#setPanel").hidden; };
$("#setPanel").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.fs) lsSet("ykkb_fs", b.dataset.fs);
  if (b.dataset.th) lsSet("ykkb_theme", b.dataset.th === "auto" ? null : b.dataset.th);
  applyPrefs();
});
applyPrefs();

// gần đây
const RK = "ykkb_recent";
function pushRecent(id, sec) {
  const list = (store.get(RK, []) || []).filter(r => r.id !== id);
  list.unshift({ id, sec: sec || 0, t: Date.now() });
  store.set(RK, list.slice(0, 8));
}
const crumb = parts => `<nav class="crumb">${parts.map((p, i) => p.href ? `<a href="${p.href}">${esc(p.t)}</a>` : `<span>${esc(p.t)}</span>`).join('<i>›</i>')}</nav>`;

// ---- thẻ ôn tập (Leitner đơn giản) ----
const DAYS = [0, 1, 3, 7, 21], DAY = 864e5;
const allCards = NOTES.flatMap(cardsOf);
const prog = () => store.get("ykkb_cards", {});
const dueCards = () => { const p = prog(), now = Date.now(); return allCards.filter(c => !p[c.id] || p[c.id].due <= now); };
function badge() { const el = $("#dueBadge"); if (el) el.textContent = dueCards().length || ""; }

// ---- trang ----
function hasPareto(d) { return /^## 9\.[^\n]*Pareto/m.test(d.body); }
function diseaseGrid(ds) {
  return `<div class="dgrid">${ds.map(d => { const { secs } = diseaseParts(d); return `<article class="dcard"><a class="dtitle" href="#/n/${d.id}/3">${esc(d.short || d.title)}</a>
      <div class="dchips">${SECS.map(([n, t, c]) => secs[n] ? `<a class="chip" style="--c:var(--${c})" href="#/n/${d.id}/${n}" title="${dnum(n)} ${esc(t)}">${dnum(n)}</a>` : `<span class="chip off" title="${dnum(n)} ${esc(t)} (chưa có)">${dnum(n)}</span>`).join("")}</div>
      <div class="dfoot">${hasPareto(d) ? `<a class="pill9" href="#/n/${d.id}/9">★ Tóm tắt</a>` : '<span class="meta">Tóm tắt: chưa có</span>'}${(d.khung || []).map(k => `<a class="chip wide" href="#/khung/${k}">STT ${k}</a>`).join("")}</div></article>`; }).join("")}</div>
    <p class="legend2 meta">${SECS.map(([n, t, c]) => `<span><i class="dot" style="background:var(--${c})"></i>${dnum(n)} ${esc(t)}</span>`).join("")}</p>`;
}

function home() {
  const ds = diseases(), mod = Object.keys(MODULES)[0], mname = MODULES[mod] || mod;
  const fo = NOTES.filter(n => n.kind === "foundation").length;
  const nKhung = window.KHUNG ? window.KHUNG.items.length : 128;
  const recent = (store.get(RK, []) || []).map(r => ({ ...r, n: byId[r.id] })).filter(r => r.n).slice(0, 4);
  const due = dueCards().length;
  $("#main").style.maxWidth = "1080px";
  $("#main").innerHTML = `
  <section class="hero">
    <div class="herotxt"><h1>Học tập Y khoa</h1><p>Kho kiến thức ôn thi chứng chỉ hành nghề bác sĩ đa khoa: từ nền tảng đến phác đồ, mỗi bệnh một trang có tab.</p></div>
    <button class="herosearch" id="heroSearch"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg> Tìm bài, bệnh, thuốc… <kbd>/</kbd></button>
    <div class="stats"><div><b>${NOTES.length}</b><span>bài</span></div><div><b>${ds.length}</b><span>bệnh</span></div><div><b>${fo}</b><span>bài chung</span></div><div><b>${nKhung}</b><span>vấn đề khung thi</span></div></div>
  </section>
  ${recent.length ? `<section><h2>Tiếp tục</h2><div class="rgrid">${recent.map(r => `<a class="rcard" href="#/n/${r.id}${r.sec ? "/" + r.sec : ""}"><small>${r.sec ? dnum(r.sec) + " · " + SECNAME[r.sec] : esc(r.n.group || (r.n.kind === "overview" ? "Tổng quan" : "Bài"))}</small><b>${esc(r.n.short || r.n.title)}</b></a>`).join("")}</div></section>` : ""}
  <section><h2>Chuyên khoa</h2>
    <article class="spec"><div class="spechead"><span class="sdot"></span><div><h3>${esc(mname)}</h3><small>${ds.length} bệnh · ${fo} bài chung</small></div>
      <div class="specact"><a class="btn p" href="#/m/${mod}/1">Tổng quan module</a><a class="btn" href="#/m/${mod}/7">Tóm tắt Pareto</a></div></div>
      <ol class="stepper">${MODSECS.map(([n, t]) => `<li style="--c:var(--s${n})"><a href="#/m/${mod}/${n}"><b>${n}</b>${esc(t)}</a></li>`).join("")}</ol>
    </article>
  </section>
  <section><h2>Bệnh</h2>${diseaseGrid(ds)}</section>
  <section><h2>Công cụ</h2>
    <div class="tiles">
      <a class="tile" href="#/khung"><b>Khung 128 vấn đề</b><span>QĐ 22 + sách, lọc theo ung bướu</span></a>
      <a class="tile" href="#/m/ung-buou/7"><b>Tóm tắt Pareto</b><span>Một trang, từng bệnh</span></a>
      <a class="tile" href="#/graph"><b>Sơ đồ liên kết</b><span>Mắc xích giữa các bài</span></a>
      <a class="tile" href="#/m/ung-buou/9"><b>Tự đánh giá</b><span>${due} thẻ đến hạn</span></a>
    </div>
  </section>`;
  $("#heroSearch").onclick = focusSearch;
}

// Bài nền tảng: khối đóng/mở xếp nối tiếp trên một trang, không tách thành trang con
// TODO(human): chọn những khối nào mở sẵn khi vào trang mục (xem openByDefault)
function openByDefault(flat, openId) {
  return new Set(openId ? [openId] : []);
}
function noteToggles(list, openSet) {
  return list.map(n => `<details class="fold note-t" id="t-${n.id}"${openSet.has(n.id) ? " open" : ""}>
      <summary>${esc(n.short || n.title)}</summary>
      ${md(n.body)}
    </details>`).join("");
}

// Trang giới thiệu của từng mục trên thanh công cụ (2–5); openId mở sẵn một bài khi đi từ #/n/<id>
function modSection(mod, k, openId) {
  const [, title, desc] = MODSECS.find(s => s[0] === k) || [k, "", ""];
  const ns = NOTES.filter(n => n.module === mod), di = diseases().filter(n => n.module === mod);
  const gen = ns.filter(n => n.kind === "foundation" && sectionOfNote(n) === k).sort((x, y) => (x.order || 99) - (y.order || 99));
  const groups = k === 2 ? [...new Set(gen.map(n => n.group || "Khác"))].sort((x, y) => (GROUP_ORDER.indexOf(x) + 99) % 99 - (GROUP_ORDER.indexOf(y) + 99) % 99) : [];
  const flat = k === 2 ? groups.flatMap(g => gen.filter(n => (n.group || "Khác") === g)) : gen;
  const openSet = openByDefault(flat, openId);
  const allBtn = gen.length ? `<p><button class="btn" data-act="toggleall" data-scope="details.note-t">Mở / đóng tất cả</button></p>` : "";
  const byDisease = (secNums) => `<div class="rgrid">${di.map(d => `<div class="rcard"><b>${esc(d.short || d.title)}</b>${secNums.map(s => `<a class="chip wide" href="#/n/${d.id}/${s}">${dnum(s)} ${esc(SECNAME[s])}</a>`).join("")}</div>`).join("")}</div>`;
  let body = "";
  if (k === 2) {
    body = allBtn + groups.map(g => `<section id="${gId(g)}"><h2>${esc(gTitle(g))}</h2>${noteToggles(flat.filter(n => (n.group || "Khác") === g), openSet)}</section>`).join("");
  } else if (k === 3) {
    body = `<section><h2>Bài khái quát</h2>${gen.length ? allBtn + noteToggles(gen, openSet) : "<p class='meta'>Chưa có.</p>"}</section>
      <section><h2>Triệu chứng học theo từng bệnh</h2>${byDisease([4])}</section>`;
  } else if (k === 4) {
    body = `<section><h2>Bài khái quát: phương tiện và vai trò</h2>${gen.length ? allBtn + noteToggles(gen, openSet) : "<p class='meta'>Chưa có.</p>"}</section>
      <section><h2>Cận lâm sàng và chẩn đoán theo từng bệnh</h2>${byDisease([5, 6])}</section>`;
  } else if (k === 5) {
    body = `<section>${diseaseGrid(di)}</section>`;
  } else if (k === 7) {
    body = `<p><button class="btn" data-act="toggleall">Mở / đóng tất cả</button></p>` + di.map((d, i) => {
      const s9 = diseaseParts(d).secs[9]; if (!s9) return "";
      return `<details class="fold pareto"${i === 0 ? " open" : ""}><summary>${esc(d.short || d.title)} <a class="chip wide" href="#/n/${d.id}/9">mở trang bệnh</a></summary>${md(relabel(summaryOnly(s9.body)).replace(/^###\s+Con số và mốc phải nhớ\s*$/m, ""))}</details>`;
    }).join("");
  } else if (k === 8) {
    const st = ns.find(n => n.kind === "sources");
    body = (st ? `<section>${md(st.body)}</section>` : "") +
      `<section><h2>Nguồn theo từng bệnh</h2>` + di.map(d => {
        const s9 = diseaseParts(d).secs[9], b = s9 ? s9.body : "";
        const doc = foldBody(b, "Nguồn tài liệu"), ext = foldBody(b, "Nguồn ngoài");
        return `<details class="fold"><summary>${esc(d.short || d.title)}</summary>${d.source ? `<p class="meta">Nguồn chính: ${esc(d.source)}</p>` : ""}${doc ? `<h3>Nguồn tài liệu</h3>${md(doc)}` : ""}${ext ? `<h3>Nguồn ngoài tài liệu</h3>${md(ext)}` : ""}</details>`;
      }).join("") + `</section>` +
      `<section><h2>Nguồn theo từng bài chung</h2><div class="tw"><table><thead><tr><th>Bài</th><th>Nguồn</th></tr></thead><tbody>${ns.filter(n => n.kind === "foundation").map(n => `<tr><td><a href="#/n/${n.id}">${esc(n.short || n.title)}</a></td><td>${esc(n.source || "")}</td></tr>`).join("")}</tbody></table></div></section>`;
  } else if (k === 6) {   // Bệnh án: các bài của mục, mở sẵn để đọc liền
    body = gen.length ? allBtn + noteToggles(gen, new Set(gen.map(n => n.id))) : "<p class='meta'>Chưa có.</p>";
  } else if (k === 9) {
    const withCards = ns.map(n => ({ n, c: cardsOf(n) })).filter(x => x.c.length);
    const total = withCards.reduce((s, x) => s + x.c.length, 0);
    body = `<div class="callout note"><div class="ct">Ghi chú</div><p>Các thẻ tự kiểm tra đã tạo được <b>lưu lại</b>. Hiện <b>tạm thời chưa xây dựng thêm</b>.</p></div>
      <p><b>${total}</b> thẻ trong <b>${withCards.length}</b> bài · <a class="btn p" href="#/cards">Bắt đầu ôn thẻ (lặp lại ngắn quãng)</a></p>` +
      withCards.map(({ n, c }) => `<details class="fold"><summary>${esc(n.short || n.title)} <small>${c.length} thẻ</small></summary>${c.map(x => `<details class="card"><summary>${inline(x.q)}</summary><div>${inline(x.a)}</div></details>`).join("")}</details>`).join("");
  }
  $("#main").style.maxWidth = "1080px";
  $("#main").innerHTML = `${crumb([{ t: "Trang chủ", href: "#/" }, { t: MODULES[mod] || mod, href: `#/m/${mod}/1` }])}
    <header class="cover" style="--c:var(--s${k})"><h1>${k}. ${esc(title)}</h1><p>${esc(desc)}</p></header>
    <div class="modpage" style="--c:var(--s${k})">${body}</div>`;
  const target = openId && document.getElementById("t-" + openId), grp = jumpTo && document.getElementById(jumpTo);
  jumpTo = null;
  if (target) target.scrollIntoView(); else if (grp) grp.scrollIntoView(); else window.scrollTo(0, 0);
}

function splitSections(body) {
  const parts = body.split(/^## (\d)\.\s*(.*)$/m);      // [pre, num, title, body, num, title, body...]
  const secs = {};
  for (let k = 1; k < parts.length; k += 3) secs[+parts[k]] = { title: parts[k + 1].trim(), body: parts[k + 2] };
  return { pre: parts[0], secs };
}
// Các mục hiển thị của một bệnh: tách "Theo dõi" khỏi mục 8
function diseaseParts(n) {
  const { pre, secs } = splitSections(n.body), out = { ...secs };
  if (secs[8]) {
    const parts = secs[8].body.split(/^(?=###\s)/m);
    const follow = parts.filter(p => FOLLOW_RE.test(p.replace(/^###\s+/, "")));
    out[8] = { title: "Tiên lượng – Dự phòng", body: parts.filter(p => !follow.includes(p)).join("") };
    if (follow.length) out[10] = { title: "Theo dõi đánh giá", body: follow.join("") };
  }
  return { pre, secs: out };
}
// Phần Tóm tắt (trước các thẻ gập nguồn / tự kiểm tra) và nội dung một thẻ gập theo tên
function summaryOnly(body) { const cut = body.search(/^@@fold!?\s+(Nguồn|Tự kiểm tra)/m); return cut >= 0 ? body.slice(0, cut) : body; }
function foldBody(body, prefix) {
  const L = body.split("\n"), re = new RegExp("^@@fold!?\\s+" + prefix, "i"), i = L.findIndex(l => re.test(l.trim()));
  if (i < 0) return "";
  let d = 1, j = i + 1;
  for (; j < L.length; j++) { const t = L[j].trim(); if (/^@@(tabs|fold)/.test(t)) d++; else if (t === "@@end" && --d === 0) break; }
  return L.slice(i + 1, j).join("\n");
}

function diseasePage(n, sec) {
  const { pre, secs } = diseaseParts(n);
  const have = SECS.filter(([num]) => secs[num]).map(([num]) => num);
  const isSummary = +sec === 9 && secs[9];
  sec = isSummary ? 9 : (secs[sec] ? sec : have[0]);
  const khung = (n.khung || []).map(k => `<a class="chip wide" href="#/khung/${k}">Khung STT ${k}</a>`).join("");
  pushRecent(n.id, sec);
  const mod = n.module, body = isSummary ? summaryOnly(secs[9].body) : secs[sec].body;
  const col = `var(--${SECCOL[sec]})`, cont = withToc(md(relabel(body)));
  $("#main").innerHTML = `${crumb([{ t: "Trang chủ", href: "#/" }, { t: MODULES[mod] || mod, href: `#/m/${mod}/1` }, { t: "5 Bệnh học", href: `#/m/${mod}/5` }])}
    <header class="cover" style="--c:var(--s5)">
    <h1>${esc(n.title)}</h1>
    <div class="meta">${n.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")} ${khung}</div></header>
    <div class="dtabs">${SECS.filter(([num]) => secs[num]).map(([num, t, c]) => `<a class="dt${num === sec ? " on" : ""}" style="--c:var(--${c})" href="#/n/${n.id}/${num}"><b>${dnum(num)}</b> ${t}</a>`).join("")}${secs[9] ? `<a class="dt sum${isSummary ? " on" : ""}" href="#/n/${n.id}/9">★ Tóm tắt</a>` : ""}</div>
    ${!isSummary && sec === have[0] && pre.trim() ? `<div class="pre">${md(relabel(pre))}</div>` : ""}
    <div class="notepage" style="--c:${col}">${tocBox(cont.items)}${cont.html}</div>
    ${n.source ? `<p class="meta srcline">Nguồn: ${esc(n.source)}</p>` : ""}`;
  window.scrollTo(0, 0);
  return sec;
}

function note(id, sec) {
  const n = byId[id];
  if (!n) { $("#main").innerHTML = "<h1>Không tìm thấy bài</h1>"; return; }
  if (n.kind === "disease") return diseasePage(n, +sec || 0);
  const k = sectionOfNote(n), mod = n.module, ms = MODSECS.find(s => s[0] === k);
  pushRecent(id, 0);
  if (n.kind === "foundation" && [2, 3, 4, 6].includes(k)) return modSection(mod, k, id);
  const cont = withToc(md(n.body));
  $("#main").innerHTML = `${crumb([{ t: "Trang chủ", href: "#/" }, { t: MODULES[mod] || mod, href: `#/m/${mod}/1` }, ...(k > 1 ? [{ t: `${k} ${ms[1]}`, href: `#/m/${mod}/${k}` }] : [{ t: "1 Tổng quan" }])])}
    <header class="cover" style="--c:var(--s${k})">
    <h1>${esc(n.title)}</h1>
    <div class="meta">${n.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}${n.source ? ` Nguồn: ${esc(n.source)}` : ""}</div></header>
    <div class="notepage" style="--c:var(--s${k})">${tocBox(cont.items)}${cont.html}</div>`;
  window.scrollTo(0, 0);
}

function cards() {
  const due = dueCards().sort(() => Math.random() - .5);
  const p = prog();
  const el = $("#main");
  if (!due.length) { el.innerHTML = `<h1>Ôn thẻ</h1><div class="box">Hết thẻ đến hạn. Tổng ${allCards.length} thẻ.</div>`; return; }
  const c = due[0];
  el.innerHTML = `<h1>Ôn thẻ</h1><p class="meta">Còn ${due.length} thẻ đến hạn / ${allCards.length}. Từ bài <a href="#/n/${c.note}">${esc(byId[c.note].title)}</a></p>
    <div class="box"><h3 style="margin-top:0">${inline(c.q)}</h3><div id="ans" style="display:none">${inline(c.a)}</div></div>
    <div class="btns" id="b1"><button class="b p" id="show">Xem đáp án</button></div>
    <div class="btns" id="b2" style="display:none"><button class="b" id="no">Chưa nhớ</button><button class="b p" id="yes">Nhớ</button></div>`;
  $("#show").onclick = () => { $("#ans").style.display = "block"; $("#b1").style.display = "none"; $("#b2").style.display = "flex"; };
  const rate = ok => { const box = ok ? Math.min((p[c.id]?.box ?? 0) + 1, 4) : 0; p[c.id] = { box, due: Date.now() + DAYS[box] * DAY }; store.set("ykkb_cards", p); badge(); cards(); };
  $("#yes").onclick = () => rate(true); $("#no").onclick = () => { p[c.id] = { box: 0, due: Date.now() + 60e3 }; store.set("ykkb_cards", p); cards(); };
}

// ---- sơ đồ liên kết ----
let raf = 0;
const GROUPS = [
  ["", "Tất cả"],
  ["chung", "Chỉ bài chung (nền tảng, tiếp cận)"],
  ["vu", "Chung + Ung thư vú"],
  ["cotucung", "Chung + Ung thư cổ tử cung"],
  ["daitruc", "Chung + Ung thư đại trực tràng"],
  ["phoi", "Chung + Ung thư phổi"],
];
const groupOf = id => (byId[id] && byId[id].disease) || "chung";
let graphFilter = "";
function graph() {
  $("#main").style.maxWidth = "none";
  $("#main").innerHTML = `<h1>Sơ đồ liên kết</h1><div class="legend meta">${LAYERS.map(([k, n]) => `<span><i class="dot" style="background:${css(k)}"></i>${n.split(" (")[0]}</span>`).join("")}</div>
    <p class="meta"><select id="gf">${GROUPS.map(([k, n]) => `<option value="${k}" ${k === graphFilter ? "selected" : ""}>${n}</option>`).join("")}</select> Rê chuột vào một nút để xem tên và các bài liên kết; bấm để mở bài.</p><canvas id="cv"></canvas>`;
  $("#gf").onchange = e => { graphFilter = e.target.value; cancelAnimationFrame(raf); graph(); };
  const cv = $("#cv"), ctx = cv.getContext("2d"), dpr = devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
  const col = Object.fromEntries(LAYERS.map(([k]) => [k, css(k)]));
  const ly = Object.fromEntries(LAYERS.map(([k], i) => [k, (i + .5) / LAYERS.length]));
  const keep = n => !graphFilter || (graphFilter === "chung" ? groupOf(n.id) === "chung" : (groupOf(n.id) === "chung" || groupOf(n.id) === graphFilter));
  const list = NOTES.filter(keep);
  const nodes = list.map((n, i) => ({ n, x: W / 2 + Math.cos(i * 2.4) * (W / 3), y: H * ly[n.layer] + Math.sin(i) * 30, vx: 0, vy: 0 }));
  const idx = Object.fromEntries(nodes.map((o, i) => [o.n.id, i]));
  const edges = list.filter(n => n.id !== "ung-buou-tong-quan").flatMap(n => (out[n.id] || []).filter(t => t in idx).map(t => [idx[n.id], idx[t]]));
  const nb = nodes.map(() => new Set());
  edges.forEach(([i, j]) => { nb[i].add(j); nb[j].add(i); });
  const rep = 90000 / Math.max(1, Math.sqrt(nodes.length) * 4);
  let hov = -1, ticks = 0;
  const step = () => {
    for (const a of nodes) for (const b of nodes) if (a !== b) {
      let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 40; const f = rep / d2;
      a.vx += dx / Math.sqrt(d2) * f; a.vy += dy / Math.sqrt(d2) * f;
    }
    for (const [i, j] of edges) { const a = nodes[i], b = nodes[j], dx = b.x - a.x, dy = b.y - a.y; a.vx += dx * .004; a.vy += dy * .004; b.vx -= dx * .004; b.vy -= dy * .004; }
    for (const o of nodes) { o.vy += (H * ly[o.n.layer] - o.y) * .03; o.vx += (W / 2 - o.x) * .0006; o.x = Math.max(30, Math.min(W - 30, o.x + (o.vx *= .6))); o.y = Math.max(20, Math.min(H - 20, o.y + (o.vy *= .6))); }
  };
  const draw = () => {
    if (ticks++ < 400) step();
    ctx.clearRect(0, 0, W, H);
    const line = css("line"), ink = css("ink"), acc = css("accent");
    for (const [i, j] of edges) { const a = nodes[i], b = nodes[j], on = hov === i || hov === j; ctx.strokeStyle = on ? acc : line; ctx.globalAlpha = hov < 0 || on ? 1 : .35; ctx.lineWidth = on ? 2 : 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.font = "13px system-ui"; ctx.textAlign = "center";
    nodes.forEach((o, i) => { const near = hov >= 0 && (i === hov || nb[hov].has(i)); ctx.globalAlpha = hov < 0 || near ? 1 : .35; ctx.fillStyle = col[o.n.layer]; ctx.beginPath(); ctx.arc(o.x, o.y, i === hov ? 9 : 6, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    nodes.forEach((o, i) => { if (hov >= 0 && (i === hov || nb[hov].has(i))) { const t = o.n.title.length > 40 ? o.n.title.slice(0, 39) + "…" : o.n.title, w = ctx.measureText(t).width + 8; ctx.fillStyle = css("panel"); ctx.globalAlpha = .92; ctx.fillRect(o.x - w / 2, o.y + 9, w, 18); ctx.globalAlpha = 1; ctx.fillStyle = ink; ctx.fillText(t, o.x, o.y + 22); } });
    raf = requestAnimationFrame(draw);
  };
  const pick = e => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; return nodes.findIndex(o => (o.x - x) ** 2 + (o.y - y) ** 2 < 150); };
  cv.onmousemove = e => { hov = pick(e); cv.style.cursor = hov >= 0 ? "pointer" : "default"; };
  cv.onclick = e => { const i = pick(e); if (i >= 0) location.hash = "#/n/" + nodes[i].n.id; };
  draw();
}

// ---- thanh module: Ung bướu › 1 … 5 ----
function renderModbar(active) {
  const mod = Object.keys(MODULES)[0];
  $("#modbar").innerHTML = `<a class="modname" href="#/m/${mod}/1">${esc(MODULES[mod] || mod)}<i>›</i></a>` +
    MODSECS.map(([n, t]) => `<a class="modsec${n === active ? " on" : ""}" style="--c:var(--s${n})" href="#/m/${mod}/${n}"><b>${n}</b>${esc(t)}</a>`).join("");
  const on = $("#modbar .modsec.on"); if (on) on.scrollIntoView({ inline: "center", block: "nearest" });   // khổ hẹp: cuộn tới mục đang chọn
}

// ---- định tuyến ----
function route() {
  cancelAnimationFrame(raf);
  window.scrollTo(0, 0);   // chuyển trang luôn bắt đầu từ đầu trang (mục/bài có điểm đến sẽ tự cuộn sau)
  $("#main").style.maxWidth = ""; $("#side").classList.remove("open");
  let h = decodeURIComponent(location.hash.slice(1)) || "/";
  if (h === "/pareto") h = "/m/ung-buou/7";
  const m = h.match(/^\/n\/([^/]+)(?:\/(\d+))?$/), mm = h.match(/^\/m\/([^/]+)\/(\d)$/);
  let sec = 0, modActive = 0;
  const kh = h.match(/^\/khung(?:\/(\d+))?$/);
  if (kh) { $("#main").style.maxWidth = "1000px"; window.renderKhung($("#main"), kh[1]); }
  else if (mm) {
    const k = +mm[2], ov = NOTES.find(n => n.module === mm[1] && n.kind === "overview");
    modActive = k;
    if (k === 1 && ov) note(ov.id); else modSection(mm[1], k);
  }
  else if (m) { sec = note(m[1], m[2]) || 0; modActive = byId[m[1]] ? sectionOfNote(byId[m[1]]) : 0; }
  else if (h === "/graph") graph(); else if (h === "/cards") cards(); else home();
  const navKey = kh ? "khung" : h === "/graph" ? "graph" : h === "/cards" ? "cards" : (mm && +mm[2] === 7) ? "summary" : (!m && !mm) ? "home" : "";
  document.querySelectorAll("[data-nav]").forEach(x => x.classList.toggle("on", x.dataset.nav === navKey));
  renderModbar(modActive);
  tree(m && m[1], sec || (m && +m[2]) || 0);
  const bd = $("#build"); if (bd) bd.textContent = window.BUILD ? "Bản dựng: " + window.BUILD : "";
  badge();
}
addEventListener("hashchange", route);
route();
})();
