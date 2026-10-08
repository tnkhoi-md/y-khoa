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
const LNAME = Object.fromEntries(LAYERS);
// Khung các mục của một chuyên khoa (module)
const SECS = [
  [3, "Bệnh học", "benh"],
  [4, "Triệu chứng học", "trieuchung"],
  [5, "Cận lâm sàng", "cls"],
  [6, "Chẩn đoán – Chẩn đoán phân biệt", "cls"],
  [7, "Điều trị", "dieutri"],
  [8, "Tiên lượng – Dự phòng", "phacdo"],
  [9, "Tóm tắt cốt lõi (Pareto 80/20)", "nen"],
];
const SECNAME = Object.fromEntries(SECS.map(([n, t]) => [n, t]));
const SECCOL = Object.fromEntries(SECS.map(([n, , c]) => [n, c]));
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

// ---- liên kết hai chiều ----
const out = {}, back = {};
NOTES.forEach(n => {
  out[n.id] = [...new Set([...n.body.matchAll(/\[\[([^\]|]+)/g)].map(m => resolve(m[1])).filter(Boolean).map(x => x.id))]
    .filter(id => id !== n.id);
  out[n.id].forEach(t => (back[t] ||= []).push(n.id));
});

// ---- markdown mở rộng: hộp màu, đánh dấu, tab, thẻ gập, danh sách lồng ----
const CALL = { key: "Ý chính", warn: "Lưu ý – bẫy thi", tip: "Mẹo nhớ", ext: "Tham khảo ngoài tài liệu", doc: "Theo văn bản Bộ Y tế", note: "Ghi chú", red: "Cấp cứu – nguy hiểm" };
const inline = s => esc(s)
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/\*([^*\s][^*]*)\*/g, "<em>$1</em>")
  .replace(/==([^=]+)==/g, "<mark>$1</mark>")
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
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) { closeLists(); h.push(`<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`); i++; continue; }
    if (/^---+$/.test(t)) { closeLists(); h.push("<hr>"); i++; continue; }
    if (t.startsWith("|")) {
      closeLists();
      const rows = [];
      while (i < L.length && L[i].trim().startsWith("|")) rows.push(L[i++].trim());
      const cells = r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
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
        const type = CALL[c[1]] ? c[1] : "note", body = [c[2], ...q.slice(1)].filter((x, k) => k || x);
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

// bấm tab trong nội dung
document.addEventListener("click", e => {
  const b = e.target.closest(".tabbtn");
  if (!b) return;
  const box = b.closest(".tabs"), k = b.dataset.t;
  box.querySelectorAll(":scope > .tabbar > .tabbtn").forEach(x => x.classList.toggle("on", x === b));
  box.querySelectorAll(":scope > .tabpanel").forEach(x => x.classList.toggle("on", x.dataset.t === k));
});

// ---- thanh bên: mục lục thu gọn theo khung 1–9 ----
function pill(layer) { return `<span class="pill" style="background:${css(layer)}">${LNAME[layer]?.split(" (")[0] || layer}</span>`; }
const diseases = () => NOTES.filter(n => n.kind === "disease").sort((a, b) => (a.order || 99) - (b.order || 99));
const GROUP_ORDER = ["Cơ chế và nguyên nhân", "Giải phẫu bệnh, xâm lấn, di căn, miễn dịch", "Triệu chứng và chẩn đoán chung", "Phòng ngừa và tầm soát"];
function tree(cur, sec) {
  const mods = [...new Set(NOTES.map(n => n.module))];
  const curN = byId[cur];
  $("#tree").innerHTML = mods.map(mod => {
    const ns = NOTES.filter(n => n.module === mod);
    const ov = ns.filter(n => n.kind === "overview"), fo = ns.filter(n => n.kind === "foundation"), di = diseases().filter(n => n.module === mod);
    const other = ns.filter(n => !n.kind);
    const link = (n, s) => `<a href="#/n/${n.id}${s ? "/" + s : ""}" class="${n.id === cur && (!s || +s === sec) ? "on" : ""}">${esc(n.short || n.title)}</a>`;
    const foOpen = curN && curN.kind === "foundation";
    const groups = [...new Set(fo.map(n => n.group || "Khác"))].sort((a, b) => (GROUP_ORDER.indexOf(a) + 99) % 99 - (GROUP_ORDER.indexOf(b) + 99) % 99);
    return `<details class="mod" open><summary>${esc(MODULES[mod] || mod)}</summary>
      ${ov.map(n => `<a href="#/n/${n.id}" class="top ${n.id === cur ? "on" : ""}"><b>1</b> Tổng quan module</a>`).join("")}
      <details${foOpen ? " open" : ""}><summary><b>2</b> Nền tảng <small>${fo.length}</small></summary>${groups.map(g => `<div class="lay">${esc(g)}</div>` + fo.filter(n => (n.group || "Khác") === g).sort((a, b) => (a.order || 99) - (b.order || 99)).map(n => link(n)).join("")).join("")}</details>
      ${SECS.map(([num, name, c]) => `<details${curN && curN.kind === "disease" && sec === num ? " open" : ""}><summary style="--c:var(--${c})"><b>${num}</b> ${name}</summary>${di.map(n => link(n, num)).join("")}</details>`).join("")}
      ${other.length ? `<details><summary>Khác <small>${other.length}</small></summary>${other.map(n => link(n)).join("")}</details>` : ""}
    </details>`;
  }).join("");
}
// ---- thanh công cụ: tìm kiếm, cài đặt hiển thị, điều hướng dưới (điện thoại) ----
const noDia = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
const plain = s => s.replace(/\{\{\+?[^}]*\}\}/g, "").replace(/==|\*\*|\{[rgbop]\|/g, "").replace(/[{}>@#|\[\]!`]/g, " ").replace(/\s+/g, " ").trim();
NOTES.forEach(n => { n._t = noDia(n.title + " " + (n.short || "")); n._g = noDia(n.tags.join(" ")); n._b = noDia(n.body); });
function secAt(n, pos) {
  if (n.kind !== "disease") return 0;
  let s = 0, m; const re = /^## (\d)\./gm;
  while ((m = re.exec(n.body)) && m.index <= pos) s = +m[1];
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
    const where = n.kind === "disease" ? (sec ? `${sec} ${SECNAME[sec]}` : "Trang bệnh") : (n.kind === "overview" ? "Tổng quan" : (n.group || "Nền tảng"));
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
const toggleSide = () => $("#side").classList.toggle("open");
$("#menuBtn").onclick = toggleSide; $("#bnMenu").onclick = toggleSide;
$("#bnSearch").onclick = e => { e.stopPropagation(); focusSearch(); };
// cỡ chữ và giao diện (lưu trên từng thiết bị)
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } }, lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
function applyPrefs() {
  const fs = parseFloat(lsGet("ykkb_fs")) || 1, th = lsGet("ykkb_theme") || "auto";
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
function badge() { const n = dueCards().length; $("#dueBadge").textContent = n || ""; }

// ---- trang ----
function home() {
  const ds = diseases(), mod = Object.keys(MODULES)[0], mname = MODULES[mod] || mod;
  const ov = NOTES.find(n => n.kind === "overview"), fo = NOTES.filter(n => n.kind === "foundation").length;
  const nKhung = window.KHUNG ? window.KHUNG.items.length : 128;
  const recent = (store.get(RK, []) || []).map(r => ({ ...r, n: byId[r.id] })).filter(r => r.n).slice(0, 4);
  const due = dueCards().length;
  const hasPareto = d => /^## 9\.[^\n]*Pareto/m.test(d.body);
  $("#main").style.maxWidth = "1080px";
  $("#main").innerHTML = `
  <section class="hero">
    <div class="herotxt"><h1>Y khoa KB</h1><p>Kho kiến thức ôn thi chứng chỉ hành nghề bác sĩ đa khoa: từ nền tảng đến phác đồ, mỗi bệnh một trang có tab.</p></div>
    <button class="herosearch" id="heroSearch"><span>⌕</span> Tìm bài, bệnh, thuốc… <kbd>/</kbd></button>
    <div class="stats"><div><b>${NOTES.length}</b><span>bài</span></div><div><b>${ds.length}</b><span>bệnh</span></div><div><b>${fo}</b><span>bài nền tảng</span></div><div><b>${nKhung}</b><span>vấn đề khung thi</span></div></div>
  </section>
  ${recent.length ? `<section><h2>Tiếp tục</h2><div class="rgrid">${recent.map(r => `<a class="rcard" href="#/n/${r.id}${r.sec ? "/" + r.sec : ""}"><small>${r.sec ? r.sec + " · " + SECNAME[r.sec] : esc(r.n.group || (r.n.kind === "overview" ? "Tổng quan" : "Bài"))}</small><b>${esc(r.n.short || r.n.title)}</b></a>`).join("")}</div></section>` : ""}
  <section><h2>Chuyên khoa</h2>
    <article class="spec"><div class="spechead"><span class="sdot"></span><div><h3>${esc(mname)}</h3><small>${ds.length} bệnh · ${fo} bài nền tảng · khung 1–9</small></div>
      <div class="specact">${ov ? `<a class="btn p" href="#/n/${ov.id}">Tổng quan module</a>` : ""}<a class="btn" href="#/pareto">Ôn nhanh Pareto</a></div></div>
      <ol class="stepper"><li><b>1</b>Tổng quan</li><li><b>2</b>Nền tảng</li>${SECS.map(([n, t, c]) => `<li style="--c:var(--${c})"><b>${n}</b>${esc(t.replace(/ \(Pareto 80\/20\)/, ""))}</li>`).join("")}</ol>
    </article>
  </section>
  <section><h2>Bệnh</h2>
    <div class="dgrid">${ds.map(d => { const { secs } = splitSections(d.body); return `<article class="dcard"><a class="dtitle" href="#/n/${d.id}/3">${esc(d.short || d.title)}</a>
      <div class="dchips">${SECS.map(([n, t, c]) => secs[n] ? `<a class="chip" style="--c:var(--${c})" href="#/n/${d.id}/${n}" title="${n}. ${esc(t)}">${n}</a>` : `<span class="chip off" title="${n}. ${esc(t)} (chưa có)">${n}</span>`).join("")}</div>
      <div class="dfoot">${hasPareto(d) ? `<a class="pill9" href="#/n/${d.id}/9">★ Pareto</a>` : '<span class="meta">Pareto: chưa có</span>'}${(d.khung || []).map(k => `<a class="chip wide" href="#/khung/${k}">STT ${k}</a>`).join("")}</div></article>`; }).join("")}</div>
    <p class="legend2 meta">${SECS.map(([n, t, c]) => `<span><i class="dot" style="background:var(--${c})"></i>${n} ${esc(t.replace(/ \(Pareto 80\/20\)/, ""))}</span>`).join("")}</p>
  </section>
  <section><h2>Công cụ</h2>
    <div class="tiles">
      <a class="tile" href="#/khung"><b>Khung 128 vấn đề</b><span>QĐ 22 + sách, lọc theo ung bướu</span></a>
      <a class="tile" href="#/pareto"><b>Ôn nhanh Pareto</b><span>20% kiến thức mang 80% điểm</span></a>
      <a class="tile" href="#/graph"><b>Sơ đồ liên kết</b><span>Mắc xích giữa các bài</span></a>
      <a class="tile" href="#/cards"><b>Ôn thẻ</b><span>${due} thẻ đến hạn</span></a>
    </div>
  </section>`;
  $("#heroSearch").onclick = focusSearch;
}

function pareto() {
  const ds = diseases();
  const parts = ds.map((d, i) => {
    const { secs } = splitSections(d.body), s9 = secs[9];
    if (!s9 || !/Pareto/.test(s9.title)) return "";
    let body = s9.body; const cut = body.search(/^@@fold!?\s+(Nguồn|Tự kiểm tra)/m);
    if (cut >= 0) body = body.slice(0, cut);
    return `<details class="fold pareto"${i === 0 ? " open" : ""}><summary>${esc(d.short || d.title)} <a class="chip wide" href="#/n/${d.id}/9">mở trang bệnh</a></summary>${md(body)}</details>`;
  }).join("");
  $("#main").innerHTML = `${crumb([{ t: "Trang chủ", href: "#/" }, { t: "Ôn nhanh Pareto" }])}<h1>Ôn nhanh Pareto 80/20</h1>
    <p class="meta">20% kiến thức mang 80% điểm: tóm tắt cốt lõi mục 9 của từng bệnh, đọc một lượt trước khi thi. Chi tiết và nguồn xem trang bệnh.</p>${parts || "<p>Chưa có mục 9 nào.</p>"}`;
}

function related(id) {
  const grp = ids => LAYERS.map(([k]) => {
    const xs = ids.map(i => byId[i]).filter(x => x && x.layer === k);
    return xs.length ? xs.map(x => `<a href="#/n/${x.id}">${pill(x.layer)} ${esc(x.title)}</a>`).join("") : "";
  }).join("") || "<small>Chưa có.</small>";
  return `<div class="links"><section><h4>Nối tới →</h4>${grp(out[id] || [])}</section><section><h4>← Được dẫn từ</h4>${grp(back[id] || [])}</section></div>`;
}

function splitSections(body) {
  const parts = body.split(/^## (\d)\.\s*(.*)$/m);      // [pre, num, title, body, num, title, body...]
  const secs = {};
  for (let k = 1; k < parts.length; k += 3) secs[+parts[k]] = { title: parts[k + 1].trim(), body: parts[k + 2] };
  return { pre: parts[0], secs };
}

function diseasePage(n, sec) {
  const { pre, secs } = splitSections(n.body);
  const have = SECS.filter(([num]) => secs[num]).map(([num]) => num);
  sec = secs[sec] ? sec : have[0];
  const khung = (n.khung || []).map(k => `<a class="chip wide" href="#/khung/${k}">Khung STT ${k}</a>`).join("");
  pushRecent(n.id, sec);
  $("#main").innerHTML = `<div class="dhead">${crumb([{ t: "Trang chủ", href: "#/" }, { t: MODULES[n.module] || n.module, href: "#/n/ung-buou-tong-quan" }, { t: sec + ". " + SECNAME[sec] }, { t: n.short || n.title }])}
    <h1>${esc(n.title)}</h1>
    <div class="meta">${n.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")} ${khung}</div></div>
    <div class="dtabs">${SECS.filter(([num]) => secs[num]).map(([num, t, c]) => `<a class="dt${num === sec ? " on" : ""}" style="--c:var(--${c})" href="#/n/${n.id}/${num}"><b>${num}</b> ${t}</a>`).join("")}</div>
    ${sec === have[0] && pre.trim() ? `<div class="pre">${md(pre)}</div>` : ""}
    <h2 class="sech" style="--c:var(--${SECCOL[sec]})">${sec}. ${esc(secs[sec].title || SECNAME[sec])}</h2>
    ${md(secs[sec].body)}
    ${n.source ? `<p class="meta srcline">Nguồn: ${esc(n.source)}</p>` : ""}
    <details class="fold"><summary>Liên kết tới bài khác</summary>${related(n.id)}</details>`;
  window.scrollTo(0, 0);
  return sec;
}

function note(id, sec) {
  const n = byId[id];
  if (!n) { $("#main").innerHTML = "<h1>Không tìm thấy bài</h1>"; return; }
  if (n.kind === "disease") return diseasePage(n, +sec || 0);
  pushRecent(n.id, 0);
  $("#main").innerHTML = `${crumb([{ t: "Trang chủ", href: "#/" }, { t: MODULES[n.module] || n.module }, { t: n.kind === "overview" ? "1 Tổng quan" : "2 Nền tảng" + (n.group ? " · " + n.group : "") }])}${pill(n.layer)}
    <h1>${esc(n.title)}</h1>
    <div class="meta">${n.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}${n.source ? ` Nguồn: ${esc(n.source)}` : ""}</div>
    ${md(n.body)}
    ${related(id)}`;
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

// ---- định tuyến ----
function route() {
  cancelAnimationFrame(raf);
  $("#main").style.maxWidth = ""; $("#side").classList.remove("open");
  const h = decodeURIComponent(location.hash.slice(1)) || "/", m = h.match(/^\/n\/([^/]+)(?:\/(\d))?$/);
  let sec = 0;
  const kh = h.match(/^\/khung(?:\/(\d+))?$/);
  if (kh) { $("#main").style.maxWidth = "1000px"; window.renderKhung($("#main"), kh[1]); }
  else if (m) sec = note(m[1], m[2]) || 0; else if (h === "/graph") graph(); else if (h === "/cards") cards(); else if (h === "/pareto") pareto(); else home();
  const navKey = kh ? "khung" : h === "/graph" ? "graph" : h === "/cards" ? "cards" : h === "/pareto" ? "pareto" : !m ? "home" : "";
  document.querySelectorAll("[data-nav]").forEach(x => x.classList.toggle("on", x.dataset.nav === navKey));
  tree(m && m[1], sec || (m && +m[2]) || 0);
  const bd = $("#build"); if (bd) bd.textContent = window.BUILD ? "Bản dựng: " + window.BUILD : "";
  badge();
}
addEventListener("hashchange", route);
route();
})();
