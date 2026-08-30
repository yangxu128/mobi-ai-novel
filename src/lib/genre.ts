/**
 * 题材分类与世界观框架自适应。
 *
 * 三种框架模式：
 * - realistic（纯现实）：都市/校园/言情等无超凡要素，世界观以人物关系与社会环境为主
 * - high-concept（日常+奇设）：现实背景 + 单一奇设（性转/变身/重生等），
 *   核心是奇设规则与关系演变，如"兄弟变女人后兄弟们渐生好感"
 * - fantasy（奇幻）：玄幻/仙侠/科幻等含完整力量体系的题材
 *
 * 奇设检测不只看题材标签，还扫描灵感/设定文本——
 * 用户选"校园"但点子是"兄弟变女人了"时，仍按奇设框架处理。
 */

const FANTASY_KEYWORDS = [
  "玄幻", "仙侠", "修仙", "修真", "奇幻", "科幻", "武侠", "末世", "魔法",
  "异能", "灵异", "脑洞", "系统", "星际", "御兽", "洪荒", "神话", "西幻",
];

const REALISTIC_KEYWORDS = [
  "都市", "校园", "言情", "青春", "职场", "悬疑", "推理", "历史",
  "现实", "商战", "娱乐", "生活", "婚恋", "年代", "家庭", "刑侦",
];

/**
 * 奇设关键词：命中后启用"日常+奇设"框架。
 * 可来自题材标签，也可来自灵感/简介/世界观设定文本。
 * "核心奇设"是本流水线生成的槽位标题，写入库后可在后续步骤中被检测到，形成闭环。
 */
const HIGH_CONCEPT_KEYWORDS = [
  "性转", "变女人", "变为女", "变成女", "变身", "男变女", "女变男",
  "变为男", "变成男", "灵魂互换", "互换身体", "交换身体", "交换人生",
  "穿越", "重生", "回到过去", "时间倒流", "读心", "预知", "超能力",
  "金手指", "变成猫", "变成狗", "变成小孩", "变大", "变小", "不老",
  "永生", "隐身", "分身", "核心奇设",
];

/** 情感关系向题材：大纲与正文用"关系推进节奏"而非打脸节奏 */
const RELATIONSHIP_KEYWORDS = [
  "言情", "青春", "校园", "婚恋", "恋爱", "纯爱", "甜宠", "情感",
  "日常", "轻小说", "暧昧", "后宫", "乙女",
];

export type GenreMode = "realistic" | "high-concept" | "fantasy";

/** 从任意文本中检测奇设关键词 */
export function detectHighConcept(
  ...texts: Array<string | null | undefined>
): boolean {
  return texts.some((t) => {
    if (!t) return false;
    return HIGH_CONCEPT_KEYWORDS.some((k) => t.includes(k));
  });
}

/**
 * 判定题材模式。
 * 优先级：奇幻关键词（题材）> 奇设关键词（题材或文本）> 现实关键词 > 默认奇幻。
 */
export function getGenreMode(
  genre?: string | null,
  ...texts: Array<string | null | undefined>
): GenreMode {
  const g = (genre || "").trim();
  if (FANTASY_KEYWORDS.some((k) => g.includes(k))) return "fantasy";
  if (detectHighConcept(g, ...texts)) return "high-concept";
  if (REALISTIC_KEYWORDS.some((k) => g.includes(k))) return "realistic";
  return "fantasy";
}

/** 是否为现实类题材（无超凡力量体系，世界观以人物关系与社会环境为主） */
export function isRealisticGenre(genre?: string | null): boolean {
  return getGenreMode(genre) === "realistic";
}

/**
 * 是否为关系推进型故事（情感向题材或含核心奇设）。
 * 此类故事的大纲与正文应以"关系升温/日常张力"推进，而非打脸复仇。
 */
export function isRelationshipStory(
  genre?: string | null,
  ...texts: Array<string | null | undefined>
): boolean {
  if (getGenreMode(genre, ...texts) === "high-concept") return true;
  const g = (genre || "").trim();
  return RELATIONSHIP_KEYWORDS.some((k) => g.includes(k));
}

