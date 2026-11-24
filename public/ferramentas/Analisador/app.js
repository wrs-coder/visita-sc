(function () {
  var A = window.Analisador, S = window.S21;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var seq = 0;
  function uid(prefix) { seq++; return prefix + Date.now().toString(36) + seq; }

  var state = blank(), dirty = false, addTo = null, replaceId = null, openAreas = {};
  function blank() { return { congregation: "", period: { from: "", to: "" }, studyRule: "last", year: null, preset: "6m", active: "all", groups: [{ id: "g1", name: "Grupo 1", overseer: "", note: "" }], pioneersNote: "", notes: "", done: {}, cards: [] }; }
  function touch() { dirty = true; }

  function areaName(id) {
    if (id === "rp") return "Pioneiros regulares";
    var g = state.groups.filter(function (x) { return x.id === id; })[0];
    return g ? (g.name || "Grupo sem nome") : "";
  }
  function areas() { return A.sortGroups(state.groups).map(function (g) { return { id: g.id, name: g.name || "Grupo sem nome" }; }).concat([{ id: "rp", name: "Pioneiros regulares" }]); }
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

  /** Coloca um cartão lido: se a mesma pessoa e o mesmo ano já existem, atualiza. */
  function placeCard(p, area) {
    var old = state.cards.filter(function (q) { return cardKey(q) === cardKey(p); })[0];
    if (old) { p.id = old.id; p.area = old.area; state.cards[state.cards.indexOf(old)] = p; return "upd"; }
    p.id = uid("c"); p.area = area; state.cards.push(p); return "ok";
  }
  async function readInto(files, area) {
    var bad = [], upd = 0, ok = 0;
    for (var i = 0; i < files.length; i++) {
      try {
        if (placeCard(await readPdf(files[i]), area) === "upd") upd++; else ok++;
      } catch (e) { bad.push(files[i].name); }
    }
    return { bad: bad, upd: upd, ok: ok };
  }
  function isData(name) { return /\.(json|xml)$/i.test(name || ""); }
  /** Lê .json (Circuit Manager) ou .xml (TSWin) → grupos com cartões prontos. */
  async function readData(file) {
    var text = await file.text();
    if (/\.xml$/i.test(file.name)) return A.fromTswinXml(text, file.name);
    return A.fromCircuitJson(JSON.parse(text), file.name);
  }
  async function addFiles(files, area) {
    var data = files.filter(function (f) { return isData(f.name); });
    if (data.length) { previewImport(files.map(function (f) { return { path: f.name, file: f }; }), area); return; }
    var r = await readInto(files, area), bad = r.bad, upd = r.upd, ok = r.ok;
    if (ok || upd) touch();
    var parts = [];
    if (bad.length) parts.push("Não lidos (sem campos preenchíveis): " + bad.join(", "));
    if (upd || ok) parts.unshift((ok ? ok + (ok === 1 ? " novo" : " novos") : "") + (ok && upd ? ", " : "") + (upd ? upd + (upd === 1 ? " atualizado" : " atualizados") : ""));
    say(parts.join(" · "));
    fixPeriod(); render();
  }
  async function replaceCard(id, file) {
    var old = state.cards.filter(function (q) { return q.id === id; })[0]; if (!old) return;
    try {
      var p = await readPdf(file); p.id = old.id; p.area = old.area;
      state.cards[state.cards.indexOf(old)] = p; touch(); say("Cartão atualizado: " + A.fullName(p));
    } catch (e) { say("Não lido (sem campos preenchíveis): " + file.name); }
    fixPeriod(); render();
  }

  // ---------- período ----------
  function fixPeriod() {
    var ys = A.serviceYears(state.cards);
    if (!ys.length) { state.year = null; state.period = { from: "", to: "" }; return; }
    if (!state.preset) state.preset = "6m";
    if (state.preset === "custom" && state.period.from && state.period.to) return;
    if (state.preset === "6m") { state.period = A.lastMonths(state.cards, 6); if (state.period.from) return; state.preset = "year"; }
    if (ys.indexOf(state.year) < 0) state.year = ys[ys.length - 1];
    state.preset = "year";
    state.period = A.periodOf(state.year);
  }
  function renderPeriod() {
    var ys = A.serviceYears(state.cards);
    var pill = function (attr, on, txt) { return '<button class="pill" ' + attr + ' aria-pressed="' + on + '">' + txt + "</button>"; };
    $("years").innerHTML = pill('data-preset="6m"', state.preset === "6m", "6 meses") +
      ys.map(function (y) { return pill('data-year="' + y + '"', state.preset === "year" && y === state.year, "Ano " + y + "<small>" + (y - 1) + "/" + y + "</small>"); }).join("") +
      pill('data-preset="custom"', state.preset === "custom", "Outro");
    $("years").hidden = !ys.length; $("range").hidden = !ys.length;
    if (!ys.length) { $("periodInfo").textContent = "Adicione os cartões. O ano de serviço vem do cartão: “2026/2027” = ano 2027."; return; }
    var all = A.coveredMonths(state.cards);
    [state.period.from, state.period.to].forEach(function (k) { if (k && all.indexOf(k) < 0) all.push(k); });
    all.sort();
    var opts = function (sel) { return all.map(function (k) { return '<option value="' + k + '"' + (k === sel ? " selected" : "") + ">" + A.label(k) + "</option>"; }).join(""); };
    $("pFrom").innerHTML = opts(state.period.from); $("pTo").innerHTML = opts(state.period.to);
    var n = A.monthsBetween(state.period.from, state.period.to).length;
    var live = A.analyze(state.cards, { from: state.period.from, to: state.period.to }).months.length;
    var yrs = A.periodYears(state.period.from, state.period.to).map(function (y) { return (y - 1) + "/" + y; });
    $("periodInfo").textContent = periodLabel() + " · " + n + (n === 1 ? " mês" : " meses") + " (" + live + " com relatório) · Usa cartões " + yrs.join(" e ") + ".";
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
      '<div class="sub">' + esc([A.cardYear(p) ? "Ano " + A.cardYear(p) : "Ano não lido", role, ST[p.status]].filter(Boolean).join(" · ")) + "</div></div>" +
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
      '<div class="cardtools"><button class="soft" data-replace>⟳ Trocar por PDF novo</button><button class="rm" data-rm>Remover este cartão</button></div></div></details>';
  }

  function areaHtml(id, g) {
    var list = cardsOf(id).slice().sort(function (a, b) { return A.fullName(a).localeCompare(A.fullName(b), "pt") || String(a.serviceYear).localeCompare(String(b.serviceYear)); });
    var people = A.people(list).length, open = !!openAreas[id];
    var count = list.length + (list.length === 1 ? " cartão" : " cartões") + (people !== list.length ? " · " + people + (people === 1 ? " pessoa" : " pessoas") : "");
    return '<div class="area" data-a="' + id + '"><div class="areahead">' +
      (g ? '<input data-g="name" value="' + esc(g.name) + '" aria-label="Nome do grupo" placeholder="Nome do grupo">' +
        '<input data-g="overseer" value="' + esc(g.overseer) + '" aria-label="Superintendente do grupo" placeholder="Superintendente do grupo">' : "") +
      '<span class="count">' + count + "</span></div>" +
      '<div class="arow"><button class="soft" data-add>⬆ Importar S-21</button><button class="soft" data-view aria-expanded="' + open + '"' + (list.length ? "" : " disabled") + ">" + (open ? "Ocultar cartões" : "Ver cartões") + "</button></div>" +
      '<div class="cards"' + (open && list.length ? "" : " hidden") + ">" + (open ? list.map(cardHtml).join("") : "") + "</div>" +
      doneHtml(id) +
      (g && state.groups.length > 1 ? '<button class="rmgroup" data-delgroup>Remover grupo</button>' : "") + "</div>";
  }

  function doneHtml(id) {
    var d = state.done[id];
    if (d) return '<div class="donebar"><span>✓ Analisado em ' + esc(d.slice(8, 10) + "/" + d.slice(5, 7)) + '</span><button class="link" data-reopen>Reabrir</button></div>';
    return '<button class="primary finish" data-finish>✓ Encerrar análise ' + (id === "rp" ? "dos pioneiros" : "do grupo") + "</button>";
  }

  // ---------- totais mensais ----------
  function renderTotals() {
    var box = $("totalsBox");
    if (!state.cards.length) { box.hidden = true; return; }
    var t = A.monthlyTotals(state.cards, { from: state.period.from, to: state.period.to, area: state.active });
    box.hidden = !t.months.length; if (!t.months.length) return;
    var secs = A.TOTAL_SECTIONS.filter(function (s) { return state.active === "rp" ? s.key === "rp" : state.active === "all" ? true : s.key !== "rp"; });
    var head = "<tr><th></th>" + t.months.map(function (k) { return "<th>" + A.label(k).replace(/ \d\d(\d\d)$/, " $1") + "</th>"; }).join("") + "<th>Total</th></tr>";
    var body = secs.map(function (s) {
      return '<tr class="sec"><th colspan="' + (t.months.length + 2) + '">' + esc(s.label) + "</th></tr>" + s.rows.map(function (r) {
        var vals = t.months.map(function (k) { return t.rows[k][r[0]]; });
        var sum = vals.reduce(function (a, b) { return a + b; }, 0);
        var tot = /Reported$/.test(r[0]) ? "" : String(Math.round(sum * 10) / 10);
        return "<tr><th>" + esc(r[1]) + "</th>" + vals.map(function (v) { return "<td>" + (Math.round(v * 10) / 10) + "</td>"; }).join("") + "<td><b>" + tot + "</b></td></tr>";
      }).join("");
    }).join("");
    $("totalsTable").innerHTML = "<thead>" + head + "</thead><tbody>" + body + "</tbody>";
    $("totalsTitle").textContent = "Totais mensais — " + (state.active === "all" ? "Geral" : areaName(state.active));
  }

  // ---------- pioneiros regulares: meta anual ----------
  function rpYear() { return state.preset === "year" && state.year ? state.year : A.yearOfMonth(state.period.to); }
  function hrs(n) { return (Math.round(n * 10) / 10).toString().replace(".", ",") + " h"; }
  function rpRows(r) {
    return r.list.map(function (x) {
      var cls = x.diff < 0 ? "warn" : "ok", sign = x.diff < 0 ? "⚠ −" + hrs(-x.diff) : "✓ +" + hrs(x.diff);
      return '<button class="item tap goal" data-person="' + esc(x.id) + '"><div class="gtop"><strong>' + esc(x.name) + (x.late ? ' <small>(iniciou em ' + esc(A.label(x.start)) + ")</small>" : "") + '</strong><span class="badge ' + cls + '">' + sign + "</span></div>" +
        "<p>Feitas " + hrs(x.done) + " · Meta até agora " + hrs(x.goalNow) + (x.late ? " · Meta do ano " + hrs(x.goalYear) + " (" + (x.goalYear / 50) + " meses × 50)" : "") + "</p>" +
        "<p>Média " + hrs(x.avg) + "/mês" + (x.left ? " · precisa " + hrs(x.need) + "/mês até agosto" : "") + "</p></button>";
    }).join("");
  }
  function renderGoals() {
    var box = $("rpBox");
    var y = rpYear();
    if (state.active !== "rp" || !y) { box.hidden = true; return; }
    var r = A.pioneerYear(state.cards, y);
    box.hidden = false;
    $("rpHead").textContent = "Ano de serviço " + y + " (set/" + (y - 1) + " a ago/" + y + ")" + (r.upTo ? " · até " + A.label(r.upTo) + ": meta " + hrs(50 * A.monthsBetween((y - 1) + "-09", r.upTo).length) : "");
    $("rpList").innerHTML = r.list.length ? rpRows(r) : '<p class="muted">Nenhum pioneiro regular com cartão deste ano.</p>';
  }

  // ---------- resumo ----------
  function analysis(scope) { return A.analyze(state.cards, { from: state.period.from, to: state.period.to, studyRule: state.studyRule, area: scope || "all" }); }
  function renderSummary() {
    $("summaryBox").hidden = !state.cards.length;
    $("sumTitle").textContent = "Resumo — " + (state.active === "all" ? "Geral (toda a congregação)" : areaName(state.active));
    $("rule").innerHTML = A.STUDY_RULES.map(function (r) { return '<option value="' + r.key + '"' + (r.key === state.studyRule ? " selected" : "") + ">" + esc(r.label) + "</option>"; }).join("");
    if (!state.cards.length) return;
    var r = analysis(state.active);
    $("tiles").innerHTML = A.TILES.map(function (t) {
      var inner = "<b>" + r.counts[t.key] + "</b><span>" + esc(t.label) + "</span>" + (t.hint ? "<small>" + esc(t.hint) + "</small>" : "");
      return t.list ? '<button class="tile" data-tile="' + t.key + '" aria-label="' + esc(t.label + ": " + r.counts[t.key] + ". Ver lista") + '">' + inner + "</button>" : '<div class="tile">' + inner + "</div>";
    }).join("");
  }
  function periodLabel() { return state.period.from ? A.label(state.period.from) + " a " + A.label(state.period.to) : ""; }
  function openList(key) {
    var t = A.TILES.filter(function (x) { return x.key === key; })[0], r = analysis(state.active), items = r.lists[key] || [];
    $("sheetTitle").textContent = t.label + " · " + (state.active === "all" ? "Geral" : areaName(state.active)) + " · " + periodLabel();
    $("sheetBody").innerHTML = items.length ? items.map(function (i) {
      return '<button class="item tap" data-person="' + esc(i.id) + '"><strong>' + esc(i.name) + "</strong><small>" + esc(areaName(i.area)) + "</small><p>" + esc(i.detail) + "</p></button>";
    }).join("") : '<p class="muted">Ninguém neste período.</p>';
    lastList = key; showSheet();
  }
  var lastList = null, pending = null;
  function showSheet() { if ($("sheet").open) return; if ($("sheet").showModal) $("sheet").showModal(); else $("sheet").setAttribute("open", ""); }

  // ---------- cartão da pessoa (só leitura) ----------
  var ST_PT = { "Regular Pioneer": "Pioneiro regular", "Baptized Publisher": "Publicador batizado", "Unbaptized Publisher": "Publicador não batizado", "Continuous Auxiliary Pioneer": "Pioneiro auxiliar contínuo" };
  function openPerson(id, year) {
    var h = A.people(state.cards).filter(function (x) { return x.main.id === id || (x.months && Object.keys(x.months).some(function (k) { return x.months[k].p.id === id; })); })[0];
    if (!h) return;
    var cards = state.cards.filter(function (p) { return Object.keys(h.months).some(function (k) { return h.months[k].p === p; }) || p === h.main; });
    cards.sort(function (a, b) { return (A.cardYear(a) || 0) - (A.cardYear(b) || 0); });
    var c = cards.filter(function (p) { return A.cardYear(p) === year; })[0] || cards.filter(function (p) { return A.cardYear(p) === A.yearOfMonth(state.period.to); })[0] || cards[cards.length - 1];
    var p = h.main, role = p.appt === "Elder" ? "Ancião" : p.appt === "MS" ? "Servo ministerial" : "";
    var dbr = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; };
    var inP = function (k) { return k && k >= state.period.from && k <= state.period.to; };
    var rows = c.months.map(function (m, j) {
      var sh = m.participated || (m.hours || 0) > 0 || (m.studies || 0) > 0, has = m.participated || m.auxiliary || m.studies != null || m.hours != null || m.comments;
      var miss = inP(m.month) && !sh && A.reportedMonths(state.cards).indexOf(m.month) >= 0;
      return '<tr class="' + (inP(m.month) ? "inp" : "out") + '"><td>' + (m.month ? A.label(m.month) : S.MONTHS[j].slice(0, 3)) + "</td><td>" + (m.participated ? "✓" : has ? "✗" : "·") + "</td><td>" + (m.studies != null ? esc(m.studies) : "·") + "</td><td>" + (m.auxiliary ? "✓" : "·") + "</td><td>" + (m.hours != null ? esc(m.hours) : "·") + "</td><td>" + (miss ? '<span class="warnc" title="Sem pregar">⚠</span>' : "") + "</td></tr>";
    }).join("");
    var obs = c.months.filter(function (m) { return m.comments; }).map(function (m) { return "<li>" + esc((m.month ? A.label(m.month) + ": " : "") + m.comments) + "</li>"; }).join("");
    $("sheetTitle").textContent = h.name;
    $("sheetBody").innerHTML = (lastList ? '<button class="back" data-back>‹ Voltar</button>' : "") +
      '<p class="pmeta">' + esc([areaName(c.area), role, ST_PT[c.status]].filter(Boolean).join(" · ")) + (h.baptism ? "<br>Batismo " + esc(dbr(h.baptism)) : "") + "</p>" +
      (cards.length > 1 ? '<div class="pillrow">' + cards.map(function (q) { var y = A.cardYear(q); return '<button class="pill" data-pyear="' + y + '" data-pid="' + esc(id) + '" aria-pressed="' + (q === c) + '">Ano ' + (y || "?") + "</button>"; }).join("") + "</div>" : "") +
      '<table class="view"><thead><tr><th>Mês</th><th>Part.</th><th>Est.</th><th>P.A.</th><th>Horas</th><th></th></tr></thead><tbody>' + rows + "</tbody></table>" +
      (obs ? '<p class="pmeta">Observações</p><ul class="warns">' + obs + "</ul>" : "") +
      '<div class="sheetbtns"><button class="soft" data-editcard="' + esc(c.id) + '">Editar este cartão</button></div>';
    showSheet();
  }
  $("sheetBody").addEventListener("click", function (e) {
    var el = e.target;
    var per = el.closest("[data-person]"); if (per) { openPerson(per.dataset.person); return; }
    if (el.closest("[data-back]")) { openList(lastList); return; }
    var py = el.closest("[data-pyear]"); if (py) { openPerson(py.dataset.pid, Number(py.dataset.pyear)); return; }
    var ed = el.closest("[data-editcard]");
    if (ed) {
      var c = state.cards.filter(function (p) { return p.id === ed.dataset.editcard; })[0]; if (!c) return;
      $("sheet").close(); state.active = c.area; openAreas[c.area] = true; render();
      var d = document.querySelector('.card[data-id="' + c.id + '"]'); if (d) { d.open = true; d.scrollIntoView({ block: "start", behavior: "smooth" }); }
      return;
    }
    if (el.closest("[data-impcancel]")) { pending = null; $("sheet").close(); return; }
    if (el.closest("[data-impgo]")) { var g = pending; pending = null; $("sheet").close(); if (g) runImport(g); }
  });

  // ---------- importar pastas ----------
  function groupByName(name) { var k = A.normName(name); return state.groups.filter(function (g) { return A.normName(g.name) === k; })[0]; }
  function defaultArea() { return state.active === "all" || state.active === "rp" ? (A.sortGroups(state.groups)[0] && A.sortGroups(state.groups)[0].id) : state.active; }
  var importArea = null;
  async function previewImport(items, area) {
    var groups = A.folderGroups(items), bad = [];
    var data = items.filter(function (i) { return isData(i.path); });
    for (var d = 0; d < data.length; d++) {
      try {
        var r = await readData(data[d].file);
        r.groups.forEach(function (g) { var ex = groups.filter(function (x) { return x.key === g.key && x.cards; })[0]; if (ex) ex.cards = ex.cards.concat(g.cards); else groups.push({ key: g.key, name: g.name, rp: g.rp, cards: g.cards, items: [], src: r.file }); });
      } catch (e) { bad.push(data[d].file.name); }
    }
    if (bad.length) say("Arquivo não reconhecido (use .json do Circuit Manager ou .xml do TSWin): " + bad.join(", "));
    if (!groups.length) { if (!bad.length) say("Nenhum PDF, .json ou .xml encontrado."); return; }
    importArea = area || null;
    var fallback = importArea || defaultArea();
    pending = groups;
    $("sheetTitle").textContent = "Conferir antes de importar";
    lastList = null;
    $("sheetBody").innerHTML = groups.map(function (g) {
      var dest = g.rp ? "Pioneiros reg." : g.name === null ? areaName(fallback) + " (grupo aberto)" : groupByName(g.name) ? g.name + " (já existe)" : g.name + " (novo grupo)";
      var n = g.cards ? g.cards.length : g.items.length, unit = g.cards ? (n === 1 ? " cartão" : " cartões") : (n === 1 ? " PDF" : " PDFs");
      return '<div class="imp"><div><strong>' + esc(g.name === null ? (g.cards ? "Sem grupo no arquivo" : "PDFs soltos") : g.name) + "</strong><br><small>→ " + esc(dest) + "</small></div><span>" + n + unit + "</span></div>";
    }).join("") + '<div class="sheetbtns"><button class="ghost" data-impcancel>Cancelar</button><button class="primary" data-impgo>Importar</button></div>';
    showSheet();
  }
  async function runImport(groups) {
    var fallback = importArea || defaultArea();
    var made = 0, tot = { ok: 0, upd: 0, bad: [] };
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i], area;
      if (g.rp) area = "rp";
      else if (g.name === null) area = fallback;
      else { var ex = groupByName(g.name); if (!ex) { ex = { id: uid("g"), name: g.name, overseer: "", note: "" }; state.groups.push(ex); made++; } area = ex.id; }
      var r = g.cards ? { ok: 0, upd: 0, bad: [] } : await readInto(g.items.map(function (x) { return x.file; }), area);
      if (g.cards) g.cards.forEach(function (c) { if (placeCard(c, area) === "upd") r.upd++; else r.ok++; });
      tot.ok += r.ok; tot.upd += r.upd; tot.bad = tot.bad.concat(r.bad);
    }
    // grupo inicial vazio e sem nome editado some quando vieram grupos das pastas
    if (made && state.groups.length > made) state.groups = state.groups.filter(function (g) { return !(g.id === "g1" && g.name === "Grupo 1" && !cardsOf("g1").length && !g.note); });
    touch(); fixPeriod();
    var parts = [];
    if (made) parts.push(made + (made === 1 ? " grupo criado" : " grupos criados"));
    parts.push(tot.ok + (tot.ok === 1 ? " cartão novo" : " cartões novos"));
    if (tot.upd) parts.push(tot.upd + (tot.upd === 1 ? " atualizado" : " atualizados"));
    if (tot.bad.length) parts.push(tot.bad.length + " não lido" + (tot.bad.length === 1 ? "" : "s") + ": " + tot.bad.join(", "));
    say(parts.join(", ")); render();
  }
  $("importFolder").addEventListener("click", function () { $("folderIn").click(); });
  $("folderIn").addEventListener("change", function (e) {
    var items = Array.from(e.target.files).map(function (f) { return { path: f.webkitRelativePath || f.name, file: f }; }); e.target.value = "";
    previewImport(items);
  });
  if (!("webkitdirectory" in document.createElement("input"))) {
    $("folderBox").querySelector("p").textContent = "Este aparelho não deixa escolher pastas inteiras. Use “⬆ Importar S-21” em cada grupo.";
    $("importFolder").disabled = true;
  }
  function readEntry(entry, path, out) {
    return new Promise(function (res) {
      if (entry.isFile) entry.file(function (f) { out.push({ path: path + f.name, file: f }); res(); }, function () { res(); });
      else if (entry.isDirectory) {
        var rd = entry.createReader(), all = [];
        (function more() { rd.readEntries(function (ents) { if (!ents.length) { Promise.all(all.map(function (en) { return readEntry(en, path + entry.name + "/", out); })).then(res); return; } all = all.concat(Array.from(ents)); more(); }, function () { res(); }); })();
      } else res();
    });
  }
  ["dragenter", "dragover"].forEach(function (t) { document.addEventListener(t, function (e) { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf("Files") >= 0) { e.preventDefault(); $("folderBox").classList.add("drag"); } }); });
  document.addEventListener("dragleave", function (e) { if (!e.relatedTarget) $("folderBox").classList.remove("drag"); });
  document.addEventListener("drop", async function (e) {
    if (!e.dataTransfer) return; e.preventDefault(); $("folderBox").classList.remove("drag");
    var entries = Array.from(e.dataTransfer.items || []).map(function (it) { return it.webkitGetAsEntry && it.webkitGetAsEntry(); }).filter(Boolean), out = [];
    if (entries.length) await Promise.all(entries.map(function (en) { return readEntry(en, "", out); }));
    else Array.from(e.dataTransfer.files).forEach(function (f) { out.push({ path: f.name, file: f }); });
    previewImport(out);
  });

  // ---------- anotações (da pílula ativa) ----------
  function noteOf(id) { if (id === "all") return state.notes; if (id === "rp") return state.pioneersNote; var g = state.groups.filter(function (x) { return x.id === id; })[0]; return g ? g.note : ""; }
  function renderNotes() {
    $("noteTitle").textContent = state.active === "all" ? "Anotações gerais" : "Anotações — " + areaName(state.active);
    $("note").value = noteOf(state.active) || "";
  }
  function renderTabs() {
    var tabs = [{ id: "all", name: "Geral" }].concat(areas());
    if (!tabs.some(function (t) { return t.id === state.active; })) state.active = "all";
    $("tabs").innerHTML = tabs.map(function (t) {
      var n = t.id === "all" ? state.cards.length : cardsOf(t.id).length;
      return '<button class="pill" role="tab" data-tab="' + t.id + '" aria-selected="' + (t.id === state.active) + '">' + (state.done[t.id] ? '<i class="done" aria-label="analisado">✓</i>' : "") + esc(t.id === "rp" ? "Pioneiros reg." : t.name) + "<small>" + n + "</small></button>";
    }).join("") + '<button class="pill add" data-addgroup>+ Grupo</button>';
  }

  function render() {
    var openCards = Array.from(document.querySelectorAll(".card[open]")).map(function (d) { return d.dataset.id; });
    $("cong").value = state.congregation;
    renderPeriod();
    renderTabs();
    var g = state.groups.filter(function (x) { return x.id === state.active; })[0];
    $("area").innerHTML = state.active === "all" ? "" : areaHtml(state.active, g || null);
    openCards.forEach(function (id) { var d = document.querySelector('.card[data-id="' + id + '"]'); if (d) d.open = true; });
    renderSummary();
    renderTotals();
    renderGoals();
    renderNotes();
  }

  // ---------- eventos ----------
  $("cong").addEventListener("input", function (e) { state.congregation = e.target.value; touch(); });
  $("years").addEventListener("click", function (e) {
    var b = e.target.closest("[data-year],[data-preset]"); if (!b) return;
    if (b.dataset.year) { state.preset = "year"; state.year = Number(b.dataset.year); } else state.preset = b.dataset.preset;
    fixPeriod(); touch(); render();
  });
  $("range").addEventListener("change", function () {
    var f = $("pFrom").value, t = $("pTo").value; if (f > t) { var x = f; f = t; t = x; }
    state.preset = "custom"; state.period = { from: f, to: t }; touch(); render();
  });
  $("tabs").addEventListener("click", function (e) {
    if (e.target.closest("[data-addgroup]")) {
      var g = { id: uid("g"), name: "Grupo " + (state.groups.length + 1), overseer: "", note: "" };
      state.groups.push(g); state.active = g.id; touch(); render();
      var inp = document.querySelector('#area [data-g="name"]'); if (inp) inp.select();
      return;
    }
    var b = e.target.closest("[data-tab]"); if (b) { state.active = b.dataset.tab; render(); }
  });
  $("rule").addEventListener("change", function (e) { state.studyRule = e.target.value; touch(); renderSummary(); });
  $("rpList").addEventListener("click", function (e) { var b = e.target.closest("[data-person]"); if (b) { lastList = null; openPerson(b.dataset.person); } });
  $("importData").addEventListener("click", function () { $("dataIn").click(); });
  $("dataIn").addEventListener("change", function (e) { var items = Array.from(e.target.files).map(function (f) { return { path: f.name, file: f }; }); e.target.value = ""; if (items.length) previewImport(items); });
  $("tiles").addEventListener("click", function (e) { var b = e.target.closest("[data-tile]"); if (b) openList(b.dataset.tile); });
  $("sheetClose").addEventListener("click", function () { $("sheet").close(); });
  $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) $("sheet").close(); });
  $("note").addEventListener("input", function (e) {
    var k = state.active, v = e.target.value;
    if (k === "all") state.notes = v; else if (k === "rp") state.pioneersNote = v;
    else state.groups.forEach(function (g) { if (g.id === k) g.note = v; });
    touch();
  });

  function areaOf(el) { var a = el.closest(".area"); return a && a.dataset.a; }
  function onAreas(e) {
    var el = e.target, id = areaOf(el); if (!id) return;
    if (e.type === "click") {
      if (el.closest("[data-add]")) { addTo = id; $("pdfs").click(); return; }
      if (el.closest("[data-finish]")) { state.done[id] = today(); touch(); render(); return; }
      if (el.closest("[data-reopen]")) { delete state.done[id]; touch(); render(); return; }
      if (el.closest("[data-view]")) { openAreas[id] = !openAreas[id]; render(); return; }
      if (el.closest("[data-delgroup]")) {
        var n = cardsOf(id).length;
        if (!confirm(n ? "Remover o grupo e os " + n + " cartões dele?" : "Remover este grupo?")) return;
        state.groups = state.groups.filter(function (g) { return g.id !== id; });
        state.cards = state.cards.filter(function (p) { return p.area !== id; });
        state.active = "all"; touch(); fixPeriod(); render(); return;
      }
      if (el.closest("[data-replace]")) { replaceId = el.closest(".card").dataset.id; $("pdfOne").click(); return; }
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
      renderSummary(); renderTotals(); renderGoals(); renderPeriod();
    }
  }
  $("area").addEventListener("click", onAreas); $("area").addEventListener("change", onAreas);
  $("pdfOne").addEventListener("change", function (e) { var f = e.target.files[0]; e.target.value = ""; if (replaceId && f) replaceCard(replaceId, f); replaceId = null; });
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
    var data = { app: "visitasc-analisador", version: 1, savedAt: new Date().toISOString(), congregation: state.congregation, period: state.period, preset: state.preset, year: state.year, studyRule: state.studyRule, groups: state.groups, done: state.done, pioneersNote: state.pioneersNote, notes: state.notes, cards: state.cards };
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
      var yr = d.year ? Number(d.year) : A.yearOfMonth(d.period && d.period.to);
      state = { congregation: String(d.congregation || ""), period: d.period || { from: "", to: "" }, studyRule: d.studyRule || "last", year: yr, preset: d.preset || (d.period && d.period.from ? "custom" : "6m"), active: "all", groups: groups, pioneersNote: String(d.pioneersNote || ""), notes: String(d.notes || ""), done: d.done && typeof d.done === "object" ? d.done : {}, cards: cards };
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
      var cols = scopes.slice(i, i + 5), labW = 180, colW = (W - 2 * M - labW) / cols.length;
      need(16 + A.TILES.length * 15);
      var heads = cols.map(function (s) { return wrap(s.name, bold, 8.5, colW - 6).slice(0, 2); }), hl = Math.max.apply(null, heads.map(function (h) { return h.length; }));
      heads.forEach(function (h, j) { h.forEach(function (l, n) { page.drawText(fit(l, bold, 8.5, colW - 6), { x: M + labW + j * colW + 3, y: y - 8.5 - n * 10, size: 8.5, font: bold, color: ink }); }); });
      y -= 4 + hl * 10; rule();
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

    var tt = A.monthlyTotals(state.cards, { from: state.period.from, to: state.period.to, area: "all" });
    if (tt.months.length) {
      need(40); text("Totais mensais (geral)", { size: 13, bold: true, gap: 6 });
      for (var a = 0; a < tt.months.length; a += 6) {
        var ms = tt.months.slice(a, a + 6), lw = 170, cw = (W - 2 * M - lw) / ms.length;
        need(30);
        ms.forEach(function (k, j) { page.drawText(pdfSafe(A.label(k)), { x: M + lw + j * cw + 3, y: y - 9, size: 8.5, font: bold, color: ink }); });
        y -= 12; rule();
        A.TOTAL_SECTIONS.forEach(function (sec) {
          need(14); page.drawText(pdfSafe(sec.label), { x: M, y: y - 9.5, size: 9.5, font: bold, color: grey }); y -= 14;
          sec.rows.forEach(function (rw) {
            need(14); page.drawText(fit(rw[1], font, 9.5, lw - 14), { x: M + 8, y: y - 9.5, size: 9.5, font: font, color: ink });
            ms.forEach(function (k, j) { page.drawText(String(Math.round(tt.rows[k][rw[0]] * 10) / 10), { x: M + lw + j * cw + 3, y: y - 9.5, size: 9.5, font: bold, color: ink }); });
            y -= 14;
          });
        });
        y -= 8;
      }
    }
    var gy = rpYear(), goals = gy ? A.pioneerYear(state.cards, gy) : null;
    if (goals && goals.list.length) {
      need(40); text("Pioneiros regulares - meta anual " + gy + " (600 h)", { size: 13, bold: true, gap: 6 });
      goals.list.forEach(function (x) {
        text(x.name + (x.late ? " (iniciou em " + A.label(x.start) + ")" : "") + ": " + (x.diff < 0 ? "atrasado " + hrs(-x.diff) : "em dia +" + hrs(x.diff)), { bold: true, gap: 1 });
        text("Feitas " + hrs(x.done) + " - meta até agora " + hrs(x.goalNow) + " - meta do ano " + hrs(x.goalYear) + " - média " + hrs(x.avg) + "/mês" + (x.left ? " - precisa " + hrs(x.need) + "/mês" : ""), { indent: 10, color: grey, gap: 6 });
      });
    }

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
