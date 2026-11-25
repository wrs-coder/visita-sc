/* Conversor S-21 — regras puras (sem tela). Funciona no navegador e no Node. */
(function (root) {
  var MONTHS = ["Setembro","Outubro","Novembro","Dezembro","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto"];
  var STATUS = ["Baptized Publisher","Regular Pioneer","Continuous Auxiliary Pioneer","Unbaptized Publisher"];
  var EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function str(v) { return v == null ? "" : String(v).trim(); }
  function num(v) { var s = str(v).replace(",", "."); if (!s) return null; var n = Number(s); return isFinite(n) ? n : null; }
  function on(v) { return v === true || /^\/?(yes|on|sim)$/i.test(str(v)); }

  // ---------- datas em qualquer formato (mesma regra do Analisador) ----------
  var MESES = { jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12 };
  function normTxt(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim(); }
  function fullYr(t, now) {
    var n = +t; if (t.length >= 3) return n;
    var cur = (now || new Date()).getFullYear() % 100;
    return n > cur ? 1900 + n : 2000 + n;
  }
  function validDate(y, m, d) {
    if (!(y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return "";
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() !== m - 1) return "";
    return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  /** Qualquer data ("06/05/1986", "6-5-86", "06051986", "1986-05-06", "06 DE MAIO DE 1986") → "aaaa-mm-dd" ou "". */
  function toIso(v, now) {
    var s = normTxt(v == null ? "" : String(v)); if (!s) return "";
    var m = /^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/.exec(s);
    if (m) return validDate(+m[1], +m[2], +m[3]);
    m = /^(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{2,4})$/.exec(s);
    if (m) return validDate(fullYr(m[3], now), +m[2], +m[1]);
    m = /^(\d{2})(\d{2})(\d{4})$/.exec(s);
    if (m) return validDate(+m[3], +m[2], +m[1]);
    m = /(\d{1,2})\s*(?:de\s+|[\/.\-]\s*)?([a-z]{3,})\.?\s*(?:de\s+|[\/.\-]\s*)?(\d{2,4})\b/.exec(s);
    if (m && MESES[m[2].slice(0, 3)]) return validDate(fullYr(m[3], now), MESES[m[2].slice(0, 3)], +m[1]);
    return "";
  }
  function dateBr(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; }
  /** Data digitada na tela → atualiza p[key] e o aviso correspondente. */
  function setDate(p, key, raw) {
    var lbl = key === "birth" ? "Nascimento" : "Batismo", v = str(raw), iso = toIso(v);
    p.dateIssues = (p.dateIssues || []).filter(function (x) { return x.indexOf(lbl) !== 0; });
    if (!v) p[key] = ""; else if (iso) p[key] = iso;
    else p.dateIssues.push(lbl + " não entendido: “" + v + "”. Corrija como dd/mm/aaaa.");
    return p;
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
      serviceYear: sy, months: [], notes: [],
      special: fm ? "fm" : sp ? "sp" : ""
    };
    p.dateIssues = [];
    [["birth", "900_2_Text_SanSerif", "Nascimento"], ["baptism", "900_5_Text_SanSerif", "Batismo"]].forEach(function (d) {
      var raw = str(g(d[1])); if (raw && !p[d[0]]) p.dateIssues.push(d[2] + " não entendido: “" + raw + "”. Corrija como dd/mm/aaaa.");
    });
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
    return w.concat(p.dateIssues || [], p.notes || []);
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

  function nz(v) { return v == null || v === "" ? null : v; }
  function shared(m) { return !!(m.participated || (m.hours || 0) > 0 || (m.studies || 0) > 0); }

  /** Valor da coluna "pioneer" no mês: Regular (pioneiro regular), Auxiliary (P.A. ou auxiliar contínuo) ou "". */
  function pioneerOf(p, m) {
    if (p.status === "Regular Pioneer") return "Regular";
    return (p.status === "Continuous Auxiliary Pioneer" || (m && m.auxiliary)) ? "Auxiliary" : "";
  }

  /** Situação para o Hourglass: pioneiro especial marcado no cartão vira "Special Pioneer". */
  function hgStatus(p, allowMissionary) {
    if (p.status !== "Regular Pioneer") return p.status;
    if (p.special === "fm" && allowMissionary) return "FieldMissionary";
    return p.special === "sp" ? "Special Pioneer" : p.status;
  }

  /**
   * Junta cartões da mesma pessoa (nome + nascimento). main = cartão do ano de serviço mais recente;
   * months = { "aaaa-mm": {p, m} } com o mês que tem dados; keys = meses em ordem.
   */
  function groupPeople(list) {
    var groups = [], byKey = {};
    list.forEach(function (p) {
      var k = personKey(p);
      if (!byKey[k]) { byKey[k] = { cards: [] }; groups.push(byKey[k]); }
      byKey[k].cards.push(p);
    });
    return groups.map(function (g) {
      var months = {};
      var main = g.cards.slice().sort(function (a, b) { return (serviceYearEnd(a.serviceYear) || 0) - (serviceYearEnd(b.serviceYear) || 0); })[g.cards.length - 1];
      g.cards.forEach(function (p) {
        p.months.forEach(function (m) {
          if (!m.month) return;
          var prev = months[m.month];
          if (!prev || (!hasData(prev.m) && hasData(m))) months[m.month] = { p: p, m: m };
        });
      });
      return { main: main, cards: g.cards, months: months, keys: Object.keys(months).sort() };
    });
  }

  /** "aaaa-mm-dd" → número de série do Excel (dias desde 30/12/1899), como no modelo do Hourglass. */
  function excelSerial(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso)); if (!m) return null;
    return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000);
  }

  /**
   * Lista de publicadores → linhas das abas contacts e reports (Hourglass), mesma ordem do modelo.
   * Células sem valor vão como null (vazias de verdade). Cartões da mesma pessoa viram um só contato.
   */
  function toRows(list) {
    var contacts = [["ID","lastname","firstname","middlename","suffix","sex","birth","baptism","appt","pioneerid","email","cellphone","homephone","address_line1","address_line2","address_city","address_state","address_postalcode","status","label"]];
    var reports = [["ID","month","hours","studies","pioneer","credithours","comments"]];
    groupPeople(list).forEach(function (g, idx) {
      var id = idx + 1, p = g.main;
      contacts.push([id, nz(p.lastname), nz(p.firstname), nz(p.middlename), nz(p.suffix), nz(p.sex), nz(p.birth), nz(p.baptism), nz(p.appt), null, null, null, null, null, null, null, null, null, hgStatus(p, false), null]);
      g.keys.forEach(function (k) {
        var q = g.months[k].p, m = g.months[k].m;
        if (!hasData(m)) return;
        // Publicador comum: Hourglass recebe 1 hora quando participou (como no modelo oficial); a tela não mostra.
        var hours = hoursAllowed(q, m) ? m.hours : shared(m) ? 1 : null;
        reports.push([id, k + "-01", nz(hours), nz(m.studies), nz(pioneerOf(q, m)), null, nz(m.comments)]);
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
    var groups = groupPeople(list);
    var d = today || new Date();
    var date = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    var L = ["<PUBLIST>", '<Agent Ver="9000">Tswin</Agent>', "<Date>" + date + "</Date>", "<Count>" + groups.length + "</Count>", "<Active>"];
    groups.forEach(function (g, idx) {
      var months = g.months, main = g.main, last = g.keys[g.keys.length - 1] || "";
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

  // ---------- Circuit Manager (hourglass-export.json) ----------

  /** País da congregação. Os números internos só são conhecidos para os países do modelo (pt-PT). */
  var COUNTRIES = {
    BR: { label: "Brasil", country: { id: null, code: "BR", name: "Brazil", datefmt: "dd/mm/yyyy", namefmt: "first", addrfmt: "c", paper_size: "a4" }, timezone: { id: null, name: "America/Sao_Paulo", offset: "-03:00", countrycode: "BR" }, locale: { id: null, code: "pt-BR", name: "Portuguese (Brazil)", symbol: "T" } },
    AO: { label: "Angola", country: { id: 50, code: "AO", name: "Angola", datefmt: "dd/mm/yyyy", namefmt: "first", addrfmt: "c", paper_size: "a4" }, timezone: { id: 87, name: "Africa/Luanda", offset: "+01:00", countrycode: "AO" }, locale: { id: 10, code: "pt-PT", name: "Portuguese (Portugal)", symbol: "TPO" } },
    PT: { label: "Portugal", country: { id: null, code: "PT", name: "Portugal", datefmt: "dd/mm/yyyy", namefmt: "first", addrfmt: "c", paper_size: "a4" }, timezone: { id: null, name: "Europe/Lisbon", offset: "+00:00", countrycode: "PT" }, locale: { id: 10, code: "pt-PT", name: "Portuguese (Portugal)", symbol: "TPO" } },
    MZ: { label: "Moçambique", country: { id: null, code: "MZ", name: "Mozambique", datefmt: "dd/mm/yyyy", namefmt: "first", addrfmt: "c", paper_size: "a4" }, timezone: { id: null, name: "Africa/Maputo", offset: "+02:00", countrycode: "MZ" }, locale: { id: 10, code: "pt-PT", name: "Portuguese (Portugal)", symbol: "TPO" } }
  };

  var PRIVILEGES = ["attendant","aux_chairman","cbs","cbs_reader","chairman","chairman2","chairman3","cleaning","closeprayer","conductFS","console","dfg","fm_discussion","fs_assistant","hh","host","initcall","interpreter","lac","localneeds","mics","mm_chairman","none","openprayer","prayer","pt","pt_out","publicMinistry","reading","rv","security_attendant","stage","stream","study","stutalk","treasures","video","wm_chairman","wm_reader","wt_conductor","zoom_attendant"];
  var E2E = ["e2e_iv","e2e_firstname","e2e_middlename","e2e_lastname","e2e_suffix","e2e_pioneerid","e2e_birth","e2e_baptism","e2e_email","e2e_cellphone","e2e_homephone","e2e_otherphone","e2e_comments"];

  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function isoStamp(d) { return d.toISOString().replace(/\.\d{3}Z$/, "Z"); }
  function ym(y, m) { return y + "-" + String(m).padStart(2, "0"); }
  function nextYm(k) { var y = +k.slice(0, 4), m = +k.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return ym(y, m); }

  /** Identificador estável (mesmo texto → mesmo código), no formato de um UUID v4. */
  function stableUuid(text) {
    var hex = "", seeds = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
    seeds.forEach(function (seed) {
      var h = seed >>> 0;
      for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; }
      h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
      hex += ("00000000" + h.toString(16)).slice(-8);
    });
    hex = hex.slice(0, 12) + "4" + hex.slice(13, 16) + ((parseInt(hex[16], 16) & 3) | 8).toString(16) + hex.slice(17);
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20, 32);
  }

  function emptyTotals() { return { active: 0, count: 0, createdAt: null, hours: 0, lateReports: 0, minutes: 0, placements: 0, returnvisits: 0, rolloverMinutes: 0, studies: 0, videoshowings: 0 }; }

  /**
   * Lista de publicadores → objeto no mesmo formato do hourglass-export.json (mesmas seções e campos,
   * na mesma ordem). Relatório só nos meses em que a pessoa participou: publicador comum = 1 hora
   * (60 minutos), pioneiro = horas do cartão. opts: { name, number, country, today }.
   */
  function toCircuit(list, opts) {
    opts = opts || {};
    var now = opts.today || new Date(), stamp = isoStamp(now);
    var number = parseInt(str(opts.number), 10); if (!(number > 0)) number = null;
    var preset = COUNTRIES[opts.country] || COUNTRIES.BR;
    var congId = number || 1, name = str(opts.name) || null;
    var congregation = {
      id: congId, number: number, number_verified: false, name: name,
      locales_id: preset.locale.id, timezones_id: preset.timezone.id, countries_id: preset.country.id,
      registered_at: stamp, abandonedreminder: null, abandonedremindercount: 0, lastreminder: null,
      address: null, phone: null, guid: stableUuid("cong|" + (number || "") + "|" + (name || "")).toUpperCase(),
      wmdow: null, wmtime: null, mmdow: null, mmtime: null,
      wmdow_future: null, wmtime_future: null, mmdow_future: null, mmtime_future: null, future_start_date: null,
      last_updated: stamp, last_checked: null, unmanaged: false, jworg_not_found: false, jworg_skip: false,
      kind: "cong", jworg_langcode: preset.locale.symbol, circuit_id: null,
      country: copy(preset.country), timezone: copy(preset.timezone), locale: copy(preset.locale)
    };

    // Números internos estáveis e sempre abaixo de 2.147.483.647 (inteiro comum), como no modelo.
    // Grupos de campo opcionais (Analisador): opts.groupOf(cartão) → nome do grupo ou "".
    var fsGroups = [], gIds = {};
    function groupId(p) {
      var n = opts.groupOf ? str(opts.groupOf(p)) : ""; if (!n) return null;
      if (!gIds[n]) { gIds[n] = (congId % 100000) * 100 + fsGroups.length + 1; fsGroups.push({ id: gIds[n], overseer_id: null, assistant_id: null, notes: null, name: n, overseer: null, assistant: null, members: null }); }
      return gIds[n];
    }
    var publishers = [], reports = [], pubBase = (congId % 2000000) * 1000, repBase = (congId % 100000) * 20000;
    groupPeople(list).forEach(function (g, idx) {
      var p = g.main, id = pubBase + idx + 1;
      var pub = {
        id: id, uuid: stableUuid(congId + "|" + personKey(p)),
        firstname: nz(p.firstname), lastname: nz(p.lastname), middlename: nz(p.middlename),
        sex: nz(p.sex), birth: nz(p.birth), baptism: nz(p.baptism), pioneerid: null, appt: nz(p.appt),
        email: null, cellphone: null, homephone: null, otherphone: null, address_id: null, comments: null,
        congregations_id: congId, smpw_root_zone_id: null, group_id: groupId(p), family_id: null, language_group_id: null,
        firstmonth: null, status: hgStatus(p, true), suffix: nz(p.suffix), descriptor: null,
        loginemail: null, lastlogin: null, lastmobiletoken: null, emailbounce: false, locales_id: null,
        revoked: false, anointed: false, familycontact: false, rpquota: null, advdirective: false,
        reportstobranch: false, piiconsentdate: null
      };
      E2E.forEach(function (k) { pub[k] = null; });
      pub.googleauth = false; pub.appleauth = false; pub.sgo = false; pub.locale = null;
      pub.mobilepush = false; pub.pubinvite = null; pub.tags = [];
      publishers.push(pub);

      g.keys.forEach(function (k) {
        var q = g.months[k].p, m = g.months[k].m;
        if (!shared(m) && !m.auxiliary) return; // sem relatório quando não participou
        var y = +k.slice(0, 4), mo = +k.slice(5, 7);
        var minutes = hoursAllowed(q, m) ? Math.round((m.hours || 0) * 60) : 60;
        reports.push({
          id: repBase + reports.length + 1, user: { id: id }, month: mo, year: y,
          placements: null, videoshowings: null, minutes_as_hours: String(Math.round(minutes / 60 * 100) / 100), minutes: minutes,
          pioneer: nz(pioneerOf(q, m)), returnvisits: null, studies: m.studies == null ? null : m.studies,
          credithours: null, remarks: nz(m.comments), submitted_month: k, reported_at: stamp, reported_by: null
        });
      });
    });

    // Totais por mês: do primeiro relatório até o mês anterior à data de hoje (como no modelo).
    var monthlyTotals = [];
    if (reports.length) {
      var first = reports.reduce(function (a, r) { return r.submitted_month < a ? r.submitted_month : a; }, "9999-99");
      var lastR = reports.reduce(function (a, r) { return r.submitted_month > a ? r.submitted_month : a; }, "");
      var prev = now.getMonth() === 0 ? ym(now.getFullYear() - 1, 12) : ym(now.getFullYear(), now.getMonth());
      var end = lastR > prev ? lastR : prev;
      for (var k = first; k <= end; k = nextYm(k)) {
        var t = { month: k, aux: emptyTotals(), pub: emptyTotals(), reg: emptyTotals() };
        reports.forEach(function (r) {
          if (r.submitted_month !== k) return;
          var b = r.pioneer === "Auxiliary" ? t.aux : r.pioneer === "Regular" ? t.reg : t.pub;
          b.count++; b.minutes += r.minutes; b.studies += r.studies || 0;
        });
        [t.aux, t.pub, t.reg].forEach(function (b) { b.hours = Math.floor(b.minutes / 60); });
        monthlyTotals.push(t);
      }
    }

    // Assistência: meses zerados do mês atual até setembro de 3 anos de serviço atrás (como no modelo).
    var attendance = [], cy = now.getFullYear(), cm = now.getMonth() + 1;
    var startY = (cm >= 9 ? cy : cy - 1) - 3;
    for (var y2 = cy, m2 = cm; y2 > startY || (y2 === startY && m2 >= 9);) {
      attendance.push({ month: ym(y2, m2), attendanceGroupId: 0, mwAvg: 0, mwCount: 0, mwTotal: 0, weAvg: 0, weCount: 0, weTotal: 0 });
      if (--m2 === 0) { m2 = 12; y2--; }
    }

    var privileges = {};
    PRIVILEGES.forEach(function (k) { privileges[k] = []; });

    return {
      congregation: congregation, publishers: publishers, addresses: [], fsGroups: fsGroups,
      attendance: { attendance: attendance, attendanceGroups: [{ id: 0, name: "" }] },
      reports: reports, notPublishers: null, monthlyTotals: monthlyTotals, privileges: privileges,
      territories: [], territoryRecords: []
    };
  }

  var api = { MONTHS: MONTHS, STATUS: STATUS, toIso: toIso, dateBr: dateBr, setDate: setDate, splitName: splitName, serviceYearEnd: serviceYearEnd, monthIso: monthIso, hoursAllowed: hoursAllowed, setServiceYear: setServiceYear, fromFields: fromFields, warnings: warnings, totals: totals, toRows: toRows, toTswin: toTswin, groupPeople: groupPeople, excelSerial: excelSerial, toCircuit: toCircuit, COUNTRIES: COUNTRIES };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.S21 = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
