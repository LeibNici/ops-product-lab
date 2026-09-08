/**
 * localStorage + JSON import/export for the assumption board.
 * No backend. Schema version 1.
 */
(function (root) {
  var STORAGE_KEY = "ops-product-lab:assumption-board:v1";
  var SCHEMA_VERSION = 1;

  function emptyState() {
    return { version: SCHEMA_VERSION, hypotheses: [] };
  }

  function normalizeSignals(raw) {
    raw = raw || {};
    return {
      likes: Number(raw.likes) || 0,
      bookmarks: Number(raw.bookmarks) || 0,
      reposts: Number(raw.reposts) || 0,
      replies: Number(raw.replies) || 0,
      intentDms: Number(raw.intentDms) || 0,
      waitlist: Number(raw.waitlist) || 0,
    };
  }

  function normalizeTargets(raw) {
    var defaults = root.Conclusion
      ? root.Conclusion.defaultTargets()
      : { engagement: 20, intentDms: 3, waitlist: 2 };
    raw = raw || {};
    return {
      engagement: Number(raw.engagement) || defaults.engagement,
      intentDms: Number(raw.intentDms) || defaults.intentDms,
      waitlist: Number(raw.waitlist) || defaults.waitlist,
    };
  }

  function normalizePost(raw) {
    raw = raw || {};
    return {
      id: String(raw.id || createId()),
      url: String(raw.url || "").trim(),
      note: String(raw.note || "").trim(),
      postedAt: String(raw.postedAt || ""),
    };
  }

  function normalizeHypothesis(raw) {
    raw = raw || {};
    var now = new Date().toISOString();
    return {
      id: String(raw.id || createId()),
      who: String(raw.who || ""),
      pain: String(raw.pain || ""),
      successMetric: String(raw.successMetric || ""),
      startDate: String(raw.startDate || todayDate()),
      posts: Array.isArray(raw.posts) ? raw.posts.map(normalizePost) : [],
      signals: normalizeSignals(raw.signals),
      targets: normalizeTargets(raw.targets),
      createdAt: String(raw.createdAt || now),
      updatedAt: String(raw.updatedAt || now),
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return emptyState();
    var list = raw.hypotheses;
    if (!Array.isArray(list) && Array.isArray(raw)) list = raw;
    return {
      version: SCHEMA_VERSION,
      hypotheses: (list || []).map(normalizeHypothesis),
    };
  }

  function todayDate() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function createId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") {
      return root.crypto.randomUUID();
    }
    return "h-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function load() {
    try {
      var raw = root.localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      return normalizeState(JSON.parse(raw));
    } catch (err) {
      return emptyState();
    }
  }

  function save(state) {
    var next = normalizeState(state);
    root.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function parseImport(text) {
    var parsed = JSON.parse(text);
    return normalizeState(parsed);
  }

  function toExportPayload(state) {
    var next = normalizeState(state);
    return {
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      hypotheses: next.hypotheses,
    };
  }

  root.BoardStorage = {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    emptyState: emptyState,
    normalizeState: normalizeState,
    normalizeHypothesis: normalizeHypothesis,
    load: load,
    save: save,
    parseImport: parseImport,
    toExportPayload: toExportPayload,
    createId: createId,
    todayDate: todayDate,
  };
})(typeof self !== "undefined" ? self : this);
