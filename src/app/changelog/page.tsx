import type { Metadata } from "next";
import { SimplePage, Section } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "更新日志 - 墨笔 AI 写作平台",
};

const LOGS: Array<{ date: string; version: string; items: string[] }> = [
  {
    date: "2026-08-31",
    version: "v0.6",
    items: [
      "深度思考开关：全站 AI 生成可在项目头部控制是否让模型先思考，默认关闭以保证速度",
      "章节扩写自动保存：生成完成、中途停止、手动编辑三种场景都会自动入库，不怕丢稿",
      "官网全新改版：SkillHub 式无限轮播、逐字标题动效、鼠标跟随光晕与点击涟漪",
      "品牌图标：全新设计的站点 favicon",
    ],
  },
  {
    date: "2026-08-30",
    version: "v0.5",
    items: [
      "大纲「继续生成」稳定性修复：推理模型兼容、坏 JSON 自动容错解析",
      "登录/注册页全新分栏设计",
      "管理员账号生成不限量、不限频次",
      "修复删除项目后页面无法点击的问题",
    ],
  },
  {
    date: "2026-08-29",
    version: "v0.4",
    items: [
      "提示词接入番茄网文节奏体系：压-小扬-压-爆三章情绪循环、10 类结尾钩子、章节四段式结构",
      "文笔去 AI 味强化：禁排比堆砌、禁高频词、对话标签节制",
      "润色新增网文保护规则：不磨平结尾钩子、不破坏开篇冲突",
    ],
  },
  {
    date: "2026-08-03",
    version: "v0.3",
    items: [
      "统一项目工作台：流水线 / 工作台 / 对话共创三视图合一，数据实时同步",
      "作者风格模仿：粘贴文本分析文风，全项目生成生效",
      "订阅体系与定价页上线",
      "章节软删除与知识库索引优化",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <SimplePage title="更新日志" description="墨笔的每一次迭代都会记录在这里。">
      <div className="space-y-10">
        {LOGS.map((log) => (
          <div key={log.version} className="relative border-l-2 border-border-neutral-l1 pl-6">
            <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full brand-gradient" />
            <div className="flex items-baseline gap-3">
              <span className="num text-sm font-bold text-text-brand">{log.version}</span>
              <span className="num text-xs text-text-tertiary">{log.date}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {log.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-6 text-text-secondary">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-neutral-900" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SimplePage>
  );
}
