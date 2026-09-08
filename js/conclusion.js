/**
 * 7-day validation scoring for H1 assumption board.
 * Works in the browser (global Conclusion) and in Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Conclusion = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  var MS_PER_DAY = 24 * 60 * 60 * 1000;

  function toNumber(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function engagementTotal(signals) {
    signals = signals || {};
    return (
      toNumber(signals.likes) +
      toNumber(signals.bookmarks) +
      toNumber(signals.reposts) +
      toNumber(signals.replies)
    );
  }

  function daysElapsed(startDate, now) {
    now = now || new Date();
    if (!startDate) return 0;
    var start = new Date(startDate + "T00:00:00");
    if (Number.isNaN(start.getTime())) return 0;
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.floor((today - start) / MS_PER_DAY));
  }

  function defaultTargets() {
    return { engagement: 20, intentDms: 3, waitlist: 2 };
  }

  function nextStep(verdict, hits) {
    if (verdict === "validated" || verdict === "early-validated") {
      return "假设成立。下一轮可以加深产品，或换一条更窄的假设继续公开验证。";
    }
    if (verdict === "invalidated") {
      return "7 天内三项信号都未达标。改写对象/痛点，或换一条带明确 CTA 的帖再测。";
    }
    if (!hits.waitlist) {
      return "等待名单偏弱：下一帖附上 waitlist / 兴趣登记链接，把互动转成意图。";
    }
    if (!hits.intentDms) {
      return "意向私信偏弱：帖文加一句可回复的问题，或邀请「想用的人私信我」。";
    }
    if (!hits.engagement) {
      return "互动未达标：同一假设再发 1 条更具体的 Build in Public 帖，观察收藏/转发。";
    }
    return "信号不齐。补齐最弱的一项后再看 7 日窗口。";
  }

  function evaluateHypothesis(hypothesis, now) {
    hypothesis = hypothesis || {};
    var signals = hypothesis.signals || {};
    var targets = Object.assign(defaultTargets(), hypothesis.targets || {});
    var days = daysElapsed(hypothesis.startDate, now);
    var windowClosed = days >= 7;
    var engagement = engagementTotal(signals);
    var intentDms = toNumber(signals.intentDms);
    var waitlist = toNumber(signals.waitlist);

    var hits = {
      engagement: engagement >= toNumber(targets.engagement),
      intentDms: intentDms >= toNumber(targets.intentDms),
      waitlist: waitlist >= toNumber(targets.waitlist),
    };
    var hitCount = Number(hits.engagement) + Number(hits.intentDms) + Number(hits.waitlist);
    var hasIntent = hits.intentDms || hits.waitlist;

    var verdict;
    var label;
    if (!windowClosed) {
      if (hitCount >= 2 && hasIntent) {
        verdict = "early-validated";
        label = "提前达标";
      } else {
        verdict = "in-progress";
        label = "7 天验证中";
      }
    } else if (hitCount >= 2 && hasIntent) {
      verdict = "validated";
      label = "已验证";
    } else if (hitCount === 0) {
      verdict = "invalidated";
      label = "未验证";
    } else {
      verdict = "inconclusive";
      label = "证据不足";
    }

    var suggestion = nextStep(verdict, hits);
    var dayLabel = windowClosed ? "窗口已满 7 天" : "第 " + Math.min(days, 7) + " / 7 天";

    return {
      days: days,
      dayLabel: dayLabel,
      windowClosed: windowClosed,
      engagement: engagement,
      intentDms: intentDms,
      waitlist: waitlist,
      targets: targets,
      hits: hits,
      hitCount: hitCount,
      verdict: verdict,
      label: label,
      suggestion: suggestion,
    };
  }

  function formatCardText(hypothesis, evaluation) {
    hypothesis = hypothesis || {};
    evaluation = evaluation || evaluateHypothesis(hypothesis);
    return [
      "【H1 7日验证】" + evaluation.dayLabel + " · " + evaluation.label,
      "对象：" + (hypothesis.who || "（未填写）"),
      "痛点：" + (hypothesis.pain || "（未填写）"),
      "成功标准：" + (hypothesis.successMetric || "（未填写）"),
      "帖文数：" + ((hypothesis.posts && hypothesis.posts.length) || 0),
      "信号：互动 " +
        evaluation.engagement +
        "/" +
        evaluation.targets.engagement +
        " · 意向 DM " +
        evaluation.intentDms +
        "/" +
        evaluation.targets.intentDms +
        " · 等待名单 " +
        evaluation.waitlist +
        "/" +
        evaluation.targets.waitlist,
      "结论：" + evaluation.label + "。" + evaluation.suggestion,
    ].join("\n");
  }

  return {
    defaultTargets: defaultTargets,
    engagementTotal: engagementTotal,
    daysElapsed: daysElapsed,
    evaluateHypothesis: evaluateHypothesis,
    formatCardText: formatCardText,
  };
});
