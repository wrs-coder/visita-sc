(function () {
  var list = [], failed = [];
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

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
    return S21.fromFields(fields, file.name);
  }

  async function addFiles(files) {
    for (var i = 0; i < files.length; i++) {
      try { list.push(await readPdf(files[i])); }
      catch (e) { failed.push(files[i].name); }
    }
    render();
  }

  function sel(key, val, opts) {
    return '<select data-k="' + key + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>";
  }

  function card(p, i) {
    var w = S21.warnings(p);
    var role = p.appt === "Elder" ? "Ancião" : p.appt === "MS" ? "Servo ministerial" : "";
    var st = { "Regular Pioneer": "Pioneiro regular", "Baptized Publisher": "Publicador batizado", "Unbaptized Publisher": "Publicador não batizado", "Continuous Auxiliary Pioneer": "Pioneiro auxiliar contínuo" }[p.status];
    var rows = p.months.map(function (m, j) {
      return '<tr data-m="' + j + '"><td>' + S21.MONTHS[j].slice(0, 3) + '</td>' +
        '<td><input type="checkbox" data-mk="participated"' + (m.participated ? " checked" : "") + ' aria-label="Participou"></td>' +
        '<td><input inputmode="numeric" data-mk="studies" value="' + esc(m.studies) + '" aria-label="Estudos"></td>' +
        '<td><input type="checkbox" data-mk="auxiliary"' + (m.auxiliary ? " checked" : "") + ' aria-label="Pioneiro auxiliar"></td>' +
        '<td><input inputmode="decimal" data-mk="hours" value="' + esc(m.hours) + '" aria-label="Horas"></td>' +
        '<td><input data-mk="comments" value="' + esc(m.comments) + '" aria-label="Observações"></td></tr>';
    }).join("");
    return '<details class="card" data-i="' + i + '"><summary><div><strong>' + esc([p.firstname, p.middlename, p.lastname].join(" ").replace(/\s+/g, " ").trim() || p.file) + '</strong>' +
      '<div class="sub">' + esc([p.sex === "Male" ? "Masculino" : p.sex === "Female" ? "Feminino" : "", role, st].filter(Boolean).join(" · ")) + '</div></div>' +
      '<span class="badge ' + (w.length ? "warn" : "ok") + '">' + (w.length ? "⚠ " + w.length : "✓") + '</span></summary><div class="body">' +
      (w.length ? '<ul class="warns">' + w.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
      '<div class="grid">' +
      '<label>Primeiro nome<input data-k="firstname" value="' + esc(p.firstname) + '"></label>' +
      '<label>Sobrenome<input data-k="lastname" value="' + esc(p.lastname) + '"></label>' +
      '<label class="full">Nome do meio<input data-k="middlename" value="' + esc(p.middlename) + '"></label>' +
      '<label>Sexo' + sel("sex", p.sex, [["", "—"], ["Male", "Masculino"], ["Female", "Feminino"]]) + '</label>' +
      '<label>Designação' + sel("appt", p.appt, [["", "Nenhuma"], ["Elder", "Ancião"], ["MS", "Servo ministerial"]]) + '</label>' +
      '<label>Nascimento<input type="date" data-k="birth" value="' + esc(p.birth) + '"></label>' +
      '<label>Batismo<input type="date" data-k="baptism" value="' + esc(p.baptism) + '"></label>' +
      '<label class="full">Situação' + sel("status", p.status, [["Baptized Publisher", "Publicador batizado"], ["Unbaptized Publisher", "Publicador não batizado"], ["Regular Pioneer", "Pioneiro regular"], ["Continuous Auxiliary Pioneer", "Pioneiro auxiliar contínuo"]]) + '</label>' +
      '</div><table class="months"><thead><tr><th>' + esc(p.serviceYear || "Mês") + '</th><th>Part.</th><th>Est.</th><th>P.A.</th><th>Horas</th><th>Obs.</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<button class="rm" data-rm>Remover este cartão</button></div></details>';
  }

  function renderTotals() {
    var t = S21.totals(list);
    $("totals").innerHTML = [["Cartões", t.total], ["Pioneiros regulares", t.rp], ["Anciãos", t.elder], ["Servos ministeriais", t.ms]]
      .map(function (x) { return '<div class="tot"><b>' + x[1] + "</b><span>" + x[0] + "</span></div>"; }).join("");
    var nw = list.filter(function (p) { return S21.warnings(p).length; }).length;
    var parts = [];
    if (nw) parts.push(nw + " cartão(ões) com aviso — toque para conferir");
    if (failed.length) parts.push("Não lidos (sem campos preenchíveis): " + failed.join(", "));
    $("warnline").textContent = parts.join(" · ");
  }

  function render() {
    var open = Array.from(document.querySelectorAll(".card[open]")).map(function (d) { return d.dataset.i; });
    $("summary").hidden = !(list.length || failed.length);
    $("actions").hidden = !list.length;
    $("list").innerHTML = list.map(card).join("");
    open.forEach(function (i) { var d = document.querySelector('.card[data-i="' + i + '"]'); if (d) d.open = true; });
    renderTotals();
  }

  $("list").addEventListener("change", function (e) {
    var el = e.target, c = el.closest(".card"); if (!c) return;
    var p = list[Number(c.dataset.i)];
    if (el.dataset.k) { p[el.dataset.k] = el.value; render(); return; }
    if (el.dataset.mk) {
      var m = p.months[Number(el.closest("tr").dataset.m)], k = el.dataset.mk;
      if (el.type === "checkbox") m[k] = el.checked;
      else if (k === "comments") m[k] = el.value.trim();
      else { var n = Number(el.value.replace(",", ".")); m[k] = el.value.trim() && isFinite(n) ? n : null; }
    }
  });
  $("list").addEventListener("click", function (e) {
    if (!e.target.matches("[data-rm]")) return;
    var c = e.target.closest(".card");
    if (confirm("Remover este cartão da lista?")) { list.splice(Number(c.dataset.i), 1); render(); }
  });

  $("files").addEventListener("change", function (e) { addFiles(Array.from(e.target.files)); e.target.value = ""; });
  var drop = $("drop");
  ["dragover", "dragenter"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files).filter(function (f) { return /pdf$/i.test(f.name); })); });
  $("clear").addEventListener("click", function () { if (confirm("Limpar todos os cartões?")) { list = []; failed = []; render(); } });

  $("export").addEventListener("click", function () {
    var t = S21.totals(list);
    if (!confirm("Confirme antes de gerar:\n\nCartões: " + t.total + "\nPioneiros regulares: " + t.rp + "\nAnciãos: " + t.elder + "\nServos ministeriais: " + t.ms)) return;
    var rows = S21.toRows(list);
    var toDate = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T12:00:00") : v; };
    rows.contacts.slice(1).forEach(function (r) { r[6] = toDate(r[6]) || null; r[7] = toDate(r[7]) || null; });
    rows.reports.slice(1).forEach(function (r) { r[1] = toDate(r[1]); });
    var wb = XLSX.utils.book_new();
    var c = XLSX.utils.aoa_to_sheet(rows.contacts, { cellDates: true, dateNF: "yyyy-mm-dd" });
    var r = XLSX.utils.aoa_to_sheet(rows.reports, { cellDates: true, dateNF: "yyyy-mm-dd" });
    var v = XLSX.utils.aoa_to_sheet([["Male", "MS", "Baptized Publisher", "Regular"], ["Female", "Elder", "Regular Pioneer", "Auxiliary"], [null, null, "Continuous Auxiliary Pioneer", null], [null, null, "Unbaptized Publisher", null]]);
    XLSX.utils.book_append_sheet(wb, c, "contacts");
    XLSX.utils.book_append_sheet(wb, r, "reports");
    XLSX.utils.book_append_sheet(wb, v, "validation");
    XLSX.writeFile(wb, "hourglass-import.xlsx", { cellDates: true });
  });
})();
