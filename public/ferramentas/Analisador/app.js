(function () {
  var A = window.Analisador, S = window.S21;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var seq = 0;
  function uid(prefix) { seq++; return prefix + Date.now().toString(36) + seq; }

  var state = blank(), dirty = false, addTo = null, openAreas = {};
  function blank() { return { congregation: "", period: { from: "", to: "" }, studyRule: "last", scope: "all", groups: [{ id: "g1", name: "Grupo 1", overseer: "", note: "" }], pioneersNote: "", notes: "", cards: [] }; }
  function touch() { dirty = true; }

  function areaName(id) {
    if (id === "rp") return "Pioneiros regulares";
    var g = state.groups.filter(function (x) { return x.id === id; })[0];
    return g ? (g.name || "Grupo sem nome") : "";
  }
  function areas() { return state.groups.map(function (g) { return { id: g.id, name: g.name || "Grupo sem nome" }; }).concat([{ id: "rp", name: "Pioneiros regulares" }]); }
  function cardsOf(id) { return state.cards.filter(function (p) { return p.area === id; }); }
  function say(text) { $("msg").textContent = text || ""; $("msg").hidden = !text; }

  // ---------- leitura dos PDFs (mesma do Conversor S-21) ----------
  async function readPdf(file) {
    var doc = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    var fields = {};
    doc.getForm().getFields().forEach(function (f) {
      var n = f.getName();
      try {
        if (f instanceof PDFLib.PDFCheckBox) fields[n] = f.isChecked();
        else if (f instanceof PDFLib.PDFTextField) fields[n] = f.getText() || "";
      } catch (e) {}
    });
    if (!("900_1_Text_SanSerif" in fields)) throw new Error("sem campos");
    return S.fromFields(fields, file.name);
  }
  function cardKey(p) { return [A.fullName(p).toLowerCase(), p.birth || "", S.serviceYearEnd(p.serviceYear) || p.serviceYear].join("|"); }

  async function addFiles(files, area) {
    var bad = [], dup = [], ok = 0;
    for (var i = 0; i < files.length; i++) {
      try {
        var p = await readPdf(files[i]);
        if (state.cards.some(function (q) { return cardKey(q) === cardKey(p); })) { dup.push(files[i].name); continue; }
        p.id = uid("c"); p.area = area; state.cards.push(p); ok++;
      } catch (e) { bad.push(files[i].name); }
    }
    if (ok) { touch(); openAreas[area] = true; }
    var parts = [];
    if (bad.length) parts.push("Não lidos (sem campos preenchíveis): " + bad.join(", "));
    if (dup.length) parts.push("Já adicionados (mesma pessoa e mesmo ano): " + dup.join(", "));
    say(parts.join(" · "));
    fixPeriod(); render();
  }

  // ---------- período ----------
  function fixPeriod() {
    var months = A.coveredMonths(state.cards), p = state.period;
    if (!months.length) { state.period = { from: "", to: "" }; return; }
    if (months.indexOf(p.from) < 0 || months.indexOf(p.to) < 0 || p.from > p.to) state.period = A.defaultPeriod(state.cards);
    if (!state.period.from) state.period = { from: months[0], to: months[months.length - 1] };
  }
  function renderPeriod() {
    var months = A.coveredMonths(state.cards);
    var opts = function (val) { return months.length ? months.map(function (k) { return '<option value="' + k + '"' + (k === val ? " selected" : "") + ">" + A.label(k) + "</option>"; }).join("") : '<option value="">—</option>'; };
    $("from").innerHTML = opts(state.period.from); $("to").innerHTML = opts(state.period.to);
    $("from").disabled = $("to").disabled = !months.length;
    if (!months.length) { $("periodInfo").textContent = "Adicione os cartões para escolher o período."; return; }
    var n = A.monthsBetween(state.period.from, state.period.to).length;
    var live = A.analyze(state.cards, { from: state.period.from, to: state.period.to }).months.length;
    $("periodInfo").textContent = n + (n === 1 ? " mês" : " meses") + " no período · " + live + " com relatório. Setembro a agosto = um ano de serviço.";
  }

  // ---------- cartões ----------
  function sel(key, val, opts) {
    return '<select data-k="' + key + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
  }
  function cardWarnings(p) {
    var w = S.warnings(p).slice();
    if (p.area === "rp" && p.status !== "Regular Pioneer") w.push("Não está marcado como pioneiro regular");
    if (p.area !== "rp" && p.status === "Regular Pioneer") w.push("Pioneiro regular: mova para “Pioneiros regulares”");
    return w;
  }
  var ST = { "Regular Pioneer": "Pioneiro regular", "Baptized Publisher": "Publicador batizado", "Unbaptized Publisher": "Publicador não batizado", "Continuous Auxiliary Pioneer": "Pioneiro auxiliar contínuo" };
  function cardHtml(p) {
    var w = cardWarnings(p);
    var role = p.appt === "Elder" ? "Ancião" : p.appt === "MS" ? "Servo ministerial" : "";
    var rows = p.months.map(function (m, j) {
      return '<tr data-m="' + j + '"><td>' + (m.month ? A.label(m.month).replace(/ \d\d(\d\d)$/, " $1") : S.MONTHS[j].slice(0, 3)) + "</td>" +
        '<td><input type="checkbox" data-mk="participated"' + (m.participated ? " checked" : "") + ' aria-label="Participou"></td>' +
        '<td><input inputmode="numeric" data-mk="studies" value="' + esc(m.studies) + '" aria-label="Estudos"></td>' +
        '<td><input type="checkbox" data-mk="auxiliary"' + (m.auxiliary ? " checked" : "") + ' aria-label="Pioneiro auxiliar"></td>' +
        '<td><input inputmode="decimal" data-mk="hours" value="' + esc(m.hours) + '" aria-label="Horas"></td>' +
        '<td><input data-mk="comments" value="' + esc(m.comments) + '" aria-label="Observações"></td></tr>';
    }).join("");
    var move = '<label class="full">Mover para' + sel("area", p.area, areas().map(function (a) { return [a.id, a.name]; })) + "</label>";
    return '<details class="card" data-id="' + p.id + '"><summary><div><strong>' + esc(A.fullName(p)) + "</strong>" +
      '<div class="sub">' + esc([p.serviceYear ? "Ano " + p.serviceYear : "", role, ST[p.status]].filter(Boolean).join(" · ")) + "</div></div>" +
      '<span class="badge ' + (w.length ? "warn" : "ok") + '">' + (w.length ? "⚠ " + w.length : "✓") + '</span></summary><div class="body">' +
      (w.length ? '<ul class="warns">' + w.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
      '<div class="grid">' + move +
      '<label>Primeiro nome<input data-k="firstname" value="' + esc(p.firstname) + '"></label>' +
      '<label>Sobrenome<input data-k="lastname" value="' + esc(p.lastname) + '"></label>' +
      '<label class="full">Nome do meio<input data-k="middlename" value="' + esc(p.middlename) + '"></label>' +
      '<label>Sexo' + sel("sex", p.sex, [["", "—"], ["Male", "Masculino"], ["Female", "Feminino"]]) + "</label>" +
      '<label>Designação' + sel("appt", p.appt, [["", "Nenhuma"], ["Elder", "Ancião"], ["MS", "Servo ministerial"]]) + "</label>" +
      '<label>Nascimento<input type="date" data-k="birth" value="' + esc(p.birth) + '"></label>' +
      '<label>Batismo<input type="date" data-k="baptism" value="' + esc(p.baptism) + '"></label>' +
      '<label class="full">Ano de serviço<input data-k="serviceYear" value="' + esc(p.serviceYear) + '" placeholder="Ex.: 2026/2027"></label>' +
      '<label class="full">Situação' + sel("status", p.status, [["Baptized Publisher", "Publicador batizado"], ["Unbaptized Publisher", "Publicador não batizado"], ["Regular Pioneer", "Pioneiro regular"], ["Continuous Auxiliary Pioneer", "Pioneiro auxiliar contínuo"]]) + "</label>" +
      '</div><table class="months"><thead><tr><th>Mês</th><th>Part.</th><th>Est.</th><th>P.A.</th><th>Horas</th><th>Obs.</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      '<button class="rm" data-rm>Remover este cartão</button></div></details>';
  }

  function areaHtml(id, g) {
    var list = cardsOf(id).slice().sort(function (a, b) { return A.fullName(a).localeCompare(A.fullName(b), "pt") || String(a.serviceYear).localeCompare(String(b.serviceYear)); });
    var people = A.people(list).length, open = !!openAreas[id];
    var count = list.length + (list.length === 1 ? " cartão" : " cartões") + (people !== list.length ? " · " + people + (people === 1 ? " pessoa" : " pessoas") : "");
    return '<div class="area" data-a="' + id + '"><div class="areahead">' +
      (g ? '<input data-g="name" value="' + esc(g.name) + '" aria-label="Nome do grupo" placeholder="Nome do grupo">' +
        '<input data-g="overseer" value="' + esc(g.overseer) + '" aria-label="Superintendente do grupo" placeholder="Superintendente do grupo">' : "") +
      '<span class="count">' + count + "</span></div>" +
      '<div class="arow"><button class="soft" data-add>⬆ Adicionar cartões</button><button class="soft" data-view aria-expanded="' + open + '"' + (list.length ? "" : " disabled") + ">" + (open ? "Ocultar cartões" : "Ver cartões") + "</button></div>" +
      '<div class="cards"' + (open && list.length ? "" : " hidden") + ">" + (open ? list.map(cardHtml).join("") : "") + "</div>" +
      (g && state.groups.length > 1 ? '<button class="rmgroup" data-delgroup>Remover grupo</button>' : "") + "</div>";
  }

  // ---------- resumo ----------
  function analysis(scope) { return A.analyze(state.cards, { from: state.period.from, to: state.period.to, studyRule: state.studyRule, area: scope || "all" }); }
  function renderSummary() {
    $("summaryBox").hidden = !state.cards.length;
    var scopes = [{ id: "all", name: "Geral" }].concat(areas());
    if (!scopes.some(function (s) { return s.id === state.scope; })) state.scope = "all";
    $("scope").innerHTML = scopes.map(function (s) { return '<option value="' + s.id + '"' + (s.id === state.scope ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("");
    $("rule").innerHTML = A.STUDY_RULES.map(function (r) { return '<option value="' + r.key + '"' + (r.key === state.studyRule ? " selected" : "") + ">" + esc(r.label) + "</option>"; }).join("");
    if (!state.cards.length) return;
    var r = analysis(state.scope);
    $("tiles").innerHTML = A.TILES.map(function (t) {
      var inner = "<b>" + r.counts[t.key] + "</b><span>" + esc(t.label) + "</span>";
      return t.list ? '<button class="tile" data-tile="' + t.key + '" aria-label="' + esc(t.label + ": " + r.counts[t.key] + ". Ver lista") + '">' + inner + "</button>" : '<div class="tile">' + inner + "</div>";
    }).join("");
  }
  function periodLabel() { return state.period.from ? A.label(state.period.from) + " a " + A.label(state.period.to) : ""; }
  function openList(key) {
    var t = A.TILES.filter(function (x) { return x.key === key; })[0], r = analysis(state.scope), items = r.lists[key] || [];
    $("sheetTitle").textContent = t.label + " · " + (state.scope === "all" ? "Geral" : areaName(state.scope)) + " · " + periodLabel();
    $("sheetBody").innerHTML = items.length ? items.map(function (i) {
      return '<div class="item"><strong>' + esc(i.name) + "</strong><small>" + esc(areaName(i.area)) + "</small><p>" + esc(i.detail) + "</p></div>";
    }).join("") : '<p class="muted">Ninguém neste período.</p>';
    if ($("sheet").showModal) $("sheet").showModal(); else $("sheet").setAttribute("open", "");
  }

  // ---------- anotações ----------
  function renderNotes() {
    var f = function (key, lbl, val) { return '<label class="notefield">' + esc(lbl) + '<textarea data-note="' + key + '" placeholder="Escreva aqui…">' + esc(val) + "</textarea></label>"; };
    $("notes").innerHTML = f("all", "Geral", state.notes) + state.groups.map(function (g) { return f(g.id, g.name || "Grupo sem nome", g.note); }).join("") + f("rp", "Pioneiros regulares", state.pioneersNote);
  }

  function render() {
    var openCards = Array.from(document.querySelectorAll(".card[open]")).map(function (d) { return d.dataset.id; });
    $("cong").value = state.congregation;
    renderPeriod();
    $("groups").innerHTML = state.groups.map(function (g) { return areaHtml(g.id, g); }).join("");
    $("pioneers").innerHTML = areaHtml("rp", null);
    openCards.forEach(function (id) { var d = document.querySelector('.card[data-id="' + id + '"]'); if (d) d.open = true; });
    renderSummary();
    renderNotes();
  }

  // ---------- eventos ----------
  $("cong").addEventListener("input", function (e) { state.congregation = e.target.value; touch(); });
  $("from").addEventListener("change", function (e) { state.period.from = e.target.value; if (state.period.from > state.period.to) state.period.to = state.period.from; touch(); render(); });
  $("to").addEventListener("change", function (e) { state.period.to = e.target.value; if (state.period.to < state.period.from) state.period.from = state.period.to; touch(); render(); });
  $("scope").addEventListener("change", function (e) { state.scope = e.target.value; renderSummary(); });
  $("rule").addEventListener("change", function (e) { state.studyRule = e.target.value; touch(); renderSummary(); });
  $("tiles").addEventListener("click", function (e) { var b = e.target.closest("[data-tile]"); if (b) openList(b.dataset.tile); });
  $("sheetClose").addEventListener("click", function () { $("sheet").close(); });
  $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) $("sheet").close(); });
  $("addGroup").addEventListener("click", function () {
    state.groups.push({ id: uid("g"), name: "Grupo " + (state.groups.length + 1), overseer: "", note: "" }); touch(); render();
    var last = document.querySelectorAll("#groups .area"); last = last[last.length - 1];
    if (last) { last.scrollIntoView({ block: "center", behavior: "smooth" }); last.querySelector('[data-g="name"]').select(); }
  });
  $("notes").addEventListener("input", function (e) {
    var k = e.target.dataset.note; if (!k) return;
    if (k === "all") state.notes = e.target.value; else if (k === "rp") state.pioneersNote = e.target.value;
    else state.groups.forEach(function (g) { if (g.id === k) g.note = e.target.value; });
    touch();
  });

  function areaOf(el) { var a = el.closest(".area"); return a && a.dataset.a; }
  function onAreas(e) {
    var el = e.target, id = areaOf(el); if (!id) return;
    if (e.type === "click") {
      if (el.closest("[data-add]")) { addTo = id; $("pdfs").click(); return; }
      if (el.closest("[data-view]")) { openAreas[id] = !openAreas[id]; render(); return; }
      if (el.closest("[data-delgroup]")) {
        var n = cardsOf(id).length;
        if (!confirm(n ? "Remover o grupo e os " + n + " cartões dele?" : "Remover este grupo?")) return;
        state.groups = state.groups.filter(function (g) { return g.id !== id; });
        state.cards = state.cards.filter(function (p) { return p.area !== id; });
        touch(); fixPeriod(); render(); return;
      }
      if (el.matches("[data-rm]")) {
        var c = el.closest(".card");
        if (confirm("Remover este cartão?")) { state.cards = state.cards.filter(function (p) { return p.id !== c.dataset.id; }); touch(); fixPeriod(); render(); }
      }
      return;
    }
    // change
    if (el.dataset.g) { state.groups.forEach(function (g) { if (g.id === id) g[el.dataset.g] = el.value.trim(); }); touch(); render(); return; }
    var card = el.closest(".card"); if (!card) return;
    var p = state.cards.filter(function (x) { return x.id === card.dataset.id; })[0]; if (!p) return;
    touch();
    if (el.dataset.k === "area") { p.area = el.value; openAreas[el.value] = true; render(); return; }
    if (el.dataset.k === "serviceYear") { S.setServiceYear(p, el.value); fixPeriod(); render(); return; }
    if (el.dataset.k) { p[el.dataset.k] = el.value; render(); return; }
    if (el.dataset.mk) {
      var m = p.months[Number(el.closest("tr").dataset.m)], k = el.dataset.mk;
      if (el.type === "checkbox") m[k] = el.checked;
      else if (k === "comments") m[k] = el.value.trim();
      else { var num = Number(el.value.replace(",", ".")); m[k] = el.value.trim() && isFinite(num) ? num : null; }
      renderSummary(); renderPeriod();
    }
  }
  ["groups", "pioneers"].forEach(function (id) { $(id).addEventListener("click", onAreas); $(id).addEventListener("change", onAreas); });
  $("pdfs").addEventListener("change", function (e) { var files = Array.from(e.target.files); e.target.value = ""; if (addTo && files.length) addFiles(files, addTo); });

  // ---------- salvar / abrir ----------
  function slug(s) { return (s || "congregacao").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "congregacao"; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function download(data, name, type) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: type }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  $("save").addEventListener("click", function () {
    if (!state.cards.length) { say("Adicione cartões antes de salvar."); return; }
    var data = { app: "visitasc-analisador", version: 1, savedAt: new Date().toISOString(), congregation: state.congregation, period: state.period, studyRule: state.studyRule, groups: state.groups, pioneersNote: state.pioneersNote, notes: state.notes, cards: state.cards };
    download(JSON.stringify(data), "analise-" + slug(state.congregation) + "-" + today() + ".json", "application/json;charset=utf-8");
    dirty = false; say("");
  });
  $("open").addEventListener("click", function () {
    if (dirty && state.cards.length && !confirm("Abrir outra análise? O que não foi salvo nesta será perdido.")) return;
    $("openFile").click();
  });
  $("openFile").addEventListener("change", async function (e) {
    var f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      var d = JSON.parse(await f.text());
      if (!d || d.app !== "visitasc-analisador" || !Array.isArray(d.cards) || !Array.isArray(d.groups)) throw new Error("formato");
      var groups = d.groups.filter(function (g) { return g && g.id; }).map(function (g) { return { id: String(g.id), name: String(g.name || ""), overseer: String(g.overseer || ""), note: String(g.note || "") }; });
      if (!groups.length) groups = blank().groups;
      var ids = groups.map(function (g) { return g.id; }).concat(["rp"]);
      var cards = d.cards.filter(function (p) { return p && Array.isArray(p.months) && p.months.length === 12; }).map(function (p) {
        if (!p.id) p.id = uid("c");
        if (ids.indexOf(p.area) < 0) p.area = groups[0].id;
        return p;
      });
      state = { congregation: String(d.congregation || ""), period: d.period || { from: "", to: "" }, studyRule: d.studyRule || "last", scope: "all", groups: groups, pioneersNote: String(d.pioneersNote || ""), notes: String(d.notes || ""), cards: cards };
      openAreas = {}; dirty = false; fixPeriod(); say(""); render();
    } catch (err) { say("Este arquivo não é uma análise salva pelo Analisador de congregações."); }
  });
  $("clear").addEventListener("click", function () {
    if (!confirm("Limpar grupos, cartões e anotações?")) return;
    state = blank(); openAreas = {}; dirty = false; say(""); render();
  });
  window.addEventListener("beforeunload", function (e) { if (dirty && state.cards.length) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- relatório PDF (pdf-lib) ----------
  function pdfSafe(t) {
    return String(t == null ? "" : t).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/›/g, ">").replace(/…/g, "...").replace(/[^\n\x20-\x7E\u00A0-\u00FF]/g, "");
  }
  async function buildPdf() {
    var doc = await PDFLib.PDFDocument.create();
    var font = await doc.embedFont(PDFLib.StandardFonts.Helvetica), bold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var W = 595.28, H = 841.89, M = 44, page, y;
    var grey = PDFLib.rgb(0.42, 0.42, 0.45), ink = PDFLib.rgb(0.1, 0.1, 0.12), line = PDFLib.rgb(0.85, 0.85, 0.88);
    function newPage() { page = doc.addPage([W, H]); y = H - M; }
    function need(h) { if (y - h < M + 14) newPage(); }
    function wrap(text, f, size, width) {
      var out = [];
      pdfSafe(text).split("\n").forEach(function (para) {
        var words = para.split(/\s+/), cur = "";
        words.forEach(function (w) {
          var t = cur ? cur + " " + w : w;
          if (f.widthOfTextAtSize(t, size) <= width) cur = t;
          else { if (cur) out.push(cur); while (f.widthOfTextAtSize(w, size) > width && w.length > 1) { var k = w.length; while (k > 1 && f.widthOfTextAtSize(w.slice(0, k), size) > width) k--; out.push(w.slice(0, k)); w = w.slice(k); } cur = w; }
        });
        out.push(cur);
      });
      return out;
    }
    function text(t, o) {
      o = o || {}; var size = o.size || 10, f = o.bold ? bold : font, x = M + (o.indent || 0);
      wrap(t, f, size, W - M - x).forEach(function (l) { need(size + 3); page.drawText(l, { x: x, y: y - size, size: size, font: f, color: o.color || ink }); y -= size + (o.gap == null ? 4 : o.gap); });
    }
    function fit(t, f, size, width) { t = pdfSafe(t); while (t.length > 1 && f.widthOfTextAtSize(t, size) > width) t = t.slice(0, -1); return t; }
    function rule() { need(10); page.drawLine({ start: { x: M, y: y - 4 }, end: { x: W - M, y: y - 4 }, thickness: 0.6, color: line }); y -= 10; }

    newPage();
    var rl = A.STUDY_RULES.filter(function (r) { return r.key === state.studyRule; })[0];
    var general = analysis("all");
    text("Análise da congregação" + (state.congregation ? " - " + state.congregation : ""), { size: 18, bold: true, gap: 6 });
    text("Período: " + periodLabel() + " (" + general.months.length + " meses com relatório)", { color: grey });
    text("Dirige estudos: " + (rl ? rl.label.toLowerCase() : ""), { color: grey });
    text("Gerado em " + today().split("-").reverse().join("/") + " pelo Analisador de congregações (VisitaSC). Dados lidos dos cartões S-21.", { color: grey, gap: 10 });

    // Tabela do resumo: Geral + cada área, até 5 colunas por tabela
    var scopes = [{ id: "all", name: "Geral" }].concat(areas()), results = {};
    scopes.forEach(function (s) { results[s.id] = s.id === "all" ? general : analysis(s.id); });
    text("Resumo", { size: 13, bold: true, gap: 6 });
    for (var i = 0; i < scopes.length; i += 5) {
      var cols = scopes.slice(i, i + 5), labW = 200, colW = (W - 2 * M - labW) / cols.length;
      need(16 + A.TILES.length * 15);
      cols.forEach(function (s, j) { page.drawText(fit(s.name, bold, 9, colW - 6), { x: M + labW + j * colW + 3, y: y - 9, size: 9, font: bold, color: ink }); });
      y -= 14; rule();
      A.TILES.forEach(function (t) {
        page.drawText(fit(t.label, font, 9.5, labW - 6), { x: M, y: y - 9.5, size: 9.5, font: font, color: ink });
        cols.forEach(function (s, j) { page.drawText(String(results[s.id].counts[t.key]), { x: M + labW + j * colW + 3, y: y - 9.5, size: 9.5, font: bold, color: ink }); });
        y -= 15;
      });
      y -= 8;
    }

    text("Listas (geral)", { size: 13, bold: true, gap: 6 });
    A.TILES.filter(function (t) { return t.list; }).forEach(function (t) {
      var items = general.lists[t.key];
      need(30); text(t.label + " (" + items.length + ")", { size: 11, bold: true, gap: 3 });
      if (!items.length) text("Ninguém neste período.", { indent: 10, color: grey, gap: 8 });
      items.forEach(function (it, n) { text(it.name + " - " + areaName(it.area), { indent: 10, bold: true, gap: 1 }); text(it.detail, { indent: 20, color: grey, gap: n === items.length - 1 ? 8 : 4 }); });
    });

    var notes = [["Geral", state.notes]].concat(state.groups.map(function (g) { return [g.name || "Grupo sem nome", g.note]; })).concat([["Pioneiros regulares", state.pioneersNote]]).filter(function (n) { return (n[1] || "").trim(); });
    if (notes.length) {
      need(40); text("Anotações do superintendente", { size: 13, bold: true, gap: 6 });
      notes.forEach(function (n) { text(n[0], { size: 11, bold: true, gap: 3 }); text(n[1].trim(), { indent: 10, gap: 8 }); });
    }

    var pages = doc.getPages();
    pages.forEach(function (pg, k) { pg.drawText(pdfSafe("Página " + (k + 1) + " de " + pages.length), { x: W - M - 70, y: 24, size: 8, font: font, color: grey }); });
    return doc.save();
  }
  $("pdf").addEventListener("click", async function () {
    if (!state.cards.length) { say("Adicione cartões antes de gerar o relatório."); return; }
    var b = $("pdf"); b.disabled = true;
    try { download(new Blob([await buildPdf()], { type: "application/pdf" }), "analise-" + slug(state.congregation) + "-" + today() + ".pdf"); }
    catch (err) { say("Não foi possível gerar o PDF. Tente de novo."); }
    finally { b.disabled = false; }
  });

  render();
})();
