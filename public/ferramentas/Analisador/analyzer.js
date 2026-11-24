/* Analisador de congregações — regras puras (sem tela). Usa a leitura do Conversor S-21 (S21). */
(function (root) {
  var MES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  var NEW_PUB = /novo\s+publicador|in[ií]cio\s+como\s+publicador|iniciou\s+como\s+publicador|come[cç]ou\s+a\s+pregar/i;

  function S() { return root.S21; }
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
    cards.forEach(function (p) { p.months.forEach(function (m) { if (m.month && hasData(m)) set[m.month] = true; }); });
    return Object.keys(set).sort();
  }

  /** Todos os meses cobertos pelos cartões (para escolher o período). */
  function coveredMonths(cards) {
    var set = {};
    cards.forEach(function (p) { p.months.forEach(function (m) { if (m.month) set[m.month] = true; }); });
    var keys = Object.keys(set).sort();
    return keys.length ? monthsBetween(keys[0], keys[keys.length - 1]) : [];
  }

  /** Período padrão: os 6 últimos meses com relatório. */
  function defaultPeriod(cards) {
    var r = reportedMonths(cards); if (!r.length) return { from: "", to: "" };
    var to = r[r.length - 1], from = addMonths(to, -5);
    return { from: from < r[0] ? r[0] : from, to: to };
  }

  /** Cartões → pessoas (cartões da mesma pessoa juntados). Área = área do cartão mais recente. */
  function people(cards) {
    return S().groupPeople(cards).map(function (g) {
      var first = null, baptism = "";
      g.keys.forEach(function (k) { if (!first && shared(g.months[k].m)) first = k; });
      g.cards.forEach(function (p) { if (p.baptism && (!baptism || p === g.main)) baptism = p.baptism; });
      return { name: fullName(g.main), main: g.main, area: g.main.area, months: g.months, keys: g.keys, firstShared: first, baptism: baptism };
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
      var p = h.main, base = { name: h.name, area: h.area };
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
    { key: "studies", label: "Dirigem estudos", list: true },
    { key: "rpLow", label: "Pioneiros regulares abaixo de 50 h", list: true }
  ];
  var STUDY_RULES = [
    { key: "last", label: "Relatou estudos no último mês do período" },
    { key: "last3", label: "Relatou estudos nos 3 últimos meses seguidos" },
    { key: "any3", label: "Relatou estudos em pelo menos 3 meses do período" }
  ];

  var api = { MES: MES, TILES: TILES, STUDY_RULES: STUDY_RULES, label: label, addMonths: addMonths, monthsBetween: monthsBetween, reportedMonths: reportedMonths, coveredMonths: coveredMonths, defaultPeriod: defaultPeriod, people: people, analyze: analyze, fullName: fullName };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Analisador = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
