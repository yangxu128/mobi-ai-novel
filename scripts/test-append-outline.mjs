/**
 * 复现流水线 step4 "继续生成" 的完整链路：
 * 1. 构造与 outlineAppendPrompt 一致的请求（10 章已有大纲）
 * 2. 流式调用 DeepSeek
 * 3. 用 step4-outline.tsx 同款 tryParse 解析
 */
import fs from "node:fs";

const env = fs.readFileSync(".env", "utf8");
const key = env.match(/AI_API_KEY\s*=\s*"?([^"\n]+)"?/)?.[1];
const baseUrl = env.match(/AI_BASE_URL\s*=\s*"?([^"\n]+)"?/)?.[1] || "https://api.deepseek.com";
const model = env.match(/AI_MODEL\s*=\s*"?([^"\n]+)"?/)?.[1] || "deepseek-v4-flash";

if (!key) {
  console.error("未找到 AI_API_KEY");
  process.exit(1);
}

// 模拟 10 章已有大纲（带情节点、伏笔，接近真实数据量）
const existing = [];
for (let i = 1; i <= 10; i++) {
  existing.push({
    chapter: i,
    sceneTitle: `第${i}章节标题示例`,
    sceneSummary: `这是第${i}章的摘要，包含剧情推进描述，约五十字左右，描述了本章发生的事件与关系变化。`,
    povCharacter: "主角",
    plotPoints: ["情节点一：具体事件描述", "情节点二：关系推进", "结尾钩子：类型+具体内容描述"],
    foreshadowing: `第${i}章埋下的伏笔内容`,
  });
}
const existingDetail = existing
  .map(
    (o) =>
      `第${o.chapter}章 ${o.sceneTitle}：${o.sceneSummary}\n  视角：${o.povCharacter}\n  情节点：${o.plotPoints.join("；")}\n  伏笔：${o.foreshadowing}`
  )
  .join("\n");
const lastChapter = 10;
const last = existing[existing.length - 1];

const userContent = `世界观：这是一个都市校园故事的世界观设定摘要，包含时代背景、主要场景、圈子规则、人物关系和核心矛盾，约八百字。
角色：主角(男)与三名配角的角色摘要，约五百字。
题材：都市校园言情
大纲模板：三幕式

已有大纲（10 章，含情节点和伏笔）：
${existingDetail}

最后一章（第${last.chapter}章 ${last.sceneTitle}）：
  摘要：${last.sceneSummary}
  情节点：${last.plotPoints.join("；")}
  伏笔：${last.foreshadowing}

【续写节奏要求】
1. 根据最后一章的剧情判断当前关系阶段，按"事件-涟漪-升温"每 3 章一个循环继续推进（亲密度逐轮上升），关系波浪式推进："靠近→退却→更近一步"
2. 章节摘要标注关系阶段（靠近/试探/升温/波折/确认）；plotPoints 的最后一个情节点必须是本章结尾钩子设计，注明钩子类型，且不能与最后一章已用的钩子类型相同
3. 悬念管理：优先回收已有伏笔，同时埋新伏笔；每章回收一个旧悬念再埋一个新悬念
4. 关系升温靠具体事件触发，不能一夜突变
5. 每章结束时局势必须有实质改变

请紧接最后一章续写后续 6-8 章的大纲。要求：
1. chapter 编号从 ${lastChapter + 1} 开始，连续递增
2. 【关键】第一章续写必须直接承接最后一章的情节走向
3. 回收已有伏笔或埋下新伏笔
4. 不要重复已有情节
5. 每章输出一个对象，包含：章节标题、章节摘要、视角角色、核心情节点（2-4 个）、伏笔或回收
6. 每章只输出一个对象，情节点放在 plotPoints 数组里

用 JSON 数组输出，不要任何额外文字：
[{"volume":1,"chapter":${lastChapter + 1},"sceneTitle":"章节标题","sceneSummary":"章节摘要（含关系阶段）","povCharacter":"视角角色名","plotPoints":["情节点1","情节点2","结尾钩子：类型+具体内容"],"foreshadowing":"伏笔或回收"}]`;

async function main() {
  console.log(`模型: ${model}, base: ${baseUrl}`);
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "你是资深网文大纲策划。" },
        { role: "user", content: userContent },
      ],
      temperature: 0.8,
      stream: true,
    }),
  });

  if (!resp.ok) {
    console.error(`HTTP ${resp.status}:`, await resp.text());
    process.exit(1);
  }

  // 流式收集（正确的 SSE 缓冲：跨 chunk 的行不能丢）
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let lineBuf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    lineBuf += decoder.decode(value, { stream: true });
    const lines = lineBuf.split("\n");
    lineBuf = lines.pop() || ""; // 保留不完整的尾行
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const j = JSON.parse(data);
        const delta = j.choices?.[0]?.delta?.content || "";
        full += delta;
      } catch {}
    }
  }

  console.log(`\n=== 输出长度: ${full.length} 字符 ===`);
  console.log(`输出前 300 字符:\n${full.slice(0, 300)}`);
  console.log(`...\n输出后 200 字符:\n${full.slice(-200)}`);

  // 客户端同款 tryParse
  const tryParse = (raw) => {
    let arr = null;
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      arr = JSON.parse(cleaned);
    } catch {
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          arr = JSON.parse(m[0]);
        } catch {
          arr = null;
        }
      }
    }
    return Array.isArray(arr) ? arr : null;
  };

  const parsed = tryParse(full);
  if (!parsed) {
    console.error("\n>>> 解析失败：客户端会 toast 'AI 返回格式异常' <<<");
  } else {
    console.log(`\n>>> 解析成功：${parsed.length} 条大纲 <<<`);
    parsed.forEach((p) => console.log(`  ch${p.chapter}: ${p.sceneTitle}`));
  }
}

main().catch((e) => {
  console.error("测试失败:", e.message);
  process.exit(1);
});
