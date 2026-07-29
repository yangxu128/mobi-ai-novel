"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Workflow, PenLine, MessageSquare } from "lucide-react";

const modes = [
  { key: "PIPELINE", label: "流水线", icon: Workflow, href: "pipeline" },
  { key: "WORKBENCH", label: "工作台", icon: PenLine, href: "editor" },
  { key: "CHAT", label: "对话共创", icon: MessageSquare, href: "chat" },
] as const;

export function ProjectModeSwitcher({
  projectId,
  current,
}: {
  projectId: string;
  current: "PIPELINE" | "WORKBENCH" | "CHAT";
}) {
  const router = useRouter();

  function onChange(value: string) {
    const m = modes.find((x) => x.key === value);
    if (!m) return;
    // 直接导航：目标页面会在 mode 不匹配时自动更新 DB 的 mode
    // 避免在此处串行 await server action 再跳转的双往返延迟
    router.push(`/${m.href}/${projectId}`);
  }

  return (
    <Tabs value={current} onValueChange={onChange}>
      <TabsList>
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <TabsTrigger key={m.key} value={m.key} className="gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
