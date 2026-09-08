(function () {
  var DEMO = {
    version: 1,
    hypotheses: [
      {
        id: "demo-h1",
        who: "在 X 上 Build in Public 的独立开发者 / 小团队 PM",
        pain: "帖文和产品假设是断开的，发完 7 天也说不清有没有被验证",
        successMetric: "7 天内：互动 ≥20，意向 DM ≥3，等待名单兴趣 ≥2",
        startDate: "",
        posts: [
          {
            id: "demo-post-1",
            url: "https://x.com/example/status/123",
            note: "公开这条假设本身",
            postedAt: "",
          },
        ],
        signals: {
          likes: 8,
          bookmarks: 5,
          reposts: 2,
          replies: 3,
          intentDms: 1,
          waitlist: 0,
        },
        targets: { engagement: 20, intentDms: 3, waitlist: 2 },
      },
    ],
  };

  var state = BoardStorage.emptyState();
  var selectedId = null;
  var saveTimer = null;

  var els = {
    status: document.getElementById("status"),
    list: document.getElementById("hypothesis-list"),
    editor: document.getElementById("editor"),
    newBtn: document.getElementById("new-hypothesis"),
    exportBtn: document.getElementById("export-json"),
    importInput: document.getElementById("import-json"),
    demoBtn: document.getElementById("load-demo"),
  };

  function setStatus(message) {
    els.status.textContent = message || "";
  }

  function persist() {
    BoardStorage.save(state);
  }

  function schedulePersist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      persist();
      setStatus("已写入浏览器 localStorage");
    }, 250);
  }

  function selected() {
    return state.hypotheses.find(function (item) {
      return item.id === selectedId;
    });
  }

  function daysAgoISO(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function createHypothesis() {
    var item = BoardStorage.normalizeHypothesis({
      who: "",
      pain: "",
      successMetric: "",
      startDate: BoardStorage.todayDate(),
      posts: [],
      signals: {},
      targets: Conclusion.defaultTargets(),
    });
    state.hypotheses.unshift(item);
    selectedId = item.id;
    persist();
    render();
    setStatus("已新建假设，填写后会自动保存");
  }

  function deleteSelected() {
    var item = selected();
    if (!item) return;
    if (!window.confirm("删除这条假设？本地 JSON 会立刻更新。")) return;
    state.hypotheses = state.hypotheses.filter(function (h) {
      return h.id !== item.id;
    });
    selectedId = state.hypotheses[0] ? state.hypotheses[0].id : null;
    persist();
    render();
    setStatus("已删除");
  }

  function loadDemo() {
    var payload = JSON.parse(JSON.stringify(DEMO));
    payload.hypotheses[0].startDate = daysAgoISO(3);
    payload.hypotheses[0].posts[0].postedAt = payload.hypotheses[0].startDate;
    payload.hypotheses[0].createdAt = new Date().toISOString();
    payload.hypotheses[0].updatedAt = payload.hypotheses[0].createdAt;
    state = BoardStorage.normalizeState(payload);
    selectedId = state.hypotheses[0].id;
    persist();
    render();
    setStatus("已载入示例假设（第 3/7 天）");
  }

  function exportJson() {
    var payload = BoardStorage.toExportPayload(state);
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "assumption-board.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("已下载 assumption-board.json");
  }

  function importJson(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        state = BoardStorage.parseImport(String(reader.result));
        selectedId = state.hypotheses[0] ? state.hypotheses[0].id : null;
        persist();
        render();
        setStatus("已导入 JSON，并写入 localStorage");
      } catch (err) {
        setStatus("导入失败：JSON 格式不正确");
      }
    };
    reader.readAsText(file);
  }

  function patchSelected(mutator) {
    var item = selected();
    if (!item) return;
    mutator(item);
    item.updatedAt = new Date().toISOString();
    schedulePersist();
    renderList();
    renderConclusion();
  }

  function renderList() {
    if (!state.hypotheses.length) {
      els.list.innerHTML = '<p class="empty-list">还没有假设。点右上角「新建假设」，或先载入示例。</p>';
      return;
    }
    els.list.innerHTML = "";
    var ul = document.createElement("ul");
    ul.className = "list";
    state.hypotheses.forEach(function (item) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "list-item" + (item.id === selectedId ? " active" : "");
      var evaluation = Conclusion.evaluateHypothesis(item);
      btn.innerHTML =
        '<span class="who"></span><span class="meta"><span></span><span></span></span>';
      btn.querySelector(".who").textContent = item.who.trim() || "未命名假设";
      btn.querySelector(".meta span:first-child").textContent = evaluation.label;
      btn.querySelector(".meta span:last-child").textContent = item.startDate || "无开始日";
      btn.addEventListener("click", function () {
        selectedId = item.id;
        render();
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
    els.list.appendChild(ul);
  }

  function field(label, inputHtml) {
    return '<label class="field"><span>' + label + "</span>" + inputHtml + "</label>";
  }

  function renderEditor() {
    var item = selected();
    if (!item) {
      els.editor.innerHTML =
        '<div class="empty-editor">选择左侧一条假设，或新建一条：写下对象、痛点、成功标准，再贴上 X 帖链接和 7 天信号。</div>';
      return;
    }

    var postsHtml = item.posts
      .map(function (post, index) {
        return (
          '<div class="post" data-post-id="' +
          post.id +
          '">' +
          '<label class="field grow"><span>X / Twitter 链接</span>' +
          '<input type="url" data-k="url" value="' +
          escapeAttr(post.url) +
          '" placeholder="https://x.com/..."></label>' +
          '<label class="field"><span>发帖日</span>' +
          '<input type="date" data-k="postedAt" value="' +
          escapeAttr(post.postedAt) +
          '"></label>' +
          '<button type="button" class="ghost" data-remove-post="' +
          index +
          '">移除</button>' +
          "</div>"
        );
      })
      .join("");

    els.editor.innerHTML =
      '<div class="blocks">' +
      '<section class="block" id="block-hypothesis">' +
      '<div class="block-head"><span class="stamp">01</span><h3>假设登记</h3></div>' +
      '<p class="hint">谁、什么痛、怎样才算成功。这是后面帖文和结论卡要对齐的那句话。</p>' +
      field(
        "谁（对象）",
        '<input type="text" id="who" value="' +
          escapeAttr(item.who) +
          '" placeholder="例如：在 X 上 Build in Public 的独立开发者">'
      ) +
      field(
        "痛点",
        '<textarea id="pain" placeholder="例如：帖文和产品假设断开，7 天内无法判断有没有验证">' +
          escapeHtml(item.pain) +
          "</textarea>"
      ) +
      field(
        "成功标准",
        '<textarea id="successMetric" placeholder="例如：7 天内等到 3 条意向 DM 或 2 个 waitlist">' +
          escapeHtml(item.successMetric) +
          "</textarea>"
      ) +
      '<div class="grid-2">' +
      field("验证开始日", '<input type="date" id="startDate" value="' + escapeAttr(item.startDate) + '">') +
      "</div></section>" +
      '<section class="block" id="block-posts">' +
      '<div class="block-head"><span class="stamp">02</span><h3>关联 X 帖</h3></div>' +
      '<p class="hint">把公开验证这条假设的帖贴进来。可以多条。</p>' +
      '<div class="posts" id="posts">' +
      (postsHtml || '<p class="hint">还没有帖文链接。</p>') +
      "</div>" +
      '<button type="button" class="ghost" id="add-post">添加帖文链接</button>' +
      "</section>" +
      '<section class="block" id="block-signals">' +
      '<div class="block-head"><span class="stamp">03</span><h3>记录 3 类信号</h3></div>' +
      '<p class="hint">互动 = 赞 + 收藏 + 转发 + 回复。意向 DM 和等待名单需要你手工从私信/表单里数。</p>' +
      '<p class="field-label">互动</p>' +
      '<div class="grid-4">' +
      numField("赞 likes", "likes", item.signals.likes) +
      numField("收藏 bookmarks", "bookmarks", item.signals.bookmarks) +
      numField("转发 reposts", "reposts", item.signals.reposts) +
      numField("回复 replies", "replies", item.signals.replies) +
      "</div>" +
      '<div class="grid-2" style="margin-top:10px">' +
      numField("意向 DM", "intentDms", item.signals.intentDms) +
      numField("等待名单兴趣", "waitlist", item.signals.waitlist) +
      "</div>" +
      '<p class="field-label" style="margin-top:12px">7 日达标线（可改）</p>' +
      '<div class="grid-3">' +
      numField("互动目标", "target-engagement", item.targets.engagement) +
      numField("意向 DM 目标", "target-intentDms", item.targets.intentDms) +
      numField("等待名单目标", "target-waitlist", item.targets.waitlist) +
      "</div></section>" +
      '<section class="block" id="block-conclusion">' +
      '<div class="block-head"><span class="stamp">04</span><h3>7 日验证结论卡</h3></div>' +
      '<p class="hint">根据开始日和三类信号现场生成。仅靠互动达标不算验证，需要意向 DM 或等待名单至少中一项。</p>' +
      '<div id="conclusion-card"></div>' +
      '<div class="actions">' +
      '<button type="button" id="generate-conclusion">生成 / 刷新结论卡</button>' +
      '<button type="button" class="ghost" id="copy-conclusion">复制结论文案</button>' +
      '<button type="button" class="ghost danger" id="delete-hypothesis">删除假设</button>' +
      "</div></section>" +
      "</div>";

    bindEditor(item);
    renderConclusion();
  }

  function numField(label, id, value) {
    return field(
      label,
      '<input type="number" min="0" step="1" id="' + id + '" value="' + escapeAttr(String(value || 0)) + '">'
    );
  }

  function bindEditor(item) {
    ["who", "pain", "successMetric", "startDate"].forEach(function (key) {
      var node = document.getElementById(key);
      if (!node) return;
      node.addEventListener("input", function () {
        patchSelected(function (h) {
          h[key] = node.value;
        });
      });
    });

    ["likes", "bookmarks", "reposts", "replies", "intentDms", "waitlist"].forEach(function (key) {
      var node = document.getElementById(key);
      if (!node) return;
      node.addEventListener("input", function () {
        patchSelected(function (h) {
          h.signals[key] = Number(node.value) || 0;
        });
      });
    });

    [
      ["target-engagement", "engagement"],
      ["target-intentDms", "intentDms"],
      ["target-waitlist", "waitlist"],
    ].forEach(function (pair) {
      var node = document.getElementById(pair[0]);
      if (!node) return;
      node.addEventListener("input", function () {
        patchSelected(function (h) {
          h.targets[pair[1]] = Number(node.value) || 0;
        });
      });
    });

    document.getElementById("add-post").addEventListener("click", function () {
      patchSelected(function (h) {
        h.posts.push({
          id: BoardStorage.createId(),
          url: "",
          note: "",
          postedAt: h.startDate || BoardStorage.todayDate(),
        });
      });
      renderEditor();
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-remove-post]"), function (btn) {
      btn.addEventListener("click", function () {
        var index = Number(btn.getAttribute("data-remove-post"));
        patchSelected(function (h) {
          h.posts.splice(index, 1);
        });
        renderEditor();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".post"), function (row) {
      Array.prototype.forEach.call(row.querySelectorAll("input"), function (input) {
        input.addEventListener("input", function () {
          var postId = row.getAttribute("data-post-id");
          var key = input.getAttribute("data-k");
          patchSelected(function (h) {
            h.posts.forEach(function (post) {
              if (post.id === postId) post[key] = input.value;
            });
          });
        });
      });
    });

    document.getElementById("delete-hypothesis").addEventListener("click", deleteSelected);
    document.getElementById("generate-conclusion").addEventListener("click", function () {
      persist();
      renderConclusion();
      document.getElementById("block-conclusion").scrollIntoView({ behavior: "smooth", block: "start" });
      setStatus("已根据当前数据生成 7 日结论卡");
    });
    document.getElementById("copy-conclusion").addEventListener("click", function () {
      var text = Conclusion.formatCardText(item, Conclusion.evaluateHypothesis(item));
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          setStatus("结论文案已复制");
        });
      } else {
        window.prompt("复制结论文案", text);
      }
    });
  }

  function renderConclusion() {
    var card = document.getElementById("conclusion-card");
    var item = selected();
    if (!card || !item) return;
    var evaluation = Conclusion.evaluateHypothesis(item);
    var postCount = item.posts.filter(function (p) {
      return p.url.trim();
    }).length;
    card.innerHTML =
      '<article class="card">' +
      '<div class="card-top">' +
      "<div><strong>" +
      escapeHtml(evaluation.dayLabel) +
      "</strong><div class=\"hint\" style=\"margin:6px 0 0\">关联帖 " +
      postCount +
      " 条 · 更新于 " +
      escapeHtml(formatTime(item.updatedAt)) +
      "</div></div>" +
      '<span class="verdict ' +
      evaluation.verdict +
      '">' +
      escapeHtml(evaluation.label) +
      "</span></div>" +
      '<p class="suggestion"><strong>对象</strong> ' +
      escapeHtml(item.who || "（未填写）") +
      "<br><strong>痛点</strong> " +
      escapeHtml(item.pain || "（未填写）") +
      "<br><strong>成功标准</strong> " +
      escapeHtml(item.successMetric || "（未填写）") +
      "</p>" +
      '<div class="metrics">' +
      metric("互动", evaluation.engagement, evaluation.targets.engagement, evaluation.hits.engagement) +
      metric("意向 DM", evaluation.intentDms, evaluation.targets.intentDms, evaluation.hits.intentDms) +
      metric("等待名单", evaluation.waitlist, evaluation.targets.waitlist, evaluation.hits.waitlist) +
      "</div>" +
      '<p class="suggestion">' +
      escapeHtml(evaluation.suggestion) +
      "</p>" +
      '<pre class="copy-preview">' +
      escapeHtml(Conclusion.formatCardText(item, evaluation)) +
      "</pre></article>";
  }

  function metric(name, value, target, hit) {
    return (
      '<div class="metric"><span>' +
      name +
      (hit ? " · 达标" : "") +
      "</span><b>" +
      value +
      " / " +
      target +
      "</b></div>"
    );
  }

  function formatTime(iso) {
    if (!iso) return "刚刚";
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "刚刚";
    return d.toLocaleString("zh-CN", { hour12: false });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  function render() {
    renderList();
    renderEditor();
  }

  function init() {
    state = BoardStorage.load();
    selectedId = state.hypotheses[0] ? state.hypotheses[0].id : null;
    els.newBtn.addEventListener("click", createHypothesis);
    els.exportBtn.addEventListener("click", exportJson);
    els.demoBtn.addEventListener("click", loadDemo);
    els.importInput.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      importJson(file);
      event.target.value = "";
    });
    render();
    if (state.hypotheses.length) setStatus("已从 localStorage 恢复");
  }

  init();
})();
