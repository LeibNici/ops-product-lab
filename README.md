# ops-product-lab

产品运营专员主导的自研产品实验仓。

## 目标
- 自主产品：定义问题、做 MVP、持续迭代
- Twitter/X 运营：内容节奏、增长实验、反馈闭环
- 团队协作：产品经理 / 研发工程师 / 社媒内容 / 运营专员

## 当前阶段

H1 MVP：单页静态「假设看板」。把产品假设、X 帖链接、7 天信号和验证结论放在同一页。

锁定的产品上下文：

- 谁：在 X 上 Build in Public 的独立开发者 / 小团队 PM
- 痛：帖文和产品假设断开，7 天内无法判断有没有被验证
- 四个界面块：假设登记（谁 / 痛点 / 成功标准）→ 关联 X 帖 → 记录三类信号 → 7 日结论卡

无账号、无后端、无 OAuth。数据只存在这台浏览器里，可导出 / 导入 JSON 文件。

## 本地打开

任选一种：

```bash
# 推荐：任意静态服务器（避免个别浏览器限制 file:// 下的 localStorage）
python3 -m http.server 4173
```

然后打开 http://localhost:4173/

或者直接用浏览器打开仓库根目录的 `index.html`。

不需要 `npm install`，没有构建步骤。

打开后：

1. 「新建假设」或「载入示例」
2. 填写对象 / 痛点 / 成功标准
3. 贴上 X 帖链接
4. 手工记下赞 / 收藏 / 转发 / 回复、意向 DM、等待名单兴趣
5. 第 4 块会根据开始日和信号生成 7 日结论卡，可复制文案发到 X

## JSON 如何持久化

两层，都在本地：

1. **浏览器 localStorage**  
   键名：`ops-product-lab:assumption-board:v1`  
   每次改字段会自动写入。刷新页面会恢复。换浏览器或清站点数据会丢，所以请导出备份。

2. **JSON 文件**  
   - 「导出 JSON」下载 `assumption-board.json`  
   - 「导入 JSON」用导出的文件覆盖当前看板  
   - 仓库里有一份示例：[`data/example-board.json`](data/example-board.json)

schema `version: 1`：

```json
{
  "version": 1,
  "exportedAt": "ISO-8601",
  "hypotheses": [
    {
      "id": "uuid",
      "who": "谁",
      "pain": "痛点",
      "successMetric": "成功标准（人话）",
      "startDate": "YYYY-MM-DD",
      "posts": [{ "id": "uuid", "url": "https://x.com/...", "note": "", "postedAt": "YYYY-MM-DD" }],
      "signals": {
        "likes": 0,
        "bookmarks": 0,
        "reposts": 0,
        "replies": 0,
        "intentDms": 0,
        "waitlist": 0
      },
      "targets": { "engagement": 20, "intentDms": 3, "waitlist": 2 }
    }
  ]
}
```

互动合计 = likes + bookmarks + reposts + replies。默认达标线可在界面改。

结论规则（可在 `js/conclusion.js` 调整）：

- 未满 7 天：默认「7 天验证中」；若互动 + 意图信号已有两项达标，且其中包含意向 DM 或等待名单 → 「提前达标」
- 满 7 天且两项达标（必须含意向信号）→ 「已验证」
- 满 7 天且三项都未达标 → 「未验证」
- 其余 → 「证据不足」（例如只有赞、没有 DM / waitlist，不算验证）

## 文件结构

```
index.html          单页入口
css/board.css
js/app.js           UI
js/storage.js       localStorage + 导入导出
js/conclusion.js    7 日结论（浏览器 / Node 共用）
data/example-board.json
tests/conclusion.test.js
```

跑结论规则的小测试：

```bash
node tests/conclusion.test.js
```

## 协作约定
1. 产品经理：定位、路线图、验收标准
2. 研发工程师：实现与 PR
3. 社媒内容：X 文案与发布节奏
4. 运营专员：节奏、增长、跨角色对齐