/** 世界观框架槽位 */
export interface WorldbuildSlot {
  /** worldbuildPrompt JSON 输出的字段名（前后端契约，固定不变） */
  key: "background" | "geography" | "rules" | "system" | "conflict";
  /** 知识库存储的 category 枚举（数据库契约，固定不变） */
  category: "BACKGROUND" | "GEOGRAPHY" | "RULE" | "SYSTEM" | "OTHER";
  /** 槽位显示标题（随题材自适应） */
  title: string;
  /** 生成提示（随题材自适应） */
  hint: string;
}

/**
 * 按题材返回世界观框架槽位。
 * JSON key 与 category 枚举固定不变，仅槽位语义随题材切换，
 * 保证旧数据解析和数据库存储完全兼容。
 */
export function getWorldbuildSlots(
  genre?: string | null,
  ...texts: Array<string | null | undefined>
): WorldbuildSlot[] {
  const mode = getGenreMode(genre, ...texts);

  if (mode === "high-concept") {
    return [
      {
        key: "background",
        category: "BACKGROUND",
        title: "时代背景",
        hint: "当下的年代与社会氛围、故事所处的圈层环境（现实可信，无架空元素）",
      },
      {
        key: "geography",
        category: "GEOGRAPHY",
        title: "主要场景",
        hint: "故事发生的城市与核心活动空间：学校、宿舍、班级、常去的场所",
      },
      {
        key: "rules",
        category: "RULE",
        title: "圈子规则",
        hint: "人物所处圈子的明规则与潜规则：兄弟团体的相处方式、校园的人际生态",
      },
      {
        key: "system",
        category: "SYSTEM",
        title: "核心奇设",
        hint: "奇设的完整规则：如何发生、有何限制、能否复原、谁知道、对当事人身心的影响——这是全文唯一的超常要素",
      },
      {
        key: "conflict",
        category: "OTHER",
        title: "核心矛盾",
        hint: "关系演变主线与张力来源：旧关系（兄弟）如何被奇设打乱、渐生的心动如何与身份认知拉扯、秘密暴露的风险",
      },
    ];
  }

  if (mode === "realistic") {
    return [
      {
        key: "background",
        category: "BACKGROUND",
        title: "时代背景",
        hint: "当下年代、社会氛围、故事所处的圈层环境（如高考季的紧张氛围、互联网大厂的内卷文化）",
      },
      {
        key: "geography",
        category: "GEOGRAPHY",
        title: "主要场景",
        hint: "城市与核心活动空间：校园、公司、社区、常去的场所，以及这些场景如何承载人物交集",
      },
      {
        key: "rules",
        category: "RULE",
        title: "圈子规则",
        hint: "该圈子的明规则与潜规则：校园的排名与流言、职场的晋升逻辑、家庭的传统与期待",
      },
      {
        key: "system",
        category: "SYSTEM",
        title: "人物关系",
        hint: "主要人物关系网络：情感主线、三角关系、对立阵营、家庭背景对关系的牵制（只写关系结构，不展开具体角色卡）",
      },
      {
        key: "conflict",
        category: "OTHER",
        title: "核心矛盾",
        hint: "贯穿全文的核心冲突与情感纠葛：身份差异、误会来源、外界阻力",
      },
    ];
  }

  return [
    {
      key: "background",
      category: "BACKGROUND",
      title: "时代背景",
      hint: "故事所处的时代与整体氛围",
    },
    {
      key: "geography",
      category: "GEOGRAPHY",
      title: "地理设定",
      hint: "大陆/城市/势力版图等空间设定",
    },
    {
      key: "rules",
      category: "RULE",
      title: "社会规则",
      hint: "社会运行规则与阶层秩序",
    },
    {
      key: "system",
      category: "SYSTEM",
      title: "力量体系",
      hint: "修仙等级/科技水平/魔法体系等",
    },
    {
      key: "conflict",
      category: "OTHER",
      title: "核心矛盾",
      hint: "贯穿全文的核心冲突",
    },
  ];
}

/** SYSTEM 槽位的显示标签（力量体系 ↔ 人物关系 ↔ 核心奇设） */
export function getSystemSlotLabel(
  genre?: string | null,
  ...texts: Array<string | null | undefined>
): string {
  const mode = getGenreMode(genre, ...texts);
  if (mode === "high-concept") return "核心奇设";
  return mode === "realistic" ? "人物关系" : "力量体系";
}
