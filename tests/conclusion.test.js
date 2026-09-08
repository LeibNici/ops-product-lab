const assert = require("assert");
const Conclusion = require("../js/conclusion.js");

function hyp(overrides) {
  return Object.assign(
    {
      who: "indie builders",
      pain: "posts disconnected from hypotheses",
      successMetric: "3 DMs or 2 waitlist in 7 days",
      startDate: "2026-09-01",
      posts: [{ url: "https://x.com/x/status/1" }],
      signals: { likes: 0, bookmarks: 0, reposts: 0, replies: 0, intentDms: 0, waitlist: 0 },
      targets: { engagement: 20, intentDms: 3, waitlist: 2 },
    },
    overrides
  );
}

const nowDay3 = new Date(2026, 8, 4);
const nowDay7 = new Date(2026, 8, 8);

assert.strictEqual(Conclusion.daysElapsed("2026-09-01", nowDay3), 3);
assert.strictEqual(Conclusion.daysElapsed("2026-09-01", nowDay7), 7);
assert.strictEqual(Conclusion.engagementTotal({ likes: 8, bookmarks: 5, reposts: 2, replies: 3 }), 18);

const inProgress = Conclusion.evaluateHypothesis(hyp(), nowDay3);
assert.strictEqual(inProgress.verdict, "in-progress");
assert.strictEqual(inProgress.label, "7 天验证中");

const early = Conclusion.evaluateHypothesis(
  hyp({
    signals: { likes: 10, bookmarks: 10, reposts: 0, replies: 0, intentDms: 3, waitlist: 0 },
  }),
  nowDay3
);
assert.strictEqual(early.verdict, "early-validated");

const vanityOnly = Conclusion.evaluateHypothesis(
  hyp({
    signals: { likes: 50, bookmarks: 0, reposts: 0, replies: 0, intentDms: 0, waitlist: 0 },
  }),
  nowDay7
);
assert.strictEqual(vanityOnly.verdict, "inconclusive", "likes alone should not validate");

const validated = Conclusion.evaluateHypothesis(
  hyp({
    signals: { likes: 10, bookmarks: 10, reposts: 0, replies: 0, intentDms: 1, waitlist: 2 },
  }),
  nowDay7
);
assert.strictEqual(validated.verdict, "validated");

const invalidated = Conclusion.evaluateHypothesis(hyp(), nowDay7);
assert.strictEqual(invalidated.verdict, "invalidated");

const text = Conclusion.formatCardText(hyp(), inProgress);
assert.ok(text.includes("【H1 7日验证】"));
assert.ok(text.includes("对象：indie builders"));

const fs = require("fs");
const path = require("path");
const example = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/example-board.json"), "utf8")
);
assert.strictEqual(example.version, 1);
assert.ok(example.hypotheses[0].who);
assert.ok(example.hypotheses[0].posts[0].url);
const demoEval = Conclusion.evaluateHypothesis(
  example.hypotheses[0],
  new Date(2026, 8, 8)
);
assert.strictEqual(demoEval.engagement, 18);
assert.strictEqual(demoEval.verdict, "in-progress");

console.log("conclusion.test.js ok");
