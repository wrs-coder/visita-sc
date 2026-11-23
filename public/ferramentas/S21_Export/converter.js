/* Conversor S-21 — regras puras (sem tela). Funciona no navegador e no Node. */
(function (root) {
  var MONTHS = ["Setembro","Outubro","Novembro","Dezembro","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto"];
  var STATUS = ["Baptized Publisher","Regular Pioneer","Continuous Auxiliary Pioneer","Unbaptized Publisher"];
  var EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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

  function fullYear(s) { return s.length >= 4 ? Number(s.slice(-4)) : 2000 + Number(s); }

  /**
   * Ano do registro = último ano escrito. "2026/2027", "2026/27", "26/27" e "26/7" → 2027.
   * Um ano sozinho ("2027") já é o ano do registro. Sem ano reconhecível → null.
   */
  function serviceYearEnd(v) {
    var s = str(v), m = s.match(/(\d{2,4})\s*[\/\-–—]\s*(\d{1,4})/);
    if (m) {
      var start = fullYear(m[1]), tail = m[2];
      if (tail.length >= 4) return Number(tail);
      var mod = Math.pow(10, tail.length), end = start - (start % mod) + Number(tail);
      if (end <= start) end += mod;
      return end;
    }
    var one = s.match(/^\D*(\d{4}|\d{2})\D*$/);
    return one ? fullYear(one[1]) : null;
  }

  /** Mês i (0 = setembro) do ano de serviço "2026/2027" → "2026-09" … "2027-08". */
  function monthIso(serviceYear, i) {
    var end = serviceYearEnd(serviceYear); if (!end) return "";
    var mon = 9 + i, y = end - 1;
    if (mon > 12) { mon -= 12; y += 1; }
    return y + "-" + String(mon).padStart(2, "0");
  }

  /** Horas só contam para pioneiro regular/auxiliar contínuo, ou no mês marcado como P.A. */
  function hoursAllowed(p, m) {
    return p.status === "Regular Pioneer" || p.status === "Continuous Auxiliary Pioneer" || !!(m && m.auxiliary);
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

  /** Troca o ano de serviço de um publicador e recalcula os meses. */
  function setServiceYear(p, sy) {
    p.serviceYear = str(sy);
    p.months.forEach(function (m, i) { m.month = monthIso(p.serviceYear, i); });
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

  /** Lista de publicadores → linhas das abas contacts e reports (Hourglass). */
  function toRows(list) {
    var contacts = [["ID","lastname","firstname","middlename","suffix","sex","birth","baptism","appt","pioneerid","email","cellphone","homephone","address_line1","address_line2","address_city","address_state","address_postalcode","status","label"]];
    var reports = [["ID","month","hours","studies","pioneer","credithours","comments"]];
    list.forEach(function (p, idx) {
      var id = idx + 1;
      contacts.push([id, p.lastname, p.firstname, p.middlename, p.suffix, p.sex, p.birth, p.baptism, p.appt, "", "", "", "", "", "", "", "", "", p.status, ""]);
      p.months.forEach(function (m) {
        if (!m.month || !hasData(m)) return;
        var hours = hoursAllowed(p, m) ? m.hours : null;
        reports.push([id, m.month + "-01", hours, m.studies, m.auxiliary ? "Auxiliary" : "", null, m.comments]);
      });
    });
    return { contacts: contacts, reports: reports };
  }

  // ---------- TSWin (Active.xml) ----------

  function xesc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function tag(name, v) { var s = str(v); return s ? "<" + name + ">" + xesc(s) + "</" + name + ">" : "<" + name + "/>"; }
  function intOr0(v) { return v == null || !isFinite(v) ? 0 : Math.round(v); }
  function personKey(p) { return [p.firstname, p.middlename, p.lastname].join(" ").toLowerCase().replace(/\s+/g, " ").trim() + "|" + (p.birth || ""); }

  /** Um mês do cartão → valores do TSWin. Publicador: Hours 1 = participou, 0 = não. */
  function tswinMonth(p, m) {
    if (!m || !hasData(m)) return { hours: 0, studies: 0, remark: "", pio: "" };
    var pio = p.status === "Regular Pioneer" ? "Reg" : (m.auxiliary || p.status === "Continuous Auxiliary Pioneer") ? "Aux" : "";
    var hours = pio ? intOr0(m.hours) : (m.participated || (m.hours || 0) > 0 || (m.studies || 0) > 0) ? 1 : 0;
    return { hours: hours, studies: intOr0(m.studies), remark: m.comments || "", pio: pio };
  }

  /**
   * Lista de publicadores → texto do Active.xml (TSWin), mesma ordem de campos do modelo.
   * Cartões da mesma pessoa (nome + nascimento) viram um só registro. Cada pessoa tem 24 meses:
   * Jan–Dez dos anos pares primeiro, depois Jan–Dez dos anos ímpares, cobrindo os 24 meses
   * que terminam no último mês dos seus cartões.
   */
  function toTswin(list, today) {
    var groups = [], byKey = {};
    list.forEach(function (p) {
      var k = personKey(p);
      if (!byKey[k]) { byKey[k] = { cards: [] }; groups.push(byKey[k]); }
      byKey[k].cards.push(p);
    });
    var d = today || new Date();
    var date = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    var L = ["<PUBLIST>", '<Agent Ver="9000">Tswin</Agent>', "<Date>" + date + "</Date>", "<Count>" + groups.length + "</Count>", "<Active>"];
    groups.forEach(function (g, idx) {
      var months = {}, last = "";
      var main = g.cards.slice().sort(function (a, b) { return (serviceYearEnd(a.serviceYear) || 0) - (serviceYearEnd(b.serviceYear) || 0); })[g.cards.length - 1];
      g.cards.forEach(function (p) {
        p.months.forEach(function (m) {
          if (!m.month) return;
          var prev = months[m.month];
          if (!prev || (!hasData(prev.m) && hasData(m))) months[m.month] = { p: p, m: m };
          if (m.month > last) last = m.month;
        });
      });
      if (!last) last = date.slice(0, 7);
      var endY = Number(last.slice(0, 4)), endM = Number(last.slice(5, 7));
      var male = main.sex === "Male", baptized = !!main.baptism && main.status !== "Unbaptized Publisher";
      var svt = main.appt === "Elder" ? "Elder" : main.appt === "MS" ? "MinSvt" : (male && baptized) ? "BapBro" : "";
      L.push("<Pub>", "<id>" + (idx + 1) + "</id>",
        tag("fname", [main.firstname, main.middlename].join(" ").replace(/\s+/g, " ")),
        tag("lname", main.lastname), "<addr/>", "<phone/>", "<phone2/>", "<phone3/>");
      if (main.sex) L.push("<gender>" + main.sex + "</gender>");
      L.push(tag("birdate", main.birth), tag("bapdate", main.baptism), "<group>1</group>");
      if (svt) L.push("<svt>" + svt + "</svt>");
      [0, 1].forEach(function (parity) {
        for (var mo = 1; mo <= 12; mo++) {
          var y = mo <= endM ? endY : endY - 1;
          if (y % 2 !== parity) y -= 1;
          var hit = months[y + "-" + String(mo).padStart(2, "0")];
          var v = tswinMonth(hit && hit.p, hit && hit.m);
          L.push("<" + EN[mo - 1] + ' Year="' + y + '">', "<Plcmts>0</Plcmts>", "<Videos>0</Videos>",
            "<Hours>" + v.hours + "</Hours>", "<R.V.s>0</R.V.s>", "<BiSt.>" + v.studies + "</BiSt.>",
            tag("Remark", v.remark), tag("Pio", v.pio), "</" + EN[mo - 1] + ">");
        }
      });
      L.push("</Pub>");
    });
    L.push("</Active>", "</PUBLIST>");
    return L.join("\r\n") + "\r\n";
  }

  var api = { MONTHS: MONTHS, STATUS: STATUS, toIso: toIso, splitName: splitName, serviceYearEnd: serviceYearEnd, monthIso: monthIso, hoursAllowed: hoursAllowed, setServiceYear: setServiceYear, fromFields: fromFields, warnings: warnings, totals: totals, toRows: toRows, toTswin: toTswin };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.S21 = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
