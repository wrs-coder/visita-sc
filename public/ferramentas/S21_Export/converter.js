/* Conversor S-21 — regras puras (sem tela). Funciona no navegador e no Node. */
(function (root) {
  var MONTHS = ["Setembro","Outubro","Novembro","Dezembro","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto"];
  var STATUS = ["Baptized Publisher","Regular Pioneer","Continuous Auxiliary Pioneer","Unbaptized Publisher"];

  function str(v) { return v == null ? "" : String(v).trim(); }
  function num(v) { var s = str(v).replace(",", "."); if (!s) return null; var n = Number(s); return isFinite(n) ? n : null; }
  function on(v) { return v === true || /^\/?(yes|on|sim)$/i.test(str(v)); }

  /** "dd/mm/aaaa" → "aaaa-mm-dd" (vazio se não reconhecer). */
  function toIso(v) {
    var s = str(v), m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (m) { var y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); }
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }

  function splitName(full) {
    var p = str(full).split(/\s+/).filter(Boolean);
    if (p.length === 0) return { firstname: "", middlename: "", lastname: "" };
    if (p.length === 1) return { firstname: p[0], middlename: "", lastname: "" };
    return { firstname: p[0], middlename: p.slice(1, -1).join(" "), lastname: p[p.length - 1] };
  }

  /** Mês i (0 = setembro) do ano de serviço "2025/2026" → "2025-09". */
  function monthIso(serviceYear, i) {
    var m = str(serviceYear).match(/(\d{4})/); if (!m) return "";
    var start = Number(m[1]), mon = 9 + i, y = start;
    if (mon > 12) { mon -= 12; y += 1; }
    return y + "-" + String(mon).padStart(2, "0");
  }

  /** Campos do PDF ({nome: valor}) → publicador editável. */
  function fromFields(f, fileName) {
    var g = function (k) { return f[k]; };
    var name = splitName(g("900_1_Text_SanSerif"));
    var sy = str(g("900_13_Text_C_SanSerif"));
    var baptism = toIso(g("900_5_Text_SanSerif"));
    var rp = on(g("900_10_CheckBox")), sp = on(g("900_11_CheckBox")), fm = on(g("900_12_CheckBox"));
    var p = {
      file: fileName || "",
      firstname: name.firstname, middlename: name.middlename, lastname: name.lastname, suffix: "",
      sex: on(g("900_3_CheckBox")) ? "Male" : on(g("900_4_CheckBox")) ? "Female" : "",
      birth: toIso(g("900_2_Text_SanSerif")), baptism: baptism,
      appt: on(g("900_8_CheckBox")) ? "Elder" : on(g("900_9_CheckBox")) ? "MS" : "",
      status: (rp || sp || fm) ? "Regular Pioneer" : baptism ? "Baptized Publisher" : "Unbaptized Publisher",
      serviceYear: sy, months: [], notes: []
    };
    if (sp) p.notes.push("Marcado como pioneiro especial");
    if (fm) p.notes.push("Marcado como missionário em campo");
    for (var i = 0; i < 12; i++) {
      var r = 20 + i;
      p.months.push({
        month: monthIso(sy, i),
        participated: on(g("901_" + r + "_CheckBox")),
        studies: num(g("902_" + r + "_Text_C_SanSerif")),
        auxiliary: on(g("903_" + r + "_CheckBox")),
        hours: num(g("904_" + r + "_S21_Value")),
        comments: str(g("905_" + r + "_Text_SanSerif"))
      });
    }
    return p;
  }

  function warnings(p) {
    var w = [];
    if (!p.firstname) w.push("Sem nome");
    if (!p.sex) w.push("Sexo não marcado");
    if (!p.birth) w.push("Sem data de nascimento");
    if (!p.baptism && p.status !== "Unbaptized Publisher") w.push("Sem data de batismo");
    if (!p.serviceYear || !p.months[0] || !p.months[0].month) w.push("Ano de serviço não reconhecido");
    if (p.appt && p.sex === "Female") w.push("Designação incompatível com sexo feminino");
    return w.concat(p.notes || []);
  }

  function totals(list) {
    var t = { total: list.length, rp: 0, elder: 0, ms: 0 };
    list.forEach(function (p) {
      if (p.status === "Regular Pioneer") t.rp++;
      if (p.appt === "Elder") t.elder++;
      if (p.appt === "MS") t.ms++;
    });
    return t;
  }

  function hasData(m) { return m.participated || m.auxiliary || m.studies != null || m.hours != null || !!m.comments; }

  /** Lista de publicadores → linhas das abas contacts e reports. */
  function toRows(list) {
    var contacts = [["ID","lastname","firstname","middlename","suffix","sex","birth","baptism","appt","pioneerid","email","cellphone","homephone","address_line1","address_line2","address_city","address_state","address_postalcode","status","label"]];
    var reports = [["ID","month","hours","studies","pioneer","credithours","comments"]];
    list.forEach(function (p, idx) {
      var id = idx + 1;
      contacts.push([id, p.lastname, p.firstname, p.middlename, p.suffix, p.sex, p.birth, p.baptism, p.appt, "", "", "", "", "", "", "", "", "", p.status, ""]);
      p.months.forEach(function (m) {
        if (!m.month || !hasData(m)) return;
        var hours = m.hours != null ? m.hours : (m.participated ? 1 : null);
        reports.push([id, m.month + "-01", hours, m.studies, m.auxiliary ? "Auxiliary" : "", null, m.comments]);
      });
    });
    return { contacts: contacts, reports: reports };
  }

  var api = { MONTHS: MONTHS, STATUS: STATUS, toIso: toIso, splitName: splitName, monthIso: monthIso, fromFields: fromFields, warnings: warnings, totals: totals, toRows: toRows };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.S21 = api;
})(this);
