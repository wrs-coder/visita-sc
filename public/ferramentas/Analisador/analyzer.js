/* Analisador de congregações — regras puras (sem tela). Usa a leitura do Conversor S-21 (S21). */
(function (root) {
  var MES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  var NEW_PUB = /novo\s+publicador|in[ií]cio\s+como\s+publicador|iniciou\s+como\s+publicador|come[cç]ou\s+a\s+pregar/i;

  function S() { return root.S21; }
  // Hoje do aparelho (testes podem fixar com setToday). O mês atual nunca é avaliado: relatórios ainda não entregues.
  var TODAY = null;
  function setToday(d) { TODAY = d ? new Date(d) : null; }
  function closedMonth() { var d = TODAY || new Date(), y = d.getFullYear(), m = d.getMonth(); if (m === 0) { y--; m = 12; } return y + "-" + String(m).padStart(2, "0"); }
  function capMonth(k) { var c = closedMonth(); return !k || k > c ? c : k; }
  function ym(y, m) { return y + "-" + String(m).padStart(2, "0"); }
  function addMonths(k, n) { var t = +k.slice(0, 4) * 12 + (+k.slice(5, 7) - 1) + n; return ym(Math.floor(t / 12), (t % 12) + 1); }
  function monthsBetween(from, to) { var out = []; if (!from || !to || from > to) return out; for (var k = from; k <= to; k = addMonths(k, 1)) out.push(k); return out; }
  function label(k) { return MES[+k.slice(5, 7) - 1] + " " + k.slice(0, 4); }
  function dateBr(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; }
  function shared(m) { return !!(m && (m.participated || (m.hours || 0) > 0 || (m.studies || 0) > 0)); }
  function hasData(m) { return !!(m && (m.participated || m.auxiliary || m.studies != null || m.hours != null || m.comments)); }
  function fullName(p) { return [p.firstname, p.middlename, p.lastname].join(" ").replace(/\s+/g, " ").trim() || p.file || "Sem nome"; }

  /** Meses em que algum cartão tem relatório (meses depois disso ainda não aconteceram). */
  function reportedMonths(cards) {
    var set = {};
    var c = closedMonth();
    cards.forEach(function (p) { p.months.forEach(function (m) { if (m.month && m.month <= c && hasData(m)) set[m.month] = true; }); });
    return Object.keys(set).sort();
  }

  /** Todos os meses cobertos pelos cartões (para escolher o período). */
  function coveredMonths(cards) {
    var set = {};
    cards.forEach(function (p) { p.months.forEach(function (m) { if (m.month) set[m.month] = true; }); });
    var keys = Object.keys(set).sort();
    return keys.length ? monthsBetween(keys[0], keys[keys.length - 1]) : [];
  }

  /** Ano de serviço do cartão: "2025/2026" = 2026 (set/2025 a ago/2026). */
  function cardYear(p) {
    var m0 = p.months && p.months[0] && p.months[0].month;
    if (m0) return +m0.slice(0, 4) + 1;
    return (S() && S().serviceYearEnd(p.serviceYear)) || null;
  }
  function serviceYears(cards) {
    var set = {}; cards.forEach(function (p) { var y = cardYear(p); if (y) set[y] = true; });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }
  function periodOf(year) { return year ? { from: (year - 1) + "-09", to: year + "-08" } : { from: "", to: "" }; }
  /** Ano de serviço de um mês "aaaa-mm" (set em diante = ano seguinte). */
  function yearOfMonth(k) { return k ? +k.slice(0, 4) + (+k.slice(5, 7) >= 9 ? 1 : 0) : null; }
  /** Últimos n meses com relatório na congregação (pode atravessar dois anos de serviço). */
  function lastMonths(cards, n) {
    var r = reportedMonths(cards); if (!r.length) return { from: "", to: "" };
    // Os n meses antes do mês atual do aparelho; dados antigos (sem relatório nessa janela) usam o último mês com relatório.
    var to = closedMonth();
    if (!r.some(function (k) { return k > addMonths(to, -n) && k <= to; })) to = r[r.length - 1];
    return { from: addMonths(to, -(n - 1)), to: to };
  }
  /** Anos de serviço tocados por um período. */
  function periodYears(from, to) { var s = {}; monthsBetween(from, to).forEach(function (k) { s[yearOfMonth(k)] = true; }); return Object.keys(s).map(Number).sort(); }
  /** Período padrão: o ano de serviço do cartão mais recente. */
  function defaultPeriod(cards) { var ys = serviceYears(cards); return periodOf(ys[ys.length - 1]); }

  /** Cartões → pessoas (cartões da mesma pessoa juntados). Área = área do cartão mais recente. */
  function people(cards) {
    return S().groupPeople(cards).map(function (g) {
      var first = null, baptism = "";
      g.keys.forEach(function (k) { if (!first && shared(g.months[k].m)) first = k; });
      g.cards.forEach(function (p) { if (p.baptism && (!baptism || p === g.main)) baptism = p.baptism; });
      return { name: fullName(g.main), main: g.main, cards: g.cards, area: g.main.area, months: g.months, keys: g.keys, firstShared: first, baptism: baptism };
    });
  }

  /**
   * Análise do período. opts: { from, to, studyRule: "last" | "last3" | "any3", area: "all" | id }.
   * Só contam os meses do período que já têm relatório na congregação e que estão no cartão da pessoa.
   */
  function analyze(cards, opts) {
    opts = opts || {};
    var reported = {}; reportedMonths(cards).forEach(function (k) { reported[k] = true; });
    var period = monthsBetween(opts.from, opts.to);
    var live = period.filter(function (k) { return reported[k]; });
    var rule = opts.studyRule || "last";
    var start = opts.from ? opts.from + "-01" : "", end = opts.to ? opts.to + "-31" : "";
    var c = { elder: 0, ms: 0, bap: 0, unbap: 0, newUnbap: 0 };
    var L = { aux: [], newBap: [], irregular: [], apptAux: [], studies: [], rpLow: [], newUnbap: [] };

    people(cards).forEach(function (h) {
      if (opts.area && opts.area !== "all" && h.area !== opts.area) return;
      var p = h.main, base = { id: p.id, name: h.name, area: h.area };
      var unbap = p.status === "Unbaptized Publisher" && !h.baptism;
      if (p.appt === "Elder") c.elder++;
      if (p.appt === "MS") c.ms++;
      if (unbap) c.unbap++; else c.bap++;

      var mine = live.filter(function (k) { return !!h.months[k]; });
      var at = function (k) { return h.months[k] && h.months[k].m; };
      var cardAt = function (k) { return h.months[k] && h.months[k].p; };

      // Novos publicadores não batizados
      if (unbap) {
        var noted = h.keys.some(function (k) { return k <= opts.to && NEW_PUB.test((at(k) && at(k).comments) || ""); });
        var fresh = h.firstShared && h.firstShared >= opts.from && h.firstShared <= opts.to && h.keys.some(function (k) { return k < h.firstShared; });
        if (noted || fresh) { c.newUnbap++; L.newUnbap.push(Object.assign({ detail: h.firstShared ? "Começou em " + label(h.firstShared) : "Observação: novo publicador" }, base)); }
      }

      // Pioneiros auxiliares diferentes (a mesma pessoa conta uma vez)
      var auxMonths = mine.filter(function (k) {
        var q = cardAt(k);
        return q.status !== "Regular Pioneer" && (at(k).auxiliary || (q.status === "Continuous Auxiliary Pioneer" && hasData(at(k))));
      });
      if (auxMonths.length) {
        var auxItem = Object.assign({ months: auxMonths, detail: auxMonths.map(label).join(", ") }, base);
        L.aux.push(auxItem);
        if (p.appt === "Elder" || p.appt === "MS") L.apptAux.push(Object.assign({}, auxItem, { detail: (p.appt === "Elder" ? "Ancião" : "Servo ministerial") + " · " + auxItem.detail }));
      }

      // Novos batizados
      if (h.baptism && start && h.baptism >= start && h.baptism <= end) L.newBap.push(Object.assign({ detail: "Batismo em " + dateBr(h.baptism) }, base));

      // Irregulares: pelo menos um mês sem pregar (meses antes de começar a pregar não contam)
      var missing = mine.filter(function (k) { return !shared(at(k)) && !(h.firstShared && k < h.firstShared); });
      if (missing.length) L.irregular.push(Object.assign({ months: missing, detail: "Sem pregar: " + missing.map(label).join(", ") }, base));

      // Dirigem estudos (regra escolhida)
      var withSt = mine.filter(function (k) { return (at(k).studies || 0) > 0; });
      var ok = false;
      if (rule === "last") ok = live.length > 0 && withSt.indexOf(live[live.length - 1]) >= 0;
      else if (rule === "last3") { var last3 = live.slice(-3); ok = last3.length > 0 && last3.every(function (k) { return withSt.indexOf(k) >= 0; }); }
      else ok = withSt.length >= 3;
      if (ok) L.studies.push(Object.assign({ months: withSt, detail: "Estudos: " + withSt.map(function (k) { return label(k) + " (" + at(k).studies + ")"; }).join(", ") }, base));

      // Pioneiros regulares abaixo de 50 horas
      var low = mine.filter(function (k) { return cardAt(k).status === "Regular Pioneer" && (at(k).hours || 0) < 50; });
      if (low.length) L.rpLow.push(Object.assign({ months: low, detail: low.map(function (k) { var hr = at(k).hours; return label(k) + ": " + (hr == null ? "sem horas" : hr + " h"); }).join(", ") }, base));
    });

    Object.keys(L).forEach(function (k) { L[k].sort(function (a, b) { return a.name.localeCompare(b.name, "pt"); }); });
    return {
      months: live,
      counts: { elder: c.elder, ms: c.ms, bap: c.bap, unbap: c.unbap, newUnbap: c.newUnbap, aux: L.aux.length, newBap: L.newBap.length, irregular: L.irregular.length, apptAux: L.apptAux.length, studies: L.studies.length, rpLow: L.rpLow.length },
      lists: L
    };
  }

  /** Nome comparável: sem acento, minúsculo, espaços únicos. */
  function normName(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim(); }
  /**
   * Arquivos de pastas → grupos. items: [{ path: "Cong/Grupo 1/a.pdf", ... }].
   * Grupo = pasta-mãe do PDF; pasta com "pioneiro" → "rp"; PDF solto (sem subpasta quando a raiz tem subpastas, ou sem pasta) → null (grupo aberto).
   * Retorna [{ key, name, rp, items }] na ordem em que aparecem.
   */
  function folderGroups(items) {
    var pdf = items.filter(function (i) { return /\.pdf$/i.test(i.path || ""); });
    var deep = {};
    pdf.forEach(function (i) { var s = i.path.split("/").filter(Boolean); if (s.length >= 3) deep[s[0]] = true; });
    var out = [], byKey = {};
    pdf.forEach(function (i) {
      var s = i.path.split("/").filter(Boolean), name = null;
      if (s.length >= 3) name = s[s.length - 2];
      else if (s.length === 2 && !deep[s[0]]) name = s[0];
      var rp = !!name && /pioneir/.test(normName(name));
      var ina = !!name && !rp && /inativ/.test(normName(name));
      var key = name === null ? "" : rp ? "rp" : ina ? "in" : normName(name);
      if (!byKey[key]) { byKey[key] = { key: key, name: name === null ? null : rp ? "Pioneiros regulares" : ina ? "Inativos" : name.trim(), rp: rp, inactive: ina, items: [] }; out.push(byKey[key]); }
      byKey[key].items.push(i);
    });
    return out;
  }

  /** Ordem crescente "natural": Grupo 2 antes de Grupo 10. */
  function sortGroups(groups) {
    return groups.slice().sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || ""), "pt", { numeric: true, sensitivity: "base" }); });
  }

  /** Totais mês a mês. opts: { from, to, area }. Só meses com relatório na congregação. */
  function monthlyTotals(cards, opts) {
    opts = opts || {};
    var reported = {}; reportedMonths(cards).forEach(function (k) { reported[k] = true; });
    var months = monthsBetween(opts.from, opts.to).filter(function (k) { return reported[k]; });
    var rows = {}, keys = ["pubStudies", "pubIrregular", "auxReported", "auxHours", "auxStudies", "rpReported", "rpHours", "rpStudies", "studies", "aux", "irregular", "newUnbap", "newBap"];
    months.forEach(function (k) { rows[k] = {}; keys.forEach(function (x) { rows[k][x] = 0; }); });
    people(cards).forEach(function (h) {
      if (opts.area && opts.area !== "all" && h.area !== opts.area) return;
      var unbap = h.main.status === "Unbaptized Publisher" && !h.baptism;
      months.forEach(function (k) {
        var t = rows[k], e = h.months[k];
        if (h.baptism && h.baptism.slice(0, 7) === k) t.newBap++;
        if (!e) return;
        var m = e.m, q = e.p, st = m.studies || 0, hr = m.hours || 0, sh = shared(m);
        t.studies += st;
        if (unbap && ((h.firstShared === k && h.keys.some(function (x) { return x < k; })) || NEW_PUB.test(m.comments || ""))) t.newUnbap++;
        if (q.status === "Regular Pioneer") { if (sh) t.rpReported++; t.rpHours += hr; t.rpStudies += st; return; }
        if (m.auxiliary || (q.status === "Continuous Auxiliary Pioneer" && hasData(m))) { t.aux++; if (sh) t.auxReported++; t.auxHours += hr; t.auxStudies += st; return; }
        t.pubStudies += st;
        if (!sh && !(h.firstShared && k < h.firstShared)) { t.pubIrregular++; t.irregular++; }
      });
    });
    return { months: months, rows: rows };
  }
  var TOTAL_SECTIONS = [
    { key: "pub", label: "Publicadores", rows: [["pubStudies", "Estudos"], ["pubIrregular", "Irregulares"]] },
    { key: "aux", label: "Pioneiros auxiliares", rows: [["auxReported", "Relataram"], ["auxHours", "Horas"], ["auxStudies", "Estudos"]] },
    { key: "rp", label: "Pioneiros regulares", rows: [["rpReported", "Relataram"], ["rpHours", "Horas"], ["rpStudies", "Estudos"]] },
    { key: "all", label: "Geral", rows: [["studies", "Estudos bíblicos"], ["aux", "Pioneiros auxiliares"], ["irregular", "Irregulares"], ["newUnbap", "Novos não batizados"], ["newBap", "Novos batizados"]] }
  ];

  /**
   * Meta anual de pioneiro regular (600 h = 50 h/mês, set–ago).
   * Início como PR = primeiro mês com horas sem tique de auxiliar e sem observação de especial/missionário
   * (só pioneiros e missionários relatam horas). Depois do início, meses com 0 h continuam contando.
   * upTo = último mês com relatório na congregação dentro do ano (ou o informado); ano encerrado pelo mês do aparelho = até agosto.
   */
  var NOT_RP = /especial|mission[aá]ri/i;
  function prStart(h, mine) {
    var s = mine.filter(function (k) { var m = h.months[k].m; return (m.hours || 0) > 0 && !m.auxiliary && !NOT_RP.test(m.comments || ""); })[0];
    return s || mine[0];
  }
  function pioneerYear(cards, year, upTo, noPrev) {
    var from = (year - 1) + "-09", to = year + "-08", all = monthsBetween(from, to);
    var rep = reportedMonths(cards).filter(function (k) { return k >= from && k <= to; });
    var closed = closedMonth() >= to;
    var last = upTo && upTo >= from ? (upTo > to ? to : upTo) : rep[rep.length - 1];
    var out = [];
    people(cards).forEach(function (h) {
      var mine = all.filter(function (k) { return h.months[k] && h.months[k].p.status === "Regular Pioneer"; });
      if (!mine.length) return;
      var at = function (k) { return h.months[k].m; };
      var start = prStart(h, mine);
      var span = monthsBetween(start, to), elapsed = last && last >= start ? monthsBetween(start, last) : [];
      var done = elapsed.reduce(function (s, k) { return s + ((h.months[k] && at(k).hours) || 0); }, 0);
      var low = elapsed.filter(function (k) { return !h.months[k] || (at(k).hours || 0) < 50; })
        .map(function (k) { return { month: k, hours: h.months[k] && at(k).hours != null ? at(k).hours : null, comments: h.months[k] ? String(at(k).comments || "").trim() : "" }; });
      var fullYear = closed && last === to;
      var shortYear = fullYear && start === from && done < 600;
      var goalYear = 50 * span.length, goalNow = 50 * elapsed.length, left = span.length - elapsed.length;
      out.push({
        id: h.main.id, name: h.name, area: h.area, start: start, late: start > from,
        months: elapsed.length, done: done, goalYear: goalYear, goalNow: goalNow, diff: done - goalNow,
        avg: elapsed.length ? Math.round(done / elapsed.length * 10) / 10 : 0,
        need: left > 0 ? Math.max(0, Math.ceil((goalYear - done) / left)) : 0, left: left, low: low,
        fullYear: fullYear, shortYear: shortYear, missing: shortYear ? Math.round((600 - done) * 10) / 10 : 0,
        prevMissing: 0, prevLow: []
      });
    });
    if (!noPrev) {
      // Alerta do ano anterior aparece também no card do ano selecionado.
      var prev = {};
      pioneerYear(cards, year - 1, null, true).list.forEach(function (x) { if (x.shortYear) prev[normName(x.name)] = x; });
      out.forEach(function (x) { var p = prev[normName(x.name)]; if (p) { x.prevMissing = p.missing; x.prevLow = p.low; } });
    }
    out.sort(function (a, b) { return a.diff - b.diff || a.name.localeCompare(b.name, "pt"); });
    return { year: year, upTo: last || "", list: out };
  }

  // ---------- arquivos de dados (Circuit Manager .json / TSWin .xml) → cartões ----------
  var EN3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function blankCard(info, year) {
    var p = { file: info.file || "", firstname: info.firstname || "", middlename: info.middlename || "", lastname: info.lastname || "", suffix: "",
      sex: info.sex || "", birth: info.birth || "", baptism: info.baptism || "", appt: info.appt || "", status: info.status, serviceYear: "", months: [], notes: [], special: info.special || "" };
    for (var i = 0; i < 12; i++) p.months.push({ month: "", participated: false, studies: null, auxiliary: false, hours: null, comments: "" });
    S().setServiceYear(p, (year - 1) + "/" + year);
    return p;
  }
  function iso(v) { return parseDateAny(v); }
  /** rec por mês "aaaa-mm": { hours, studies, aux, rp, remark, any }. Gera um cartão por ano de serviço. */
  function cardsFrom(info, recs) {
    var years = {};
    Object.keys(recs).forEach(function (k) { years[yearOfMonth(k)] = true; });
    return Object.keys(years).map(Number).sort().map(function (y) {
      var anyRp = Object.keys(recs).some(function (k) { return yearOfMonth(k) === y && recs[k].rp; });
      var st = anyRp || info.rp ? "Regular Pioneer" : info.baptism ? "Baptized Publisher" : "Unbaptized Publisher";
      var p = blankCard(Object.assign({}, info, { status: st }), y);
      p.months.forEach(function (m) {
        var r = recs[m.month]; if (!r) return;
        var pio = r.rp || r.aux || st === "Regular Pioneer";
        m.participated = !!(r.hours > 0 || r.studies > 0 || r.any);
        m.studies = r.studies > 0 ? r.studies : (m.participated ? 0 : null);
        m.auxiliary = !!r.aux;
        m.hours = pio && r.hours > 0 ? r.hours : null;
        m.comments = r.remark || "";
      });
      return p;
    });
  }
  function nameParts(first, last) { var f = String(first || "").trim().split(/\s+/).filter(Boolean); return { firstname: f[0] || "", middlename: f.slice(1).join(" "), lastname: String(last || "").trim() }; }

  /** Circuit Manager / Hourglass (hourglass-export.json) → { file, groups: [{ key, name, rp, cards }] } */
  function fromCircuitJson(d, file) {
    if (!d || !Array.isArray(d.publishers) || !Array.isArray(d.reports)) throw new Error("formato");
    var byUser = {};
    d.reports.forEach(function (r) {
      var u = r.user && r.user.id; if (u == null || !r.year || !r.month) return;
      var k = ym(r.year, r.month), hrs = r.minutes != null ? Math.round(r.minutes / 6) / 10 : Number(r.minutes_as_hours) || 0;
      (byUser[u] = byUser[u] || {})[k] = { hours: hrs, studies: Number(r.studies) || 0, aux: r.pioneer === "Auxiliary", rp: r.pioneer === "Regular", remark: String(r.remarks || "").trim(), any: true };
    });
    var fsg = Array.isArray(d.fsGroups) ? d.fsGroups : [], gname = {};
    fsg.forEach(function (g, i) { gname[g.id] = String(g.name || "").trim() || "Grupo " + (i + 1); });
    var out = [], byKey = {};
    d.publishers.forEach(function (pb) {
      var recs = byUser[pb.id]; if (!recs) return;
      var rpStatus = /Regular Pioneer|FieldMissionary|Special Pioneer/.test(pb.status || "");
      var info = Object.assign(nameParts([pb.firstname, pb.middlename].filter(Boolean).join(" "), pb.lastname), {
        file: file, sex: pb.sex === "Female" ? "Female" : pb.sex === "Male" ? "Male" : "", birth: iso(pb.birth), baptism: iso(pb.baptism),
        appt: pb.appt === "Elder" ? "Elder" : pb.appt === "MS" ? "MS" : "", rp: rpStatus, special: pb.status === "FieldMissionary" ? "fm" : pb.status === "Special Pioneer" ? "sp" : "" });
      var cards = cardsFrom(info, recs);
      var rp = cards.some(function (c) { return c.status === "Regular Pioneer"; });
      var name = pb.group_id != null ? (gname[pb.group_id] || "Grupo " + pb.group_id) : null;
      var key = rp ? "rp" : name === null ? "" : normName(name);
      if (!byKey[key]) { byKey[key] = { key: key, name: rp ? "Pioneiros regulares" : name, rp: rp, cards: [] }; out.push(byKey[key]); }
      byKey[key].cards = byKey[key].cards.concat(cards);
    });
    return { file: file, people: d.publishers.filter(function (pb) { return byUser[pb.id]; }).length, groups: out };
  }

  function xmlText(block, tag) {
    var m = new RegExp("<" + tag.replace(/\./g, "\\.") + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag.replace(/\./g, "\\.") + ">").exec(block);
    return m ? m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim() : "";
  }
  /** TSWin (Active.xml) → { file, groups } */
  function fromTswinXml(text, file) {
    text = String(text || "");
    if (!/<PUBLIST[\s>]/.test(text)) throw new Error("formato");
    var pubs = text.match(/<Pub>[\s\S]*?<\/Pub>/g) || [];
    var out = [], byKey = {}, n = 0;
    pubs.forEach(function (b) {
      var recs = {};
      var re = /<(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+Year="(\d{4})">([\s\S]*?)<\/\1>/g, mm;
      while ((mm = re.exec(b))) {
        var body = mm[3], pio = xmlText(body, "Pio"), hrs = Number(xmlText(body, "Hours").replace(",", ".")) || 0, st = Number(xmlText(body, "BiSt.")) || 0, rem = xmlText(body, "Remark");
        if (!hrs && !st && !pio && !rem) continue;
        recs[ym(+mm[2], EN3.indexOf(mm[1]) + 1)] = { hours: hrs, studies: st, aux: /^Aux/i.test(pio), rp: /^(Reg|Spe|Sp)/i.test(pio), remark: rem, any: hrs > 0 || st > 0 };
      }
      if (!Object.keys(recs).length) return;
      n++;
      var svt = xmlText(b, "svt"), g = xmlText(b, "gender");
      var info = Object.assign(nameParts(xmlText(b, "fname"), xmlText(b, "lname")), {
        file: file, sex: /^f/i.test(g) ? "Female" : /^m/i.test(g) ? "Male" : "", birth: iso(xmlText(b, "birdate")), baptism: iso(xmlText(b, "bapdate")),
        appt: svt === "Elder" ? "Elder" : /^(MinSvt|MS)$/.test(svt) ? "MS" : "" });
      var cards = cardsFrom(info, recs);
      var rp = cards.some(function (c) { return c.status === "Regular Pioneer"; });
      var gr = xmlText(b, "group"), name = gr ? (/^\d+$/.test(gr) ? "Grupo " + gr : gr) : null;
      var key = rp ? "rp" : name === null ? "" : normName(name);
      if (!byKey[key]) { byKey[key] = { key: key, name: rp ? "Pioneiros regulares" : name, rp: rp, cards: [] }; out.push(byKey[key]); }
      byKey[key].cards = byKey[key].cards.concat(cards);
    });
    return { file: file, people: n, groups: out };
  }


  // ---------- datas em qualquer formato ----------
  var MESES = { jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12 };
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
  /** Qualquer data ("06/05/1986", "6-5-86", "1986-05-06", "06 DE MAIO DE 1986", "6 de mai. 1986") → "aaaa-mm-dd" ou "". */
  function parseDateAny(v, now) {
    var s = normName(v == null ? "" : String(v)); if (!s) return "";
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

  // ---------- inativos ----------
  var INATIVO = /inativ/;
  function cardText(p) {
    var parts = [p.file, p.special, p.inactiveFlag ? "inativo" : ""];
    (p.months || []).forEach(function (m) { parts.push(m.comments); });
    (p.notes || []).forEach(function (n) { parts.push(typeof n === "string" ? n : JSON.stringify(n)); });
    return normName(parts.filter(Boolean).join(" "));
  }
  /**
   * Situação de cada pessoa. Inativo = 6+ meses seguidos sem pregar terminando no último mês
   * do período (upTo). Pregou nesse mês → nunca inativo. A palavra "inativo" só gera aviso (flagNote).
   * overrides[normName] = true → "Não está inativo" (escolha manual).
   * Retorna { idDoCartão: { inactive, risk, streak, reason, flagNote, manual, key } }.
   */
  function inactiveMap(cards, upTo, overrides) {
    var rep = reportedMonths(cards), last = capMonth(upTo || rep[rep.length - 1]), out = {}, ov = overrides || {};
    people(cards).forEach(function (h) {
      var key = normName(h.name);
      var flag = h.cards.some(function (p) { return INATIVO.test(cardText(p)); });
      var streak = 0;
      if (last) for (var k = last; h.months[k] && !shared(h.months[k].m) && !(h.firstShared && k < h.firstShared); k = addMonths(k, -1)) streak++;
      var manual = !!ov[key], auto = streak >= 6, inactive = auto && !manual;
      var info = { inactive: inactive, auto: auto, manual: manual, key: key, risk: !auto && streak >= 4, streak: streak, reason: auto ? streak + " meses seguidos sem pregar" : "", flagNote: flag && !auto ? "Cartão diz “inativo”, mas a regra dos 6 meses não confirma" : "" };
      h.cards.forEach(function (p) { if (p.id != null) out[p.id] = info; });
    });
    return out;
  }

  var TILES = [
    { key: "elder", label: "Anciãos" },
    { key: "ms", label: "Servos ministeriais" },
    { key: "bap", label: "Publicadores batizados", hint: "inclui anciãos, servos e pioneiros" },
    { key: "unbap", label: "Publicadores não batizados" },
    { key: "newUnbap", label: "Novos publicadores não batizados" },
    { key: "aux", label: "Pioneiros auxiliares diferentes", list: true },
    { key: "newBap", label: "Novos batizados", list: true },
    { key: "irregular", label: "Irregulares", list: true },
    { key: "apptAux", label: "Anciãos e servos como P.A.", list: true },
    { key: "studies", label: "Dirigem estudos", list: true }
  ];
  /** Resumo próprio da área dos pioneiros regulares. */
  var RP_TILES = [
    { key: "elderRp", label: "Anciãos – Pioneiros Regulares" },
    { key: "msRp", label: "Servos ministeriais – Pioneiros Regulares" },
    { key: "studies", label: "Dirigem estudos", list: true },
    { key: "irregular", label: "Irregulares", list: true },
    { key: "below", label: "Abaixo da média", hint: "atrás da meta anual de 600 h", list: true }
  ];
  /** Análise da área "rp": analyze + pioneiros abaixo da meta do ano de serviço. */
  function analyzeRp(cards, opts, year) {
    var r = analyze(cards, Object.assign({}, opts, { area: "rp" }));
    var below = year ? pioneerYear(cards, year).list.filter(function (x) { return x.area === "rp" && x.diff < 0; }).map(function (x) {
      return { id: x.id, name: x.name, area: x.area, detail: "Faltam " + (Math.round(-x.diff * 10) / 10) + " h · média " + x.avg + " h/mês" };
    }) : [];
    below.sort(function (a, b) { return a.name.localeCompare(b.name, "pt"); });
    r.lists.below = below;
    r.counts.elderRp = r.counts.elder; r.counts.msRp = r.counts.ms; r.counts.below = below.length;
    return r;
  }
  /** Possíveis pioneiros regulares: não marcados como PR, não inativos, com meses entre 35 h e 50 h (50 não entra). */
  function prCandidates(cards, info, decisions) {
    info = info || {}; decisions = decisions || {};
    var by = {};
    cards.forEach(function (p) {
      var k = fullName(p).toLowerCase(); if (!k) return;
      var e = by[k] = by[k] || { key: k, name: fullName(p), id: p.id, area: p.area, skip: false, months: [] };
      if (p.status === "Regular Pioneer" || p.area === "rp" || (info[p.id] && info[p.id].inactive)) e.skip = true;
      (p.months || []).forEach(function (m) { var h = m.hours; if (typeof h === "number" && h >= 35 && h < 50 && m.month && e.months.indexOf(m.month) < 0) e.months.push(m.month); });
    });
    return Object.keys(by).map(function (k) { return by[k]; }).filter(function (e) { return !e.skip && e.months.length && !decisions[e.key]; })
      .map(function (e) { e.months.sort(); delete e.skip; return e; }).sort(function (x, y) { return x.name.localeCompare(y.name, "pt"); });
  }
  var STUDY_RULES = [
    { key: "last", label: "Relatou estudos no último mês do período" },
    { key: "last3", label: "Relatou estudos nos 3 últimos meses seguidos" },
    { key: "any3", label: "Relatou estudos em pelo menos 3 meses do período" }
  ];

  var api = { MES: MES, TILES: TILES, RP_TILES: RP_TILES, analyzeRp: analyzeRp, STUDY_RULES: STUDY_RULES, label: label, addMonths: addMonths, monthsBetween: monthsBetween, reportedMonths: reportedMonths, coveredMonths: coveredMonths, defaultPeriod: defaultPeriod, cardYear: cardYear, serviceYears: serviceYears, periodOf: periodOf, yearOfMonth: yearOfMonth, lastMonths: lastMonths, periodYears: periodYears, people: people, analyze: analyze, fullName: fullName, normName: normName, folderGroups: folderGroups, sortGroups: sortGroups, monthlyTotals: monthlyTotals, TOTAL_SECTIONS: TOTAL_SECTIONS, pioneerYear: pioneerYear, setToday: setToday, closedMonth: closedMonth, fromCircuitJson: fromCircuitJson, fromTswinXml: fromTswinXml, parseDateAny: parseDateAny, dateBr: dateBr, inactiveMap: inactiveMap, prCandidates: prCandidates };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Analisador = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
